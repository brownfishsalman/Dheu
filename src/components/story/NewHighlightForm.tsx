"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { publicUrl } from "@/lib/storage";
import { timeAgo } from "@/lib/time";

type StoryOption = { id: string; image_path: string; created_at: string; expires_at: string };

type Props = { ownerId: string; ownerUsername: string; stories: StoryOption[]; nextPosition: number };

export function NewHighlightForm({ ownerId, ownerUsername, stories, nextPosition }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setError("Give the highlight a name.");
    if (selected.length === 0) return setError("Pick at least one story.");
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: hErr } = await supabase
      .from("story_highlights")
      .insert({ owner_id: ownerId, title: t, cover_story_id: selected[0], position: nextPosition })
      .select("id")
      .single();
    if (hErr || !data) {
      setBusy(false);
      return setError("Couldn't create the highlight.");
    }
    const { error: iErr } = await supabase
      .from("highlight_items")
      .insert(selected.map((story_id) => ({ highlight_id: data.id, story_id })));
    if (iErr) {
      await supabase.from("story_highlights").delete().eq("id", data.id);
      setBusy(false);
      return setError("Couldn't add the stories.");
    }
    router.replace(`/u/${ownerUsername}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-4 py-4">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
          Name
        </label>
        <input
          id="title"
          className="input"
          value={title}
          maxLength={30}
          placeholder="e.g. Trip, Friends, 2026"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          Choose stories{" "}
          <span className="font-normal text-ink-muted">({selected.length} selected)</span>
        </p>
        {stories.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-8 text-center text-sm text-ink-muted">
            You have no stories to highlight. Post a story first — you can add it to a highlight from the story
            itself before it expires.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-1">
            {stories.map((s) => {
              const on = selected.includes(s.id);
              const active = new Date(s.expires_at).getTime() > now;
              return (
                <li key={s.id} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-surface-2">
                  <button type="button" onClick={() => toggle(s.id)} className="block h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrl("stories", s.image_path) ?? ""}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover transition ${on ? "opacity-70" : ""}`}
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      {active ? timeAgo(s.created_at) : "highlighted"}
                    </span>
                    <span
                      className={`absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full border-2 ${
                        on ? "border-brand bg-brand text-brand-ink" : "border-white/80 bg-black/30"
                      }`}
                    >
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy || stories.length === 0}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Create highlight
      </button>
    </form>
  );
}
