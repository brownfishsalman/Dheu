"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { pushSupported, isStandalone, currentSubscription, enablePush, registerServiceWorker } from "@/lib/push-client";

const DISMISS_KEY = "dheu-push-banner-dismissed";

// One-time nudge inside the installed app: "turn on notifications?".
// Only shows when push is possible here and the member hasn't decided yet.
export function PushBanner({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {}
      if (!pushSupported() || !isStandalone()) return;
      if (Notification.permission !== "default") return;
      await registerServiceWorker();
      if (await currentSubscription()) return;
      if (!cancelled) setShow(true);
    })();
    return () => { cancelled = true; };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setShow(false);
  }

  async function enable() {
    setBusy(true);
    await enablePush(userId);
    setBusy(false);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card sm:mx-0">
      <Bell className="size-5 shrink-0 text-brand" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">Turn on notifications?</span>{" "}
        <span className="text-ink-muted">Likes, comments, follow requests and messages — even when Dheu is closed.</span>
      </p>
      <button type="button" onClick={enable} disabled={busy} className="btn-primary px-3 py-1.5 text-sm">
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Turn on"}
      </button>
      <Link href="/settings" onClick={dismiss} className="sr-only">
        Settings
      </Link>
      <button type="button" onClick={dismiss} aria-label="Not now" className="rounded-full p-1 text-ink-faint hover:text-ink">
        <X className="size-4" />
      </button>
    </div>
  );
}
