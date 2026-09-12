import Link from "next/link";

// Post / Story switcher at the top of the create screens.
export function CreateTabs({ active }: { active: "post" | "story" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex-1 rounded-lg py-1.5 text-center text-sm font-semibold transition ${
        on ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mx-4 mt-4 flex rounded-xl border border-line bg-surface-2 p-1">
      {tab("/new", "Post", active === "post")}
      {tab("/stories/new", "Story", active === "story")}
    </div>
  );
}
