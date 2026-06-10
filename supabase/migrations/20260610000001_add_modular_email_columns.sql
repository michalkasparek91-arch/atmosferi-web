-- Přidání nových sloupců pro modulární e-maily (layouty, bannery, hero obrázky atd.)

-- 1. Aktualizace email_templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS layout_type text DEFAULT 'standard';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS urgency_banner_enabled boolean DEFAULT true;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS urgency_banner_text text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS promo_banner_enabled boolean DEFAULT true;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS promo_banner_text text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS job_description_snippet text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS ps_footer_enabled boolean DEFAULT false;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS ps_footer_text text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS language text DEFAULT 'cs';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS show_job_widget boolean DEFAULT true;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS show_cta_button boolean DEFAULT true;

-- 2. Aktualizace marketing_campaigns
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS layout_type text DEFAULT 'standard';
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS urgency_banner_enabled boolean DEFAULT true;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS urgency_banner_text text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS promo_banner_enabled boolean DEFAULT true;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS promo_banner_text text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS job_description_snippet text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS ps_footer_enabled boolean DEFAULT false;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS ps_footer_text text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS language text DEFAULT 'cs';
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS show_job_widget boolean DEFAULT true;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS show_cta_button boolean DEFAULT true;
