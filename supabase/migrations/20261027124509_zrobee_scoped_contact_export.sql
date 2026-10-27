-- Apply ONLY to Zrobee (uminqrrkflgldlfeaypn), not Atmosferi.
-- Time-limited authorization for a fixed, profession-scoped business contact copy.
CREATE TABLE public.atmosferi_contact_export_authorizations (
 run_id uuid PRIMARY KEY,
 token_sha256 text NOT NULL,
 expires_at timestamptz NOT NULL,
 enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE public.atmosferi_contact_export_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atmosferi_contact_export_authorizations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.atmosferi_contact_export_authorizations TO service_role;
