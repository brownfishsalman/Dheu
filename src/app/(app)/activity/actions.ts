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
