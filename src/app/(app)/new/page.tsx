import type { Metadata } from "next";
import { requireProfile } from "@/lib/data/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreateTabs } from "@/components/ui/CreateTabs";
import { NewPostForm } from "@/components/post/NewPostForm";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const me = await requireProfile();
  return (
    <div className="mx-auto max-w-[520px]">
      <PageHeader title="Create" back="/" />
      <CreateTabs active="post" />
      <NewPostForm userId={me.id} />
    </div>
  );
}
