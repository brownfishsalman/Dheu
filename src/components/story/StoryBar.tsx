import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { StoryGroup } from "@/lib/data/stories";
import type { Profile } from "@/lib/database.types";

type Props = { groups: StoryGroup[]; me: Profile };

// Horizontal strip of story rings at the top of the feed.
export function StoryBar({ groups, me }: Props) {
  const mine = groups.find((g) => g.author.id === me.id);
  const others = groups.filter((g) => g.author.id !== me.id);

  return (
    <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 py-3 sm:px-0">
      {/* Me: add a story, or view mine */}
      <Link
        href={mine ? `/stories/${me.id}` : "/stories/new"}
        className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
      >
        <span className={`relative rounded-full p-[2.5px] ${mine ? (mine.allSeen ? "ring-story-seen" : "ring-story") : ""}`}>
          <span className="block rounded-full border-2 border-surface">
            <Avatar path={me.avatar_path} name={me.full_name} size={56} />
          </span>
          {!mine && (
            <span className="absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-brand text-brand-ink">
              <Plus className="size-3.5" strokeWidth={3} />
            </span>
          )}
        </span>
        <span className="w-full truncate text-center text-xs text-ink-muted">Your story</span>
      </Link>

      {others.map((g) => (
        <Link
          key={g.author.id}
          href={`/stories/${g.author.id}`}
          className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className={`rounded-full p-[2.5px] ${g.allSeen ? "ring-story-seen" : "ring-story"}`}>
            <span className="block rounded-full border-2 border-surface">
              <Avatar path={g.author.avatar_path} name={g.author.full_name} size={56} />
            </span>
          </span>
          <span className="w-full truncate text-center text-xs">{g.author.username}</span>
        </Link>
      ))}
    </div>
  );
}
