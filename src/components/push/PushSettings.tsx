"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Smartphone } from "lucide-react";
import { pushSupported, isStandalone, isIOS, currentSubscription, enablePush, disablePush, registerServiceWorker } from "@/lib/push-client";

type Status = "checking" | "unsupported" | "ios-needs-install" | "blocked" | "off" | "on";

async function detect(): Promise<Status> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? "ios-needs-install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return (await currentSubscription()) ? "on" : "off";
}

// Settings card: turn push notifications on/off for this device.
export function PushSettings({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    registerServiceWorker().then(() => detect()).then((s) => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, []);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (status === "on") {
        await disablePush();
        setStatus("off");
      } else {
        const r = await enablePush(userId);
        if (r.ok) setStatus("on");
        else {
          setError(r.error);
          setStatus(await detect());
        }
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const copy: Record<Status, string> = {
    checking: "Checking this device…",
    unsupported: "This browser can't show push notifications. Try Chrome on Android, or add Dheu to your Home Screen on iPhone.",
    "ios-needs-install": "On iPhone, notifications only work from the installed app: tap Share → Add to Home Screen, then open Dheu from there and come back here.",
    blocked: "Notifications are blocked for Dheu in your browser settings. Allow them there, then reload this page.",
    off: "Get alerts on this device for likes, comments, follow requests, messages and announcements.",
    on: "This device receives alerts for likes, comments, follow requests, messages and announcements.",
  };

  const Icon = status === "on" ? BellRing : status === "blocked" ? BellOff : status === "ios-needs-install" ? Smartphone : Bell;

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <Icon className={`mt-0.5 size-4 shrink-0 ${status === "on" ? "text-brand" : ""}`} />
        {copy[status]}
      </p>
      {(status === "on" || status === "off") && (
        <button type="button" onClick={toggle} disabled={busy} className={status === "on" ? "btn-secondary" : "btn-primary"}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : status === "on" ? <BellOff className="size-4" /> : <Bell className="size-4" />}
          {status === "on" ? "Turn off on this device" : "Turn on notifications"}
        </button>
      )}
      {error && <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
      <p className="text-xs text-ink-faint">Notifications are per device — turn them on separately on your phone and computer.</p>
    </div>
  );
}
