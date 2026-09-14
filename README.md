<p align="center">
  <img src="docs/screenshots/hero.png" alt="Dheu — a small, invite-only photo community" width="100%" />
</p>

<h1 align="center">Dheu (ঢেউ)</h1>

<p align="center">
  An invite-only, Instagram-style photo community for a small circle of people.<br/>
  Private accounts, posts that fade after 30 days, 24-hour stories, real-time chat with disappearing photos,<br/>push notifications — running entirely on free tiers.
</p>

<p align="center">
  <a href="https://dheu-beige.vercel.app"><img alt="Live" src="https://img.shields.io/badge/live-dheu--beige.vercel.app-1589a5?style=flat-square" /></a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-20232a?style=flat-square&logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%C2%B7%20Auth%20%C2%B7%20Storage%20%C2%B7%20Realtime-3ecf8e?style=flat-square&logo=supabase&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-00273d?style=flat-square" />
</p>

---

*Dheu* means **wave** in Bengali. It was built for one small community that wanted the feel of early Instagram — photos from friends, nothing else — without ads, algorithms, or an audience of strangers. Membership is by invite code only.

## Features

| | |
|---|---|
| **Private by default** | Every account is private. Following is a request the other person accepts or declines from Activity; posts, stories and highlights are visible only to approved followers — enforced by the database, not just the UI. Blocking removes all ties both ways and hides each person from the other. |
| **Posts** | 1–10 photos per post in a swipeable carousel, any aspect ratio, captions, likes (double-tap too), comments. Every post expires 30 days after it's shared. |
| **Stories** | 24-hour photo stories with a full-screen viewer (progress bars, tap / hold / swipe gestures, keyboard on desktop), emoji reactions, text replies that land in chat, "seen by" list, and permanent Highlights on the profile. |
| **Chat** | 1-to-1 messaging delivered instantly over WebSockets; photos that vanish after 7 days; swipe-to-reply with quoted messages; unread badges; a pinned read-only **announcements** thread from the admin in every inbox. |
| **Activity & push** | Alerts for follow requests, accepted requests, likes, comments, new followers and story reactions — created by database triggers, shown with a live badge, and delivered as **Web Push notifications** to installed PWAs (Android, and iOS 16.4+ from the Home Screen). |
| **Discovery** | People search, follower lists, and an admin-curated "Suggested for you" strip that appears in the feed now and then. |
| **Photos** | Resized to 1080 px in the browser before upload, HEIC → JPEG conversion, EXIF orientation applied, GPS and other metadata stripped. |
| **Accounts** | Email + password, invite-code gated sign-up — members generate single-use codes for friends and share them from Settings; first account becomes admin; light / dark / system theme; installable as a home-screen app (PWA). |
| **Admin** | Invite codes with use limits and expiry, member suspension / password reset / deletion, content moderation, suggestions curation, announcements, storage usage overview. |
| **Housekeeping** | A nightly job deletes expired posts, stories, chat photos and old notifications together with their files. |

## Screenshots

<p align="center">
  <img src="docs/screenshots/feed.png" width="19%" alt="Feed with suggested people" />
  <img src="docs/screenshots/story.png" width="19%" alt="Story viewer" />
  <img src="docs/screenshots/post.png" width="19%" alt="Post with comments" />
  <img src="docs/screenshots/activity.png" width="19%" alt="Activity with follow requests" />
  <img src="docs/screenshots/chat.png" width="19%" alt="Chat with a disappearing photo and a quoted reply" />
</p>
<p align="center">
  <img src="docs/screenshots/profile.png" width="19%" alt="Profile" />
  <img src="docs/screenshots/private-profile.png" width="19%" alt="Private profile with a pending request" />
  <img src="docs/screenshots/settings.png" width="19%" alt="Settings: push notifications and invite codes" />
  <img src="docs/screenshots/feed-dark.png" width="19%" alt="Dark mode" />
  <img src="docs/screenshots/login-dark.png" width="19%" alt="Login (dark)" />
</p>
<p align="center">
  <img src="docs/screenshots/desktop-feed.png" width="49%" alt="Desktop feed" />
  <img src="docs/screenshots/desktop-chat.png" width="49%" alt="Desktop chat" />
</p>

<sub>Demo accounts and stock photos; not real members.</sub>

## How it works

```mermaid
flowchart LR
  B["Browser / installed PWA<br/>React 19 client components<br/>+ service worker"]
  V["Vercel (sin1)<br/>Next.js 16 server components,<br/>server actions, /api/push, nightly cron"]
  subgraph S["Supabase (ap-southeast-1)"]
    DB[("Postgres<br/>22 tables · 78 RLS policies<br/>14 triggers · Vault")]
    AUTH["Auth<br/>email + password, ES256 JWT"]
    ST["Storage<br/>avatars · posts · stories · chat"]
    RT["Realtime<br/>Postgres changes over WebSocket"]
  end
  P["Push services<br/>FCM / APNs / Mozilla"]
  B -- "pages & actions" --> V
  V -- "queries (user JWT) /<br/>privileged ops (secret key)" --> DB
  B -- "likes, follows, comments,<br/>uploads (user JWT)" --> DB & ST
  B -- "chat, badges, announcements" --> RT
  RT --> DB
  DB -- "pg_net webhook on<br/>notification / message / announcement" --> V
  V -- "Web Push (VAPID)" --> P
  P -- "push event" --> B
  B --> AUTH
```

**One codebase, no separate backend.** Next.js server components render pages on Vercel and query Supabase directly; interactive pieces (feed, story viewer, chat, uploads) are client components that talk to Supabase from the browser.

**Security lives in the database.** Every table has Row Level Security — 78 policies evaluated inside Postgres against the caller's JWT. Members can only change their own rows, read chats they belong to, or touch the `read_at` column of their own notifications; the admin can delete anything. The browser only ever holds a publishable key that grants nothing on its own. Privileged operations (invite-gated sign-up, bans, cleanup, push sending) run server-side with the secret key.

**Privacy is a function.** `can_view_content_of(author)` — self, or an approved follow, and never across a block — is the single predicate behind the RLS policies for posts, images, comments, likes, stories and highlights. Following is a `follow_requests` row that only `accept_follow_request()` can turn into a `follows` row; blocking fires a trigger that removes follows, requests and notifications in both directions.

**Notifications are triggers.** Inserting a like, follow request, comment or story reaction fires a PL/pgSQL trigger that writes a notification row (and deletes it again on unlike / decline). Realtime streams the insert to the recipient's open tab.

**Push goes database → site → device.** A second trigger on notifications, messages and announcements calls the site's `/api/push` through `pg_net` (asynchronously, with a shared secret kept in Supabase Vault, and never able to block the original insert). The endpoint looks up the recipient's devices and sends a VAPID-signed Web Push; the service worker shows it and opens the right screen on tap. Read markers are stamped with the database clock so a phone with a slow clock can't leave things "unread".

**Images never touch a server.** The browser decodes the file (including HEIC via a WebAssembly build of libheif), fixes orientation, redraws it on a canvas at ≤ 1080 × 1920 — which also strips all metadata — and uploads the JPEG straight to Storage under `<userId>/<uuid>.jpg`. Storage policies only allow writes into your own folder.

**Expiry is a timestamp.** `posts.expires_at` defaults to `now() + 30 days` and chat photos get `image_expires_at = now() + 7 days`; RLS hides expired rows instantly and a Vercel cron job (`/api/cron/cleanup`) removes rows and files nightly, keeping highlighted stories.

**Region matters.** Vercel functions are pinned next to the database (`vercel.json`); that alone cut page render time by roughly 4×. Badge counts are rendered on the server and kept fresh over one shared Realtime channel, and a `loading.tsx` skeleton makes navigation feel instant.

## Stack

- **Next.js 16** (App Router, Turbopack, server actions, `proxy.ts` for session refresh) · **React 19** · **TypeScript** (strict; hand-written `Database` type mirrors the schema so every query is type-checked)
- **Tailwind CSS 4** with a small token set; light / dark themes; Inter + Outfit
- **Supabase**: Postgres (with `pg_net` webhooks and Vault), Auth, Storage, Realtime — schema, policies and triggers in [`supabase/migrations`](supabase/migrations)
- **Vercel** for hosting, functions pinned to the database's region, cron
- **web-push** (VAPID) for notifications, **zod** for input validation, **lucide-react** icons, **heic-to** for HEIC decoding

~8,400 lines of TypeScript, ~1,200 lines of SQL (22 tables, 78 RLS policies, 14 triggers, 30 functions), ten runtime dependencies.

## Running it yourself

```bash
git clone https://github.com/brownfishsalman/Dheu.git
cd Dheu
npm install
cp .env.example .env.local   # fill in your Supabase URL + keys
npm run dev
```

Then create a free Supabase project, run the files in `supabase/migrations/` in order in its SQL editor, and turn off "Confirm email" under Authentication. The first account to sign up becomes the admin. Full step-by-step instructions — including deploying to Vercel and day-to-day administration — are in the [owner's guide](docs/OWNER-GUIDE.md).

## Project layout

```
src/app/(auth)/            login & sign-up (server actions)
src/app/(app)/             everything behind login: feed, profiles, posts, stories,
                           highlights, messages, activity, settings, admin
src/app/api/cron/cleanup/  nightly expiry job
src/app/api/push/          receives database webhooks, sends Web Push
src/lib/push.ts            VAPID sending · src/lib/push-client.ts subscribe/unsubscribe · public/sw.js
src/proxy.ts               session refresh + login gate (runs on every request)
src/components/            UI: post/ story/ chat/ activity/ profile/ admin/ nav/ ui/ brand/
src/lib/data/              server-only query functions
src/lib/supabase/          browser / server / admin clients, realtime auth helper
src/lib/images.ts          browser-side image pipeline
supabase/migrations/       schema, RLS policies, triggers, storage buckets
scripts/build-logo.mjs     regenerates icons from the original logo artwork
```

## Design notes

- **Free-tier first.** 50 members, 1 GB of images. Resizing to 1080 px and expiring posts after 30 days keeps storage flat.
- **Public-read image URLs.** Files sit at unguessable paths in public buckets instead of signing every URL; a deliberate trade-off for simplicity in a trusted community.
- **No email.** Free-tier SMTP can't reach arbitrary addresses, so sign-up needs no confirmation and password resets go through the admin.
- **Region matters.** Moving Vercel's functions next to the database cut page render time by roughly 4× — see `vercel.json`.
- **Secrets never sit in the repo.** The push webhook secret lives in Supabase Vault and Vercel env vars; the committed migration carries placeholders.
- **Fail-safe side effects.** The push webhook trigger swallows its own errors so a notification hiccup can never block a like or a message.

## License

[MIT](LICENSE) © Salman Saadiq. The logo and the name *Dheu* are not covered by the licence.
