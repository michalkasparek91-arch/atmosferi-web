-- ════════════════════════════════════════════════════════════════════════════
-- ODEMČENÍ PUBLIKA — nahrazuje a rozšiřuje migraci 20261027120000.
-- Bezpečné pustit i když ta předchozí už proběhla (nic nepřepisuje zbytečně).
--
-- Diagnostika z 75 400 kontaktů ukázala tři zámky:
--   1) 57 828 nemá kategorii ANI jazyk  (AI obohacení bylo týdny mimo provoz)
--   2)  8 895 má kategorii v ANGLIČTINĚ z importu ("Architect", "Real estate",
--       "Landscape architect", "Architecture", "Apartments") — šablony ale
--       párují na české slugy, takže tyhle kontakty nepatří nikam
--   3)  jazyk "fi" vs. šablony používající "f" (Finsko) → 441+ kontaktů mimo
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1) SJEDNOCENÍ KATEGORIÍ Z IMPORTU ──────────────────────────────────────
-- Pozor na pořadí: specifičtější obor musí vyhrát nad obecným "architect",
-- jinak by "Interior architect" spadlo mezi architekty.
UPDATE public.marketing_leads SET category = CASE
    WHEN category ~* '(interior|interi|innenarch|inredning|sisustus)'                  THEN 'interiery'
    WHEN category ~* '(urban|planning|stadtplan|územ|uzem)'                             THEN 'urbanismus'
    WHEN category ~* '(real ?estate|realit|apartment|propert|develop|investor|housing)' THEN 'developeri'
    WHEN category ~* '(landscape|architect|architektur|architecture|arkitekt|arkkiteh)' THEN 'architekti'
    ELSE category
  END,
  updated_at = now()
WHERE category IS NOT NULL
  AND category <> ''
  AND category NOT IN ('architekti','architekt','interiery','developeri','urbanismus');

-- ── 2) JAZYK: varianty na tvar, který používají šablony ────────────────────
-- Šablony mají Finsko jako 'f'. Kontakty z importu mají 'fi' → nikdy se nespárují.
UPDATE public.marketing_leads SET language = 'f', updated_at = now()
WHERE lower(language) = 'fi';

UPDATE public.marketing_leads SET language = 'cz', updated_at = now()
WHERE lower(language) IN ('cs-cz','ces','cze');

-- ── 3) JAZYK z národní domény e-mailu (nejspolehlivější signál) ────────────
UPDATE public.marketing_leads SET language = CASE lower(split_part(email, '.', -1))
    WHEN 'cz' THEN 'cz' WHEN 'sk' THEN 'sk' WHEN 'de' THEN 'de' WHEN 'at' THEN 'at'
    WHEN 'ch' THEN 'ch' WHEN 'no' THEN 'no' WHEN 'fi' THEN 'f'
  END,
  updated_at = now()
WHERE (language IS NULL OR language = '')
  AND email IS NOT NULL
  AND lower(split_part(email, '.', -1)) IN ('cz','sk','de','at','ch','no','fi');

-- ── 4) Zbylý jazyk podle uložené země ──────────────────────────────────────
UPDATE public.marketing_leads SET language = CASE
    WHEN country ILIKE '%esk%'   OR country ILIKE '%czech%'  THEN 'cz'
    WHEN country ILIKE '%lovens%' OR country ILIKE '%slovak%' THEN 'sk'
    WHEN country ILIKE '%meck%'  OR country ILIKE '%german%' THEN 'de'
    WHEN country ILIKE '%akous%' OR country ILIKE '%austria%' THEN 'at'
    WHEN country ILIKE '%carsk%' OR country ILIKE '%switz%'  THEN 'ch'
    WHEN country ILIKE '%orsk%'  OR country ILIKE '%norway%' THEN 'no'
    WHEN country ILIKE '%insk%'  OR country ILIKE '%finland%' THEN 'f'
    WHEN country ILIKE '%USA%'   OR country ILIKE '%united states%' THEN 'us'
    WHEN country ILIKE '%ustrali%' THEN 'au'
    ELSE 'en'   -- univerzální anglická sada pokryje zbytek světa
  END,
  updated_at = now()
WHERE (language IS NULL OR language = '') AND email IS NOT NULL;

-- ── 5) KATEGORIE z oboru / názvu firmy / webu ──────────────────────────────
UPDATE public.marketing_leads SET category = CASE
    WHEN txt ~* '(interi|innenarch|inredning|sisustus|wnętrz|intérieur|interior)'          THEN 'interiery'
    WHEN txt ~* '(develop|immobilienentwick|promoteur|eiendomsutvik|deweloper|investor)'   THEN 'developeri'
    WHEN txt ~* '(urban|územní|uzemni|stadtplan|city planning|byplan|veřejn|verejn)'       THEN 'urbanismus'
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

-- ── 6) Zbytek bez rozpoznaného oboru → 'architekti' ────────────────────────
-- Cílovka je architektura; obecná šablona pro studia je bezpečná výchozí volba.
UPDATE public.marketing_leads
SET category = 'architekti', updated_at = now()
WHERE (category IS NULL OR category = '')
  AND email IS NOT NULL AND email <> '';

-- ── 7) Jazyk bez odpovídající šablony → univerzální anglická sada ──────────
-- Kontakt se švédským (se), dánským (dk) či italským (it) jazykem nemá kam
-- spadnout; EN sada ho pokryje. Spouští se až nakonec, ať pracuje s hotovými daty.
UPDATE public.marketing_leads ml
SET language = 'en', updated_at = now()
WHERE email IS NOT NULL AND email <> ''
  AND language IS NOT NULL AND language <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.email_templates t
    CROSS JOIN LATERAL (
      SELECT unnest(
        CASE WHEN t.language IN ('cs','cz') THEN ARRAY['cs','cz','sk'] ELSE ARRAY[t.language] END
      ) AS lang
    ) l
    WHERE t.is_enabled IS TRUE
      AND t.category = ml.category
      AND l.lang = ml.language
  );

COMMIT;

-- ── KONTROLA PO MIGRACI ────────────────────────────────────────────────────
-- Pusť znovu diagnostiku 1-kde-se-ztraci-kontakty.sql.
-- Očekávaný výsledek: bez_kategorie = 0, bez_jazyka = 0, nema_zadnou_sablonu = 0.
