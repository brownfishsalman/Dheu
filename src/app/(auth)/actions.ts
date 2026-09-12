"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthState = {
  error?: string;
  fields?: Record<string, string>;
};

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(60, "Name is too long"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_RE, "3–30 characters: letters, numbers, dots or underscores"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(72, "Password is too long"),
  inviteCode: z.string().trim().toUpperCase(),
});

function fieldsOf(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && k !== "password") out[k] = v;
  }
  return out;
}

function safeNext(next: string | undefined): string {
  // Only allow same-site relative paths to prevent open redirects.
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, fields: fieldsOf(formData) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = /banned/i.test(error.message)
      ? "This account has been suspended."
      : "Wrong email or password.";
    return { error: msg, fields: fieldsOf(formData) };
  }

  redirect(safeNext(parsed.data.next));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, fields: fieldsOf(formData) };
  }
  const { fullName, username, email, password, inviteCode } = parsed.data;

  const admin = createAdminClient();

  // The very first account on a fresh platform needs no invite (it becomes admin).
  const { count, error: countError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (countError) {
    return { error: "Something went wrong. Please try again.", fields: fieldsOf(formData) };
  }
  const isFirstUser = (count ?? 0) === 0;

  if (!isFirstUser && !inviteCode) {
    return { error: "An invite code is required to join.", fields: fieldsOf(formData) };
  }

  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) {
    return { error: "That username is already taken.", fields: fieldsOf(formData) };
  }

  let inviteCodeId: string | null = null;
  if (!isFirstUser) {
    const { data, error } = await admin.rpc("claim_invite_code", { p_code: inviteCode });
    if (error || !data) {
      const reason = error?.message ?? "";
      const msg = reason.includes("INVITE_USED_UP")
        ? "That invite code has already been used."
        : reason.includes("INVITE_EXPIRED")
          ? "That invite code has expired."
          : reason.includes("INVITE_DISABLED")
            ? "That invite code is no longer active."
            : "That invite code isn't valid.";
      return { error: msg, fields: fieldsOf(formData) };
    }
    inviteCodeId = data;
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName, invite_code_id: inviteCodeId },
  });

  if (createError) {
    if (inviteCodeId) await admin.rpc("release_invite_code", { p_id: inviteCodeId });
    const msg = /already|exists|registered/i.test(createError.message)
      ? "An account with this email already exists."
      : /username|profiles_username/i.test(createError.message)
        ? "That username is already taken."
        : "Could not create your account. Please try again.";
    return { error: msg, fields: fieldsOf(formData) };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // Account exists now; send them to log in manually.
    redirect("/login?created=1");
  }

  redirect("/");
}
