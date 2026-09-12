import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import type { ProfileListItem } from "@/lib/data/profiles";

type Props = {
  people: ProfileListItem[];
  viewerId: string;
  followingIds: Set<string>;
  emptyText: string;
};

export function ProfileList({ people, viewerId, followingIds, emptyText }: Props) {
  if (people.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-ink-muted">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
          <Link href={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar path={p.avatar_path} name={p.full_name} size={44} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{p.username}</span>
              <span className="block truncate text-sm text-ink-muted">{p.full_name}</span>
            </span>
          </Link>
          {p.id !== viewerId && (
            <FollowButton targetId={p.id} initialFollowing={followingIds.has(p.id)} size="sm" />
          )}
        </li>
      ))}
    </ul>
  );
}
