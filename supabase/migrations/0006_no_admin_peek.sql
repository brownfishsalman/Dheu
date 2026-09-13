-- =====================================================================
--  Dheu — the admin account no longer bypasses follower-only visibility.
--  Moderation goes through the admin panel (privileged key) instead.
--  Run AFTER 0005_fixes.sql
-- =====================================================================

create or replace function public.can_view_content_of(p_author uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select (
    p_author = auth.uid()
    or exists (select 1 from public.follows where follower_id = auth.uid() and following_id = p_author)
  ) and not public.blocked_either(auth.uid(), p_author);
$$;

-- Real number of live posts, shown on private profiles too (the rows themselves stay hidden).
create or replace function public.live_post_count(p_user uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::integer from public.posts where author_id = p_user and expires_at > now();
$$;
