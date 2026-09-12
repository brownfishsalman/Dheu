"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";

type Row = {
  id: string;
  username: string;
  full_name: string;
  avatar_path: string | null;
  viewed_at: string;
  emoji: string | null;
};

// Bottom sheet listing who has seen (and reacted to) one of my stories.
export function SeenBySheet({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: views }, { data: reactions }] = await Promise.all([
        supabase
          .from("story_views")
          .select("viewed_at, viewer:profiles!story_views_viewer_id_fkey(id, username, full_name, avatar_path)")
          .eq("story_id", storyId)
          .order("viewed_at", { ascending: false }),
        supabase.from("story_reactions").select("user_id, emoji").eq("story_id", storyId),
      ]);
      const emojiBy = new Map((reactions ?? []).map((r) => [r.user_id, r.emoji]));
      setRows(
        (views ?? [])
          .filter((v) => v.viewer)
          .map((v) => ({
            id: v.viewer!.id,
            username: v.viewer!.username,
            full_name: v.viewer!.full_name,
            avatar_path: v.viewer!.avatar_path,
            viewed_at: v.viewed_at,
            emoji: emojiBy.get(v.viewer!.id) ?? null,
          })),
      );
    })();
  }, [storyId]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative max-h-[70%] rounded-t-2xl bg-surface text-ink shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display font-semibold">
            Seen by {rows ? rows.length : ""}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto pb-safe">
          {rows === null && (
            <li className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-ink-faint" />
            </li>
          )}
          {rows?.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">No views yet.</li>}
          {rows?.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link href={`/u/${r.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar path={r.avatar_path} name={r.full_name} size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.username}</span>
                  <span className="block text-xs text-ink-faint">{timeAgo(r.viewed_at)}</span>
                </span>
              </Link>
              {r.emoji && <span className="text-xl">{r.emoji}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
