"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy, Check, Ban, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { createInvite, setInviteDisabled, deleteInvite, type ActionResult } from "@/app/(app)/admin/actions";
import type { InviteCode } from "@/lib/database.types";

type Props = { invites: InviteCode[]; siteUrl: string };

export function InviteManager({ invites, siteUrl }: Props) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createInvite, null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(`${siteUrl}/signup?code=${code}`);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  function run(id: string, fn: () => Promise<ActionResult>) {
    setBusyId(id);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) alert(r.error);
      setBusyId(null);
    });
  }

  return (
    <div className="space-y-6">
      <form action={action} className="card space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">New invite code</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Note (who it&apos;s for)</span>
            <input name="note" className="input" placeholder="e.g. cousins" maxLength={80} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Max uses</span>
            <input name="maxUses" type="number" min={1} max={500} defaultValue={1} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Expires in (days, 0 = never)</span>
            <input name="expiresDays" type="number" min={0} max={365} defaultValue={30} className="input" />
          </label>
        </div>
        {state && (
          <p className={`text-sm ${state.ok ? "text-brand-strong" : "text-danger"}`}>
            {state.ok ? state.message : state.error}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Generate code
        </button>
      </form>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Codes</h2>
          <p className="text-xs text-ink-muted">Tap the copy icon to get a sign-up link with the code filled in.</p>
        </div>
        {invites.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No codes yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {invites.map((inv) => {
              const expired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false;
              const usedUp = inv.use_count >= inv.max_uses;
              const status = inv.disabled ? "Disabled" : expired ? "Expired" : usedUp ? "Used up" : "Active";
              const dead = inv.disabled || expired || usedUp;
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <code className={`font-mono text-[15px] font-semibold tracking-wider ${dead ? "text-ink-faint line-through" : ""}`}>
                    {inv.code}
                  </code>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      dead ? "bg-surface-2 text-ink-muted" : "bg-brand-soft text-brand-strong"
                    }`}
                  >
                    {status}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {inv.use_count}/{inv.max_uses} used
                    {inv.expires_at && ` · until ${new Date(inv.expires_at).toLocaleDateString("en-GB")}`}
                    {inv.note && ` · ${inv.note}`}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Copy sign-up link"
                      onClick={() => copy(inv.code)}
                      className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
                    >
                      {copied === inv.code ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
                    </button>
                    <button
                      type="button"
                      aria-label={inv.disabled ? "Enable" : "Disable"}
                      disabled={busyId === inv.id}
                      onClick={() => run(inv.id, () => setInviteDisabled(inv.id, !inv.disabled))}
                      className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
                    >
                      {inv.disabled ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      disabled={busyId === inv.id}
                      onClick={() => {
                        if (confirm(`Delete code ${inv.code}?`)) run(inv.id, () => deleteInvite(inv.id));
                      }}
                      className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
