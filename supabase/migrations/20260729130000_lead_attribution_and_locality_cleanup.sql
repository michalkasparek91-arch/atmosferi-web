-- 1) Atribuce: ktera AI / ktery zdroj kontakt prinesl.
--    Hodnoty: nazev provideru (cerebras, nvidia, groq…), "osm", "vyhledavani+crawl".
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS discovered_by TEXT;

COMMENT ON COLUMN public.marketing_leads.discovered_by IS
  'Zdroj nalezeni kontaktu: nazev AI provideru, "osm" nebo "vyhledavani+crawl".';

CREATE INDEX IF NOT EXISTS marketing_leads_discovered_by_idx
  ON public.marketing_leads (discovered_by);

-- 2) OPRAVA STAVAJICICH DAT — geograficky nesedici kontakty.
--    Priklad: ceske "Interiéry Janovský" ulozene jako Bergen/Norsko. Vzniklo tim,
--    ze se ceskym slovem hledalo i v cizine a vysledky se oznacily mestem z dotazu.
--    Narodni domena e-mailu je spolehlivejsi nez mesto z dotazu → podle ni srovnavame.

-- 2a) Nahled pred opravou (spust samostatne, kdyz se chces podivat):
-- SELECT country, split_part(email,'.',-1) AS tld, count(*)
-- FROM public.marketing_leads
-- WHERE source='ai_web_sniper' GROUP BY 1,2 ORDER BY 3 DESC;

BEGIN;

CREATE TEMP TABLE _tld_map(country text primary key, tld text) ON COMMIT DROP;
INSERT INTO _tld_map(country,tld) VALUES
 ('Ceska republika','cz'),('Slovensko','sk'),('Nemecko','de'),('Rakousko','at'),
 ('Svycarsko','ch'),('Polsko','pl'),('Madarsko','hu'),('Velka Britanie','uk'),
 ('Irsko','ie'),('Francie','fr'),('Spanelsko','es'),('Italie','it'),
 ('Portugalsko','pt'),('Nizozemsko','nl'),('Belgie','be'),('Dansko','dk'),
 ('Svedsko','se'),('Norsko','no'),('Finsko','fi'),('Chorvatsko','hr'),
 ('Slovinsko','si'),('Rumunsko','ro'),('Recko','gr'),('Turecko','tr'),
 ('Kanada','ca'),('Australie','au'),('Novy Zeland','nz'),('Japonsko','jp'),
 ('Brazilie','br'),('Mexiko','mx'),('Jizni Afrika','za');

-- Kontakty, kde narodni domena e-mailu patri JINE zemi, nez je ulozena:
-- prepiseme zemi podle domeny a smazeme mesto (to bylo z dotazu, ne z firmy).
WITH mismatched AS (
  SELECT l.id, t2.country AS real_country
  FROM public.marketing_leads l
  JOIN _tld_map t1 ON t1.country = l.country
  JOIN _tld_map t2 ON t2.tld = lower(split_part(l.email, '.', -1))
  WHERE l.source = 'ai_web_sniper'
    AND t2.tld <> t1.tld
)
UPDATE public.marketing_leads l
SET country = m.real_country,
    city = NULL,                       -- mesto z dotazu bylo chybne
    language = CASE
      WHEN m.real_country = 'Ceska republika' THEN 'cz'
      WHEN m.real_country = 'Slovensko'       THEN 'sk'
      WHEN m.real_country = 'Nemecko'         THEN 'de'
      WHEN m.real_country = 'Rakousko'        THEN 'at'
      WHEN m.real_country = 'Svycarsko'       THEN 'ch'
      WHEN m.real_country = 'Norsko'          THEN 'no'
      WHEN m.real_country = 'Finsko'          THEN 'f'
      ELSE 'en'
    END,
    updated_at = now()
FROM mismatched m
WHERE l.id = m.id;

-- 3) Vycisteni katalogu a portalu, ktere se stihly ulozit jako "firmy".
DELETE FROM public.email_outbox
WHERE lead_id IN (
  SELECT id FROM public.marketing_leads
  WHERE source = 'ai_web_sniper' AND (
       email ~* '(immobilienscout24|immowelt|immonet|willhaben|edireal|gecheckt|remax|century21|engelvoelkers|sreality|bezrealitky|herold\.at|gelbeseiten|11880|yelp|yellowpages|panoramafirm|europages|kompass\.com|wko\.at)'
    OR company_name ~* '^(home \[|top\s?\d+|kauf|verkauf|prodej)'
    OR company_name ~* '(finden|vergleich|ranking|katalog|directory|übersicht)'
    OR length(company_name) > 80
  )
);

DELETE FROM public.marketing_leads
WHERE source = 'ai_web_sniper' AND (
     email ~* '(immobilienscout24|immowelt|immonet|willhaben|edireal|gecheckt|remax|century21|engelvoelkers|sreality|bezrealitky|herold\.at|gelbeseiten|11880|yelp|yellowpages|panoramafirm|europages|kompass\.com|wko\.at)'
  OR company_name ~* '^(home \[|top\s?\d+|kauf|verkauf|prodej)'
  OR company_name ~* '(finden|vergleich|ranking|katalog|directory|übersicht)'
  OR length(company_name) > 80
);

COMMIT;
