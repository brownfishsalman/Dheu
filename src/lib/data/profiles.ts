import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export const getProfileByUsername = cache(async (username: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return data;
});

export type ProfileStats = {
  posts: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  followsMe: boolean;
};

export async function getProfileStats(profileId: string, viewerId: string): Promise<ProfileStats> {
  const supabase = await createClient();

  const [posts, followers, following, isFollowing, followsMe] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profileId)
      .gt("expires_at", new Date().toISOString()),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", viewerId)
      .eq("following_id", profileId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId)
      .eq("following_id", viewerId),
  ]);

  return {
    posts: posts.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    isFollowing: (isFollowing.count ?? 0) > 0,
    followsMe: (followsMe.count ?? 0) > 0,
  };
}

export type GridPost = {
  id: string;
  created_at: string;
  images: { path: string; width: number; height: number; position: number }[];
};

export async function getProfilePosts(profileId: string): Promise<GridPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, created_at, images:post_images(path, width, height, position)")
    .eq("author_id", profileId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((p) => ({
    ...p,
    images: [...p.images].sort((a, b) => a.position - b.position),
  }));
}

export type ProfileListItem = Pick<Profile, "id" | "username" | "full_name" | "avatar_path">;

export async function getFollowers(profileId: string): Promise<ProfileListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("profile:profiles!follows_follower_id_fkey(id, username, full_name, avatar_path)")
    .eq("following_id", profileId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.profile).filter(Boolean) as ProfileListItem[];
}

export async function getFollowing(profileId: string): Promise<ProfileListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("profile:profiles!follows_following_id_fkey(id, username, full_name, avatar_path)")
    .eq("follower_id", profileId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.profile).filter(Boolean) as ProfileListItem[];
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  return (data ?? []).map((r) => r.following_id);
}

export async function searchProfiles(query: string, limit = 30): Promise<ProfileListItem[]> {
  const supabase = await createClient();
  const q = query.trim().replace(/[%_]/g, "");
  let req = supabase
    .from("profiles")
    .select("id, username, full_name, avatar_path")
    .order("username")
    .limit(limit);
  if (q) req = req.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data } = await req;
  return data ?? [];
}
