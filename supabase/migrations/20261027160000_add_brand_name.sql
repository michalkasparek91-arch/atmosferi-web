-- ════════════════════════════════════════════════════════════════════════
--  CHYBĚJÍCÍ SLOUPEC brand_name
--
--  Kód s ním pracuje na třech místech, ale v databázi nikdy nevznikl:
--    • process-sniper-outbox ho ČTE a dává mu přednost při dosazení
--      {{studio}} do předmětu e-mailu (ř. 267)
--    • auto-enrich-leads ho ZAPISUJE v update payloadu (ř. 627)
--      → každý update obohacení dosud selhal na "column does not exist",
--        takže se neuložilo nic ani v době, kdy AI ještě fungovaly
--    • autonomous-web-sniper si ho nechává vracet od AI
--
--  Po přidání sloupce začne fungovat obojí: ukládání i hezčí předmět.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS brand_name TEXT;

COMMENT ON COLUMN public.marketing_leads.brand_name IS
  'Krátký oslovitelný název firmy do předmětu e-mailu ({{studio}}). Bez právní formy a popisných přívlastků.';
