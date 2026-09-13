import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data/session";
import { getProfileByUsername, getFollowers, getRelationships, statesFor, canViewContentOf } from "@/lib/data/profiles";
import { ProfileList } from "@/components/profile/ProfileList";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Followers" };

export default async function FollowersPage(props: PageProps<"/u/[username]/followers">) {
  const { username } = await props.params;
  const [me, profile] = await Promise.all([requireProfile(), getProfileByUsername(username)]);
  if (!profile) notFound();

  if (!(await canViewContentOf(profile.id))) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Followers" subtitle={`@${profile.username}`} back={`/u/${profile.username}`} />
        <p className="px-6 py-16 text-center text-sm text-ink-muted">This account is private.</p>
      </div>
    );
  }
  const [people, rel] = await Promise.all([getFollowers(profile.id), getRelationships(me.id)]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Followers" subtitle={`@${profile.username}`} back={`/u/${profile.username}`} />
      <ProfileList
        people={people}
        viewerId={me.id}
        states={statesFor(rel, people)}
        emptyText="No followers yet."
      />
    </div>
  );
}
