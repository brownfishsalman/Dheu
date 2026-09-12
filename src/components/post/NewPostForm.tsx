"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { processImage, POST_MAX, ACCEPT_ATTR, newImagePath, type ProcessedImage } from "@/lib/images";

const MAX_IMAGES = 10;

type Picked = ProcessedImage & { key: string };

export function NewPostForm({ userId }: { userId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Picked[]>([]);
  const [caption, setCaption] = useState("");
  const [processing, setProcessing] = useState(0);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const room = MAX_IMAGES - images.length;
    if (files.length > room) setError(`You can add up to ${MAX_IMAGES} images per post.`);

    setProcessing(Math.min(files.length, room));
    for (const file of files.slice(0, room)) {
      try {
        const img = await processImage(file, POST_MAX);
        setImages((prev) => [...prev, { ...img, key: crypto.randomUUID() }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't read one of the images.");
      } finally {
        setProcessing((n) => n - 1);
      }
    }
  }

  function remove(key: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.key !== key);
    });
  }

  function move(key: string, dir: -1 | 1) {
    setImages((prev) => {
      const i = prev.findIndex((x) => x.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (images.length === 0) return setError("Add at least one photo.");
    if (caption.length > 2200) return setError("Caption is too long.");
    setError(null);
    setPosting(true);

    const supabase = createClient();
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) {
        setProgress(`Uploading ${i + 1} of ${images.length}…`);
        const path = newImagePath(userId);
        const { error: upErr } = await supabase.storage
          .from("posts")
          .upload(path, images[i].blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (upErr) throw new Error(upErr.message);
        uploaded.push(path);
      }

      setProgress("Publishing…");
      const { data: post, error: postErr } = await supabase
        .from("posts")
        .insert({ author_id: userId, caption: caption.trim() })
        .select("id")
        .single();
      if (postErr || !post) throw new Error(postErr?.message ?? "Couldn't create the post.");

      const { error: imgErr } = await supabase.from("post_images").insert(
        images.map((img, i) => ({
          post_id: post.id,
          path: uploaded[i],
          width: img.width,
          height: img.height,
          position: i,
        })),
      );
      if (imgErr) {
        await supabase.from("posts").delete().eq("id", post.id);
        throw new Error(imgErr.message);
      }

      images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      router.replace(`/p/${post.id}`);
      router.refresh();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from("posts").remove(uploaded);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPosting(false);
      setProgress("");
    }
  }

  const busy = posting || processing > 0;

  return (
    <form onSubmit={submit} className="space-y-4 px-4 py-4">
      {/* Picker / previews */}
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-line bg-surface text-ink-muted transition hover:border-brand hover:text-brand"
        >
          {processing > 0 ? (
            <Loader2 className="size-10 animate-spin" />
          ) : (
            <ImagePlus className="size-10" strokeWidth={1.5} />
          )}
          <span className="font-medium">{processing > 0 ? "Preparing photos…" : "Choose photos"}</span>
          <span className="text-xs text-ink-faint">Up to {MAX_IMAGES} · any shape · JPG, PNG, HEIC</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <div
                key={img.key}
                className="relative flex aspect-square w-[85%] shrink-0 snap-center items-center justify-center overflow-hidden rounded-card bg-black/90 sm:w-[60%]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                  {i + 1}/{images.length}
                </span>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => remove(img.key)}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="size-4" />
                </button>
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    <button
                      type="button"
                      aria-label="Move left"
                      disabled={i === 0}
                      onClick={() => move(img.key, -1)}
                      className="rounded-full bg-black/60 p-1 text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move right"
                      disabled={i === images.length - 1}
                      onClick={() => move(img.key, 1)}
                      className="rounded-full bg-black/60 p-1 text-white disabled:opacity-30"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="btn-secondary w-full"
            >
              {processing > 0 ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              Add more ({images.length}/{MAX_IMAGES})
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={onPick}
      />

      <div>
        <label htmlFor="caption" className="sr-only">
          Caption
        </label>
        <textarea
          id="caption"
          className="input min-h-24 resize-y"
          placeholder="Write a caption…"
          value={caption}
          maxLength={2200}
          onChange={(e) => setCaption(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-ink-faint">{caption.length}/2200</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy || images.length === 0}>
        {posting && <Loader2 className="size-4 animate-spin" />}
        {posting ? progress || "Posting…" : "Share"}
      </button>
      <p className="text-center text-xs text-ink-faint">Posts disappear after 30 days.</p>
    </form>
  );
}
