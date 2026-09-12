import Link from "next/link";
import { Layers } from "lucide-react";
import { publicUrl } from "@/lib/storage";
import type { GridPost } from "@/lib/data/profiles";

export function PostGrid({ posts }: { posts: GridPost[] }) {
  if (posts.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {posts.map((post) => {
        const cover = post.images[0];
        const src = cover ? publicUrl("posts", cover.path) : null;
        return (
          <li key={post.id} className="relative aspect-square overflow-hidden bg-surface-2">
            <Link href={`/p/${post.id}`} className="block h-full w-full">
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition hover:opacity-90"
                />
              )}
              {post.images.length > 1 && (
                <Layers
                  className="absolute top-2 right-2 size-4 text-white drop-shadow"
                  aria-label="Multiple images"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
