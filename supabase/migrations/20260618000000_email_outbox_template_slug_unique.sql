-- Ensure upsert-on-conflict works when populating outbox batches from leads
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_template_slug_lead_id_key
  ON public.email_outbox (template_slug, lead_id)
  WHERE lead_id IS NOT NULL;
