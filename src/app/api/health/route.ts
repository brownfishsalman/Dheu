import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Short fingerprint of a secret so two copies can be compared without revealing either.
const fp = (v: string | undefined) => (v ? createHash("sha256").update(v.trim()).digest("hex").slice(0, 8) : null);

// Diagnostics: which Vercel region ran this, and the round-trip time to the
// database from there. Reveals no data. Open /api/health to check.
export async function GET() {
  const t0 = Date.now();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const dbMs = Date.now() - t0;

  const t1 = Date.now();
  await admin.from("profiles").select("id", { count: "exact", head: true });
  const dbMsWarm = Date.now() - t1;

  return NextResponse.json({
    ok: !error,
    vercelRegion: process.env.VERCEL_REGION ?? "local",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    dbRoundTripMs: dbMs,
    dbRoundTripWarmMs: dbMsWarm,
    push: {
      // lengths only: a valid public key is 87 characters, a private key 43
      vapidPublicKeyLen: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length ?? 0,
      vapidPrivateKeyLen: process.env.VAPID_PRIVATE_KEY?.length ?? 0,
      vapidPublicKeyFp: fp(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      webhookSecret: fp(process.env.PUSH_WEBHOOK_SECRET),
    },
  });
}
