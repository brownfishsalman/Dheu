import type { Metadata } from "next";
import { requireProfile } from "@/lib/data/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreateTabs } from "@/components/ui/CreateTabs";
import { NewStoryForm } from "@/components/story/NewStoryForm";

export const metadata: Metadata = { title: "New story" };

export default async function NewStoryPage() {
  const me = await requireProfile();
  return (
    <div className="mx-auto max-w-[520px]">
      <PageHeader title="Create" back="/" />
      <CreateTabs active="story" />
      <NewStoryForm userId={me.id} />
    </div>
  );
}
