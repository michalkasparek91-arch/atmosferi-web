ALTER TABLE public.zrobee_contact_import_runs ADD COLUMN transfer_cursor uuid;
ALTER TABLE public.zrobee_contact_import_runs ADD COLUMN copied_count integer NOT NULL DEFAULT 0;
-- External AI classification was declined. All classification is reviewed locally.
DROP FUNCTION public.claim_zrobee_import_batch(uuid);
