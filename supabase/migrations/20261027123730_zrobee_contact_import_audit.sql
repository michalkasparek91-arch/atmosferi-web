-- One-way, auditable copy. The source Zrobee database is never modified.
CREATE TABLE public.zrobee_contact_import_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'loading',
 request_token text NOT NULL DEFAULT (gen_random_uuid()::text || gen_random_uuid()::text),
 last_error text
);
CREATE TABLE public.zrobee_contact_import_contacts (
 run_id uuid NOT NULL REFERENCES public.zrobee_contact_import_runs(id),
 source_id uuid NOT NULL,
 raw jsonb NOT NULL,
 normalized_email text,
 status text NOT NULL DEFAULT 'pending',
 classification jsonb,
 claimed_at timestamptz,
 target_lead_id uuid REFERENCES public.marketing_leads(id),
 original_target jsonb,
 PRIMARY KEY(run_id,source_id)
);
CREATE INDEX zrobee_import_pending_idx ON public.zrobee_contact_import_contacts(run_id,status,source_id);
ALTER TABLE public.zrobee_contact_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zrobee_contact_import_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zrobee_contact_import_runs, public.zrobee_contact_import_contacts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zrobee_contact_import_runs, public.zrobee_contact_import_contacts TO service_role;

ALTER TABLE public.marketing_leads ADD COLUMN outreach_template_slug text REFERENCES public.email_templates(slug);
ALTER TABLE public.marketing_leads ADD COLUMN outreach_import_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.marketing_leads ADD COLUMN outreach_locale text;

CREATE FUNCTION public.claim_zrobee_import_batch(import_run uuid)
RETURNS SETOF public.zrobee_contact_import_contacts
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 UPDATE public.zrobee_contact_import_contacts c SET status='processing',claimed_at=now()
 WHERE (c.run_id,c.source_id) IN (
   SELECT run_id,source_id FROM public.zrobee_contact_import_contacts
   WHERE run_id=$1 AND status='pending' ORDER BY source_id
   LIMIT 60 FOR UPDATE SKIP LOCKED
 ) RETURNING c.*;
$$;
REVOKE ALL ON FUNCTION public.claim_zrobee_import_batch(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_zrobee_import_batch(uuid) TO service_role;
