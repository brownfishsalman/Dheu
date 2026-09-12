import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Runs daily (see vercel.json). Deletes expired posts and stories together
// with their image files so storage is reclaimed. Protected by CRON_SECRET,
// which Vercel sends automatically as a bearer token for cron invocations.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const report = { posts: 0, postImages: 0, stories: 0, errors: [] as string[] };

  // ---- expired posts -------------------------------------------------
  const { data: posts, error: pErr } = await admin
    .from("posts")
    .select("id, images:post_images(path)")
    .lte("expires_at", now)
    .limit(500);
  if (pErr) report.errors.push(`posts: ${pErr.message}`);

  if (posts && posts.length > 0) {
    const paths = posts.flatMap((p) => p.images.map((i) => i.path));
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from("posts").remove(paths.slice(i, i + 100));
      if (error) report.errors.push(`post files: ${error.message}`);
    }
    const { error } = await admin.from("posts").delete().in("id", posts.map((p) => p.id));
    if (error) report.errors.push(`post rows: ${error.message}`);
    else {
      report.posts = posts.length;
      report.postImages = paths.length;
    }
  }

  // ---- expired stories not saved in a highlight ------------------------
  const { data: stories, error: sErr } = await admin
    .from("stories")
    .select("id, image_path, items:highlight_items(highlight_id)")
    .lte("expires_at", now)
    .limit(1000);
  if (sErr) report.errors.push(`stories: ${sErr.message}`);

  const removable = (stories ?? []).filter((s) => s.items.length === 0);
  if (removable.length > 0) {
    const paths = removable.map((s) => s.image_path);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from("stories").remove(paths.slice(i, i + 100));
      if (error) report.errors.push(`story files: ${error.message}`);
    }
    const { error } = await admin.from("stories").delete().in("id", removable.map((s) => s.id));
    if (error) report.errors.push(`story rows: ${error.message}`);
    else report.stories = removable.length;
  }

  return NextResponse.json({ ok: report.errors.length === 0, ranAt: now, ...report });
}
