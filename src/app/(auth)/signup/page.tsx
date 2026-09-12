import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" ? sp.code : undefined;

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold">Join Dheu</h1>
      <p className="mb-5 text-sm text-ink-muted">You need an invite code from a member.</p>
      <SignupForm inviteCode={code} />
    </>
  );
}
