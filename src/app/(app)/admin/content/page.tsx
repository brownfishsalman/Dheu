import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentManager, type AdminPost, type AdminStory } from "@/components/admin/ContentManager";

export const metadata: Metadata = { title: "Content" };

export default async function AdminContentPage() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [{ data: posts }, { data: stories }] = await Promise.all([
    admin
      .from("posts")
      .select("id, caption, created_at, author:profiles!posts_author_id_fkey(username), images:post_images(path, position)")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(60),
    admin
      .from("stories")
      .select("id, created_at, author_id, image_path, author:profiles!stories_author_id_fkey(username)")
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
  ]);

  const adminPosts: AdminPost[] = (posts ?? []).map((p) => ({
    id: p.id,
    caption: p.caption,
    created_at: p.created_at,
    username: p.author?.username ?? "?",
    cover: [...p.images].sort((a, b) => a.position - b.position)[0]?.path ?? null,
  }));

  const adminStories: AdminStory[] = (stories ?? []).map((s) => ({
    id: s.id,
    created_at: s.created_at,
    author_id: s.author_id,
    image_path: s.image_path,
    username: s.author?.username ?? "?",
  }));

  return <ContentManager posts={adminPosts} stories={adminStories} />;
}
