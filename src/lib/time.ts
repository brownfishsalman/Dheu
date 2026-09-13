// Short relative timestamps like Instagram: "now", "5m", "3h", "2d", "3w".
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

// Longer form: "12 September 2026 at 14:05"
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "Expires in 12 days" / "Expires in 3 hours"
export function expiresIn(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "Expired";
  const h = Math.ceil(ms / 3_600_000);
  if (h < 48) return `Expires in ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.ceil(ms / 86_400_000);
  return `Expires in ${d} day${d === 1 ? "" : "s"}`;
}
