"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";

// Fired by the Activity page once it has marked everything as read.
export const ACTIVITY_READ_EVENT = "dheu-activity-read";

// Unread count for likes / follows / comments / story reactions.
export function ActivityBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const channelName = `activity-badge-${useId()}`;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (!cancelled) setCount(count ?? 0);
    }

    refresh();
    window.addEventListener(ACTIVITY_READ_EVENT, refresh);

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => refresh())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, () => refresh());
    ensureRealtimeAuth(supabase).then(() => {
      if (!cancelled) channel.subscribe();
    });

    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVITY_READ_EVENT, refresh);
      supabase.removeChannel(channel);
    };
  }, [pathname, channelName]);

  if (count === 0) return null;

  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-like px-1 text-[11px] font-bold leading-none text-white ring-2 ring-surface ${className}`}
      aria-label={`${count} new notifications`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
