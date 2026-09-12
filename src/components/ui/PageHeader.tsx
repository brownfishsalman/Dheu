import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  back?: string;
  action?: React.ReactNode;
};

// Compact page title bar used on inner pages.
export function PageHeader({ title, subtitle, back, action }: Props) {
  return (
    <div className="sticky top-14 z-20 flex h-12 items-center gap-2 border-b border-line bg-canvas/95 px-2 backdrop-blur md:top-0 md:h-14 md:px-4">
      {back && (
        <Link href={back} aria-label="Back" className="rounded-full p-1.5 hover:bg-surface-2">
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <div className="min-w-0 flex-1 px-1">
        <h1 className="truncate font-display text-lg font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
