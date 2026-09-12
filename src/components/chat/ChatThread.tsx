"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { publicUrl } from "@/lib/storage";
import { Avatar } from "@/components/ui/Avatar";
import { loadOlderMessages } from "@/app/(app)/messages/actions";
import type { ChatMessage, ChatPeer } from "@/lib/data/chat";
import { MESSAGE_PAGE } from "@/lib/constants";

type Props = { conversationId: string; meId: string; peer: ChatPeer; initialMessages: ChatMessage[] };

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}
function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({ conversationId, meId, peer, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [hasOlder, setHasOlder] = useState(initialMessages.length >= MESSAGE_PAGE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const markRead = useCallback(async () => {
    const supabase = createClient();
    await supabase
      .from("conversation_reads")
      .upsert({ conversation_id: conversationId, user_id: meId, last_read_at: new Date().toISOString() }, { onConflict: "conversation_id,user_id" });
  }, [conversationId, meId]);

  // Initial scroll + mark as read
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
    markRead();
  }, [markRead]);

  // Realtime: new messages in this conversation
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const channel = supabase.channel(`conversation:${conversationId}:${Math.random().toString(36).slice(2)}`);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as Omit<ChatMessage, "story">;
          let story: ChatMessage["story"] = null;
          if (row.story_id) {
            const { data } = await supabase.from("stories").select("image_path, author_id").eq("id", row.story_id).maybeSingle();
            story = data ?? null;
          }
          setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, { ...row, story }]));
          if (row.sender_id !== meId && document.visibilityState === "visible") markRead();
        },
      );
    ensureRealtimeAuth(supabase).then(() => {
      if (cancelled) return;
      channel.subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[chat realtime]", status, err?.message ?? "");
        }
      });
    });
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId, meId, markRead]);

  // Keep pinned to the bottom when new messages arrive (if already near the bottom)
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, body })
      .select("id, conversation_id, sender_id, body, story_id, created_at")
      .single();
    setSending(false);
    if (err || !data) return setError("Couldn't send. Check your connection.");
    setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, { ...data, story: null }]));
    setText("");
    inputRef.current?.focus();
    markRead();
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function loadOlder() {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const older = await loadOlderMessages(conversationId, messages[0].created_at);
    setMessages((m) => [...older, ...m]);
    setHasOlder(older.length >= MESSAGE_PAGE);
    setLoadingOlder(false);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3rem-3.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-3.5rem)]">
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
        {hasOlder && (
          <div className="mb-3 flex justify-center">
            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="btn-ghost text-sm">
              {loadingOlder ? <Loader2 className="size-4 animate-spin" /> : "Load earlier messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Avatar path={peer.avatar_path} name={peer.full_name} size={72} />
            <p className="font-semibold">{peer.full_name}</p>
            <p className="text-sm text-ink-muted">@{peer.username} · Say hi 👋</p>
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const prev = messages[i - 1];
          const showDay = !prev || !sameDay(prev.created_at, m.created_at);
          const grouped = prev && prev.sender_id === m.sender_id && !showDay &&
            new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
          const storySrc = m.story ? publicUrl("stories", m.story.image_path) : null;

          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-3 text-center text-xs font-medium text-ink-faint">{dayLabel(m.created_at)}</div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2"}`}>
                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {m.story_id && (
                    <div className={`mb-1 flex items-end gap-2 text-xs text-ink-faint ${mine ? "flex-row-reverse" : ""}`}>
                      {storySrc ? (
                        <Link href={m.story && m.story.author_id === peer.id ? `/stories/${peer.id}` : `/stories/${meId}`} className="block h-20 w-12 overflow-hidden rounded-lg border border-line bg-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={storySrc} alt="" className="h-full w-full object-cover" />
                        </Link>
                      ) : (
                        <span className="flex h-20 w-12 items-center justify-center rounded-lg border border-dashed border-line text-center text-[10px] leading-tight">
                          story expired
                        </span>
                      )}
                      <span>{mine ? "You replied to their story" : "Replied to your story"}</span>
                    </div>
                  )}
                  <div
                    title={clock(m.created_at)}
                    className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] ${
                      mine ? "rounded-br-md bg-brand text-brand-ink" : "rounded-bl-md bg-surface-2 text-ink"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Message…"
          autoComplete="off"
          enterKeyHint="send"
          className="input rounded-full"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send"
          className="btn-primary rounded-full p-2.5"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </form>
      {error && <p className="bg-surface px-4 pb-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
