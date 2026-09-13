# Dheu — owner's guide

How to run, deploy and look after Dheu. For an overview of the project see the [README](../README.md).

A small, invite-only photo-sharing community. Still images only: posts (up to 10 photos, gone after 30 days), 24-hour stories with highlights, follows, likes, comments, an activity feed (likes / follows / comments / story reactions), and 1-to-1 chat.

Built with **Next.js** (the website) and **Supabase** (database, login, image storage, realtime chat). Hosted for free on **Vercel**.

---

## 1. Running it on your own computer

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The file `.env.local` holds the keys (never share it or commit it to git).

Useful commands:

| Command         | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Start the site locally with live reload       |
| `npm run build` | Check that the site builds (Vercel runs this) |
| `npm run lint`  | Check the code for mistakes                   |

---

## 2. One-time setup checklist

1. **Supabase project** – create one at supabase.com, then run these files in **SQL Editor → New query**, in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_admin.sql`
   - `supabase/migrations/0003_notifications.sql`
   - `supabase/migrations/0004_private_blocks_chat.sql`
   - `supabase/migrations/0005_fixes.sql`
   - `supabase/migrations/0006_announcements.sql`
   - `supabase/migrations/0007_server_read_marks.sql`
2. **Turn off "Confirm email"** – Supabase → Authentication → Sign In / Providers → Email → untick _Confirm email_. (Accounts are created by the app with the invite code, so no confirmation email is needed. The free tier can't send emails to arbitrary addresses anyway.)
3. **Keys** – Supabase → Project Settings → API keys. Put the URL, the _publishable_ key and the _secret_ key in `.env.local` (copy `.env.example`).
4. **First account = admin.** The very first person to sign up doesn't need an invite code and automatically becomes the admin. Do this yourself immediately after deploying.

---

## 3. Deploying to Vercel (free)

1. Push the code to a GitHub repository.
2. On vercel.com → **Add New… → Project** → import the repo. Framework is detected automatically.
3. Under **Environment Variables**, add every line from `.env.local`.
   (`NEXT_PUBLIC_SITE_URL` is only a fallback — the app detects its own address.)
4. Deploy. Every later `git push` redeploys automatically.
5. Vercel runs the cleanup job (`/api/cron/cleanup`) once a day (see `vercel.json`). It needs the `CRON_SECRET` variable to be set in Vercel too.

To use a custom domain later: Vercel → Project → Settings → Domains.

---

## 4. Day-to-day admin

Everything is under **Settings → Open admin panel** (only visible to the admin).

- **Invites** – generate a code, set how many people can use it and when it expires. Members can also make their own single-use codes (Settings → Share with friends, max 5 unused each); those appear here too, marked "by @username". The copy button gives a link like `https://dheu-beige.vercel.app/signup?code=WAVE-XXXX-XXXX` with the code pre-filled.
- **Members** – suspend (blocks login instantly), reinstate, set a temporary password for someone who forgot theirs (tell them privately; they change it in Settings), or delete a member and everything they posted.
- **Privacy** – every account is private: people must send a follow request and be accepted before they see someone's posts and stories. Members can block each other (Settings → Blocked accounts to undo).
- **Announcements** – Messages → *Dheu announcements* (pinned at the top of everyone's inbox). Only you can post there; members get an unread badge and see it instantly. Use it for new features, downtime notices, house rules.
- **Content** – see all active stories and recent posts; delete anything. You can also delete any post from the "…" menu on the post itself.
- **Overview** – member count, storage used vs. the free 1 GB, etc.

---

## 5. Limits of the free tiers (what to expect)

| Service  | Free limit                                       | What happens                                                                                               |
| -------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Supabase | 500 MB database, 1 GB images, 5 GB bandwidth/mo  | Images are resized to 1080 px (~150–400 KB each). Expired posts/stories are deleted daily to free space.   |
| Supabase | Project **pauses after 7 days with no traffic**  | The site shows errors until you click **Restore** in the Supabase dashboard. Regular use prevents this.    |
| Vercel   | 100 GB bandwidth/mo, non-commercial use          | Fine for a small community.                                                                                |

If you outgrow this, Supabase Pro ($25/mo) lifts the limits with no code changes.

---

## 6. If something breaks

- **"Couldn't load stats" in admin** → run `0002_admin.sql` in the SQL Editor.
- **Everything errors after a quiet week** → Supabase project is paused; restore it in the dashboard.
- **Someone can't log in** → check Members: are they suspended? Otherwise set them a temporary password.
- **Images don't upload** → Supabase → Storage: the buckets `avatars`, `posts`, `stories` must exist (they're created by `0001_init.sql`).
- **Rotate a leaked key** → Supabase → Project Settings → API keys → rotate, then update `.env.local` and the Vercel environment variables, and redeploy.

---

## 7. Project layout (for developers)

```
src/app/(auth)/        login & sign-up (server actions in actions.ts)
src/app/(app)/         everything behind login: feed, profiles, posts, stories, chat, admin
src/app/api/cron/      daily cleanup of expired posts/stories
src/components/        UI pieces
src/lib/data/          server-side data queries (Supabase)
src/lib/supabase/      Supabase clients (browser, server, admin) + session refresh (proxy)
src/lib/images.ts      browser-side resize / HEIC conversion / metadata stripping
supabase/migrations/   database schema, security rules (RLS), storage buckets
scripts/build-logo.mjs regenerates public/brand + app icons from the original logo PNGs
```

Security model: every table has Row Level Security. Users can only change their own data; the admin can delete anything. Privileged actions (sign-up, bans, cleanup) run on the server with the secret key.
