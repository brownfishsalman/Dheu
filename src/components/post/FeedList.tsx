"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PostCard, type Viewer } from "@/components/post/PostCard";
import { SuggestedStrip } from "@/components/post/SuggestedStrip";
import type { ProfileListItem } from "@/lib/data/profiles";
import { loadMoreFeed } from "@/app/(app)/feed-actions";
import type { FeedPost } from "@/lib/data/posts";

type Props = {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  viewer: Viewer;
  suggestions?: ProfileListItem[]; // when present, a "Suggested for you" strip is slotted in
};

// Infinite-scrolling list of posts. Loads the next page when the sentinel
// at the bottom scrolls into view.
export function FeedList({ initialPosts, initialCursor, viewer, suggestions }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // When the server re-renders with fresh data (router.refresh), adopt it.
  const [prevInitial, setPrevInitial] = useState(initialPosts);
  if (prevInitial !== initialPosts) {
    setPrevInitial(initialPosts);
    setPosts(initialPosts);
    setCursor(initialCursor);
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        setLoading(true);
        try {
          const page = await loadMoreFeed(cursor);
          setPosts((p) => {
            const seen = new Set(p.map((x) => x.id));
            return [...p, ...page.posts.filter((x) => !seen.has(x.id))];
          });
          setCursor(page.nextCursor);
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loading]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {posts.map((post, i) => (
        <Fragment key={post.id}>
          <PostCard
            post={post}
            viewer={viewer}
            priority={i === 0}
            onDeleted={() => setPosts((p) => p.filter((x) => x.id !== post.id))}
          />
          {suggestions && suggestions.length > 0 && i === Math.min(1, posts.length - 1) && (
            <SuggestedStrip people={suggestions} />
          )}
        </Fragment>
      ))}
      <div ref={sentinel} className="flex justify-center py-4">
        {loading && <Loader2 className="size-6 animate-spin text-ink-faint" />}
        {!cursor && posts.length > 0 && (
          <p className="text-sm text-ink-faint">You&apos;re all caught up</p>
        )}
      </div>
    </div>
  );
}
