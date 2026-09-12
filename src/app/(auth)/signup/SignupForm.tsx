"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SignupForm({ inviteCode }: { inviteCode?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signup, {});
  const f = state.fields ?? {};

  return (
    <form action={action} className="space-y-3.5">
      <div>
        <label htmlFor="inviteCode" className="mb-1.5 block text-sm font-medium">
          Invite code
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="input font-mono uppercase tracking-widest"
          placeholder="e.g. WAVE-8K2P"
          defaultValue={f.inviteCode ?? inviteCode ?? ""}
        />
      </div>

      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={60}
          className="input"
          defaultValue={f.fullName ?? ""}
        />
      </div>

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-faint">
            @
          </span>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_.]{3,30}"
            title="3–30 characters: letters, numbers, dots or underscores"
            className="input pl-8"
            defaultValue={f.username ?? ""}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          defaultValue={f.email ?? ""}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
        />
        <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>

      <p className="pt-2 text-center text-sm text-ink-muted">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
