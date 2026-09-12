import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export type NotificationActor = Pick<Profile, "id" | "username" | "full_name" | "avatar_path">;

export type NotificationItem = {
  id: string;
  type: "like" | "follow" | "comment" | "story_reaction";
  read_at: string | null;
  created_at: string;
  post_id: string | null;
  story_id: string | null;
  actor: NotificationActor;
  // Thumbnail for the right-hand side (null if the post/story is gone)
  thumb: string | null;
  thumbBucket: "posts" | "stories";
  commentBody: string | null;
};

export async function getNotifications(userId: string, limit = 100): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, read_at, created_at, post_id, story_id, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_path), post:posts(images:post_images(path, position)), comment:comments(body), story:stories(image_path)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const out: NotificationItem[] = [];
  for (const n of data ?? []) {
    if (!n.actor) continue;
    const cover = n.post ? [...n.post.images].sort((a, b) => a.position - b.position)[0]?.path ?? null : null;
    out.push({
      id: n.id,
      type: n.type,
      read_at: n.read_at,
      created_at: n.created_at,
      post_id: n.post_id,
      story_id: n.story_id,
      actor: n.actor,
      thumb: n.type === "story_reaction" ? (n.story?.image_path ?? null) : cover,
      thumbBucket: n.type === "story_reaction" ? "stories" : "posts",
      commentBody: n.comment?.body ?? null,
    });
  }
  return out;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
