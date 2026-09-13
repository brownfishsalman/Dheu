import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { getAnnouncements } from "@/lib/data/chat";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnnouncementsThread } from "@/components/chat/AnnouncementsThread";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const me = await requireProfile();
  const items = await getAnnouncements();

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <PageHeader
        title="Dheu announcements"
        subtitle={me.is_admin ? "You are posting as admin" : "From the admin"}
        back="/messages"
        action={<Megaphone className="mr-2 size-5 text-brand" />}
      />
      <AnnouncementsThread initial={items} meId={me.id} isAdmin={me.is_admin} />
    </div>
  );
}
