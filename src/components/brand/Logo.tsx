import Link from "next/link";

// The Dheu mark: a map-pin filled with layered waves (public/brand/mark.png,
// generated from the original artwork by scripts/build-logo.mjs).
// `size` is the rendered height in px; the pin's aspect ratio is 530:720.
const MARK_RATIO = 530 / 720;

export function WaveMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const width = Math.round(size * MARK_RATIO);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={size <= 64 ? "/brand/mark-128.png" : "/brand/mark.png"}
      alt=""
      width={width}
      height={size}
      style={{ width, height: size }}
      className={`shrink-0 select-none ${className}`}
      draggable={false}
      aria-hidden="true"
    />
  );
}

// Wordmark set to match the logo: heavy geometric caps, wide tracking, navy
// in light mode and warm off-white in dark mode.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold uppercase tracking-[0.22em] text-wordmark ${className}`}>
      Dheu
    </span>
  );
}

export function Logo({ href = "/", size = 30 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 select-none" aria-label="Dheu home">
      <WaveMark size={size} />
      <Wordmark className="text-[20px] leading-none" />
    </Link>
  );
}
