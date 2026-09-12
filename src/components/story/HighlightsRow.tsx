import Link from "next/link";
import { Plus } from "lucide-react";
import { publicUrl } from "@/lib/storage";
import type { HighlightSummary } from "@/lib/data/stories";

type Props = { highlights: HighlightSummary[]; ownerId: string; isOwner: boolean };

export function HighlightsRow({ highlights, isOwner }: Props) {
  if (highlights.length === 0 && !isOwner) return null;

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-5 sm:px-6">
      {isOwner && (
        <Link href="/highlights/new" className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-line text-ink-muted">
            <Plus className="size-6" />
          </span>
          <span className="w-full truncate text-center text-xs">New</span>
        </Link>
      )}

      {highlights.map((h) => {
        const src = publicUrl("stories", h.cover_path);
        return (
          <Link
            key={h.id}
            href={`/highlights/${h.id}`}
            className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="rounded-full bg-line p-[2px]">
              <span className="block size-[60px] overflow-hidden rounded-full border-2 border-surface bg-surface-2">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}
              </span>
            </span>
            <span className="w-full truncate text-center text-xs">{h.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
