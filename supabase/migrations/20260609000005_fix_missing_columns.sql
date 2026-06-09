-- 1. Přidání chybějících sloupců do marketing_leads pro uložení AI dat
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS ai_icebreaker text;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS premium_score integer;
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS decision_maker_name text;

-- 2. Aktualizace spojeného pohledu unified_contacts, aby tyto nové sloupce obsahoval i on
DROP VIEW IF EXISTS public.unified_contacts;

CREATE VIEW public.unified_contacts AS
SELECT 
    id,
    email,
    full_name,
    phone,
    website,
    city,
    full_address,
    tags,
    category,
    subcategory,
    source,
    created_at,
    'profile' as record_type,
    false as marketing_notifications,
    null as company_name,
    null as company_description,
    null as country,
    null as language,
    null as ai_icebreaker,
    null::integer as premium_score,
    null as decision_maker_name
FROM public.profiles

UNION ALL

SELECT 
    id,
    email,
    full_name,
    phone,
    website,
    city,
    full_address,
    tags,
    category,
    subcategory,
    source,
    created_at,
    'marketing_lead' as record_type,
    marketing_notifications,
    company_name,
    company_description,
    country,
    language,
    ai_icebreaker,
    premium_score,
    decision_maker_name
FROM public.marketing_leads;
