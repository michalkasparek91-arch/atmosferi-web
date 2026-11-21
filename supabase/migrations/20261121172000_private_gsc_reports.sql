-- Private Google Search Console snapshots for the Atmosferi admin.
-- Only a service_role backend may write; authenticated admins may read.
create table if not exists public.gsc_reports (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null,
  site text not null default 'sc-domain:atmosferi.com',
  period_start date not null,
  period_end date not null,
  clicks integer not null default 0 check (clicks >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  ctr double precision not null default 0,
  average_position double precision not null default 0,
  inspected_urls integer not null default 0,
  indexed_urls integer not null default 0,
  inspection_errors integer not null default 0,
  inspections jsonb not null default '[]'::jsonb check (jsonb_typeof(inspections) = 'array'),
  queries jsonb not null default '[]'::jsonb check (jsonb_typeof(queries) = 'array'),
  pages jsonb not null default '[]'::jsonb check (jsonb_typeof(pages) = 'array'),
  created_at timestamptz not null default now(),
  constraint gsc_reports_site check (site = 'sc-domain:atmosferi.com'),
  constraint gsc_reports_period check (period_start <= period_end),
  constraint gsc_reports_index_counts check (indexed_urls <= inspected_urls and inspection_errors <= inspected_urls)
);

create index if not exists gsc_reports_recent on public.gsc_reports (checked_at desc);

alter table public.gsc_reports enable row level security;

revoke all on public.gsc_reports from public, anon, authenticated;
grant select on public.gsc_reports to authenticated;
grant all on public.gsc_reports to service_role;

drop policy if exists "Read GSC reports only as Atmosferi administrator" on public.gsc_reports;
create policy "Read GSC reports only as Atmosferi administrator"
on public.gsc_reports
for select to authenticated
using ((select public.is_admin((select auth.uid()))));

comment on table public.gsc_reports is 'Private Google Search Console API snapshots: only authenticated admin readers, service_role writer; never publish to website or GitHub.';
