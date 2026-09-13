import type { Metadata } from "next";
import { requireProfile } from "@/lib/data/session";
import { getNotifications } from "@/lib/data/notifications";
import { getRelationships, statesFor } from "@/lib/data/profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActivityList } from "@/components/activity/ActivityList";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const me = await requireProfile();
  const [items, rel] = await Promise.all([getNotifications(me.id), getRelationships(me.id)]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Activity" back="/" />
      <ActivityList items={items} states={statesFor(rel, items.map((i) => i.actor))} meId={me.id} />
    </div>
  );
}
