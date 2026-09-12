// Shown instantly while the next page's data loads on the server. Because this
// boundary exists, Next.js can also prefetch links so taps feel immediate.
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[520px] animate-pulse px-4 py-4 sm:px-4" aria-busy="true" aria-label="Loading">
      {/* story bar */}
      <div className="mb-4 flex gap-3.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
            <div className="size-[62px] rounded-full bg-surface-2" />
            <div className="h-2.5 w-12 rounded bg-surface-2" />
          </div>
        ))}
      </div>
      {/* two post cards */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="card mb-4 overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="size-9 rounded-full bg-surface-2" />
            <div className="h-3 w-28 rounded bg-surface-2" />
          </div>
          <div className="aspect-square bg-surface-2" />
          <div className="space-y-2 px-4 py-3">
            <div className="h-3 w-20 rounded bg-surface-2" />
            <div className="h-3 w-3/4 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
