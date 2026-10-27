WITH pairs AS (
  SELECT DISTINCT t.category, l.lang
  FROM public.email_templates t
  CROSS JOIN LATERAL (
    SELECT unnest(
      CASE WHEN t.language IN ('cs','cz') THEN ARRAY['cs','cz','sk'] ELSE ARRAY[t.language] END
    ) AS lang
  ) l
  WHERE t.is_enabled IS TRUE AND t.category IS NOT NULL AND t.language IS NOT NULL
)
SELECT
  count(*)                                                                      AS celkem,
  count(*) FILTER (WHERE email IS NULL OR email = '')                           AS bez_emailu,
  count(*) FILTER (WHERE coalesce(marketing_notifications, true) = false
                      OR coalesce(email_notifications, true) = false)           AS odhlaseni,
  count(*) FILTER (WHERE outreach_import_review IS TRUE)                        AS ceka_na_revizi_importu,
  count(*) FILTER (WHERE tags::text ILIKE '%známé%')                            AS oznaceno_zname,
  count(*) FILTER (WHERE category IS NULL OR category = '')                     AS bez_kategorie,
  count(*) FILTER (WHERE language IS NULL OR language = '')                     AS bez_jazyka,
  count(*) FILTER (WHERE category IS NOT NULL AND language IS NOT NULL
                     AND NOT EXISTS (SELECT 1 FROM pairs p
                                     WHERE p.category = ml.category AND p.lang = ml.language))
                                                                                AS nema_zadnou_sablonu
FROM public.marketing_leads ml;
