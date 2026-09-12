import type { Metadata } from "next";
import { requireProfile } from "@/lib/data/session";
import { getMyStoriesForHighlights, getHighlights } from "@/lib/data/stories";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewHighlightForm } from "@/components/story/NewHighlightForm";

export const metadata: Metadata = { title: "New highlight" };

export default async function NewHighlightPage() {
  const me = await requireProfile();
  const [stories, highlights] = await Promise.all([getMyStoriesForHighlights(me.id), getHighlights(me.id)]);

  return (
    <div className="mx-auto max-w-[520px]">
      <PageHeader title="New highlight" back={`/u/${me.username}`} />
      <NewHighlightForm
        ownerId={me.id}
        ownerUsername={me.username}
        stories={stories.map((s) => ({ id: s.id, image_path: s.image_path, created_at: s.created_at, expires_at: s.expires_at }))}
        nextPosition={highlights.length}
      />
    </div>
  );
}
