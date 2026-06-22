-- ===========================================================================
-- Atmosferi° — project_briefs
-- Stores every brief submitted from atmosferi.com/start (website + visualisation).
-- The public site inserts with the ANON key, protected by RLS:
--   · anyone may INSERT a brief (that's the contact form)
--   · nobody may SELECT/UPDATE/DELETE with the anon key (only your admin /
--     service-role can read them) — so visitors can't read each other's briefs.
-- Run once in: Supabase → SQL Editor → paste → Run. Safe to re-run.
-- ===========================================================================

create table if not exists public.project_briefs (
  id           uuid primary key default gen_random_uuid(),
  mode         text not null,                 -- 'web' | 'viz'
  name         text,
  email        text not null,
  budget       integer,                       -- € (visualisation only; null for web)
  timeline     text,                          -- 'ASAP' | '1–3 months' | 'Flexible'
  summary      text not null,                 -- full human-readable brief
  details      jsonb,                         -- structured selections
  source       text default 'start',
  status       text not null default 'new',   -- new | read | replied | archived
  created_at   timestamptz not null default now()
);

-- helpful for the admin list view
create index if not exists project_briefs_created_idx on public.project_briefs (created_at desc);
create index if not exists project_briefs_status_idx  on public.project_briefs (status);

-- ---- Row Level Security -------------------------------------------------
alter table public.project_briefs enable row level security;

-- allow anonymous + logged-in visitors to submit (INSERT only)
drop policy if exists "anyone can submit a brief" on public.project_briefs;
create policy "anyone can submit a brief"
  on public.project_briefs
  for insert
  to anon, authenticated
  with check (true);

-- NOTE: we intentionally add NO select/update/delete policy for anon.
-- Your admin app uses the service_role key (which bypasses RLS) to read them,
-- so the briefs stay private to you while the form still works for everyone.

-- ---- Optional: let signed-in admins read in the dashboard ----------------
-- If you want to read briefs from an authenticated admin session (not just the
-- service role), uncomment and adjust to your admin's auth:
-- drop policy if exists "admins can read briefs" on public.project_briefs;
-- create policy "admins can read briefs"
--   on public.project_briefs for select
--   to authenticated
--   using (true);
