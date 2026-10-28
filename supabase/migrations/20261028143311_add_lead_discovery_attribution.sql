-- Outreach display queries and contact discovery both use this optional attribution.
-- Keep this repair separate from the older attribution/locality data cleanup migration.
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS discovered_by text;

COMMENT ON COLUMN public.marketing_leads.discovered_by IS
  'Source that discovered the contact; optional attribution for admin displays.';

NOTIFY pgrst, 'reload schema';
