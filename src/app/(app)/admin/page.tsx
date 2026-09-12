import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin" };

type Stats = {
  members: number;
  banned: number;
  live_posts: number;
  expired_posts: number;
  live_stories: number;
  messages: number;
  invite_codes: number;
  storage: Record<string, number>;
};

const FREE_STORAGE_BYTES = 1024 ** 3; // Supabase free tier: 1 GB

function fmtBytes(n: number) {
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_stats");
  if (error || !data) {
    return (
      <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
        Couldn&apos;t load stats. Has <code>supabase/migrations/0002_admin.sql</code> been run? ({error?.message})
      </div>
    );
  }
  const s = data as unknown as Stats;
  const used = Object.values(s.storage ?? {}).reduce((a, b) => a + Number(b), 0);
  const pct = Math.min(100, (used / FREE_STORAGE_BYTES) * 100);

  const tiles: { label: string; value: number | string; href?: string }[] = [
    { label: "Members", value: s.members, href: "/admin/members" },
    { label: "Suspended", value: s.banned, href: "/admin/members" },
    { label: "Live posts", value: s.live_posts, href: "/admin/content" },
    { label: "Awaiting cleanup", value: s.expired_posts },
    { label: "Active stories", value: s.live_stories, href: "/admin/content" },
    { label: "Messages sent", value: s.messages },
    { label: "Active invite codes", value: s.invite_codes, href: "/admin/invites" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => {
          const inner = (
            <>
              <p className="text-2xl font-semibold tabular-nums">{t.value}</p>
              <p className="text-xs text-ink-muted">{t.label}</p>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="card p-4 transition hover:bg-surface-2/60">
              {inner}
            </Link>
          ) : (
            <div key={t.label} className="card p-4">
              {inner}
            </div>
          );
        })}
      </div>

      <section className="card p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Image storage</h2>
          <span className="text-sm text-ink-muted">
            {fmtBytes(used)} of {fmtBytes(FREE_STORAGE_BYTES)} free tier
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full ${pct > 85 ? "bg-danger" : "bg-wave"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          {(["posts", "stories", "avatars"] as const).map((b) => (
            <div key={b}>
              <dt className="text-ink-muted capitalize">{b}</dt>
              <dd className="font-medium">{fmtBytes(Number(s.storage?.[b] ?? 0))}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-faint">
          Expired posts (30 days) and stories (24 h) are removed by the daily cleanup job, which frees their storage.
        </p>
      </section>
    </div>
  );
}
