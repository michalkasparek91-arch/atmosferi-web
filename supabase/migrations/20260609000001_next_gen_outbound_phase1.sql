-- Migration for Next-Gen Outbound (Phase 1)
-- Adds decision maker and premium score to marketing_leads
-- Adds language to email_templates

ALTER TABLE public.marketing_leads
ADD COLUMN IF NOT EXISTS decision_maker_name text,
ADD COLUMN IF NOT EXISTS premium_score integer;

ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS language text;
