"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import type { ProfileListItem } from "@/lib/data/profiles";

const DISMISS_KEY = "dheu-suggested-dismissed";
const DISMISS_FOR = 24 * 60 * 60 * 1000;

// "Suggested for you" — a horizontal strip of admin-picked members that shows
// up in the feed now and then (the server decides when; ✕ hides it for a day).
const DISMISS_EVENT = "dheu-suggested-dismiss";

function readDismissed(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < DISMISS_FOR;
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(DISMISS_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(DISMISS_EVENT, cb);
  };
}

export function SuggestedStrip({ people }: { people: ProfileListItem[] }) {
  // Hidden on the server render; the browser decides once it can read localStorage.
  const hidden = useSyncExternalStore(subscribe, readDismissed, () => true);

  if (hidden || people.length === 0) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <section className="card overflow-hidden sm:rounded-card max-sm:rounded-none max-sm:border-x-0">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold">Suggested for you</h2>
        <div className="flex items-center gap-2">
          <Link href="/explore" className="text-sm font-semibold text-brand hover:underline">
            See all
          </Link>
          <button type="button" onClick={dismiss} aria-label="Hide suggestions" className="rounded-full p-1 text-ink-faint hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      </div>
      <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-4">
        {people.map((p) => (
          <li key={p.id} className="flex w-[150px] shrink-0 flex-col items-center gap-2 rounded-xl border border-line bg-surface px-3 py-4 text-center">
            <Link href={`/u/${p.username}`}>
              <Avatar path={p.avatar_path} name={p.full_name} size={64} />
            </Link>
            <Link href={`/u/${p.username}`} className="w-full">
              <span className="block truncate text-sm font-semibold">{p.username}</span>
              <span className="block truncate text-xs text-ink-muted">{p.full_name}</span>
            </Link>
            <FollowButton targetId={p.id} initialState="none" size="sm" className="w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
