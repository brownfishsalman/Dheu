import "server-only";
import { createClient } from "@/lib/supabase/server";

// Unread chat (incl. announcements) + activity counts, fetched in parallel for the app shell.
export async function getBadgeCounts(userId: string): Promise<{ messages: number; activity: number }> {
  const supabase = await createClient();
  const [{ data: unread }, { data: ann }, { count }] = await Promise.all([
    supabase.rpc("unread_counts"),
    supabase.rpc("unread_announcement_count"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  return {
    messages: (unread ?? []).reduce((sum, row) => sum + Number(row.unread), 0) + (ann ?? 0),
    activity: count ?? 0,
  };
}
