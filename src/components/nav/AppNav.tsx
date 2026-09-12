"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, MessageCircle, Heart, Shield, Settings } from "lucide-react";
import { Logo, WaveMark } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/database.types";
import { UnreadBadge, ActivityBadge } from "@/components/nav/BadgeProvider";

type Props = { profile: Profile };

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: "messages" | "activity";
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const linkBase =
  "flex items-center gap-4 rounded-xl px-3 py-2.5 text-[15px] transition hover:bg-surface-2";

// Desktop sidebar (md and up). Icon-only until xl, then labels appear.
export function Sidebar({ profile }: Props) {
  const pathname = usePathname();
  const profileHref = `/u/${profile.username}`;

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Search", icon: Search },
    { href: "/new", label: "Create", icon: PlusSquare },
    { href: "/activity", label: "Activity", icon: Heart, badge: "activity" },
    { href: "/messages", label: "Messages", icon: MessageCircle, badge: "messages" },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col border-r border-line bg-surface px-3 py-5 md:flex xl:w-60">
      <div className="mb-6 px-2">
        <span className="hidden xl:block">
          <Logo />
        </span>
        <Link href="/" className="block xl:hidden" aria-label="Dheu home">
          <WaveMark size={34} />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`${linkBase} ${active ? "font-semibold text-ink" : "text-ink-muted"}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon className="size-6" strokeWidth={active ? 2.5 : 2} />
                {badge === "messages" && <UnreadBadge className="absolute -top-1.5 -right-1.5" />}
                {badge === "activity" && <ActivityBadge className="absolute -top-1.5 -right-1.5" />}
              </span>
              <span className="hidden xl:inline">{label}</span>
            </Link>
          );
        })}

        <Link
          href={profileHref}
          className={`${linkBase} ${isActive(pathname, profileHref) ? "font-semibold text-ink" : "text-ink-muted"}`}
        >
          <Avatar path={profile.avatar_path} name={profile.full_name} size={26} />
          <span className="hidden xl:inline">Profile</span>
        </Link>

        {profile.is_admin && (
          <Link
            href="/admin"
            className={`${linkBase} ${isActive(pathname, "/admin") ? "font-semibold text-ink" : "text-ink-muted"}`}
          >
            <Shield className="size-6" />
            <span className="hidden xl:inline">Admin</span>
          </Link>
        )}
      </nav>

      <Link
        href="/settings"
        className={`${linkBase} ${isActive(pathname, "/settings") ? "font-semibold text-ink" : "text-ink-muted"}`}
      >
        <Settings className="size-6" />
        <span className="hidden xl:inline">Settings</span>
      </Link>
    </aside>
  );
}

// Phone bottom tab bar (below md).
export function TabBar({ profile }: Props) {
  const pathname = usePathname();
  const profileHref = `/u/${profile.username}`;

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Search", icon: Search },
    { href: "/new", label: "Create", icon: PlusSquare },
    { href: "/messages", label: "Messages", icon: MessageCircle, badge: "messages" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur pb-safe md:hidden"
      aria-label="Primary"
    >
      <ul className="flex h-14 items-stretch justify-around">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex h-full items-center justify-center ${active ? "text-ink" : "text-ink-muted"}`}
              >
                <span className="relative">
                  <Icon className="size-[26px]" strokeWidth={active ? 2.5 : 2} />
                  {badge === "messages" && <UnreadBadge className="absolute -top-1.5 -right-2" />}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <Link
            href={profileHref}
            aria-label="Profile"
            className="flex h-full items-center justify-center"
          >
            <span
              className={`rounded-full p-[2px] ${isActive(pathname, profileHref) ? "ring-2 ring-ink" : ""}`}
            >
              <Avatar path={profile.avatar_path} name={profile.full_name} size={26} />
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

// Phone top header (below md).
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur pt-safe md:hidden">
      <Logo size={28} />
      <div className="-mr-1 flex items-center gap-1">
        <Link href="/activity" aria-label="Activity" className="relative p-1 text-ink">
          <Heart className="size-[26px]" />
          <ActivityBadge className="absolute top-0 right-0" />
        </Link>
        <Link href="/messages" aria-label="Messages" className="relative p-1 text-ink">
          <MessageCircle className="size-[26px]" />
          <UnreadBadge className="absolute top-0 right-0" />
        </Link>
      </div>
    </header>
  );
}
