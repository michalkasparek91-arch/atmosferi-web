-- ════════════════════════════════════════════════════════════════════════════
-- PROČ: publikum kampaně se počítá jako  category = šablona.category
--       AND language IN (šablona.language). Kontakt bez vyplněné kategorie
--       nebo jazyka nepatří do ŽÁDNÉHO publika — je neviditelný.
--       Kategorii dosud vyplňovalo jen AI obohacení; to bylo týdny mimo provoz,
--       takže desítky tisíc kontaktů zůstaly s NULL a nedaly se oslovit.
--
-- CO DĚLÁ: dopočítá category a language deterministicky, bez AI —
--          z oboru (subcategory), názvu firmy, webu a domény e-mailu.
--          Nikdy nepřepisuje už vyplněné hodnoty.
--
-- NEJDŘÍV SI PUSŤ NÁHLED (sekce 0), ať víš, čeho se to dotkne.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0) NÁHLED (spusť samostatně, nic nemění) ───────────────────────────────
-- SELECT
--   count(*) AS celkem,
--   count(*) FILTER (WHERE email IS NULL OR email = '')        AS bez_emailu,
--   count(*) FILTER (WHERE category IS NULL OR category = '')  AS bez_kategorie,
--   count(*) FILTER (WHERE language IS NULL OR language = '')  AS bez_jazyka,
--   count(*) FILTER (WHERE outreach_import_review)             AS ceka_na_revizi
-- FROM public.marketing_leads;

BEGIN;

-- ── 1) JAZYK (trh) z národní domény e-mailu ────────────────────────────────
-- Doména je nejspolehlivější signál; teprve pak sáhneme po poli country.
UPDATE public.marketing_leads SET language = CASE lower(split_part(email, '.', -1))
    WHEN 'cz' THEN 'cz'  WHEN 'sk' THEN 'sk' WHEN 'de' THEN 'de' WHEN 'at' THEN 'at'
    WHEN 'ch' THEN 'ch'  WHEN 'no' THEN 'no' WHEN 'fi' THEN 'f'
  END,
  updated_at = now()
WHERE (language IS NULL OR language = '')
  AND email IS NOT NULL
  AND lower(split_part(email, '.', -1)) IN ('cz','sk','de','at','ch','no','fi');

-- Zbytek podle uložené země.
UPDATE public.marketing_leads SET language = CASE
    WHEN country ILIKE '%esk%'  OR country ILIKE '%czech%'   THEN 'cz'
    WHEN country ILIKE '%lovens%' OR country ILIKE '%slovak%' THEN 'sk'
    WHEN country ILIKE '%meck%' OR country ILIKE '%german%'  THEN 'de'
    WHEN country ILIKE '%akous%' OR country ILIKE '%austria%' THEN 'at'
    WHEN country ILIKE '%carsk%' OR country ILIKE '%switz%'  THEN 'ch'
    WHEN country ILIKE '%orsk%' OR country ILIKE '%norway%'  THEN 'no'
    WHEN country ILIKE '%insk%' OR country ILIKE '%finland%' THEN 'f'
    WHEN country ILIKE '%USA%'  OR country ILIKE '%united states%' THEN 'us'
    WHEN country ILIKE '%ustrali%' THEN 'au'
    ELSE 'en'   -- univerzální anglická sada pokryje zbytek světa
  END,
  updated_at = now()
WHERE (language IS NULL OR language = '') AND email IS NOT NULL;

-- ── 2) KATEGORIE z oboru / názvu firmy / webu ──────────────────────────────
-- Pořadí podmínek je záměrné: specifičtější obor vyhrává nad obecným
-- "architekt" (např. "interiérový architekt" → interiery, ne architekti).
UPDATE public.marketing_leads SET category = CASE
    WHEN txt ~* '(interi|innenarch|inredning|sisustus|wnętrz|intérieur|interior)'          THEN 'interiery'
    WHEN txt ~* '(develop|immobilienentwick|promoteur|eiendomsutvik|deweloper|investor)'   THEN 'developeri'
    WHEN txt ~* '(urban|územní|uzemni|stadtplan|city planning|byplan|veřejn|verejn)'        THEN 'urbanismus'
    WHEN txt ~* '(realit|makl|estate|immobilienmakl|eiendomsmegl|nieruchom)'               THEN 'developeri'
    WHEN txt ~* '(ateli|studio|büro|buro|kancel|s\.r\.o|gmbh|ltd|a\.s\.|zt\b|oy\b|as\b)'   THEN 'architekti'
    WHEN txt ~* '(architek|arkitekt|arkkiteh|architect|építész)'                           THEN 'architekti'
    ELSE NULL
  END,
  updated_at = now()
FROM (
  SELECT id AS lid,
         coalesce(subcategory,'') || ' ' || coalesce(company_name,'') || ' ' ||
         coalesce(full_name,'')   || ' ' || coalesce(website,'')      AS txt
  FROM public.marketing_leads
  WHERE category IS NULL OR category = ''
) src
WHERE public.marketing_leads.id = src.lid
  AND (public.marketing_leads.category IS NULL OR public.marketing_leads.category = '');

-- ── 3) Zbytek bez rozpoznaného oboru → 'architekti' ────────────────────────
-- Cílovka je architektura; obecná šablona pro studia je bezpečná výchozí volba.
UPDATE public.marketing_leads
SET category = 'architekti', updated_at = now()
WHERE (category IS NULL OR category = '')
  AND email IS NOT NULL AND email <> '';

COMMIT;

-- ── 4) KONTROLA PO MIGRACI ─────────────────────────────────────────────────
-- SELECT category, language, count(*) FROM public.marketing_leads
-- WHERE email IS NOT NULL GROUP BY 1,2 ORDER BY 3 DESC LIMIT 30;
