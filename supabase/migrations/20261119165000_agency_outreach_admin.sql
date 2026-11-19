-- Agency outreach CRM. Dedicated, isolated from automated email audience and invoicing contacts.
create table if not exists public.agency_outreach_leads (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  company_name text not null,
  contact_name text,
  email text not null,
  website text,
  city text,
  region text,
  priority text not null default 'B' check (priority in ('A','B','REVIEW')),
  review_state text not null default 'ready' check (review_state in ('ready','review')),
  outreach_status text not null default 'new' check (outreach_status in ('new','queued','sent','opened','replied','meeting','won','not_interested','do_not_contact')),
  source_status text,
  source_email_status text,
  source_reason text,
  source_name text,
  notes text not null default '',
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agency_outreach_leads_priority_idx on public.agency_outreach_leads (review_state, priority, outreach_status);
create index if not exists agency_outreach_leads_company_idx on public.agency_outreach_leads (company_name);
create table if not exists public.agency_outreach_templates (
  slug text primary key,
  name text not null,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);
alter table public.agency_outreach_leads enable row level security;
alter table public.agency_outreach_templates enable row level security;
revoke all on public.agency_outreach_leads from anon, authenticated;
revoke all on public.agency_outreach_templates from anon, authenticated;
grant select, insert, update, delete on public.agency_outreach_leads to authenticated;
grant select, insert, update, delete on public.agency_outreach_templates to authenticated;
drop policy if exists "Atmosferi admins manage agency outreach leads" on public.agency_outreach_leads;
create policy "Atmosferi admins manage agency outreach leads"
 on public.agency_outreach_leads for all to authenticated
 using (public.is_admin((select auth.uid())))
 with check (public.is_admin((select auth.uid())));
drop policy if exists "Atmosferi admins manage agency outreach templates" on public.agency_outreach_templates;
create policy "Atmosferi admins manage agency outreach templates"
 on public.agency_outreach_templates for all to authenticated
 using (public.is_admin((select auth.uid())))
 with check (public.is_admin((select auth.uid())));
insert into public.agency_outreach_templates (slug, name, subject, body)
values ('agency-intro-cs','Agentury · první oslovení','Externí spolupráce na webových a digitálních projektech',
 E'Dobrý den,\n\nrád bych vám nabídl možnost externí spolupráce na digitálních projektech pro vaše klienty.\n\nJmenuji se Michal Kašpárek a pod značkou Atmosferi° se věnuji tvorbě webů, vývoji webových aplikací a AI automatizacím. Kromě klientských projektů stojím také za technologickým startupem Zrobee, kde se podílím na vývoji a provozu vlastní online platformy.\n\nRád bych své zkušenosti nabídl také dalším agenturám, ať už formou jednorázových zakázek, dlouhodobé spolupráce nebo jako externí vývojář pod vaší značkou.\n\nPřipravil jsem krátké portfolio s ukázkami práce a přehledem služeb:\nhttps://www.atmosferi.com/for-agencies\n\nPokud by se vám někdy hodila další technická kapacita, rád se spojím a probereme možnosti spolupráce.\n\nPřeji hezký den,\n\nMichal Kašpárek\nAtmosferi°\nwww.atmosferi.com')
on conflict (slug) do nothing;
