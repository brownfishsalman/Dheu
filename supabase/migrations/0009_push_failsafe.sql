-- =====================================================================
--  Dheu — push webhook hotfix
--  1) sets the real webhook URL/secret (replace the placeholders below)
--  2) makes the trigger fail-safe: a webhook error never blocks the insert
--  Run AFTER 0008_suggestions_push.sql
-- =====================================================================

select vault.update_secret(
  (select id from vault.secrets where name = 'push_webhook_url'),
  '__PUSH_URL__'
);
select vault.update_secret(
  (select id from vault.secrets where name = 'push_webhook_secret'),
  '__PUSH_SECRET__'
);

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
  if v_url is null or v_secret is null or v_url not like 'https://%' then return new; end if;

  begin
    perform net.http_post(
      url     := v_url,
      body    := jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new)),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      timeout_milliseconds := 5000
    );
  exception when others then
    -- Never let a notification problem stop the actual like / message / comment.
    raise warning 'push webhook skipped: %', sqlerrm;
  end;
  return new;
end;
$$;
