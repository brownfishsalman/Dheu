import "server-only";
import { headers } from "next/headers";

// The public origin of the site (e.g. https://dheu-beige.vercel.app), taken
// from the incoming request so it stays correct on any domain. Falls back to
// NEXT_PUBLIC_SITE_URL, then localhost.
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
