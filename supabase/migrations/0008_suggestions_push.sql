-- =====================================================================
--  Dheu — suggested people + push notification plumbing
--  Run AFTER 0007_server_read_marks.sql
--
--  Before running, replace the two placeholders below:
--    __PUSH_URL__     e.g. https://dheu-beige.vercel.app/api/push
--    __PUSH_SECRET__  the same value as PUSH_WEBHOOK_SECRET in Vercel
-- =====================================================================

-- ---------------------------------------------------------------------
-- Suggested people (curated by the admin, shown in the feed)
-- ---------------------------------------------------------------------

create table public.suggested_people (
  user_id   uuid primary key references public.profiles (id) on delete cascade,
  position  integer not null default 0,
  added_by  uuid references public.profiles (id) on delete set null,
  added_at  timestamptz not null default now()
);

alter table public.suggested_people enable row level security;
create policy "members read suggestions" on public.suggested_people
  for select to authenticated using (true);
create policy "admin manages suggestions" on public.suggested_people
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Push subscriptions (one row per device/browser a member enabled)
-- ---------------------------------------------------------------------

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "users manage own push subscriptions" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Outgoing webhook: tell the site whenever something push-worthy happens.
-- pg_net performs the HTTP call asynchronously; Vault holds the secret.
-- ---------------------------------------------------------------------

create extension if not exists pg_net;
create extension if not exists supabase_vault;

select vault.create_secret('__PUSH_URL__', 'push_webhook_url', 'Where Dheu receives push events');
select vault.create_secret('__PUSH_SECRET__', 'push_webhook_secret', 'Shared secret for /api/push');

create or replace function public.notify_push_webhook()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then return new; end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger push_on_notification after insert on public.notifications
  for each row execute function public.notify_push_webhook();
create trigger push_on_message after insert on public.messages
  for each row execute function public.notify_push_webhook();
create trigger push_on_announcement after insert on public.announcements
  for each row execute function public.notify_push_webhook();
