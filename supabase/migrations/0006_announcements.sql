-- =====================================================================
--  Dheu — announcements thread (admin posts, everyone reads)
--  Run AFTER 0005_fixes.sql
-- =====================================================================

create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index announcements_created_idx on public.announcements (created_at desc);

-- When each member last opened the announcements thread.
create table public.announcement_reads (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  last_read_at  timestamptz not null default now()
);

alter table public.announcements      enable row level security;
alter table public.announcement_reads enable row level security;

create policy "members read announcements" on public.announcements
  for select to authenticated using (true);
create policy "admin posts announcements" on public.announcements
  for insert to authenticated with check (public.is_admin() and author_id = auth.uid());
create policy "admin edits announcements" on public.announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes announcements" on public.announcements
  for delete to authenticated using (public.is_admin());

create policy "users manage own announcement read marker" on public.announcement_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Announcements newer than the caller's read marker.
create or replace function public.unread_announcement_count()
returns integer
language sql stable security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.announcements a
  where a.created_at > coalesce(
    (select r.last_read_at from public.announcement_reads r where r.user_id = auth.uid()),
    'epoch'::timestamptz
  );
$$;

alter publication supabase_realtime add table public.announcements;
