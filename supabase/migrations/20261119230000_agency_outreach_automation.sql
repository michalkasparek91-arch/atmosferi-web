-- Agency outreach: automatic daily sending, follow-up, history and test sends.
-- Sending happens in the dispatch-agency-emails edge function (SMTP, From michal@atmosferi.com).
-- Nothing is sent until an admin switches agency_outreach_settings.enabled on.

create table if not exists public.agency_outreach_settings (
  id integer primary key check (id = 1),
  enabled boolean not null default false,
  daily_limit integer not null default 25 check (daily_limit between 1 and 100),
  followup_enabled boolean not null default true,
  followup_after_days integer not null default 6 check (followup_after_days between 2 and 30),
  sender_email text not null default 'michal@atmosferi.com',
  sender_name text not null default 'Michal Kašpárek · Atmosferi°',
  test_email text not null default 'michal.kasparek91@gmail.com',
  last_run_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
insert into public.agency_outreach_settings (id) values (1) on conflict (id) do nothing;

alter table public.agency_outreach_leads
  add column if not exists sent_count integer not null default 0,
  add column if not exists followup_sent_at timestamptz,
  add column if not exists last_error text;

create table if not exists public.agency_outreach_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.agency_outreach_leads(id) on delete set null,
  kind text not null check (kind in ('intro','followup','test')),
  email text not null,
  subject text not null,
  status text not null check (status in ('sent','failed')),
  message_id text,
  error text,
  sent_at timestamptz not null default now()
);
create index if not exists agency_outreach_log_sent_idx on public.agency_outreach_log (sent_at desc);
create index if not exists agency_outreach_log_lead_idx on public.agency_outreach_log (lead_id);

alter table public.agency_outreach_settings enable row level security;
alter table public.agency_outreach_log enable row level security;
revoke all on public.agency_outreach_settings, public.agency_outreach_log from anon, authenticated;
grant select, update on public.agency_outreach_settings to authenticated;
grant select on public.agency_outreach_log to authenticated;
drop policy if exists "Atmosferi admins manage agency outreach settings" on public.agency_outreach_settings;
create policy "Atmosferi admins manage agency outreach settings"
 on public.agency_outreach_settings for all to authenticated
 using (public.is_admin((select auth.uid())))
 with check (public.is_admin((select auth.uid())));
drop policy if exists "Atmosferi admins read agency outreach log" on public.agency_outreach_log;
create policy "Atmosferi admins read agency outreach log"
 on public.agency_outreach_log for select to authenticated
 using (public.is_admin((select auth.uid())));

-- Follow-up template (editable in the admin).
insert into public.agency_outreach_templates (slug, name, subject, body)
values ('agency-followup-cs','Agentury · připomenutí','Re: Externí spolupráce na webových a digitálních projektech',
 E'Dobrý den,\n\njen krátce navazuji na svůj e-mail z minulého týdne. Kdyby se vám někdy hodila externí kapacita na weby, webové aplikace nebo AI automatizace, rád pomůžu, klidně i pod vaší značkou.\n\nUkázky práce: https://www.atmosferi.com/for-agencies\n\nPokud to teď není aktuální, nic se neděje, další e-mail už posílat nebudu.\n\nHezký den,\n\nMichal Kašpárek\nAtmosferi°\nwww.atmosferi.com')
on conflict (slug) do nothing;

-- A reply stops the sequence: interested → replied, unsubscribe → do_not_contact (+ suppression).
create or replace function public.agency_outreach_on_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(new.from_email));
begin
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
revoke all on function public.agency_outreach_on_reply() from public, anon, authenticated;
drop trigger if exists agency_outreach_on_reply on public.email_replies;
create trigger agency_outreach_on_reply after insert on public.email_replies
  for each row execute function public.agency_outreach_on_reply();

-- Every 15 minutes on weekdays; the function itself paces sending to business hours and the daily limit.
select cron.unschedule('agency-outreach-dispatch')
 where exists (select 1 from cron.job where jobname = 'agency-outreach-dispatch');
select cron.schedule('agency-outreach-dispatch', '*/15 * * * 1-5', $cron$
 select net.http_post(
  url := 'https://paryiowezqlnffanxtnt.supabase.co/functions/v1/dispatch-agency-emails',
  headers := jsonb_build_object('Content-Type','application/json','x-atmosferi-cron-token',
   (select decrypted_secret from vault.decrypted_secrets where name = 'atmosferi_email_dispatch_token')),
  body := '{"action":"run"}'::jsonb, timeout_milliseconds := 60000)
 where exists (select 1 from public.agency_outreach_settings where id = 1 and enabled);
$cron$);
