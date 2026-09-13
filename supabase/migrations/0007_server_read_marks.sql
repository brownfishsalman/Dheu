-- =====================================================================
--  Dheu — read markers stamped with the database clock, so a phone whose
--  clock runs slow can't leave messages / announcements stuck as unread.
--  Run AFTER 0006_announcements.sql
-- =====================================================================

create or replace function public.mark_announcements_read()
returns void
language sql security invoker
set search_path = public
as $$
  insert into public.announcement_reads (user_id, last_read_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_read_at = now();
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql security invoker
set search_path = public
as $$
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
$$;
