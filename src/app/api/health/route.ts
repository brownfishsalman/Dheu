import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    dbRoundTripMs: dbMs,
    dbRoundTripWarmMs: dbMsWarm,
  });
}
