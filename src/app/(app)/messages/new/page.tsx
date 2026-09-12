import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { searchProfiles } from "@/lib/data/profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";

export const metadata: Metadata = { title: "New message" };

export default async function NewMessagePage(props: PageProps<"/messages/new">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const me = await requireProfile();
  const people = (await searchProfiles(q)).filter((p) => p.id !== me.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New message" back="/messages" />
      <form className="px-4 py-3" action="/messages/new">
        <label className="relative block">
          <Search className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-5 text-ink-faint" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="To: search people"
            autoComplete="off"
            className="input pl-11"
            autoFocus
          />
        </label>
      </form>
      <ul className="divide-y divide-line">
        {people.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-ink-muted">No one found.</li>
        )}
        {people.map((p) => (
          <li key={p.id}>
            <Link href={`/messages/with/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/60">
              <Avatar path={p.avatar_path} name={p.full_name} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.username}</span>
                <span className="block truncate text-sm text-ink-muted">{p.full_name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
