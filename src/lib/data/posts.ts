import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { FEED_PAGE_SIZE } from "@/lib/constants";

export type PostAuthor = Pick<Profile, "id" | "username" | "full_name" | "avatar_path">;

export type FeedImage = { id: string; path: string; width: number; height: number; position: number };

export type FeedPost = {
  id: string;
  author_id: string;
  caption: string;
  created_at: string;
  expires_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  author: PostAuthor;
  images: FeedImage[];
};

const FEED_SELECT =
  "id, author_id, caption, created_at, expires_at, like_count, comment_count, liked_by_me, author:profiles!posts_author_id_fkey(id, username, full_name, avatar_path), images:post_images(id, path, width, height, position)";


type RawFeedRow = {
  id: string;
  author_id: string;
  caption: string;
  created_at: string;
  expires_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  author: PostAuthor | null;
  images: FeedImage[];
};

function normalize(rows: RawFeedRow[]): FeedPost[] {
  return rows
    .filter((r): r is RawFeedRow & { author: PostAuthor } => r.author !== null)
    .map((r) => ({ ...r, images: [...r.images].sort((a, b) => a.position - b.position) }));
}

// Chronological feed of people I follow + me. Cursor = created_at of the last post seen.
export async function getFeedPage(
  viewerId: string,
  followingIds: string[],
  before?: string,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const supabase = await createClient();
  let q = supabase
    .from("post_feed")
    .select(FEED_SELECT)
    .in("author_id", [viewerId, ...followingIds])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);
  if (before) q = q.lt("created_at", before);

  const { data } = await q;
  const rows = normalize((data ?? []) as RawFeedRow[]);
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const posts = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  return { posts, nextCursor: hasMore ? posts[posts.length - 1].created_at : null };
}

export async function getPost(id: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("post_feed").select(FEED_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  return normalize([data as RawFeedRow])[0] ?? null;
}

export type CommentItem = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: PostAuthor;
};

export async function getComments(postId: string): Promise<CommentItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at, author:profiles!comments_author_id_fkey(id, username, full_name, avatar_path)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(500);
  return (data ?? []).filter((c) => c.author !== null) as CommentItem[];
}

export async function getLikers(postId: string): Promise<PostAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_likes")
    .select("profile:profiles!post_likes_user_id_fkey(id, username, full_name, avatar_path)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => r.profile).filter(Boolean) as PostAuthor[];
}
