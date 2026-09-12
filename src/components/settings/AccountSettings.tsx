"use client";

import { useState, useSyncExternalStore } from "react";
import { Loader2, Moon, Sun, Monitor } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Theme = "light" | "dark" | "system";

const THEME_EVENT = "dheu-theme-change";

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("dheu-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "system";
}

function subscribeTheme(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(THEME_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(THEME_EVENT, cb);
  };
}

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (theme === "system") localStorage.removeItem("dheu-theme");
    else localStorage.setItem("dheu-theme", theme);
  } catch {}
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemePicker() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as Theme);

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1" role="radiogroup" aria-label="Theme">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => applyTheme(value)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            theme === value ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (password !== confirm) return setMsg({ ok: false, text: "Passwords don't match." });

    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setPassword("");
    setConfirm("");
    setMsg({ ok: true, text: "Password updated." });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {msg && (
        <p
          role="alert"
          className={`rounded-xl px-3.5 py-2.5 text-sm ${
            msg.ok ? "bg-brand-soft text-brand-strong" : "bg-danger-soft text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}
      <button type="submit" className="btn-secondary" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Update password
      </button>
    </form>
  );
}
