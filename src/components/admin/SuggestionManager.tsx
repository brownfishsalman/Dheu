"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, X, ChevronUp, ChevronDown, Loader2, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { addSuggestion, removeSuggestion, moveSuggestion, type ActionResult } from "@/app/(app)/admin/actions";
import type { ProfileListItem, SuggestedRow } from "@/lib/data/profiles";

type Props = { suggested: SuggestedRow[]; members: ProfileListItem[] };

export function SuggestionManager({ suggested, members }: Props) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, fn: () => Promise<ActionResult>) {
    setBusy(id);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) alert(r.error);
      setBusy(null);
    });
  }

  const chosen = new Set(suggested.map((s) => s.id));
  const needle = q.trim().toLowerCase();
  const candidates = members
    .filter((m) => !chosen.has(m.id))
    .filter((m) => !needle || m.username.includes(needle) || m.full_name.toLowerCase().includes(needle))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Suggested for you ({suggested.length})</h2>
          <p className="text-xs text-ink-muted">
            Shown in members&apos; feeds on about 2 in 5 visits, in this order. People already followed (or requested) by the
            viewer are skipped automatically.
          </p>
        </div>
        {suggested.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No one suggested yet — add members below.</p>
        ) : (
          <ul className="divide-y divide-line">
            {suggested.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-center text-xs text-ink-faint">{i + 1}</span>
                <Link href={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar path={p.avatar_path} name={p.full_name} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.username}</span>
                    <span className="block truncate text-sm text-ink-muted">{p.full_name}</span>
                  </span>
                </Link>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label="Move up" disabled={i === 0 || busy === p.id} onClick={() => run(p.id, () => moveSuggestion(p.id, -1))} className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                    <ChevronUp className="size-4" />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === suggested.length - 1 || busy === p.id} onClick={() => run(p.id, () => moveSuggestion(p.id, 1))} className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                    <ChevronDown className="size-4" />
                  </button>
                  <button type="button" aria-label="Remove" disabled={busy === p.id} onClick={() => run(p.id, () => removeSuggestion(p.id))} className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-danger">
                    {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Add a member</h2>
        <label className="relative block">
          <Search className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-5 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or username" className="input pl-11" />
        </label>
        <ul className="mt-2 divide-y divide-line">
          {candidates.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <Avatar path={m.avatar_path} name={m.full_name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{m.username}</span>
                <span className="block truncate text-xs text-ink-muted">{m.full_name}</span>
              </span>
              <button type="button" disabled={busy === m.id} onClick={() => run(m.id, () => addSuggestion(m.id))} className="btn-secondary px-3 py-1.5 text-sm">
                {busy === m.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
              </button>
            </li>
          ))}
          {candidates.length === 0 && <li className="py-4 text-center text-sm text-ink-muted">No matching members.</li>}
        </ul>
      </section>
    </div>
  );
}
