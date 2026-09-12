"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, UserPlus, Smile } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { publicUrl } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import { markAllNotificationsRead } from "@/app/(app)/activity/actions";
import { ACTIVITY_READ_EVENT } from "@/components/nav/BadgeProvider";
import type { NotificationItem } from "@/lib/data/notifications";

type Props = { items: NotificationItem[]; followingIds: string[]; meId: string };

const DAY = 86_400_000;

function bucket(iso: string, now: number): "Today" | "This week" | "Earlier" {
  const age = now - new Date(iso).getTime();
  if (age < DAY) return "Today";
  if (age < 7 * DAY) return "This week";
  return "Earlier";
}

export function ActivityList({ items, followingIds, meId }: Props) {
  const [now] = useState(() => Date.now());

  // Opening the page clears the badge; the "New" section still shows this visit's unread items.
  useEffect(() => {
    if (!items.some((i) => i.read_at === null)) return;
    markAllNotificationsRead().then(() => window.dispatchEvent(new Event(ACTIVITY_READ_EVENT)));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <Heart className="mx-auto mb-3 size-10 text-ink-faint" strokeWidth={1.5} />
        <p className="font-display text-lg font-semibold">Nothing yet</p>
        <p className="mt-1 text-sm text-ink-muted">
          When someone likes or comments on your posts, follows you, or reacts to your story, it shows up here.
        </p>
      </div>
    );
  }

  const following = new Set(followingIds);
  const groups: { title: string; rows: NotificationItem[] }[] = [];
  const unread = items.filter((i) => i.read_at === null);
  if (unread.length) groups.push({ title: "New", rows: unread });
  for (const title of ["Today", "This week", "Earlier"] as const) {
    const rows = items.filter((i) => i.read_at !== null && bucket(i.created_at, now) === title);
    if (rows.length) groups.push({ title, rows });
  }

  return (
    <div>
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="px-4 pt-4 pb-1 text-xs font-semibold tracking-widest text-ink-muted uppercase">{g.title}</h2>
          <ul>
            {g.rows.map((n) => (
              <Row key={n.id} n={n} isFollowing={following.has(n.actor.id)} meId={meId} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ n, isFollowing, meId }: { n: NotificationItem; isFollowing: boolean; meId: string }) {
  // Where the thumbnail leads: my post, or my own story (reactions are on my stories).
  const href = n.type === "story_reaction" ? `/stories/${meId}` : n.post_id ? `/p/${n.post_id}` : "#";

  const text =
    n.type === "like" ? (
      <>liked your post.</>
    ) : n.type === "follow" ? (
      <>started following you.</>
    ) : n.type === "comment" ? (
      <>
        commented: <span className="text-ink-muted">{n.commentBody ?? "…"}</span>
      </>
    ) : (
      <>reacted to your story.</>
    );

  const Icon =
    n.type === "like" ? Heart : n.type === "follow" ? UserPlus : n.type === "comment" ? MessageCircle : Smile;

  const thumbSrc = n.thumb ? publicUrl(n.thumbBucket, n.thumb) : null;
  const gone = n.type !== "follow" && !n.thumb;

  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${n.read_at === null ? "bg-brand-soft/40" : ""}`}>
      <Link href={`/u/${n.actor.username}`} className="relative shrink-0">
        <Avatar path={n.actor.avatar_path} name={n.actor.full_name} size={44} />
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-surface text-brand ring-1 ring-line">
          <Icon className={`size-3 ${n.type === "like" ? "fill-like text-like" : ""}`} />
        </span>
      </Link>

      <p className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-snug">
        <Link href={`/u/${n.actor.username}`} className="mr-1 font-semibold">
          {n.actor.username}
        </Link>
        {text}
        <span className="ml-1.5 text-xs text-ink-faint">{timeAgo(n.created_at)}</span>
      </p>

      {n.type === "follow" ? (
        <FollowButton targetId={n.actor.id} initialFollowing={isFollowing} size="sm" />
      ) : gone ? (
        <span className="w-12 text-center text-[10px] leading-tight text-ink-faint">no longer available</span>
      ) : (
        <Link
          href={href}
          className="block size-12 shrink-0 overflow-hidden rounded-md bg-surface-2"
          aria-label="Open"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thumbSrc && <img src={thumbSrc} alt="" className="h-full w-full object-cover" loading="lazy" />}
        </Link>
      )}
    </li>
  );
}
