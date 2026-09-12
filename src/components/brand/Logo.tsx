import Link from "next/link";

// The Dheu mark: a rounded tile with a single flowing wave.
export function WaveMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dheu-wave" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--wave-a)" />
          <stop offset="1" stopColor="var(--wave-b)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#dheu-wave)" />
      <path
        d="M10 38c6-8 10-8 16 0s10 8 16 0 10-8 16 0"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 48c5-6 8-6 12 0s8 6 12 0 8-6 12 0"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="47" cy="19" r="5" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight text-wave ${className}`}>Dheu</span>
  );
}

export function Logo({ href = "/", size = 30 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 select-none" aria-label="Dheu home">
      <WaveMark size={size} />
      <Wordmark className="text-[26px] leading-none" />
    </Link>
  );
}
