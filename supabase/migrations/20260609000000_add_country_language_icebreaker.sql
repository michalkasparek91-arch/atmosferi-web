-- Add country, language, and ai_icebreaker columns to marketing_leads
ALTER TABLE public.marketing_leads
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS language text,
ADD COLUMN IF NOT EXISTS ai_icebreaker text;
