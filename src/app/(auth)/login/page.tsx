import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const created = sp.created === "1";

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold">Welcome back</h1>
      <p className="mb-5 text-sm text-ink-muted">Log in to catch up with everyone.</p>
      {created && (
        <p className="mb-4 rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm text-brand-strong">
          Your account is ready — log in to continue.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}
