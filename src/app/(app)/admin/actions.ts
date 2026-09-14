"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true; message?: string; secret?: string } | { ok: false; error: string };

async function assertAdmin() {
  const me = await requireProfile();
  if (!me.is_admin) throw new Error("Not allowed");
  return me;
}

// Readable, unambiguous invite codes like "WAVE-7K3P-Q2MD".
function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `WAVE-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

const createInviteSchema = z.object({
  note: z.string().trim().max(80).default(""),
  maxUses: z.coerce.number().int().min(1).max(500).default(1),
  expiresDays: z.coerce.number().int().min(0).max(365).default(0),
});

export async function createInvite(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await assertAdmin();
  const parsed = createInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { note, maxUses, expiresDays } = parsed.data;

  const admin = createAdminClient();
  const expires_at = expiresDays > 0 ? new Date(Date.now() + expiresDays * 86_400_000).toISOString() : null;

  // Retry on the (astronomically unlikely) code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const { error } = await admin
      .from("invite_codes")
      .insert({ code, note, max_uses: maxUses, expires_at, created_by: me.id });
    if (!error) {
      revalidatePath("/admin/invites");
      return { ok: true, message: `Created ${code}` };
    }
    if (error.code !== "23505") return { ok: false, error: error.message };
  }
  return { ok: false, error: "Couldn't generate a unique code. Try again." };
}

export async function setInviteDisabled(id: string, disabled: boolean): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("invite_codes").update({ disabled }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/invites");
  return { ok: true };
}

export async function deleteInvite(id: string): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("invite_codes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/invites");
  return { ok: true };
}

export async function setBanned(userId: string, banned: boolean): Promise<ActionResult> {
  const me = await assertAdmin();
  if (userId === me.id) return { ok: false, error: "You can't ban yourself." };
  const admin = createAdminClient();

  // Blocks login / token refresh at the auth layer ("none" lifts the ban).
  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (authErr) return { ok: false, error: authErr.message };

  const { error } = await admin
    .from("profiles")
    .update({ banned_at: banned ? new Date().toISOString() : null })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/members");
  return { ok: true, message: banned ? "Member suspended." : "Member reinstated." };
}

export async function resetPassword(userId: string): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const temp = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");

  const { error } = await admin.auth.admin.updateUserById(userId, { password: temp });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Temporary password set. Share it privately; they should change it in Settings.", secret: temp };
}

export async function deleteMember(userId: string): Promise<ActionResult> {
  const me = await assertAdmin();
  if (userId === me.id) return { ok: false, error: "You can't delete yourself." };
  const admin = createAdminClient();

  // Remove their files first (rows cascade when the auth user is deleted).
  for (const bucket of ["avatars", "posts", "stories", "chat"] as const) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (files && files.length > 0) {
      await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  return { ok: true, message: "Member deleted." };
}

export async function adminDeletePost(postId: string): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: images } = await admin.from("post_images").select("path").eq("post_id", postId);
  if (images && images.length > 0) {
    await admin.storage.from("posts").remove(images.map((i) => i.path));
  }
  const { error } = await admin.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/content");
  return { ok: true, message: "Post deleted." };
}

export async function adminDeleteStory(storyId: string): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: story } = await admin.from("stories").select("image_path").eq("id", storyId).maybeSingle();
  if (story) await admin.storage.from("stories").remove([story.image_path]);
  const { error } = await admin.from("stories").delete().eq("id", storyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/content");
  return { ok: true, message: "Story deleted." };
}

export async function addSuggestion(userId: string): Promise<ActionResult> {
  const me = await assertAdmin();
  const admin = createAdminClient();
  const { data: max } = await admin.from("suggested_people").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await admin
    .from("suggested_people")
    .upsert({ user_id: userId, position: (max?.position ?? -1) + 1, added_by: me.id }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/suggestions");
  return { ok: true };
}

export async function removeSuggestion(userId: string): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("suggested_people").delete().eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/suggestions");
  return { ok: true };
}

export async function moveSuggestion(userId: string, direction: -1 | 1): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: rows } = await admin.from("suggested_people").select("user_id, position").order("position");
  if (!rows) return { ok: false, error: "Couldn't load suggestions." };
  const i = rows.findIndex((r) => r.user_id === userId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  const order = rows.map((r) => r.user_id);
  [order[i], order[j]] = [order[j], order[i]];
  for (let k = 0; k < order.length; k++) {
    await admin.from("suggested_people").update({ position: k }).eq("user_id", order[k]);
  }
  revalidatePath("/admin/suggestions");
  return { ok: true };
}
