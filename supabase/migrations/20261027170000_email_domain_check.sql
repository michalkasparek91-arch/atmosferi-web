-- ════════════════════════════════════════════════════════════════════════
--  OVĚŘENÍ DORUČITELNOSTI PRO STÁVAJÍCÍ DATABÁZI
--
--  MX kontrola běží jen u nových kontaktů ze sběrače. Starších ~75 tisíc
--  adres z importu a scrapingu neprošlo ničím. Rozesílat na ně naslepo
--  znamená riskovat pozastavení SES účtu (bounce rate nad 5 %).
--
--  Ověřuje se DOMÉNA, ne jednotlivá adresa — 75 tis. kontaktů má řádově
--  méně unikátních domén, takže je to mnohonásobně rychlejší.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_domain_check (
  domain      text PRIMARY KEY,
  has_mx      boolean NOT NULL,
  checked_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_domain_check IS
  'Výsledek MX kontroly domény (DNS-over-HTTPS). Cache, aby se stejná doména neověřovala opakovaně.';

ALTER TABLE public.email_domain_check ENABLE ROW LEVEL SECURITY;

-- Zapisuje jen edge funkce pod service_role; běžní klienti sem nemají co dělat.
REVOKE ALL ON public.email_domain_check FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_domain_check TO service_role;

-- Rychlé dohledání kontaktů čekajících na ověření.
CREATE INDEX IF NOT EXISTS marketing_leads_email_domain_idx
  ON public.marketing_leads ((lower(split_part(email, '@', 2))))
  WHERE email IS NOT NULL;

-- Rychlý výběr domén, které ještě nemáme ověřené.
CREATE OR REPLACE FUNCTION public.pending_email_domains(max_rows integer DEFAULT 300)
RETURNS TABLE(domain text, kontaktu bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT lower(split_part(l.email, '@', 2)) AS domain, count(*) AS kontaktu
  FROM public.marketing_leads l
  WHERE l.email IS NOT NULL AND l.email <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.email_domain_check c
      WHERE c.domain = lower(split_part(l.email, '@', 2))
    )
  GROUP BY 1
  ORDER BY count(*) DESC          -- nejčastější domény první: největší efekt
  LIMIT max_rows;
$$;

REVOKE ALL ON FUNCTION public.pending_email_domains(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_email_domains(integer) TO service_role;
