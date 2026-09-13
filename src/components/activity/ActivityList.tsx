"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, UserPlus, Smile, UserCheck, Check, X, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { publicUrl } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import { markAllNotificationsRead, acceptFollowRequest, declineFollowRequest } from "@/app/(app)/activity/actions";
import { ACTIVITY_READ_EVENT } from "@/components/nav/BadgeProvider";
import type { NotificationItem } from "@/lib/data/notifications";
import type { FollowState } from "@/lib/data/profiles";

type Props = { items: NotificationItem[]; states: Record<string, FollowState>; meId: string };

const DAY = 86_400_000;

function bucket(iso: string, now: number): "Today" | "This week" | "Earlier" {
  const age = now - new Date(iso).getTime();
  if (age < DAY) return "Today";
  if (age < 7 * DAY) return "This week";
  return "Earlier";
}

export function ActivityList({ items, states, meId }: Props) {
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
          Follow requests, likes, comments and story reactions will show up here.
        </p>
      </div>
    );
  }

  // Pending follow requests always sit at the top, whatever their age.
  const requests = items.filter((i) => i.type === "follow_request");
  const rest = items.filter((i) => i.type !== "follow_request");

  const groups: { title: string; rows: NotificationItem[] }[] = [];
  if (requests.length) groups.push({ title: "Follow requests", rows: requests });
  const unread = rest.filter((i) => i.read_at === null);
  if (unread.length) groups.push({ title: "New", rows: unread });
  for (const title of ["Today", "This week", "Earlier"] as const) {
    const rows = rest.filter((i) => i.read_at !== null && bucket(i.created_at, now) === title);
    if (rows.length) groups.push({ title, rows });
  }

  return (
    <div>
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="px-4 pt-4 pb-1 text-xs font-semibold tracking-widest text-ink-muted uppercase">{g.title}</h2>
          <ul>
            {g.rows.map((n) => (
              <Row key={n.id} n={n} state={states[n.actor.id] ?? "none"} meId={meId} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RequestButtons({ requesterId }: { requesterId: string }) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function go(kind: "accept" | "decline") {
    setBusy(kind);
    const r = kind === "accept" ? await acceptFollowRequest(requesterId) : await declineFollowRequest(requesterId);
    setBusy(null);
    if (!r.ok) return alert(r.error);
    setDone(kind === "accept" ? "accepted" : "declined");
    startTransition(() => router.refresh());
  }

  if (done) return <span className="text-xs text-ink-faint">{done === "accepted" ? "Accepted" : "Declined"}</span>;
  return (
    <span className="flex items-center gap-1.5">
      <button type="button" onClick={() => go("accept")} disabled={busy !== null} className="btn-primary px-3 py-1.5 text-sm">
        {busy === "accept" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Accept
      </button>
      <button type="button" onClick={() => go("decline")} disabled={busy !== null} aria-label="Decline" className="btn-secondary px-2.5 py-1.5 text-sm">
        {busy === "decline" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      </button>
    </span>
  );
}

function Row({ n, state, meId }: { n: NotificationItem; state: FollowState; meId: string }) {
  // Where the thumbnail leads: my post, or my own story (reactions are on my stories).
  const href = n.type === "story_reaction" ? `/stories/${meId}` : n.post_id ? `/p/${n.post_id}` : "#";

  const text =
    n.type === "like" ? (
      <>liked your post.</>
    ) : n.type === "follow" ? (
      <>started following you.</>
    ) : n.type === "follow_request" ? (
      <>wants to follow you.</>
    ) : n.type === "follow_accepted" ? (
      <>accepted your follow request.</>
    ) : n.type === "comment" ? (
      <>
        commented: <span className="text-ink-muted">{n.commentBody ?? "…"}</span>
      </>
    ) : (
      <>reacted to your story.</>
    );

  const Icon =
    n.type === "like"
      ? Heart
      : n.type === "follow" || n.type === "follow_request"
        ? UserPlus
        : n.type === "follow_accepted"
          ? UserCheck
          : n.type === "comment"
            ? MessageCircle
            : Smile;

  const thumbSrc = n.thumb ? publicUrl(n.thumbBucket, n.thumb) : null;
  const social = n.type === "follow" || n.type === "follow_request" || n.type === "follow_accepted";
  const gone = !social && !n.thumb;

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

      {n.type === "follow_request" ? (
        <RequestButtons requesterId={n.actor.id} />
      ) : social ? (
        <FollowButton targetId={n.actor.id} initialState={state} size="sm" />
      ) : gone ? (
        <span className="w-12 text-center text-[10px] leading-tight text-ink-faint">no longer available</span>
      ) : (
        <Link href={href} className="block size-12 shrink-0 overflow-hidden rounded-md bg-surface-2" aria-label="Open">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {thumbSrc && <img src={thumbSrc} alt="" className="h-full w-full object-cover" loading="lazy" />}
        </Link>
      )}
    </li>
  );
}
