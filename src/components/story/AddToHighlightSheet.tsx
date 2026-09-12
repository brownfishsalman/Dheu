"use client";

import { useState } from "react";
import { X, Plus, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  storyId: string;
  ownerId: string;
  highlights: { id: string; title: string }[];
  onClose: () => void;
  onDone: (title: string) => void;
};

// Bottom sheet: add the current story to an existing highlight or a new one.
export function AddToHighlightSheet({ storyId, ownerId, highlights, onClose, onDone }: Props) {
  const [creating, setCreating] = useState(highlights.length === 0);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addTo(highlightId: string, label: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("highlight_items")
      .upsert({ highlight_id: highlightId, story_id: storyId }, { onConflict: "highlight_id,story_id", ignoreDuplicates: true });
    setBusy(false);
    if (err) return setError("Couldn't add it. Try again.");
    onDone(label);
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("story_highlights")
      .insert({ owner_id: ownerId, title: t, cover_story_id: storyId, position: highlights.length })
      .select("id")
      .single();
    if (err || !data) {
      setBusy(false);
      return setError("Couldn't create the highlight.");
    }
    await addTo(data.id, t);
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative rounded-t-2xl bg-surface text-ink shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display font-semibold">Add to highlight</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>

        <div className="px-4 pb-4 pb-safe">
          {!creating && (
            <ul className="mb-3 max-h-[40vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {highlights.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => addTo(h.id, h.title)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2"
                  >
                    <span className="font-medium">{h.title}</span>
                    <Check className="size-4 text-ink-faint" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {creating ? (
            <form onSubmit={createAndAdd} className="flex gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={30}
                placeholder="Highlight name"
                className="input"
              />
              <button type="submit" className="btn-primary shrink-0" disabled={busy || !title.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="btn-secondary w-full">
              <Plus className="size-4" /> New highlight
            </button>
          )}

          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
