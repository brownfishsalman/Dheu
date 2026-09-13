import type { Metadata } from "next";
import Link from "next/link";
import { SquarePen } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { getConversations } from "@/lib/data/chat";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const me = await requireProfile();
  const conversations = await getConversations(me.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Messages"
        action={
          <Link href="/messages/new" aria-label="New message" className="rounded-full p-2 hover:bg-surface-2">
            <SquarePen className="size-5" />
          </Link>
        }
      />

      {conversations.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold">No messages yet</p>
          <p className="mt-1 text-sm text-ink-muted">Start a conversation with someone you follow.</p>
          <Link href="/messages/new" className="btn-primary mt-5">
            <SquarePen className="size-4" /> New message
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {conversations.map((c) => {
            const preview = c.last
              ? `${c.last.sender_id === me.id ? "You: " : ""}${c.last.story_id ? "Replied to a story: " : ""}${c.last.image_path ? "📷 Photo " : ""}${c.last.body}`
              : "No messages yet";
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                  <Avatar path={c.peer.avatar_path} name={c.peer.full_name} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${c.unread > 0 ? "font-bold" : "font-semibold"}`}>
                        {c.peer.full_name}
                      </span>
                      {c.last && <span className="shrink-0 text-xs text-ink-faint">{timeAgo(c.last.created_at)}</span>}
                    </span>
                    <span
                      className={`block truncate text-sm ${c.unread > 0 ? "font-semibold text-ink" : "text-ink-muted"}`}
                    >
                      {preview}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-brand-ink">
                      {c.unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
