import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on every page route. Static assets and /api/* are excluded
  // (API routes authenticate themselves).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|brand/|manifest.webmanifest|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
