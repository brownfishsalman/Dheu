"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Ban, RotateCcw, KeyRound, Trash2, ShieldCheck, Loader2, Copy, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { setBanned, resetPassword, deleteMember, type ActionResult } from "@/app/(app)/admin/actions";
import type { Profile } from "@/lib/database.types";

type Member = Profile & { email: string | null };

export function MemberManager({ members, meId }: { members: Member[]; meId: string }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string; secret?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function run(id: string, fn: () => Promise<ActionResult>) {
    setBusyId(id);
    setNotice(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) setNotice({ id, text: r.message ?? "Done.", secret: r.secret });
      else alert(r.error);
      setBusyId(null);
    });
  }

  async function copySecret(s: string) {
    try {
      await navigator.clipboard.writeText(s);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-display text-lg font-semibold">Members ({members.length})</h2>
        <p className="text-xs text-ink-muted">Suspending blocks login immediately. Deleting removes everything they posted.</p>
      </div>
      <ul className="divide-y divide-line">
        {members.map((m) => {
          const isMe = m.id === meId;
          const banned = m.banned_at !== null;
          return (
            <li key={m.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Link href={`/u/${m.username}`}>
                  <Avatar path={m.avatar_path} name={m.full_name} size={40} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold">
                    <Link href={`/u/${m.username}`}>{m.username}</Link>
                    {m.is_admin && <ShieldCheck className="size-4 text-brand" aria-label="Admin" />}
                    {banned && (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Suspended</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {m.full_name} · {m.email ?? "no email"} · joined {new Date(m.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                {!isMe && (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Reset password"
                      title="Reset password"
                      disabled={busyId === m.id}
                      onClick={() => {
                        if (confirm(`Set a temporary password for ${m.username}?`)) run(m.id, () => resetPassword(m.id));
                      }}
                      className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <KeyRound className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={banned ? "Reinstate" : "Suspend"}
                      title={banned ? "Reinstate" : "Suspend"}
                      disabled={busyId === m.id}
                      onClick={() => {
                        const q = banned ? `Reinstate ${m.username}?` : `Suspend ${m.username}? They won't be able to log in.`;
                        if (confirm(q)) run(m.id, () => setBanned(m.id, !banned));
                      }}
                      className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
                    >
                      {banned ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete member"
                      title="Delete member"
                      disabled={busyId === m.id}
                      onClick={() => {
                        if (
                          confirm(`Permanently delete ${m.username} and everything they posted? This cannot be undone.`) &&
                          prompt(`Type ${m.username} to confirm`) === m.username
                        )
                          run(m.id, () => deleteMember(m.id));
                      }}
                      className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-danger"
                    >
                      {busyId === m.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  </span>
                )}
              </div>
              {notice?.id === m.id && (
                <div className="mt-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm text-brand-strong">
                  {notice.text}
                  {notice.secret && (
                    <span className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-surface px-2 py-1 font-mono text-ink">{notice.secret}</code>
                      <button type="button" onClick={() => copySecret(notice.secret!)} className="btn-ghost px-2 py-1 text-xs">
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} copy
                      </button>
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
