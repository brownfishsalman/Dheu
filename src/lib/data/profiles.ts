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

export type BlockStatus = "by_me" | "by_them" | "both" | null;

export type ProfileStats = {
  posts: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  followsMe: boolean;
  requested: boolean; // I have a pending request to follow them
  requestedMe: boolean; // they have a pending request to follow me
  blockStatus: BlockStatus;
};

export async function getProfileStats(profileId: string, viewerId: string): Promise<ProfileStats> {
  const supabase = await createClient();

  const [posts, followers, following, isFollowing, followsMe, requested, requestedMe, block] = await Promise.all([
    supabase.rpc("live_post_count", { p_user: profileId }),
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
    supabase
      .from("follow_requests")
      .select("*", { count: "exact", head: true })
      .eq("requester_id", viewerId)
      .eq("target_id", profileId),
    supabase
      .from("follow_requests")
      .select("*", { count: "exact", head: true })
      .eq("requester_id", profileId)
      .eq("target_id", viewerId),
    supabase.rpc("block_status", { p_other: profileId }),
  ]);

  return {
    posts: posts.data ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    isFollowing: (isFollowing.count ?? 0) > 0,
    followsMe: (followsMe.count ?? 0) > 0,
    requested: (requested.count ?? 0) > 0,
    requestedMe: (requestedMe.count ?? 0) > 0,
    blockStatus: (block.data as BlockStatus) ?? null,
  };
}

export type FollowState = "none" | "requested" | "following";

// Who I follow and who I've asked to follow — for lists of people.
export type Relationships = { following: Set<string>; requested: Set<string> };

export async function getRelationships(userId: string): Promise<Relationships> {
  const supabase = await createClient();
  const [{ data: f }, { data: r }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase.from("follow_requests").select("target_id").eq("requester_id", userId),
  ]);
  return {
    following: new Set((f ?? []).map((x) => x.following_id)),
    requested: new Set((r ?? []).map((x) => x.target_id)),
  };
}

export function followStateFor(rel: Relationships, id: string): FollowState {
  if (rel.following.has(id)) return "following";
  if (rel.requested.has(id)) return "requested";
  return "none";
}

// Build the id -> state map ProfileList expects.
export function statesFor(rel: Relationships, people: { id: string }[]): Record<string, FollowState> {
  const out: Record<string, FollowState> = {};
  for (const p of people) out[p.id] = followStateFor(rel, p.id);
  return out;
}

// Am I allowed to see this member's content (own, admin, or approved follower; not blocked)?
export async function canViewContentOf(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_view_content_of", { p_author: profileId });
  return data === true;
}

export async function getBlockedProfiles(userId: string): Promise<ProfileListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("profile:profiles!blocks_blocked_id_fkey(id, username, full_name, avatar_path)")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.profile).filter(Boolean) as ProfileListItem[];
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
