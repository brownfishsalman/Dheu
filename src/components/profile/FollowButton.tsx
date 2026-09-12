"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  targetId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function FollowButton({ targetId, initialFollowing, size = "md", className = "" }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const next = !following;
    setFollowing(next); // optimistic

    const { error } = next
      ? await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId })
      : await supabase.from("follows").delete().match({ follower_id: user.id, following_id: targetId });

    if (error) {
      setFollowing(!next);
      return;
    }
    startTransition(() => router.refresh());
  }

  const sizing = size === "sm" ? "px-3 py-1.5 text-sm" : "";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`${following ? "btn-secondary" : "btn-primary"} ${sizing} ${className}`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
