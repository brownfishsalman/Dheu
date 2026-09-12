import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export type StoryAuthor = Pick<Profile, "id" | "username" | "full_name" | "avatar_path">;

export type StoryItem = {
  id: string;
  author_id: string;
  image_path: string;
  width: number;
  height: number;
  created_at: string;
  expires_at: string;
  seen: boolean;
};

export type StoryGroup = {
  author: StoryAuthor;
  stories: StoryItem[];
  allSeen: boolean;
  latestAt: string;
};

// Active stories from me + people I follow, grouped per author for the story bar.
export async function getStoryFeed(viewerId: string, followingIds: string[]): Promise<StoryGroup[]> {
  const supabase = await createClient();
  const authorIds = [viewerId, ...followingIds];

  const { data } = await supabase
    .from("stories")
    .select(
      "id, author_id, image_path, width, height, created_at, expires_at, author:profiles!stories_author_id_fkey(id, username, full_name, avatar_path), views:story_views(viewer_id)",
    )
    .in("author_id", authorIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  const groups = new Map<string, StoryGroup>();
  for (const s of data ?? []) {
    if (!s.author) continue;
    const seen = s.views.some((v) => v.viewer_id === viewerId);
    const item: StoryItem = {
      id: s.id,
      author_id: s.author_id,
      image_path: s.image_path,
      width: s.width,
      height: s.height,
      created_at: s.created_at,
      expires_at: s.expires_at,
      seen,
    };
    const g = groups.get(s.author_id) ?? {
      author: s.author,
      stories: [],
      allSeen: true,
      latestAt: s.created_at,
    };
    g.stories.push(item);
    g.allSeen = g.allSeen && seen;
    g.latestAt = s.created_at;
    groups.set(s.author_id, g);
  }

  // Mine first, then unseen (newest first), then seen (newest first).
  return [...groups.values()].sort((a, b) => {
    if (a.author.id === viewerId) return -1;
    if (b.author.id === viewerId) return 1;
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    return b.latestAt.localeCompare(a.latestAt);
  });
}

// One author's active stories (for the full-screen viewer).
export async function getAuthorStories(authorId: string, viewerId: string): Promise<StoryGroup | null> {
  const feed = await getStoryFeed(viewerId, [authorId]);
  return feed.find((g) => g.author.id === authorId) ?? null;
}

export type HighlightSummary = {
  id: string;
  title: string;
  position: number;
  cover_path: string | null;
  count: number;
};

export async function getHighlights(ownerId: string): Promise<HighlightSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_highlights")
    .select(
      "id, title, position, cover:stories!story_highlights_cover_story_id_fkey(image_path), items:highlight_items(story_id, story:stories(image_path))",
    )
    .eq("owner_id", ownerId)
    .order("position")
    .order("created_at");

  return (data ?? []).map((h) => ({
    id: h.id,
    title: h.title,
    position: h.position,
    cover_path: h.cover?.image_path ?? h.items[0]?.story?.image_path ?? null,
    count: h.items.length,
  }));
}

export type HighlightDetail = {
  id: string;
  title: string;
  owner: StoryAuthor;
  stories: StoryItem[];
};

export async function getHighlight(highlightId: string): Promise<HighlightDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_highlights")
    .select(
      "id, title, owner:profiles!story_highlights_owner_id_fkey(id, username, full_name, avatar_path), items:highlight_items(added_at, story:stories(id, author_id, image_path, width, height, created_at, expires_at))",
    )
    .eq("id", highlightId)
    .maybeSingle();

  if (!data || !data.owner) return null;

  const stories = data.items
    .map((i) => i.story)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => ({ ...s, seen: true }));

  return { id: data.id, title: data.title, owner: data.owner, stories };
}

// All of my stories that can still be added to a highlight (active or already highlighted).
export async function getMyStoriesForHighlights(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("id, image_path, width, height, created_at, expires_at, items:highlight_items(highlight_id)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}
