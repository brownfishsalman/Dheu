import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import type { BlockStatus } from "@/lib/data/profiles";
import { MESSAGE_PAGE } from "@/lib/constants";

export type ChatPeer = Pick<Profile, "id" | "username" | "full_name" | "avatar_path">;

export type ConversationSummary = {
  id: string;
  peer: ChatPeer;
  last_message_at: string | null;
  last: { body: string; sender_id: string; created_at: string; story_id: string | null; image_path: string | null } | null;
  unread: number;
};

export async function getConversations(meId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const [{ data: convs }, { data: unread }] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, last_message_at, a:profiles!conversations_user_a_fkey(id, username, full_name, avatar_path), b:profiles!conversations_user_b_fkey(id, username, full_name, avatar_path), messages(body, sender_id, created_at, story_id, image_path)",
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

export async function getConversation(
  id: string,
  meId: string,
): Promise<{ id: string; peer: ChatPeer; blocked: BlockStatus } | null> {
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
  if (!peer) return null;
  const { data: blocked } = await supabase.rpc("block_status", { p_other: peer.id });
  return { id: data.id, peer, blocked: (blocked as BlockStatus) ?? null };
}

export type ReplyPreview = { id: string; body: string; sender_id: string; image_path: string | null };

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  story_id: string | null;
  image_path: string | null;
  image_expires_at: string | null;
  reply_to_id: string | null;
  created_at: string;
  story: { image_path: string; author_id: string } | null;
  reply: ReplyPreview | null;
};

export const MESSAGE_SELECT =
  "id, conversation_id, sender_id, body, story_id, image_path, image_expires_at, reply_to_id, created_at, story:stories(image_path, author_id), reply:reply_to_id(id, body, sender_id, image_path)";


export async function getMessages(conversationId: string, before?: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  let q = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  // PostgREST types a self-referencing embed as an array; it is a single row here.
  const rows = (data ?? []).map((r) => ({
    ...r,
    reply: Array.isArray(r.reply) ? ((r.reply[0] as ReplyPreview | undefined) ?? null) : ((r.reply as ReplyPreview | null) ?? null),
  })) as unknown as ChatMessage[];
  return rows.reverse();
}
