-- =====================================================================
--  Dheu — fixes found while testing 0004
--  Run AFTER 0004_private_blocks_chat.sql
-- =====================================================================

-- A member who has been blocked can't see the block row (RLS), so the
-- profile policy must check through a privileged function.
create or replace function public.has_blocked_me(p_user uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.blocks where blocker_id = p_user and blocked_id = auth.uid());
$$;

drop policy "members can read profiles" on public.profiles;
create policy "members can read profiles" on public.profiles
  for select to authenticated using (id = auth.uid() or not public.has_blocked_me(id));

-- A photo-only message keeps its row after the photo expires (shown as "Photo expired").
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (
    char_length(body) <= 2000
    and (char_length(body) > 0 or image_path is not null or image_expires_at is not null)
  );
