"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { FollowState } from "@/lib/data/profiles";

type Props = {
  targetId: string;
  initialState: FollowState;
  size?: "sm" | "md";
  className?: string;
};

// All accounts are private: Follow sends a request, which the other person
// accepts from their Activity page. Requested → tap again to cancel.
export function FollowButton({ targetId, initialState, size = "md", className = "" }: Props) {
  const [state, setState] = useState<FollowState>(initialState);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function act() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const prev = state;
    let error: { message: string } | null = null;

    if (state === "none") {
      setState("requested");
      ({ error } = await supabase.from("follow_requests").insert({ requester_id: user.id, target_id: targetId }));
    } else if (state === "requested") {
      setState("none");
      ({ error } = await supabase.from("follow_requests").delete().match({ requester_id: user.id, target_id: targetId }));
    } else {
      if (!confirm("Unfollow? You'll need to send a new request to follow them again.")) return;
      setState("none");
      ({ error } = await supabase.from("follows").delete().match({ follower_id: user.id, following_id: targetId }));
    }

    if (error) {
      setState(prev);
      return;
    }
    startTransition(() => router.refresh());
  }

  const sizing = size === "sm" ? "px-3 py-1.5 text-sm" : "";
  const look = state === "none" ? "btn-primary" : "btn-secondary";
  const label = state === "none" ? "Follow" : state === "requested" ? "Requested" : "Following";

  return (
    <button type="button" onClick={act} disabled={pending} className={`${look} ${sizing} ${className}`}>
      {label}
    </button>
  );
}
