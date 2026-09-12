import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteManager } from "@/components/admin/InviteManager";

export const metadata: Metadata = { title: "Invites" };

export default async function AdminInvitesPage() {
  const admin = createAdminClient();
  const { data: invites } = await admin
    .from("invite_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <InviteManager
      invites={invites ?? []}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
