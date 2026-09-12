-- =====================================================================
--  Dheu — admin helpers
--  Run AFTER 0001_init.sql (SQL Editor → New query → paste → Run)
-- =====================================================================

-- Platform totals for the admin dashboard, incl. storage used per bucket.
-- Server-only (called with the secret key after checking the caller is admin).
create or replace function public.admin_stats()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'members',        (select count(*) from public.profiles),
    'banned',         (select count(*) from public.profiles where banned_at is not null),
    'live_posts',     (select count(*) from public.posts where expires_at > now()),
    'expired_posts',  (select count(*) from public.posts where expires_at <= now()),
    'live_stories',   (select count(*) from public.stories where expires_at > now()),
    'messages',       (select count(*) from public.messages),
    'invite_codes',   (select count(*) from public.invite_codes where not disabled),
    'storage', (
      select coalesce(jsonb_object_agg(bucket_id, bytes), '{}'::jsonb)
      from (
        select bucket_id, sum(coalesce((metadata ->> 'size')::bigint, 0)) as bytes
        from storage.objects
        where bucket_id in ('avatars', 'posts', 'stories')
        group by bucket_id
      ) s
    )
  );
$$;

revoke execute on function public.admin_stats() from public, anon, authenticated;
