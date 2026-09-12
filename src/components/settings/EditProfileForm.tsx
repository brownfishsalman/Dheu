"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { processImage, AVATAR_MAX, ACCEPT_ATTR, newImagePath } from "@/lib/images";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/database.types";

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [avatarPath, setAvatarPath] = useState(profile.avatar_path);
  const [preview, setPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const img = await processImage(file, AVATAR_MAX);
      const supabase = createClient();
      const path = newImagePath(profile.id);
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, img.blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (upErr) throw new Error(upErr.message);

      // Point the profile at the new file right away, then drop the old one.
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", profile.id);
      if (dbErr) throw new Error(dbErr.message);

      if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
      setAvatarPath(path);
      setPreview(img.previewUrl);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your photo.");
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const name = fullName.trim();
    const uname = username.trim().toLowerCase();
    if (!name) return setError("Enter your name.");
    if (!USERNAME_RE.test(uname)) return setError("Username: 3–30 letters, numbers, dots or underscores.");
    if (bio.length > 300) return setError("Bio is too long (300 characters max).");

    setSaving(true);
    const supabase = createClient();
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ full_name: name, username: uname, bio: bio.trim() })
      .eq("id", profile.id);
    setSaving(false);

    if (dbErr) {
      setError(dbErr.code === "23505" ? "That username is already taken." : dbErr.message);
      return;
    }
    setUsername(uname);
    setSaved(true);
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative rounded-full"
          aria-label="Change profile photo"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-[72px] rounded-full object-cover" />
          ) : (
            <Avatar path={avatarPath} name={fullName || profile.full_name} size={72} />
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
            {uploading ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
          </span>
        </button>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <p className="text-xs text-ink-faint">JPG, PNG, HEIC. Cropped to a square.</p>
        </div>
        <input ref={fileRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={onPickAvatar} />
      </div>

      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
          Name
        </label>
        <input
          id="fullName"
          className="input"
          value={fullName}
          maxLength={60}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
          Username
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-faint">@</span>
          <input
            id="username"
            className="input pl-8"
            value={username}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          className="input min-h-24 resize-y"
          value={bio}
          maxLength={300}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-ink-faint">{bio.length}/300</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm text-brand-strong">Profile saved.</p>
      )}

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        Save changes
      </button>
    </form>
  );
}
