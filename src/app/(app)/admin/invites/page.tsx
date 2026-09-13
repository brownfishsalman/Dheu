import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteManager } from "@/components/admin/InviteManager";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Invites" };

export default async function AdminInvitesPage() {
  const admin = createAdminClient();
  const siteUrl = await getSiteUrl();
  const { data: invites } = await admin
    .from("invite_codes")
    .select("*, creator:profiles!invite_codes_created_by_fkey(username)")
    .order("created_at", { ascending: false });

  return (
    <InviteManager
      invites={(invites ?? []).map((i) => ({ ...i, creator: i.creator?.username ?? null }))}
      siteUrl={siteUrl}
    />
  );
}
