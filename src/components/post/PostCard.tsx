"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, MoreHorizontal, Link2, Trash2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Carousel } from "@/components/post/Carousel";
import { timeAgo, expiresIn } from "@/lib/time";
import type { FeedPost } from "@/lib/data/posts";

export type Viewer = { id: string; isAdmin: boolean };

type Props = {
  post: FeedPost;
  viewer: Viewer;
  detail?: boolean; // on /p/[id]: show full caption, no "view comments" link
  priority?: boolean;
  onDeleted?: () => void;
  deleteRedirect?: string; // where to go after deleting (detail page)
  children?: React.ReactNode; // comments block on the detail page
};

export function PostCard({ post, viewer, detail = false, priority, onDeleted, deleteRedirect, children }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [burst, setBurst] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(detail);
  const [, startTransition] = useTransition();

  const canDelete = viewer.id === post.author_id || viewer.isAdmin;

  async function toggleLike(force?: boolean) {
    const next = force ?? !liked;
    if (next === liked) return;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: viewer.id })
      : await supabase.from("post_likes").delete().match({ post_id: post.id, user_id: viewer.id });
    if (error && !(next && error.code === "23505")) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  function doubleTap() {
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    toggleLike(true);
  }

  async function copyLink() {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(`${location.origin}/p/${post.id}`);
    } catch {}
  }

  async function deletePost() {
    setMenuOpen(false);
    if (!confirm("Delete this post? This can't be undone.")) return;
    const supabase = createClient();
    await supabase.storage.from("posts").remove(post.images.map((i) => i.path));
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return alert("Couldn't delete the post.");
    if (deleteRedirect) router.replace(deleteRedirect);
    else if (onDeleted) onDeleted();
    else startTransition(() => router.refresh());
  }

  const captionLong = post.caption.length > 140;
  const shownCaption = !expanded && captionLong ? post.caption.slice(0, 140).trimEnd() + "…" : post.caption;

  return (
    <article className="card overflow-hidden sm:rounded-card max-sm:rounded-none max-sm:border-x-0">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link href={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-3">
          <Avatar path={post.author.avatar_path} name={post.author.full_name} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight">{post.author.username}</span>
            <span className="block text-xs text-ink-faint" title={expiresIn(post.expires_at)}>
              {timeAgo(post.created_at)}
            </span>
          </span>
        </Link>

        <div className="relative ml-auto">
          <button
            type="button"
            aria-label="Post options"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <MoreHorizontal className="size-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-card">
                <button type="button" onClick={copyLink} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-surface-2">
                  <Link2 className="size-4" /> Copy link
                </button>
                <div className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-muted">
                  <Clock className="size-4" /> {expiresIn(post.expires_at)}
                </div>
                {canDelete && (
                  <button type="button" onClick={deletePost} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger hover:bg-surface-2">
                    <Trash2 className="size-4" /> Delete post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Images */}
      <div className="relative">
        <Carousel images={post.images} alt={post.caption} onDoubleTap={doubleTap} priority={priority} />
        {burst && (
          <Heart
            className="pointer-events-none absolute inset-0 m-auto size-24 animate-[fade-in_150ms_ease-out] fill-white text-white drop-shadow-lg"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 pt-1.5">
        <button
          type="button"
          onClick={() => toggleLike()}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className="rounded-full p-2 transition active:scale-90"
        >
          <Heart className={`size-[26px] ${liked ? "fill-like text-like" : "text-ink"}`} />
        </button>
        {detail ? (
          <span className="rounded-full p-2 text-ink">
            <MessageCircle className="size-[26px]" />
          </span>
        ) : (
          <Link href={`/p/${post.id}`} aria-label="Comments" className="rounded-full p-2 text-ink">
            <MessageCircle className="size-[26px]" />
          </Link>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-1 px-4 pt-1 pb-3.5 text-[15px]">
        {likeCount > 0 && (
          <Link href={`/p/${post.id}/likes`} className="block font-semibold">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </Link>
        )}
        {post.caption && (
          <p className="whitespace-pre-wrap break-words">
            <Link href={`/u/${post.author.username}`} className="mr-1.5 font-semibold">
              {post.author.username}
            </Link>
            {shownCaption}
            {captionLong && !expanded && (
              <button type="button" onClick={() => setExpanded(true)} className="ml-1 text-ink-muted">
                more
              </button>
            )}
          </p>
        )}
        {!detail && post.comment_count > 0 && (
          <Link href={`/p/${post.id}`} className="block text-ink-muted">
            View {post.comment_count === 1 ? "1 comment" : `all ${post.comment_count} comments`}
          </Link>
        )}
      </div>

      {children}
    </article>
  );
}
