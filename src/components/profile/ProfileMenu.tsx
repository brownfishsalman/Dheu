"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Ban, ShieldOff, UserMinus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  targetId: string;
  username: string;
  blockedByMe: boolean;
  followsMe: boolean;
};

// "…" menu on another member's profile: block / unblock, remove follower.
export function ProfileMenu({ targetId, username, blockedByMe, followsMe }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function run(fn: () => Promise<{ error: { message: string } | null }>) {
    setOpen(false);
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return alert(error.message);
    startTransition(() => router.refresh());
  }

  async function me() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, id: user!.id };
  }

  const block = () =>
    confirm(
      `Block ${username}? You won't see each other's posts, stories or messages, and any follows between you are removed.`,
    ) &&
    run(async () => {
      const { supabase, id } = await me();
      return supabase.from("blocks").insert({ blocker_id: id, blocked_id: targetId });
    });

  const unblock = () =>
    run(async () => {
      const { supabase, id } = await me();
      return supabase.from("blocks").delete().match({ blocker_id: id, blocked_id: targetId });
    });

  const removeFollower = () =>
    confirm(`Remove ${username} from your followers? They'll have to request to follow you again.`) &&
    run(async () => {
      const { supabase, id } = await me();
      return supabase.from("follows").delete().match({ follower_id: targetId, following_id: id });
    });

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More options"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="rounded-full p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <MoreHorizontal className="size-5" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-card">
            {followsMe && !blockedByMe && (
              <button type="button" onClick={removeFollower} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-surface-2">
                <UserMinus className="size-4" /> Remove follower
              </button>
            )}
            {blockedByMe ? (
              <button type="button" onClick={unblock} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-surface-2">
                <ShieldOff className="size-4" /> Unblock
              </button>
            ) : (
              <button type="button" onClick={block} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger hover:bg-surface-2">
                <Ban className="size-4" /> Block
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
