import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

// Verified user id from the session JWT (null when logged out).
// Wrapped in cache() so a request only checks once.
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

// The logged-in user's profile. Redirects to /login if there's no session.
export const requireProfile = cache(async (): Promise<Profile> => {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (!profile) {
    // Session exists but the profile row is missing (shouldn't happen). Log out cleanly.
    await supabase.auth.signOut();
    redirect("/login");
  }
  return profile;
});
