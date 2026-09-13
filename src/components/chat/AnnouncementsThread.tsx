"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Trash2, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { WaveMark } from "@/components/brand/Logo";
import { BADGES_REFRESH_EVENT } from "@/components/nav/BadgeProvider";
import type { AnnouncementItem } from "@/lib/data/chat";

type Props = { initial: AnnouncementItem[]; meId: string; isAdmin: boolean };

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Read-only broadcast thread. Only the admin can post (enforced by the database).
export function AnnouncementsThread({ initial, meId, isAdmin }: Props) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark as read on open and whenever something new arrives while open.
  const markRead = async () => {
    const supabase = createClient();
    await supabase.rpc("mark_announcements_read"); // stamped with the server clock
    window.dispatchEvent(new Event(BADGES_REFRESH_EVENT));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
    markRead();
     
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const channel = supabase
      .channel(`announcements:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const row = payload.new as AnnouncementItem;
        setItems((it) => (it.some((x) => x.id === row.id) ? it : [...it, row]));
        if (document.visibilityState === "visible") markRead();
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "announcements" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setItems((it) => it.filter((x) => x.id !== id));
      });
    ensureRealtimeAuth(supabase).then(() => {
      if (!cancelled) channel.subscribe();
    });
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
     
  }, []);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("announcements")
      .insert({ author_id: meId, body })
      .select("id, body, created_at, author_id")
      .single();
    setSending(false);
    if (err || !data) return setError("Couldn't post the announcement.");
    setItems((it) => (it.some((x) => x.id === data.id) ? it : [...it, data]));
    setText("");
    markRead();
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement for everyone?")) return;
    const { error: err } = await createClient().from("announcements").delete().eq("id", id);
    if (err) return alert("Couldn't delete it.");
    setItems((it) => it.filter((x) => x.id !== id));
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3rem-3.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-3.5rem)]">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto mb-4 max-w-sm rounded-xl bg-surface-2/70 px-4 py-3 text-center text-xs text-ink-muted">
          <Megaphone className="mx-auto mb-1 size-5 text-brand" />
          Updates from the Dheu admin — new features, changes and tips. This thread is read-only.
        </div>

        {items.length === 0 && <p className="py-12 text-center text-sm text-ink-muted">No announcements yet.</p>}

        {items.map((a) => (
          <div key={a.id} className="group mt-3 flex items-end gap-2">
            <span className="mb-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-line">
              <WaveMark size={18} />
            </span>
            <div className="max-w-[85%]">
              <div className="rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-2.5 text-[15px] whitespace-pre-wrap break-words">{a.body}</div>
              <div className="mt-0.5 flex items-center gap-2 pl-1 text-[11px] text-ink-faint">
                {when(a.created_at)}
                {isAdmin && (
                  <button type="button" onClick={() => remove(a.id)} aria-label="Delete announcement" className="rounded p-0.5 opacity-60 hover:text-danger hover:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isAdmin ? (
        <form onSubmit={post} className="border-t border-line bg-surface px-3 py-2">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
              rows={Math.min(6, Math.max(1, text.split("\n").length))}
              placeholder="Write an announcement for everyone…"
              className="input resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post(e);
              }}
            />
            <button type="submit" disabled={sending || !text.trim()} aria-label="Post" className="btn-primary rounded-full p-2.5">
              {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
          </div>
          <p className="mt-1 px-1 text-[11px] text-ink-faint">Posts to every member&apos;s inbox. Ctrl+Enter to send.</p>
          {error && <p className="px-1 pt-1 text-xs text-danger">{error}</p>}
        </form>
      ) : (
        <p className="border-t border-line bg-surface px-4 py-3 text-center text-xs text-ink-faint">Only the admin can post here.</p>
      )}
    </div>
  );
}
