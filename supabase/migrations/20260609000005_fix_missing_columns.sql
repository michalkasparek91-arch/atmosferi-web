-- 1. Přidání chybějících sloupců do marketing_leads pro uložení AI dat
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS ai_icebreaker text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS premium_score integer;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS decision_maker_name text;

