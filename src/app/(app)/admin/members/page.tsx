import type { Metadata } from "next";
import { requireProfile } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberManager } from "@/components/admin/MemberManager";

export const metadata: Metadata = { title: "Members" };

export default async function AdminMembersPage() {
  const me = await requireProfile();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: users }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailBy = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? null]));
  const members = (profiles ?? []).map((p) => ({ ...p, email: emailBy.get(p.id) ?? null }));

  return <MemberManager members={members} meId={me.id} />;
}
