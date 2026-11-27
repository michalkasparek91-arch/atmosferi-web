-- Reads the michal@atmosferi.com mailbox (IMAP) every 10 minutes:
-- real replies -> email_replies, bounces -> blocked addresses, auto-replies -> archived.

create table if not exists public.email_inbox_sync_state (
  id integer primary key check (id = 1),
  uid_validity bigint,
  last_uid bigint not null default 0,
  last_run_at timestamptz,
  last_error text,
  replies_total integer not null default 0,
  bounces_total integer not null default 0,
  skipped_total integer not null default 0
);
insert into public.email_inbox_sync_state (id) values (1) on conflict (id) do nothing;
alter table public.email_inbox_sync_state enable row level security;
revoke all on public.email_inbox_sync_state from anon, authenticated;
grant select on public.email_inbox_sync_state to authenticated;
grant select, insert, update on public.email_inbox_sync_state to service_role;
drop policy if exists "Admins read inbox sync state" on public.email_inbox_sync_state;
create policy "Admins read inbox sync state" on public.email_inbox_sync_state
  for select to authenticated using (public.is_admin((select auth.uid())));

-- Replies: one row per mailbox message, plus what the sync found out about it.
alter table public.email_replies
  add column if not exists message_id text,
  add column if not exists kind text not null default 'reply',      -- reply | bounce | auto
  add column if not exists bounced_email text,
  add column if not exists received_at timestamptz;
-- Full (not partial) unique index so upsert ... on conflict (message_id) works; NULLs stay allowed.
create unique index if not exists email_replies_message_id_key on public.email_replies (message_id);

-- email_replies used to be open to anyone with the public key. Admins only from now on.
drop policy if exists "Enable read access for all users" on public.email_replies;
drop policy if exists "Enable insert access for all users" on public.email_replies;
drop policy if exists "Enable update access for all users" on public.email_replies;
drop policy if exists "Enable delete access for all users" on public.email_replies;
revoke all on public.email_replies from anon;
grant select, update, delete on public.email_replies to authenticated;
grant all on public.email_replies to service_role;
drop policy if exists "Admins manage email replies" on public.email_replies;
create policy "Admins manage email replies" on public.email_replies
  for all to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- The agency trigger should react to real replies only (not to bounces or auto-replies).
create or replace function public.agency_outreach_on_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(new.from_email));
begin
  if coalesce(new.kind, 'reply') <> 'reply' then return new; end if;
  if new.ai_sentiment = 'unsubscribe' then
    update public.agency_outreach_leads
       set outreach_status = 'do_not_contact', updated_at = now()
     where lower(email) = v_email;
    insert into public.email_recipient_suppression (email, reason)
    values (v_email, 'agency_outreach_unsubscribe') on conflict (email) do nothing;
  else
    update public.agency_outreach_leads
       set outreach_status = 'replied', updated_at = now()
     where lower(email) = v_email
       and outreach_status in ('new','queued','sent','opened');
  end if;
  return new;
end $$;

grant select, insert on public.email_recipient_suppression to service_role;
grant select, update on public.marketing_leads to service_role;
grant select on public.email_outbox to service_role;

select cron.unschedule('inbox-sync')
 where exists (select 1 from cron.job where jobname = 'inbox-sync');
select cron.schedule('inbox-sync', '*/10 * * * *', $cron$
 select net.http_post(
  url := 'https://paryiowezqlnffanxtnt.supabase.co/functions/v1/sync-inbox',
  headers := jsonb_build_object('Content-Type','application/json','x-atmosferi-cron-token',
   (select decrypted_secret from vault.decrypted_secrets where name = 'atmosferi_email_dispatch_token')),
  body := '{}'::jsonb, timeout_milliseconds := 120000);
$cron$);
