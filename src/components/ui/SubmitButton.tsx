"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  className = "btn-primary w-full",
  pendingText,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
