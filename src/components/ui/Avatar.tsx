import { avatarUrl } from "@/lib/storage";

type Props = {
  path: string | null | undefined;
  name: string;
  size?: number; // px
  className?: string;
};

// Deterministic soft background for initials, keyed on the name.
function hue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({ path, name, size = 40, className = "" }: Props) {
  const url = avatarUrl(path);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full bg-surface-2 object-cover ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <span
      aria-label={name}
      role="img"
      style={{ ...style, background: `hsl(${hue(name)} 55% 88%)`, color: `hsl(${hue(name)} 45% 30%)` }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold dark:brightness-75 ${className}`}
    >
      {initials || "?"}
    </span>
  );
}
