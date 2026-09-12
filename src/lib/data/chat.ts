import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { MESSAGE_PAGE } from "@/lib/constants";

export type ChatPeer = Pick<Profile, "id" | "username" | "full_name" | "avatar_path">;

export type ConversationSummary = {
  id: string;
  peer: ChatPeer;
  last_message_at: string | null;
  last: { body: string; sender_id: string; created_at: string; story_id: string | null } | null;
  unread: number;
};

export async function getConversations(meId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const [{ data: convs }, { data: unread }] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, last_message_at, a:profiles!conversations_user_a_fkey(id, username, full_name, avatar_path), b:profiles!conversations_user_b_fkey(id, username, full_name, avatar_path), messages(body, sender_id, created_at, story_id)",
      )
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { referencedTable: "messages", ascending: false })
      .limit(1, { referencedTable: "messages" }),
    supabase.rpc("unread_counts"),
  ]);

  const unreadBy = new Map((unread ?? []).map((u) => [u.conversation_id, Number(u.unread)]));

  const out: ConversationSummary[] = [];
  for (const c of convs ?? []) {
    const peer = c.a?.id === meId ? c.b : c.a;
    if (!peer) continue;
    out.push({
      id: c.id,
      peer,
      last_message_at: c.last_message_at,
      last: c.messages[0] ?? null,
      unread: unreadBy.get(c.id) ?? 0,
    });
  }
  return out;
}

export async function getConversation(id: string, meId: string): Promise<{ id: string; peer: ChatPeer } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, a:profiles!conversations_user_a_fkey(id, username, full_name, avatar_path), b:profiles!conversations_user_b_fkey(id, username, full_name, avatar_path)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const peer = data.a?.id === meId ? data.b : data.a;
  return peer ? { id: data.id, peer } : null;
}

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  story_id: string | null;
  created_at: string;
  story: { image_path: string; author_id: string } | null;
};


export async function getMessages(conversationId: string, before?: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  let q = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, story_id, created_at, story:stories(image_path, author_id)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  return ((data ?? []) as ChatMessage[]).reverse();
}
