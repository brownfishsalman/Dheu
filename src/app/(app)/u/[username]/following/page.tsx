import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data/session";
import { getProfileByUsername, getFollowing, getFollowingIds } from "@/lib/data/profiles";
import { ProfileList } from "@/components/profile/ProfileList";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Following" };

export default async function FollowingPage(props: PageProps<"/u/[username]/following">) {
  const { username } = await props.params;
  const [me, profile] = await Promise.all([requireProfile(), getProfileByUsername(username)]);
  if (!profile) notFound();

  const [people, myFollowing] = await Promise.all([getFollowing(profile.id), getFollowingIds(me.id)]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Following" subtitle={`@${profile.username}`} back={`/u/${profile.username}`} />
      <ProfileList
        people={people}
        viewerId={me.id}
        followingIds={new Set(myFollowing)}
        emptyText="Not following anyone yet."
      />
    </div>
  );
}
