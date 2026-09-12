import type { Metadata } from "next";
import { requireProfile } from "@/lib/data/session";
import { getNotifications } from "@/lib/data/notifications";
import { getFollowingIds } from "@/lib/data/profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActivityList } from "@/components/activity/ActivityList";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const me = await requireProfile();
  const [items, following] = await Promise.all([getNotifications(me.id), getFollowingIds(me.id)]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Activity" back="/" />
      <ActivityList items={items} followingIds={following} meId={me.id} />
    </div>
  );
}
