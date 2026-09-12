"use server";

import { getMessages, type ChatMessage } from "@/lib/data/chat";

export async function loadOlderMessages(conversationId: string, before: string): Promise<ChatMessage[]> {
  // RLS guarantees the caller can only read conversations they belong to.
  return getMessages(conversationId, before);
}
