import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data/session";
import { getPost, getLikers } from "@/lib/data/posts";
import { getFollowingIds } from "@/lib/data/profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileList } from "@/components/profile/ProfileList";

export const metadata: Metadata = { title: "Likes" };

export default async function LikesPage(props: PageProps<"/p/[id]/likes">) {
  const { id } = await props.params;
  const [me, post] = await Promise.all([requireProfile(), getPost(id)]);
  if (!post) notFound();
  const [people, following] = await Promise.all([getLikers(post.id), getFollowingIds(me.id)]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Likes" back={`/p/${post.id}`} />
      <ProfileList people={people} viewerId={me.id} followingIds={new Set(following)} emptyText="No likes yet." />
    </div>
  );
}
