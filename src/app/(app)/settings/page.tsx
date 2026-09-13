import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { getBlockedProfiles } from "@/lib/data/profiles";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_INVITE_LIMIT } from "@/lib/constants";
import { ShareWithFriends } from "@/components/settings/ShareWithFriends";
import { BlockedList } from "@/components/settings/BlockedList";
import { PageHeader } from "@/components/ui/PageHeader";
import { EditProfileForm } from "@/components/settings/EditProfileForm";
import { ThemePicker, ChangePasswordForm } from "@/components/settings/AccountSettings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [siteUrl, blocked, { data: myCodes }] = await Promise.all([
    getSiteUrl(),
    getBlockedProfiles(profile.id),
    supabase.from("invite_codes").select("*").eq("created_by", profile.id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" back={`/u/${profile.username}`} />

      <div className="space-y-6 px-4 py-6">
        <section className="card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Profile</h2>
          <EditProfileForm profile={profile} />
        </section>

        <section className="card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Share with friends</h2>
          <ShareWithFriends codes={myCodes ?? []} siteUrl={siteUrl} limit={MEMBER_INVITE_LIMIT} />
        </section>

        <section className="card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Appearance</h2>
          <p className="mb-3 text-sm text-ink-muted">Choose how Dheu looks on this device.</p>
          <ThemePicker />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Password</h2>
          <ChangePasswordForm />
        </section>

        <section className="card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Blocked accounts</h2>
          <p className="mb-3 text-sm text-ink-muted">Blocked members can&apos;t see your photos or message you, and you won&apos;t see theirs.</p>
          <BlockedList people={blocked} meId={profile.id} />
        </section>

        {profile.is_admin && (
          <section className="card p-5">
            <h2 className="mb-1 font-display text-lg font-semibold">Admin</h2>
            <p className="mb-3 text-sm text-ink-muted">Invite codes, members and moderation.</p>
            <Link href="/admin" className="btn-secondary">
              <Shield className="size-4" /> Open admin panel
            </Link>
          </section>
        )}

        <form action="/auth/signout" method="post" className="pt-2">
          <button type="submit" className="btn-danger w-full">
            <LogOut className="size-4" /> Log out
          </button>
        </form>

        <p className="text-center text-xs text-ink-faint">
          Dheu · posts expire after 30 days · stories after 24 hours
        </p>
      </div>
    </div>
  );
}
