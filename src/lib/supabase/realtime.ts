import type { SupabaseClient } from "@supabase/supabase-js";

// Realtime applies Row Level Security using the token attached to the socket.
// The browser client attaches it asynchronously after loading the session, so a
// channel subscribed too early would be evaluated as an anonymous user and
// receive nothing. Call this before subscribing.
export async function ensureRealtimeAuth(supabase: SupabaseClient<never, never, never> | SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
}
