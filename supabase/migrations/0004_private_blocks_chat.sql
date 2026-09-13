-- =====================================================================
--  Dheu — private accounts (follow requests), blocking, chat photos,
--  reply-to-message, member invite codes
--  Run AFTER 0003_notifications.sql (SQL Editor → New query → paste → Run)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.follow_requests (
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  target_id     uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (requester_id, target_id),
  check (requester_id <> target_id)
);
create index follow_requests_target_idx on public.follow_requests (target_id);

-- chat photos (expire after 7 days) + reply-to
alter table public.messages
  add column image_path       text,
  add column image_expires_at timestamptz,
  add column reply_to_id      uuid references public.messages (id) on delete set null;

alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 2000 and (char_length(body) > 0 or image_path is not null));

create index messages_image_expiry_idx on public.messages (image_expires_at) where image_path is not null;

-- new notification kinds
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'follow', 'comment', 'story_reaction', 'follow_request', 'follow_accepted'));
create unique index notifications_follow_request_uniq
  on public.notifications (user_id, actor_id) where type = 'follow_request';

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------

-- True if either user has blocked the other.
create or replace function public.blocked_either(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- 'by_me' | 'by_them' | 'both' | null — how I and another user stand.
create or replace function public.block_status(p_other uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = p_other)
     and exists (select 1 from public.blocks where blocker_id = p_other and blocked_id = auth.uid()) then 'both'
    when exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = p_other) then 'by_me'
    when exists (select 1 from public.blocks where blocker_id = p_other and blocked_id = auth.uid()) then 'by_them'
    else null end;
$$;

-- Can the caller see content (posts, stories, highlights) by this author?
-- Own content, admin, or an approved follow — and never across a block.
create or replace function public.can_view_content_of(p_author uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select (
    p_author = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.follows where follower_id = auth.uid() and following_id = p_author)
  ) and not public.blocked_either(auth.uid(), p_author);
$$;

create or replace function public.conversation_blocked(p_conversation_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    join public.blocks b on (b.blocker_id = c.user_a and b.blocked_id = c.user_b)
                        or (b.blocker_id = c.user_b and b.blocked_id = c.user_a)
    where c.id = p_conversation_id
  );
$$;

-- Accept a follow request addressed to me.
create or replace function public.accept_follow_request(p_requester uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.follow_requests where requester_id = p_requester and target_id = me) then
    raise exception 'no such request';
  end if;
  delete from public.follow_requests where requester_id = p_requester and target_id = me;
  insert into public.follows (follower_id, following_id) values (p_requester, me) on conflict do nothing;
  insert into public.notifications (user_id, actor_id, type) values (p_requester, me, 'follow_accepted');
end;
$$;

-- Blocking removes any relationship in both directions.
create or replace function public.on_block()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  delete from public.follow_requests
   where (requester_id = new.blocker_id and target_id = new.blocked_id)
      or (requester_id = new.blocked_id and target_id = new.blocker_id);
  delete from public.notifications
   where (user_id = new.blocker_id and actor_id = new.blocked_id)
      or (user_id = new.blocked_id and actor_id = new.blocker_id);
  return new;
end;
$$;
create trigger on_block_insert after insert on public.blocks for each row execute function public.on_block();

-- Follow-request notifications
create or replace function public.notify_follow_request()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.target_id, new.requester_id, 'follow_request')
  on conflict do nothing;
  return new;
end;
$$;
create or replace function public.unnotify_follow_request()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'follow_request' and user_id = old.target_id and actor_id = old.requester_id;
  return old;
end;
$$;
create trigger on_follow_request_notify   after insert on public.follow_requests for each row execute function public.notify_follow_request();
create trigger on_follow_request_unnotify after delete on public.follow_requests for each row execute function public.unnotify_follow_request();

-- Conversations can't be started across a block.
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
  if public.blocked_either(me, p_other_id) then raise exception 'blocked'; end if;

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

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.blocks          enable row level security;
alter table public.follow_requests enable row level security;

create policy "users see own blocks" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "users block" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "users unblock" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

create policy "parties see follow requests" on public.follow_requests
  for select to authenticated using (requester_id = auth.uid() or target_id = auth.uid());
create policy "users send follow requests" on public.follow_requests
  for insert to authenticated with check (
    requester_id = auth.uid()
    and not public.blocked_either(auth.uid(), target_id)
    and not exists (select 1 from public.follows where follower_id = auth.uid() and following_id = target_id)
  );
create policy "requester cancels or target declines" on public.follow_requests
  for delete to authenticated using (requester_id = auth.uid() or target_id = auth.uid());

-- follows: no direct inserts any more (only accept_follow_request); followers can be removed by either side
drop policy "users follow" on public.follows;
drop policy "users unfollow" on public.follows;
create policy "either side removes a follow" on public.follows
  for delete to authenticated using (follower_id = auth.uid() or following_id = auth.uid());

-- profiles: someone who blocked you disappears
drop policy "members can read profiles" on public.profiles;
create policy "members can read profiles" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or not exists (select 1 from public.blocks where blocker_id = id and blocked_id = auth.uid())
  );

-- content: approved followers only (and never across a block)
drop policy "members read live posts" on public.posts;
create policy "followers read live posts" on public.posts
  for select to authenticated using (expires_at > now() and public.can_view_content_of(author_id));

drop policy "members read post images" on public.post_images;
create policy "followers read post images" on public.post_images
  for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));

drop policy "members read likes" on public.post_likes;
create policy "followers read likes" on public.post_likes
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id)
    and not public.blocked_either(auth.uid(), user_id)
  );
drop policy "users like" on public.post_likes;
create policy "users like visible posts" on public.post_likes
  for insert to authenticated with check (
    user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy "members read comments" on public.comments;
create policy "followers read comments" on public.comments
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id)
    and not public.blocked_either(auth.uid(), author_id)
  );
drop policy "users comment" on public.comments;
create policy "users comment on visible posts" on public.comments
  for insert to authenticated with check (
    author_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy "members read stories" on public.stories;
create policy "followers read stories" on public.stories
  for select to authenticated using (public.can_view_content_of(author_id));

drop policy "members read highlights" on public.story_highlights;
create policy "followers read highlights" on public.story_highlights
  for select to authenticated using (public.can_view_content_of(owner_id));

drop policy "members read highlight items" on public.highlight_items;
create policy "followers read highlight items" on public.highlight_items
  for select to authenticated using (exists (select 1 from public.story_highlights h where h.id = highlight_id));

-- messages: no sending across a block; members may clear their own photo
drop policy "members send messages" on public.messages;
create policy "members send messages" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
    and not public.conversation_blocked(conversation_id)
  );

-- invite codes: members see the codes they generated (creation happens server-side)
create policy "members read own invite codes" on public.invite_codes
  for select to authenticated using (created_by = auth.uid());

-- ---------------------------------------------------------------------
-- Storage: chat photos
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "members read chat photos" on storage.objects
  for select to authenticated using (bucket_id = 'chat');
create policy "users upload chat photos into own folder" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users or admin delete chat photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'chat' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
