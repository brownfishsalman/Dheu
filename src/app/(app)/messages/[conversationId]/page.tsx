import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/data/session";
import { getConversation, getMessages } from "@/lib/data/chat";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ChatThread } from "@/components/chat/ChatThread";

export async function generateMetadata(props: PageProps<"/messages/[conversationId]">): Promise<Metadata> {
  const { conversationId } = await props.params;
  const me = await requireProfile();
  const conv = await getConversation(conversationId, me.id);
  return { title: conv ? conv.peer.full_name : "Messages" };
}

export default async function ConversationPage(props: PageProps<"/messages/[conversationId]">) {
  const { conversationId } = await props.params;
  const me = await requireProfile();
  const conv = await getConversation(conversationId, me.id);
  if (!conv) notFound();
  const messages = await getMessages(conv.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <PageHeader
        title={conv.peer.full_name}
        subtitle={`@${conv.peer.username}`}
        back="/messages"
        action={
          <Link href={`/u/${conv.peer.username}`} className="mr-1">
            <Avatar path={conv.peer.avatar_path} name={conv.peer.full_name} size={34} />
          </Link>
        }
      />
      <ChatThread conversationId={conv.id} meId={me.id} peer={conv.peer} initialMessages={messages} />
    </div>
  );
}
