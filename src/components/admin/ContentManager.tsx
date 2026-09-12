"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { publicUrl } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import { adminDeletePost, adminDeleteStory, type ActionResult } from "@/app/(app)/admin/actions";

export type AdminPost = { id: string; caption: string; created_at: string; username: string; cover: string | null };
export type AdminStory = { id: string; created_at: string; username: string; author_id: string; image_path: string };

export function ContentManager({ posts, stories }: { posts: AdminPost[]; stories: AdminStory[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, fn: () => Promise<ActionResult>) {
    setBusy(id);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) alert(r.error);
      setBusy(null);
    });
  }

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Active stories ({stories.length})</h2>
        </div>
        {stories.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">No active stories.</p>
        ) : (
          <ul className="grid grid-cols-4 gap-1 p-2 sm:grid-cols-6">
            {stories.map((s) => (
              <li key={s.id} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-surface-2">
                <Link href={`/stories/${s.author_id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl("stories", s.image_path) ?? ""} alt="" className="h-full w-full object-cover" loading="lazy" />
                </Link>
                <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {s.username} · {timeAgo(s.created_at)}
                </span>
                <button
                  type="button"
                  aria-label="Delete story"
                  disabled={busy === s.id}
                  onClick={() => confirm(`Delete this story by ${s.username}?`) && run(s.id, () => adminDeleteStory(s.id))}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-danger"
                >
                  {busy === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Recent posts</h2>
          <p className="text-xs text-ink-muted">Newest 60. You can also delete any post from its own menu.</p>
        </div>
        {posts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">No posts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/p/${p.id}`} className="block size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {p.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicUrl("posts", p.cover) ?? ""} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold">{p.username}</span>{" "}
                    <span className="text-ink-faint">· {timeAgo(p.created_at)}</span>
                  </p>
                  <p className="truncate text-sm text-ink-muted">{p.caption || <em>no caption</em>}</p>
                </div>
                <button
                  type="button"
                  aria-label="Delete post"
                  disabled={busy === p.id}
                  onClick={() => confirm(`Delete this post by ${p.username}?`) && run(p.id, () => adminDeletePost(p.id))}
                  className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-danger"
                >
                  {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
