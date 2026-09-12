import { WaveMark, Wordmark } from "@/components/brand/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Soft wave backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[46vh] opacity-70 dark:opacity-40"
      >
        <svg viewBox="0 0 1440 400" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="bg-wave" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="var(--wave-a)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--wave-b)" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <path
            d="M0 160 C 240 60, 480 260, 720 160 S 1200 60, 1440 160 L1440 400 L0 400 Z"
            fill="url(#bg-wave)"
          />
          <path
            d="M0 240 C 240 140, 480 340, 720 240 S 1200 140, 1440 240 L1440 400 L0 400 Z"
            fill="url(#bg-wave)"
          />
        </svg>
      </div>

      <div className="mb-8 flex flex-col items-center gap-4">
        <WaveMark size={112} />
        <Wordmark className="text-[34px]" />
        <p className="-mt-1 text-sm text-ink-muted">Share moments with your people.</p>
      </div>

      <div className="card w-full max-w-sm p-6 shadow-card">{children}</div>
    </div>
  );
}
