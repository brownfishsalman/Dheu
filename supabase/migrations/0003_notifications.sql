-- =====================================================================
--  Dheu — in-app notifications (likes, follows, comments, story reactions)
--  Run AFTER 0002_admin.sql (SQL Editor → New query → paste → Run)
-- =====================================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade, -- recipient
  actor_id    uuid not null references public.profiles (id) on delete cascade, -- who did it
  type        text not null check (type in ('like', 'follow', 'comment', 'story_reaction')),
  post_id     uuid references public.posts (id) on delete cascade,
  comment_id  uuid references public.comments (id) on delete cascade,
  story_id    uuid references public.stories (id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- One notification per actor for the same like / follow / story reaction.
create unique index notifications_like_uniq
  on public.notifications (user_id, actor_id, post_id) where type = 'like';
create unique index notifications_follow_uniq
  on public.notifications (user_id, actor_id) where type = 'follow';
create unique index notifications_story_reaction_uniq
  on public.notifications (user_id, actor_id, story_id) where type = 'story_reaction';

-- ---------------------------------------------------------------------
-- Triggers that create / remove notifications
-- ---------------------------------------------------------------------

create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is null or v_author = new.user_id then return new; end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (v_author, new.user_id, 'like', new.post_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.unnotify_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications
  where type = 'like' and actor_id = old.user_id and post_id = old.post_id;
  return old;
end;
$$;

create trigger on_post_like_notify   after insert on public.post_likes for each row execute function public.notify_post_like();
create trigger on_post_like_unnotify after delete on public.post_likes for each row execute function public.unnotify_post_like();

create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow')
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.unnotify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.notifications
  where type = 'follow' and actor_id = old.follower_id and user_id = old.following_id;
  return old;
end;
$$;

create trigger on_follow_notify   after insert on public.follows for each row execute function public.notify_follow();
create trigger on_follow_unnotify after delete on public.follows for each row execute function public.unnotify_follow();

create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is null or v_author = new.author_id then return new; end if;
  insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
  values (v_author, new.author_id, 'comment', new.post_id, new.id);
  return new;
end;
$$;

create trigger on_comment_notify after insert on public.comments for each row execute function public.notify_comment();

create or replace function public.notify_story_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.stories where id = new.story_id;
  if v_author is null or v_author = new.user_id then return new; end if;
  insert into public.notifications (user_id, actor_id, type, story_id)
  values (v_author, new.user_id, 'story_reaction', new.story_id)
  on conflict (user_id, actor_id, story_id) where type = 'story_reaction'
  do update set created_at = now(), read_at = null;
  return new;
end;
$$;

create trigger on_story_reaction_notify
  after insert or update on public.story_reactions
  for each row execute function public.notify_story_reaction();

-- ---------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------

alter table public.notifications enable row level security;

create policy "users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "users mark own notifications read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own notifications" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- members may only change the read marker; rows are created by the triggers above
revoke insert, update on public.notifications from authenticated;
grant  update (read_at) on public.notifications to authenticated;

-- live badge updates
alter publication supabase_realtime add table public.notifications;
