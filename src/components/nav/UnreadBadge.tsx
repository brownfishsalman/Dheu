"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Small dot/count showing unread chat messages. Refreshes on navigation and
// whenever a new message arrives over realtime.
export function UnreadBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase.rpc("unread_counts");
      if (cancelled || !data) return;
      setCount(data.reduce((sum, row) => sum + Number(row.unread), 0));
    }

    refresh();

    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refresh())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  if (count === 0) return null;

  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold leading-none text-brand-ink ring-2 ring-surface ${className}`}
      aria-label={`${count} unread messages`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
