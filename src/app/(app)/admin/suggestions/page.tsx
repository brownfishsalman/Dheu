import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllSuggestions } from "@/lib/data/profiles";
import { SuggestionManager } from "@/components/admin/SuggestionManager";

export const metadata: Metadata = { title: "Suggestions" };

export default async function AdminSuggestionsPage() {
  const admin = createAdminClient();
  const [suggested, { data: members }] = await Promise.all([
    getAllSuggestions(),
    admin.from("profiles").select("id, username, full_name, avatar_path").is("banned_at", null).order("username"),
  ]);
  return <SuggestionManager suggested={suggested} members={members ?? []} />;
}
