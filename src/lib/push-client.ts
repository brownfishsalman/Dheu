"use client";

import { createClient } from "@/lib/supabase/client";

// Browser-side helpers for Web Push: register the service worker, subscribe
// this device, and store/remove the subscription for the logged-in member.

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// iOS only allows push for apps added to the Home Screen.
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function enablePush(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!pushSupported()) return { ok: false, error: "This browser doesn't support notifications." };
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, error: "Notifications aren't configured on the server yet." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Notifications were not allowed." };

  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  let sub: PushSubscription | null = null;
  try {
    sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  } catch (err) {
    const isBrave = Boolean((navigator as unknown as { brave?: unknown }).brave);
    return {
      ok: false,
      error: isBrave
        ? "Brave couldn't reach the push service. Open brave://settings/privacy, turn on “Use Google services for push messaging”, restart Brave and try again."
        : `Your browser couldn't set up push notifications (${(err as Error).message}).`,
    };
  }

  const json = sub.toJSON();
  const { error } = await createClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        user_agent: navigator.userAgent.slice(0, 200),
      },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: "Couldn't save this device. Try again." };
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
