"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";

type Counts = { messages: number; activity: number };

const BadgeContext = createContext<Counts & { refresh: () => void }>({
  messages: 0,
  activity: 0,
  refresh: () => {},
});

export const useBadges = () => useContext(BadgeContext);

// Fired by the Activity page once it has marked everything as read.
export const ACTIVITY_READ_EVENT = "dheu-activity-read";
export const BADGES_REFRESH_EVENT = "dheu-badges-refresh";

// One place that knows the unread counts for chat and activity. Fetches them
// once per navigation and keeps a single realtime channel open, so the several
// badges in the sidebar / tab bar / header cost nothing extra.
export function BadgeProvider({
  userId,
  initial,
  children,
}: {
  userId: string;
  initial: Counts;
  children: React.ReactNode;
}) {
  const [counts, setCounts] = useState<Counts>(initial);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [{ data: unread }, { data: ann }, { count }] = await Promise.all([
      supabase.rpc("unread_counts"),
      supabase.rpc("unread_announcement_count"),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    ]);
    setCounts({
      messages: (unread ?? []).reduce((sum, row) => sum + Number(row.unread), 0) + (ann ?? 0),
      activity: count ?? 0,
    });
  }, [userId]);

  // Re-check after every navigation (e.g. leaving a chat marks it read).
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return; // initial counts came from the server
    refresh();
  }, [pathname, refresh]);

  // Live updates + the "I've read my activity" signal.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    window.addEventListener(ACTIVITY_READ_EVENT, refresh);
    window.addEventListener(BADGES_REFRESH_EVENT, refresh);

    const channel = supabase
      .channel(`badges:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => refresh())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, () => refresh());
    ensureRealtimeAuth(supabase).then(() => {
      if (!cancelled) channel.subscribe();
    });

    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVITY_READ_EVENT, refresh);
      window.removeEventListener(BADGES_REFRESH_EVENT, refresh);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return <BadgeContext.Provider value={{ ...counts, refresh }}>{children}</BadgeContext.Provider>;
}

function Pill({ count, color, className, label }: { count: number; color: string; className: string; label: string }) {
  if (count === 0) return null;
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none ring-2 ring-surface ${color} ${className}`}
      aria-label={label}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function UnreadBadge({ className = "" }: { className?: string }) {
  const { messages } = useBadges();
  return <Pill count={messages} color="bg-brand text-brand-ink" className={className} label={`${messages} unread messages`} />;
}

export function ActivityBadge({ className = "" }: { className?: string }) {
  const { activity } = useBadges();
  return <Pill count={activity} color="bg-like text-white" className={className} label={`${activity} new notifications`} />;
}
