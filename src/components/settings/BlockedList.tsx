"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import type { ProfileListItem } from "@/lib/data/profiles";

export function BlockedList({ people, meId }: { people: ProfileListItem[]; meId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function unblock(id: string) {
    setBusy(id);
    const { error } = await createClient().from("blocks").delete().match({ blocker_id: meId, blocked_id: id });
    setBusy(null);
    if (error) return alert(error.message);
    startTransition(() => router.refresh());
  }

  if (people.length === 0) return <p className="text-sm text-ink-muted">You haven&apos;t blocked anyone.</p>;

  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
          <Link href={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar path={p.avatar_path} name={p.full_name} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{p.username}</span>
              <span className="block truncate text-sm text-ink-muted">{p.full_name}</span>
            </span>
          </Link>
          <button type="button" onClick={() => unblock(p.id)} disabled={busy === p.id} className="btn-secondary px-3 py-1.5 text-sm">
            {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : "Unblock"}
          </button>
        </li>
      ))}
    </ul>
  );
}
