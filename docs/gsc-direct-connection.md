# Atmosferi: trvalá Search Console přímo v adminu

**Důležité:** GitHub → Google autorizace vyžaduje jednorázové nastavení vlastníkem. Bez něho běží pouze admin rozhraní, nikoliv synchronizace dat. Není potřeba Windsor.ai, Google Sheets, soukromý JSON klíč ani Supabase service_role klíč v GitHubu.

## Architektura

1. GitHub Actions každých 6 hodin přečte jen data property `sc-domain:atmosferi.com` přes Google Search Console API (scope `webmasters.readonly`).
2. Google Workload Identity Federation dá GitHubu krátkodobý přístupový token bez dlouhodobého klíče.
3. GitHub si od svého OIDC poskytovatele vyžádá další krátkodobý podepsaný token, tentokrát s publikem `https://paryiowezqlnffanxtnt.supabase.co/functions/v1/gsc-ingest`.
4. Supabase Edge Function `gsc-ingest` ověří kryptografický podpis, issuer, audience, stáří tokenu, přesné GitHub repository ID `1260597613`, repository name, `main` branch, workflow a událost `schedule` nebo `workflow_dispatch`. Neověřený požadavek se odmítá.
5. Teprve server Supabase bezpečně zapíše report do RLS-zabezpečené tabulky `gsc_reports`. Privilegovaný databázový klíč zůstává **jen uvnitř Supabase Edge runtime**.
6. Admin `https://www.atmosferi.com/admin/seo` čte výsledky pouze pro přihlášeného administrátora (RLS `public.is_admin(auth.uid())`). Výpisy metrik a vyhledávacích dotazů nikdy nedáváme do veřejného GitHubu.

Výstupy: kliknutí, zobrazení, CTR, pozice, 25 nejlepších vyhledávacích dotazů, 25 vstupních URL a rotační kontrola indexace článků. Vzorek URL Inspection není kompletní index Googlu.

## Co musíš jednou udělat ty

### 1) Vytvořit servisní účet

- [Google Cloud – Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) a vybrat správný Cloud projekt.
- `Create Service Account` → jméno `atmosferi-gsc-monitor`.
- Projektové role přeskočit, potvrdit a zkopírovat servisní e-mail ve tvaru `atmosferi-gsc-monitor@PROJECT_ID.iam.gserviceaccount.com`.
- Povolit `Search Console API`, `IAM Service Account Credentials API` a `Security Token Service API`. Google Sheets API není potřeba.
- **Nikde nevytvářet ani nesdělovat JSON klíč.**

### 2) Pustit účet do Google Search Console

- [Search Console – Atmosferi](https://search.google.com/search-console?resource_id=sc-domain%3Aatmosferi.com).
- `Settings → Users and permissions → Add user`: vložit servisní e-mail, oprávnění `Full user` (nikoliv Owner).
- Property je přesně `sc-domain:atmosferi.com`.

### 3) Nastavit Google Workload Identity Federation

[Google Cloud → Workload Identity Federation](https://console.cloud.google.com/iam-admin/workload-identity-pools)

- Pool ID například `atmosferi-github`.
- Provider ID například `github`; typ OIDC; issuer `https://token.actions.githubusercontent.com`.
- Mapování atributů: `google.subject = assertion.sub` a `attribute.repository = assertion.repository`.
- Podmínka provideru:
  `assertion.repository == 'michalkasparek91-arch/atmosferi-web' && assertion.ref == 'refs/heads/main'`.
- Servisnímu účtu přidělit `Workload Identity User` pro daný pool a pouze identity s `attribute.repository/michalkasparek91-arch/atmosferi-web`.
- Dokumentace: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

### 4) Nastavit pouze tři GitHub Actions **Variables**

[Atmosferi – Actions variables](https://github.com/michalkasparek91-arch/atmosferi-web/settings/variables/actions)

- `GSC_WIF_PROVIDER` = `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`.
- `GSC_SERVICE_ACCOUNT` = e-mail Google servisního účtu z prvního kroku.
- `GSC_MONITOR_ENABLED` = `true`, **až po dokončení předchozích bodů**.

Žádné další GitHub Secrets nejsou pro Search Console monitoring potřebné. Klíč `GSC_SUPABASE_SERVICE_ROLE_KEY` není potřeba vytvářet; pokud již existuje, po ověření nového mechanismu jej lze z GitHubu odstranit.

### 5) Ověření

1. Na `main` musí být nasazena `gsc-ingest` Edge Function s `verify_jwt=false`, protože si GitHub token ověřuje samotná funkce (nejde o anonymní zápis). Její nasazení lze ověřit v Supabase Edge Functions.
2. Tabulka `public.gsc_reports` má zapnuté RLS a jedinečný `github_run_id` proti duplicitním reportům.
3. Po aktivaci `GSC_MONITOR_ENABLED=true` otevřít GitHub Actions → `Direct Google Search Console monitoring` → `Run workflow` na větvi `main`.
4. Úspěšný běh neobsahuje soukromá data v GitHub logu. V `/admin/seo` se zobrazí první skutečný záznam z Google Search Console.
5. Automatika pak běží `02:17, 08:17, 14:17, 20:17 UTC` i bez otevřeného prohlížeče.

## Omezení a bezpečnost

- Search Analytics mívá zpoždění 2–3 dny.
- URL Inspection ukazuje poslední známý stav Google indexu, nikoliv živé načtení webu a nenutí Google k indexaci.
- Pokud token nepochází z přesné větve a workflow, endpoint vrací 401/403. Ani znalost veřejné URL neopravňuje k zápisu.
- Při změně názvu GitHub repo nebo jeho ID je nutné znovu ověřit očekávané OIDC claims.
- Prohlížeč ani zapnutý ChatGPT nejsou pro běh monitoringu potřeba.
