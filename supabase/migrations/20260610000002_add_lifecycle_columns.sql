-- Přidání dalších chybějících sloupců z frontendu do email_templates a marketing_campaigns

-- 1. Aktualizace email_templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS category text DEFAULT 'marketing';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS greeting text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS cta_text text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS cta_url text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS secondary_text text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS target_role text DEFAULT 'all';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS trigger_type text DEFAULT 'cron';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS trigger_event text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS drip_delay_days integer;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS drip_series text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS segment_filters jsonb;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS heading text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS sender_email text;

-- 2. Aktualizace marketing_campaigns
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS category text DEFAULT 'marketing';
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS emoji text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS greeting text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS cta_text text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS cta_url text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS secondary_text text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS target_role text DEFAULT 'all';
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS trigger_type text DEFAULT 'cron';
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS trigger_event text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS drip_delay_days integer;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS drip_series text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS segment_filters jsonb;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS heading text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS sender_email text;
