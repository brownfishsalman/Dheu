import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data/session";
import { getHighlight } from "@/lib/data/stories";
import { StoryViewer } from "@/components/story/StoryViewer";

export async function generateMetadata(props: PageProps<"/highlights/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const h = await getHighlight(id);
  return { title: h ? h.title : "Highlight" };
}

export default async function HighlightPage(props: PageProps<"/highlights/[id]">) {
  const { id } = await props.params;
  const [me, h] = await Promise.all([requireProfile(), getHighlight(id)]);
  if (!h) notFound();

  return (
    <StoryViewer
      group={{ author: h.owner, stories: h.stories, allSeen: true, latestAt: "" }}
      viewerId={me.id}
      isOwner={me.id === h.owner.id}
      mode="highlight"
      highlight={{ id: h.id, title: h.title }}
      closeHref={`/u/${h.owner.username}`}
    />
  );
}
