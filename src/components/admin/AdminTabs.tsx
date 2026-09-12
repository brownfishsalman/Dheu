"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/invites", label: "Invites" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/content", label: "Content" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-2">
      {tabs.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              active ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
