# Atmosferi: Search Console přímo v adminu

**Stav: příprava dokončena, ale Google ještě není autorizovaný.** Bez jednorázového nastavení běh nezačne. Není potřeba Google Sheet, Windsor.ai ani otevřený prohlížeč.

## Jak systém funguje

- Zdroj: přímé Google Search Console API, property sc-domain:atmosferi.com.
- Každých šest hodin běží GitHub Actions s krátkodobým Google OAuth tokenem přes Workload Identity Federation (OIDC), bez privátního Google JSON klíče.
- Oprávnění vůči Search Console je jen read-only.
- Výsledky se ukládají do privátní Supabase tabulky public.gsc_reports v projektu Atmosferi (paryiowezqlnffanxtnt).
- Admin na https://www.atmosferi.com/admin/seo ukazuje poslední 28denní organický výkon, vyhledávací dotazy, stránky a indexaci rotujícího vzorku URL.
- Databáze má RLS: číst smí pouze přihlášený administrátor podle public.is_admin(auth.uid()). Běžný uživatel, anonym a veřejná webová stránka data nevidí.
- Přístupové tokeny a neveřejná data nikdy neukládat do veřejného repozitáře nebo logů.

## Krok 1 – vytvoř technický účet v Google

1. Jdi na https://console.cloud.google.com/iam-admin/serviceaccounts a vyber správný projekt Atmosferi.
2. Create service account → název atmosferi-gsc-monitor → Create and continue → volitelné role přeskočit → Done.
3. Zkopíruj adresu technického účtu ve tvaru atmosferi-gsc-monitor@PROJECT_ID.iam.gserviceaccount.com.
4. **Nedělej žádný soukromý JSON key.**
5. V projektu musí být povoleny Search Console API, IAM Service Account Credentials API a Security Token Service API. Google Sheets API nepotřebujeme.

## Krok 2 – uděl mu přístup do Search Console

https://search.google.com/search-console?resource_id=sc-domain%3Aatmosferi.com

Settings → Users and permissions → Add user → vlož e-mail servisního účtu → Full user. Nikoliv Owner.

## Krok 3 – bezpečně spoj GitHub a Google Cloud

https://console.cloud.google.com/iam-admin/workload-identity-pools

- Pool ID: atmosferi-github
- Provider ID: github
- Provider type: OpenID Connect, issuer URL: https://token.actions.githubusercontent.com
- Attribute mapping: google.subject = assertion.sub
- Attribute mapping: attribute.repository = assertion.repository
- Provider condition: assertion.repository == 'michalkasparek91-arch/atmosferi-web' && assertion.ref == 'refs/heads/main'
- Servisnímu účtu přidej roli Workload Identity User pro principalSet uvedeného poolu s hodnotou attribute.repository/michalkasparek91-arch/atmosferi-web.

Oficiální návod: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

## Krok 4 – GitHub variables a jeden šifrovaný secret

https://github.com/michalkasparek91-arch/atmosferi-web/settings/variables/actions

Repository **Variables**:
- GSC_WIF_PROVIDER: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
- GSC_SERVICE_ACCOUNT: e-mail Google servisního účtu
- GSC_MONITOR_ENABLED: true (nastav až nakonec, po migraci databáze a všech oprávněních)

Repository **Secrets**:
- GSC_SUPABASE_SERVICE_ROLE_KEY: skutečný secret service_role z Supabase Atmosferi projektu.

Pozor: service_role je silný databázový klíč. Zadávej ho jen jako GitHub Actions Secret; nikdy do chatu, veřejné proměnné, URL, repozitáře ani logů. Pokud nebudeš chtít dát takový klíč GitHubu, nahradíme ho omezenou ingest Edge Function. Token ke Googlu má pouze krátkou platnost.

## Krok 5 – nasazení a test

1. Ověřit a sloučit PR #141, nasadit DB migraci 20261121172000_private_gsc_reports.sql do Atmosferi Supabase. **Samotné uložení souboru v GitHubu tabulku nevytvoří.**
2. Zkontrolovat admin RLS: pouze admin může číst gsc_reports; běžný uživatel nemůže nic číst ani zapisovat.
3. Nastavit GSC_MONITOR_ENABLED=true až po úspěšném nasazení a vytvoření GitHub Secret.
4. Spustit GitHub Actions → Direct Google Search Console monitoring → Run workflow.
5. Otevřít https://www.atmosferi.com/admin/seo a ověřit první skutečný report.
6. Dále běží automaticky v 02:17, 08:17, 14:17 a 20:17 UTC bez otevřeného prohlížeče.

## Omezení

Search Console mívá zpoždění dat 2–3 dny. URL Inspection vrací stav známý indexu Googlu, není to živá HTTP kontrola a nedokáže vynutit indexaci. Vždy kontroluje omezený rotační vzorek článků, nikoli úplně všechny URL při každém běhu.
