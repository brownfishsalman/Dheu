"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { publicUrl } from "@/lib/storage";
import type { FeedImage } from "@/lib/data/posts";

type Props = {
  images: FeedImage[];
  alt?: string;
  onDoubleTap?: () => void;
  priority?: boolean;
};

// Swipeable image carousel. The frame takes the first image's aspect ratio
// (any orientation allowed); other images letterbox inside it.
export function Carousel({ images, alt = "", onDoubleTap, priority }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const first = images[0];
  const ratio = first ? first.width / first.height : 1;
  // Keep extremely tall images from taking over the screen.
  const clampedRatio = Math.max(ratio, 0.5);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function go(delta: number) {
    const el = scroller.current;
    if (!el) return;
    const next = Math.min(images.length - 1, Math.max(0, index + delta));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  const lastTap = useRef(0);
  function handleClick() {
    const now = Date.now();
    if (now - lastTap.current < 300) onDoubleTap?.();
    lastTap.current = now;
  }

  if (!first) return null;

  return (
    <div className="group relative select-none bg-black/90" style={{ aspectRatio: clampedRatio }}>
      <div
        ref={scroller}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        onClick={handleClick}
      >
        {images.map((img, i) => (
          <div key={img.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicUrl("posts", img.path) ?? ""}
              alt={alt}
              width={img.width}
              height={img.height}
              loading={priority && i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {index + 1}/{images.length}
          </span>

          <button
            type="button"
            aria-label="Previous image"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1 text-black opacity-0 shadow transition group-hover:opacity-100 disabled:!opacity-0 md:block"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => go(1)}
            disabled={index === images.length - 1}
            className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-white/90 p-1 text-black opacity-0 shadow transition group-hover:opacity-100 disabled:!opacity-0 md:block"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full transition ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
