-- =====================================================================
--  Dheu — initial database schema
--  Run once on a fresh Supabase project:
--  Supabase dashboard → SQL Editor → New query → paste → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  note        text not null default '',
  max_uses    integer not null default 1 check (max_uses >= 1),
  use_count   integer not null default 0 check (use_count >= 0),
  expires_at  timestamptz,
  disabled    boolean not null default false,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  full_name       text not null check (char_length(full_name) between 1 and 60),
  bio             text not null default '' check (char_length(bio) <= 300),
  avatar_path     text,
  is_admin        boolean not null default false,
  banned_at       timestamptz,
  invite_code_id  uuid references public.invite_codes (id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.invite_codes
  add constraint invite_codes_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

create table public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  caption     text not null default '' check (char_length(caption) <= 2200),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days')
);
create index posts_author_idx  on public.posts (author_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index posts_expires_idx on public.posts (expires_at);

create table public.post_images (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references public.posts (id) on delete cascade,
  path      text not null,
  width     integer not null check (width > 0),
  height    integer not null check (height > 0),
  position  smallint not null default 0 check (position between 0 and 9),
  unique (post_id, position)
);

create table public.post_likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.stories (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  image_path  text not null,
  width       integer not null check (width > 0),
  height      integer not null check (height > 0),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours')
);
create index stories_author_idx  on public.stories (author_id, created_at desc);
create index stories_expires_idx on public.stories (expires_at);

create table public.story_views (
  story_id   uuid not null references public.stories (id) on delete cascade,
  viewer_id  uuid not null references public.profiles (id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.story_reactions (
  story_id    uuid not null references public.stories (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  emoji       text not null check (char_length(emoji) between 1 and 8),
  created_at  timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table public.story_highlights (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 30),
  cover_story_id  uuid references public.stories (id) on delete set null,
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);
create index story_highlights_owner_idx on public.story_highlights (owner_id, position);

create table public.highlight_items (
  highlight_id  uuid not null references public.story_highlights (id) on delete cascade,
  story_id      uuid not null references public.stories (id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (highlight_id, story_id)
);
create index highlight_items_story_idx on public.highlight_items (story_id);

create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  user_a           uuid not null references public.profiles (id) on delete cascade,
  user_b           uuid not null references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz,
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index conversations_user_a_idx on public.conversations (user_a);
create index conversations_user_b_idx on public.conversations (user_b);

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 2000),
  story_id         uuid references public.stories (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.conversation_reads (
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  last_read_at     timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  );
$$;

-- Create a profile row whenever an auth user is created.
-- The very first account on the platform becomes the admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, invite_code_id, is_admin)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'invite_code_id', '')::uuid,
    not exists (select 1 from public.profiles)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically consume one use of an invite code. Server-only (secret key).
create or replace function public.claim_invite_code(p_code text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v public.invite_codes%rowtype;
begin
  select * into v from public.invite_codes
  where code = upper(trim(p_code))
  for update;

  if not found then raise exception 'INVITE_INVALID'; end if;
  if v.disabled then raise exception 'INVITE_DISABLED'; end if;
  if v.expires_at is not null and v.expires_at < now() then raise exception 'INVITE_EXPIRED'; end if;
  if v.use_count >= v.max_uses then raise exception 'INVITE_USED_UP'; end if;

  update public.invite_codes set use_count = use_count + 1 where id = v.id;
  return v.id;
end;
$$;

create or replace function public.release_invite_code(p_id uuid)
returns void
language sql security definer
set search_path = public
as $$
  update public.invite_codes set use_count = greatest(use_count - 1, 0) where id = p_id;
$$;

revoke execute on function public.claim_invite_code(text)   from public, anon, authenticated;
revoke execute on function public.release_invite_code(uuid) from public, anon, authenticated;

-- Keep conversations.last_message_at fresh.
create or replace function public.touch_conversation()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Find or create the 1-to-1 conversation between me and another user.
create or replace function public.get_or_create_conversation(p_other_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  a   uuid;
  b   uuid;
  cid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_other_id = me then raise exception 'cannot message yourself'; end if;
  if not exists (select 1 from public.profiles where id = p_other_id) then
    raise exception 'user not found';
  end if;

  a := least(me, p_other_id);
  b := greatest(me, p_other_id);

  select id into cid from public.conversations where user_a = a and user_b = b;
  if cid is null then
    insert into public.conversations (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do update set user_a = excluded.user_a
    returning id into cid;
  end if;
  return cid;
end;
$$;

-- Unread message count per conversation for the calling user.
create or replace function public.unread_counts()
returns table (conversation_id uuid, unread bigint)
language sql stable security invoker
set search_path = public
as $$
  select c.id, count(m.id)
  from public.conversations c
  left join public.conversation_reads r
    on r.conversation_id = c.id and r.user_id = auth.uid()
  left join public.messages m
    on m.conversation_id = c.id
   and m.sender_id <> auth.uid()
   and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
  where c.user_a = auth.uid() or c.user_b = auth.uid()
  group by c.id;
$$;

-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------

-- Posts with counts and "did I like it", respecting the caller's RLS.
create view public.post_feed
with (security_invoker = true) as
select
  p.id,
  p.author_id,
  p.caption,
  p.created_at,
  p.expires_at,
  (select count(*) from public.post_likes l where l.post_id = p.id)::integer as like_count,
  (select count(*) from public.comments c where c.post_id = p.id)::integer  as comment_count,
  exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me
from public.posts p;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.invite_codes       enable row level security;
alter table public.profiles           enable row level security;
alter table public.follows            enable row level security;
alter table public.posts              enable row level security;
alter table public.post_images        enable row level security;
alter table public.post_likes         enable row level security;
alter table public.comments           enable row level security;
alter table public.stories            enable row level security;
alter table public.story_views        enable row level security;
alter table public.story_reactions    enable row level security;
alter table public.story_highlights   enable row level security;
alter table public.highlight_items    enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.conversation_reads enable row level security;

-- invite_codes: admin only
create policy "admin manages invite codes" on public.invite_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy "members can read profiles" on public.profiles
  for select to authenticated using (true);
create policy "users edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admin edits any profile" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- normal members may only touch these columns (admin flags stay server-side)
revoke update on public.profiles from authenticated;
grant  update (username, full_name, bio, avatar_path) on public.profiles to authenticated;

-- follows
create policy "members can read follows" on public.follows
  for select to authenticated using (true);
create policy "users follow" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());
create policy "users unfollow" on public.follows
  for delete to authenticated using (follower_id = auth.uid());

-- posts (expired posts are invisible to everyone but admin)
create policy "members read live posts" on public.posts
  for select to authenticated using (expires_at > now() or public.is_admin());
create policy "users create posts" on public.posts
  for insert to authenticated with check (author_id = auth.uid());
create policy "users edit own posts" on public.posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "users or admin delete posts" on public.posts
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());
revoke update on public.posts from authenticated;
grant  update (caption) on public.posts to authenticated;

-- post_images
create policy "members read post images" on public.post_images
  for select to authenticated using (true);
create policy "authors add images" on public.post_images
  for insert to authenticated with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );
create policy "authors or admin delete images" on public.post_images
  for delete to authenticated using (
    public.is_admin() or
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- post_likes
create policy "members read likes" on public.post_likes
  for select to authenticated using (true);
create policy "users like" on public.post_likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "users unlike" on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

-- comments
create policy "members read comments" on public.comments
  for select to authenticated using (true);
create policy "users comment" on public.comments
  for insert to authenticated with check (author_id = auth.uid());
create policy "author, post owner or admin delete comments" on public.comments
  for delete to authenticated using (
    author_id = auth.uid() or public.is_admin() or
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- stories
create policy "members read stories" on public.stories
  for select to authenticated using (true);
create policy "users post stories" on public.stories
  for insert to authenticated with check (author_id = auth.uid());
create policy "users or admin delete stories" on public.stories
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- story_views: the author sees who viewed; viewers see their own view rows
create policy "author or viewer reads views" on public.story_views
  for select to authenticated using (
    viewer_id = auth.uid() or
    exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );
create policy "users record own views" on public.story_views
  for insert to authenticated with check (viewer_id = auth.uid());

-- story_reactions
create policy "author or reactor reads reactions" on public.story_reactions
  for select to authenticated using (
    user_id = auth.uid() or
    exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );
create policy "users react" on public.story_reactions
  for insert to authenticated with check (user_id = auth.uid());
create policy "users change reaction" on public.story_reactions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users remove reaction" on public.story_reactions
  for delete to authenticated using (user_id = auth.uid());

-- story_highlights
create policy "members read highlights" on public.story_highlights
  for select to authenticated using (true);
create policy "users manage own highlights" on public.story_highlights
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "admin deletes highlights" on public.story_highlights
  for delete to authenticated using (public.is_admin());

-- highlight_items
create policy "members read highlight items" on public.highlight_items
  for select to authenticated using (true);
create policy "owners add own stories to own highlights" on public.highlight_items
  for insert to authenticated with check (
    exists (select 1 from public.story_highlights h where h.id = highlight_id and h.owner_id = auth.uid()) and
    exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
  );
create policy "owners or admin remove highlight items" on public.highlight_items
  for delete to authenticated using (
    public.is_admin() or
    exists (select 1 from public.story_highlights h where h.id = highlight_id and h.owner_id = auth.uid())
  );

-- conversations (created only through get_or_create_conversation)
create policy "members read own conversations" on public.conversations
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- messages
create policy "members read own messages" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "members send messages" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and public.is_conversation_member(conversation_id)
  );
create policy "senders or admin delete messages" on public.messages
  for delete to authenticated using (sender_id = auth.uid() or public.is_admin());

-- conversation_reads
create policy "users manage own read markers" on public.conversation_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Realtime (chat)
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------
-- Storage buckets + policies
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('posts',   'posts',   true, 6291456, array['image/jpeg', 'image/png', 'image/webp']),
  ('stories', 'stories', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "members read images" on storage.objects
  for select to authenticated using (bucket_id in ('avatars', 'posts', 'stories'));

create policy "users upload into own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('avatars', 'posts', 'stories')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users replace own files" on storage.objects
  for update to authenticated using (
    bucket_id in ('avatars', 'posts', 'stories')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users or admin delete files" on storage.objects
  for delete to authenticated using (
    bucket_id in ('avatars', 'posts', 'stories')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
