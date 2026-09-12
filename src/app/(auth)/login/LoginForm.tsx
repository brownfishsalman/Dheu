"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthState } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="space-y-3.5">
      {next && <input type="hidden" name="next" value={next} />}

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
          defaultValue={state.fields?.email ?? ""}
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
          autoComplete="current-password"
          required
          className="input"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <SubmitButton pendingText="Logging in…">Log in</SubmitButton>

      <p className="pt-2 text-center text-sm text-ink-muted">
        Have an invite?{" "}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-xs text-ink-faint">
        Forgot your password? Ask the admin to reset it.
      </p>
    </form>
  );
}
