"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";

import { MEMBER_INVITE_LIMIT } from "@/lib/constants";

const MEMBER_INVITE_DAYS = 30;

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `WAVE-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

// A member creates a single-use invite code for a friend.
export async function createMyInviteCode(): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("banned_at").eq("id", userId).single();
  if (!profile || profile.banned_at) return { ok: false, error: "Not allowed." };

  const { count } = await admin
    .from("invite_codes")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .eq("disabled", false)
    .eq("use_count", 0)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  if ((count ?? 0) >= MEMBER_INVITE_LIMIT) {
    return { ok: false, error: `You can hold up to ${MEMBER_INVITE_LIMIT} unused codes at a time. Share those first.` };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("invite_codes").insert({
      code,
      note: "member invite",
      max_uses: 1,
      expires_at: new Date(Date.now() + MEMBER_INVITE_DAYS * 86_400_000).toISOString(),
      created_by: userId,
    });
    if (!error) {
      revalidatePath("/settings");
      return { ok: true, code };
    }
    if (error.code !== "23505") return { ok: false, error: error.message };
  }
  return { ok: false, error: "Couldn't generate a code. Try again." };
}
