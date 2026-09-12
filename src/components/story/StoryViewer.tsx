"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Pause, Play, Eye, Trash2, Bookmark, Send, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { publicUrl } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { SeenBySheet } from "@/components/story/SeenBySheet";
import { AddToHighlightSheet } from "@/components/story/AddToHighlightSheet";
import type { StoryGroup } from "@/lib/data/stories";

const DURATION = 5000;
const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

export type ViewerProps = {
  group: StoryGroup;
  viewerId: string;
  isOwner: boolean;
  mode: "story" | "highlight";
  closeHref: string;
  nextHref?: string | null; // next person's stories (story mode)
  prevHref?: string | null;
  highlight?: { id: string; title: string };
  myHighlights?: { id: string; title: string }[];
  startIndex?: number;
};

export function StoryViewer(props: ViewerProps) {
  const { group, viewerId, isOwner, mode, closeHref, nextHref, prevHref, highlight, myHighlights = [] } = props;
  const router = useRouter();
  const stories = group.stories;

  const [index, setIndex] = useState(() =>
    Math.min(Math.max(props.startIndex ?? 0, 0), Math.max(stories.length - 1, 0)),
  );
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [sheet, setSheet] = useState<null | "seen" | "highlight">(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const current = stories[index];
  const replyRef = useRef<HTMLInputElement>(null);
  const [typing, setTyping] = useState(false);
  const frozen = paused || holding || sheet !== null || typing || busy;

  // ---- navigation -------------------------------------------------------
  const goNext = useCallback(() => {
    if (index < stories.length - 1) {
      setIndex((i) => i + 1);
      setProgress(0);
    } else if (nextHref) {
      router.replace(nextHref);
    } else {
      router.replace(closeHref);
    }
  }, [index, stories.length, nextHref, closeHref, router]);

  const goPrev = useCallback(() => {
    if (progress > 0.15 || index === 0) {
      if (index === 0 && progress < 0.15 && prevHref) return router.replace(prevHref);
      setProgress(0);
      return;
    }
    setIndex((i) => i - 1);
    setProgress(0);
  }, [index, progress, prevHref, router]);

  // ---- timer ------------------------------------------------------------
  useEffect(() => {
    if (frozen || !current) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setProgress((p) => {
        const next = p + delta / DURATION;
        if (next >= 1) {
          queueMicrotask(goNext);
          return 1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frozen, current, goNext]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ---- mark as viewed ---------------------------------------------------
  useEffect(() => {
    if (!current || isOwner || mode !== "story" || current.seen) return;
    const supabase = createClient();
    supabase
      .from("story_views")
      .upsert({ story_id: current.id, viewer_id: viewerId }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true })
      .then(() => {
        current.seen = true;
      });
  }, [current, isOwner, mode, viewerId]);

  // ---- preload next image -----------------------------------------------
  useEffect(() => {
    const next = stories[index + 1];
    if (next) {
      const img = new Image();
      img.src = publicUrl("stories", next.image_path) ?? "";
    }
  }, [index, stories]);

  // ---- keyboard ---------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing || sheet) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") router.replace(closeHref);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, router, closeHref, typing, sheet]);

  // ---- touch / pointer gestures ----------------------------------------
  const pointer = useRef<{ x: number; y: number; t: number; holdTimer: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const holdTimer = window.setTimeout(() => setHolding(true), 180);
    pointer.current = { x: e.clientX, y: e.clientY, t: Date.now(), holdTimer };
  }

  function onPointerUp(e: React.PointerEvent) {
    const p = pointer.current;
    pointer.current = null;
    if (!p) return;
    clearTimeout(p.holdTimer);
    const wasHolding = holding;
    setHolding(false);

    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dy > 80 && Math.abs(dx) < 60) return router.replace(closeHref); // swipe down
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60) return dx < 0 ? goNext() : goPrev(); // horizontal swipe
    if (wasHolding || Date.now() - p.t > 250) return; // it was a hold, not a tap

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (ratio < 0.33) goPrev();
    else goNext();
  }

  function onPointerCancel() {
    const p = pointer.current;
    if (p) clearTimeout(p.holdTimer);
    pointer.current = null;
    setHolding(false);
  }

  // ---- actions ----------------------------------------------------------
  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 1400);
  }

  async function react(emoji: string) {
    if (!current) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("story_reactions")
      .upsert({ story_id: current.id, user_id: viewerId, emoji }, { onConflict: "story_id,user_id" });
    showToast(error ? "Couldn't send" : `Sent ${emoji}`);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !current) return;
    setSending(true);
    const supabase = createClient();
    const { data: convId, error: cErr } = await supabase.rpc("get_or_create_conversation", {
      p_other_id: group.author.id,
    });
    if (cErr || !convId) {
      setSending(false);
      return showToast("Couldn't send");
    }
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: convId, sender_id: viewerId, body: text, story_id: current.id });
    setSending(false);
    if (error) return showToast("Couldn't send");
    setReply("");
    replyRef.current?.blur();
    showToast("Reply sent");
  }

  async function deleteStory() {
    if (!current) return;
    if (!confirm("Delete this story?")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.storage.from("stories").remove([current.image_path]);
    const { error } = await supabase.from("stories").delete().eq("id", current.id);
    setBusy(false);
    if (error) return alert("Couldn't delete the story.");
    if (stories.length <= 1) return router.replace(closeHref);
    router.refresh();
    if (index >= stories.length - 1) setIndex(Math.max(0, index - 1));
    setProgress(0);
  }

  async function removeFromHighlight() {
    if (!current || !highlight) return;
    if (!confirm("Remove this story from the highlight?")) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("highlight_items")
      .delete()
      .match({ highlight_id: highlight.id, story_id: current.id });
    setBusy(false);
    if (error) return alert("Couldn't remove it.");
    if (stories.length <= 1) return router.replace(closeHref);
    router.refresh();
    if (index >= stories.length - 1) setIndex(Math.max(0, index - 1));
    setProgress(0);
  }

  async function deleteHighlight() {
    if (!highlight) return;
    if (!confirm(`Delete the highlight “${highlight.title}”? The stories themselves are kept.`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("story_highlights").delete().eq("id", highlight.id);
    setBusy(false);
    if (error) return alert("Couldn't delete the highlight.");
    router.replace(closeHref);
    router.refresh();
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
        <p>Nothing to show.</p>
        <Link href={closeHref} className="absolute top-4 right-4 p-2" aria-label="Close">
          <X className="size-7" />
        </Link>
      </div>
    );
  }

  const src = publicUrl("stories", current.image_path) ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black md:bg-neutral-950">
      {/* Desktop side arrows */}
      {(index > 0 || prevHref) && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous"
          className="absolute left-4 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:block"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      {(index < stories.length - 1 || nextHref) && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Next"
          className="absolute right-4 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:block"
        >
          <ChevronRight className="size-6" />
        </button>
      )}

      <div className="relative flex h-full w-full flex-col bg-black md:h-[min(100vh,900px)] md:w-auto md:aspect-[9/16] md:overflow-hidden md:rounded-2xl">
        {/* Image + gesture layer */}
        <div
          className="absolute inset-0 flex touch-none select-none items-center justify-center"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={src}
            alt=""
            draggable={false}
            className="animate-fade-in max-h-full max-w-full object-contain"
          />
        </div>

        {/* Top gradient, progress bars, header */}
        <div className="pointer-events-none relative z-10 bg-gradient-to-b from-black/70 to-transparent px-3 pt-safe">
          <div className="flex gap-1 pt-3">
            {stories.map((s, i) => (
              <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-white"
                  style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
                />
              </div>
            ))}
          </div>

          <div className="pointer-events-auto mt-3 flex items-center gap-2.5 pb-3 text-white">
            <Link href={`/u/${group.author.username}`} className="flex items-center gap-2.5">
              <Avatar path={group.author.avatar_path} name={group.author.full_name} size={34} />
              <span className="text-sm font-semibold drop-shadow">{group.author.username}</span>
            </Link>
            <span className="text-xs text-white/70">
              {mode === "highlight" && highlight ? highlight.title : timeAgo(current.created_at)}
            </span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play" : "Pause"}
              className="ml-auto p-1.5"
            >
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </button>
            <Link href={closeHref} aria-label="Close" className="p-1.5">
              <X className="size-6" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-auto bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-safe">
          {toast && (
            <div className="mb-2 text-center text-sm font-medium text-white drop-shadow">{toast}</div>
          )}

          {isOwner ? (
            <div className="flex items-center gap-2 pb-3 text-white">
              {mode === "story" && (
                <>
                  <button
                    type="button"
                    onClick={() => setSheet("seen")}
                    className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium"
                  >
                    <Eye className="size-4" /> Seen by
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("highlight")}
                    className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium"
                  >
                    <Bookmark className="size-4" /> Highlight
                  </button>
                  <button
                    type="button"
                    onClick={deleteStory}
                    disabled={busy}
                    aria-label="Delete story"
                    className="ml-auto rounded-full bg-white/15 p-2"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
              {mode === "highlight" && (
                <>
                  <button
                    type="button"
                    onClick={removeFromHighlight}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium"
                  >
                    <X className="size-4" /> Remove story
                  </button>
                  <button
                    type="button"
                    onClick={deleteHighlight}
                    disabled={busy}
                    className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium"
                  >
                    <Trash2 className="size-4" /> Delete highlight
                  </button>
                </>
              )}
            </div>
          ) : mode === "story" ? (
            <div className="space-y-2.5 pb-3">
              <div className="flex justify-around">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(emoji)}
                    className="rounded-full p-1.5 text-2xl transition active:scale-125"
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex items-center gap-2">
                <input
                  ref={replyRef}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setTyping(true)}
                  onBlur={() => setTyping(false)}
                  maxLength={2000}
                  placeholder={`Reply to ${group.author.username}…`}
                  className="min-w-0 flex-1 rounded-full border border-white/40 bg-black/30 px-4 py-2.5 text-[15px] text-white placeholder:text-white/60 outline-none focus:border-white"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  aria-label="Send reply"
                  className="rounded-full p-2 text-white disabled:opacity-40"
                >
                  {sending ? <Loader2 className="size-6 animate-spin" /> : <Send className="size-6" />}
                </button>
              </form>
            </div>
          ) : (
            <div className="pb-3" />
          )}
        </div>

        {sheet === "seen" && <SeenBySheet storyId={current.id} onClose={() => setSheet(null)} />}
        {sheet === "highlight" && (
          <AddToHighlightSheet
            storyId={current.id}
            ownerId={viewerId}
            highlights={myHighlights}
            onClose={() => setSheet(null)}
            onDone={(title) => {
              setSheet(null);
              showToast(`Added to “${title}”`);
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}
