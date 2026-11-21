-- Allow only one private Google Search Console snapshot per GitHub Actions run.
-- Unique run IDs prevent accidental replay from inserting duplicate snapshots.
alter table public.gsc_reports add column if not exists github_run_id bigint;
create unique index if not exists gsc_reports_github_run_id_unique
  on public.gsc_reports (github_run_id)
  where github_run_id is not null;
comment on column public.gsc_reports.github_run_id is
  'Authenticated GitHub Actions run ID from verified OIDC claims; unique to prevent replay.';
