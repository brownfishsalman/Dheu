import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { searchProfiles, getRelationships, statesFor } from "@/lib/data/profiles";
import { ProfileList } from "@/components/profile/ProfileList";

export const metadata: Metadata = { title: "Search" };

export default async function ExplorePage(props: PageProps<"/explore">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";

  const me = await requireProfile();
  const [people, rel] = await Promise.all([searchProfiles(q), getRelationships(me.id)]);

  return (
    <div className="mx-auto max-w-2xl">
      <form className="sticky top-14 z-20 bg-canvas/95 px-4 py-3 backdrop-blur md:top-0" action="/explore">
        <label className="relative block">
          <Search className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-5 text-ink-faint" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search people"
            autoComplete="off"
            className="input pl-11"
            autoFocus={!q}
          />
        </label>
      </form>

      <h2 className="px-4 pt-2 pb-1 text-xs font-semibold tracking-widest text-ink-muted uppercase">
        {q ? `Results for “${q}”` : "Everyone on Dheu"}
      </h2>

      <ProfileList
        people={people}
        viewerId={me.id}
        states={statesFor(rel, people)}
        emptyText={q ? "No one matches that." : "No members yet."}
      />
    </div>
  );
}
