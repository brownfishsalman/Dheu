"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/data/session";

// Marks every unread notification of the current user as read.
export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

export async function acceptFollowRequest(requesterId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_follow_request", { p_requester: requesterId });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function declineFollowRequest(requesterId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not signed in" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_requests")
    .delete()
    .match({ requester_id: requesterId, target_id: userId });
  return error ? { ok: false, error: error.message } : { ok: true };
}
