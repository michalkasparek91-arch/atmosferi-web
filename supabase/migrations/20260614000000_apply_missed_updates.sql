DELETE FROM email_templates WHERE slug IN (
  'atmosferi-arch', 
  'atmosferi-interior', 
  'atmosferi-developer', 
  'atmosferi-urban', 
  'atmosferi-individual'
);

INSERT INTO email_templates (
  slug, name, category, subject, greeting, body, cta_text, cta_url, layout_type, target_role, trigger_type, is_enabled, hero_image_url, segment_filters
) VALUES
(
  'atmosferi-arch',
  'Atmosferi: Architektonické studio',
  'architekti',
  'Web pro {{studio}} — portfolio na úrovni vaší architektury',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Specializuji se na portfolia architektonických studií — editoriální, obrazem vedené weby s redakčním systémem, ve kterém si projekty spravujete sami. K tomu umíme dodat i vizualizace nepostavených staveb.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/07-loop.webp", "https://atmosferi.com/demos/atmosferi-viz/img/08-courtyards.webp", "https://atmosferi.com/demos/atmosferi-viz/img/01-nightfall.webp"]}'::jsonb
),
(
  'atmosferi-interior',
  'Atmosferi: Interiérové studio',
  'architekti',
  'Web a vizualizace pro {{studio}}',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro interiérová studia stavíme weby, kde vyniknou materiály, světlo a detail — a doplňujeme je fotorealistickými vizualizacemi interiérů a 360° prohlídkami, ve kterých klient projde návrh ještě před realizací.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/chalet-living.jpg',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/chalet-dining.jpg", "https://atmosferi.com/demos/atmosferi-viz/img/chalet-bedroom.jpg", "https://atmosferi.com/demos/atmosferi-viz/img/10-penthouse.webp"]}'::jsonb
),
(
  'atmosferi-developer',
  'Atmosferi: Realitní developer',
  'developeri',
  'Prezentace projektu, která prodává — web, vizualizace a 360° prohlídky',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro developery stavíme prodejní prezentace projektů — web s přehledem dostupnosti jednotek, fotorealistické vizualizace, animované průlety a interaktivní 360° prohlídky. Kupující projekt pochopí dřív, než se kopne do země.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/01-nightfall.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp", "https://atmosferi.com/demos/atmosferi-viz/img/09-horizon.webp", "https://atmosferi.com/demos/atmosferi-viz/img/10-penthouse.webp"]}'::jsonb
),
(
  'atmosferi-urban',
  'Atmosferi: Urbanismus',
  'stavebnictvi',
  'Srozumitelná prezentace vašeho projektu pro veřejnost',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro urbanistické a veřejné projekty stavíme weby, které srozumitelně vysvětlí záměr občanům i zastupitelům — mapy, fáze, vizualizace a 360° pohledy na jednom přehledném místě.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/08-courtyards.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/05-crossing.webp", "https://atmosferi.com/demos/atmosferi-viz/img/04-tidewater.webp", "https://atmosferi.com/demos/atmosferi-viz/img/07-loop.webp"]}'::jsonb
),
(
  'atmosferi-individual',
  'Atmosferi: Samostatný architekt',
  'architekti',
  'Portfolio web, který staví vaši práci do popředí',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro samostatné architekty děláme čisté, rychlé portfolio weby, které práci nechají dýchat — bez šablonovitosti, s důrazem na typografii a obraz. Ideální vstupní úroveň, kterou lze později rozšířit.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/12-fjord.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/06-canopy.webp", "https://atmosferi.com/demos/atmosferi-viz/img/03-concert.webp", "https://atmosferi.com/demos/atmosferi-viz/img/12-fjord.webp"]}'::jsonb
);


-- Insert or update the automation job for autonomous web sniper
INSERT INTO public.automation_jobs (job_name, function_name, schedule, is_active)
VALUES ('Continuous Web Discovery', 'autonomous-web-sniper', '*/30 * * * *', true)
ON CONFLICT (job_name) DO UPDATE
SET function_name = EXCLUDED.function_name,
    schedule = EXCLUDED.schedule,
    is_active = EXCLUDED.is_active;


-- Update unified_contacts view to include country and ai_icebreaker which were missing
DROP VIEW IF EXISTS public.unified_contacts;

CREATE OR REPLACE VIEW public.unified_contacts AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.user_type::text,
    p.website,
    p.city,
    p.full_address,
    p.postal_code,
    p.street_name,
    p.street_number,
    p.latitude,
    p.longitude,
    p.tags,
    p.is_pro,
    p.referral_code,
    p.marketing_notifications,
    p.push_notifications,
    p.email_notifications,
    COALESCE(p.last_activity, p.created_at) as last_activity,
    p.engagement_score,
    p.created_at,
    p.category,
    p.subcategory,
    'registered' as contact_source,
    p.bio as description,
    p.secondary_emails,
    NULL as company_name,
    (SELECT eo.icebreaker FROM public.email_outbox eo WHERE eo.worker_id = p.id ORDER BY eo.created_at DESC LIMIT 1) as icebreaker,
    (SELECT eo.id FROM public.email_outbox eo WHERE eo.worker_id = p.id ORDER BY eo.created_at DESC LIMIT 1) as outbox_id,
    NULL::integer as premium_score,
    NULL::text as decision_maker_name,
    NULL::text as language,
    NULL::text as country,
    NULL::text as ai_icebreaker
FROM public.profiles p
UNION ALL
SELECT 
    m.id,
    m.email,
    m.full_name,
    m.phone,
    m.user_type,
    m.website,
    m.city,
    m.full_address,
    m.postal_code,
    m.street_name,
    m.street_number,
    m.latitude,
    m.longitude,
    m.tags,
    m.is_pro,
    m.referral_code,
    m.marketing_notifications,
    m.push_notifications,
    m.email_notifications,
    m.last_activity,
    m.engagement_score,
    m.created_at,
    m.category,
    m.subcategory,
    CASE WHEN m.source = 'ai_web_sniper' THEN 'ai_web_sniper' ELSE 'lead' END as contact_source,
    COALESCE(m.company_description, m.description) as description,
    m.secondary_emails,
    m.company_name,
    (SELECT eo.icebreaker FROM public.email_outbox eo WHERE eo.lead_id = m.id ORDER BY eo.created_at DESC LIMIT 1) as icebreaker,
    (SELECT eo.id FROM public.email_outbox eo WHERE eo.lead_id = m.id ORDER BY eo.created_at DESC LIMIT 1) as outbox_id,
    m.premium_score,
    m.decision_maker_name,
    m.language,
    m.country,
    m.ai_icebreaker
FROM public.marketing_leads m;

GRANT SELECT ON public.unified_contacts TO authenticated;


-- Fix hardcoded project URL and anon key in the sync_automation_job_cron function
CREATE OR REPLACE FUNCTION public.sync_automation_job_cron()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_job_name   text := 'auto_' || NEW.function_name;
  v_url        text := 'https://paryiowezqlnffanxtnt.supabase.co/functions/v1/' || NEW.function_name;
  v_anon_key   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnlpb3dlenFsbmZmYW54dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3MzYsImV4cCI6MjA5NjQwOTczNn0.yyd-pRRXds1o8lU9mVWk21zu-5l_dcdxiBjDSKfKw5o';
  v_command    text;
BEGIN
  -- Always unschedule any existing entry first
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job_name) THEN
    PERFORM cron.unschedule(v_job_name);
  END IF;

  IF NEW.is_active IS TRUE THEN
    v_command := format(
      $cmd$SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      )$cmd$,
      v_url,
      json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key)
    );
    PERFORM cron.schedule(v_job_name, NEW.schedule, v_command);
  END IF;

  RETURN NEW;
END;
$$;

-- Touch the table to force the trigger to fire and recreate all cron jobs with the corrected URL
UPDATE public.automation_jobs SET is_active = is_active;

