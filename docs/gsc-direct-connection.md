# Atmosferi: trvalé přímé napojení na Google Search Console

Toto je připravená integrace, NE potvrzení přístupu. Dokud vlastník jednorázově nepropojí Google Cloud a nepovolí přístup k property, workflow nic nečte. Soubory projektu a běžné SEO buildy fungují nezávisle.

## Architektura

- Zdroj: Google Search Console API pro přesnou doménovou property sc-domain:atmosferi.com.
- Běh: GitHub Actions každých šest hodin (02:17, 08:17, 14:17, 20:17 UTC) a možnost ručního spuštění.
- Autorizace: Google Cloud Workload Identity Federation a krátkodobé OAuth tokeny. Bez exportovaného JSON klíče a bez nutnosti mít otevřený prohlížeč.
- Oprávnění: pouze read-only Search Console API; zápis výhradně do soukromého Google Sheets sešitu sdíleného s technickým účtem.
- Soukromé výstupy: 28denní přehled impresí/kliknutí/CTR/pozice, nejsilnější URL a dotazy, a dávková URL Inspection s indexačními stavy a canonicals.
- GitHub repozitář je VEŘEJNÝ. Nedávat SEO metriky, hledané výrazy ani tokeny do commitů, Actions logů, summaries nebo artifacts.

## Nezbytné jednorázové nastavení

### 1. Vlastní Google Cloud projekt a servisní účet

Otevřít https://console.cloud.google.com/ a použít Google účet s přístupem do Search Console. V projektu povolit:
Search Console API, Google Sheets API, IAM Service Account Credentials API a Security Token Service API.
Vytvořit servisní účet, například atmosferi-gsc-monitor, a poznamenat jeho e-mail (např. atmosferi-gsc-monitor@PROJECT_ID.iam.gserviceaccount.com).
NEGENEROVAT a nikam neposílat soukromý JSON klíč.

### 2. Search Console oprávnění

Otevřít https://search.google.com/search-console?resource_id=sc-domain%3Aatmosferi.com
→ Settings → Users and permissions → Add user → zadat e-mail servisního účtu s oprávněním Full user.
Musí jít o přesnou property sc-domain:atmosferi.com. API token má i nadále výhradně scope webmasters.readonly; nesmí měnit nastavení ani žádat o indexaci.

### 3. Soukromý Google Sheet

V Google Drivu propojeném s ChatGPT vytvořit SOUKROMÝ sešit s názvem například Atmosferi – Search Console monitoring.
Sešit sdílet pouze se servisním účtem jako Editor, nesdílet veřejným odkazem.
Sešit může být prázdný: první běh automaticky vytvoří záložky Overview, Inspection, Queries, LandingPages a jejich hlavičky.
Ze soukromé URL ve tvaru https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit opsat SPREADSHEET_ID.
Tento soukromý sešit pak mohu vyhodnocovat přes propojený Google Drive/Sheets.

### 4. GitHub OIDC / Workload Identity Federation

V Google Cloud IAM & Admin → Workload Identity Federation vytvořit pool a OIDC provider.
Issuer: https://token.actions.githubusercontent.com
Attribute mapping:
- google.subject = assertion.sub
- attribute.repository = assertion.repository

Podmínka provideru omezující výhradně repozitář a větev main:
assertion.repository == 'michalkasparek91-arch/atmosferi-web' && assertion.ref == 'refs/heads/main'

Na servisním účtu udělit roli Workload Identity User výhradně členovi principalSet tohoto poolu pro attribute.repository/michalkasparek91-arch/atmosferi-web.
Příklad cesty:
principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/attribute.repository/michalkasparek91-arch/atmosferi-web

Oficiální dokumentace:
https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
https://github.com/google-github-actions/auth

### 5. Tři GitHub Actions variables

Repo Settings → Secrets and variables → Actions → Variables. Vložit tyto identifikátory, nikoli hesla či tokeny:
- GSC_WIF_PROVIDER: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
- GSC_SERVICE_ACCOUNT: e-mail servisního účtu
- GSC_SPREADSHEET_ID: ID soukromého Google Sheets sešitu

### 6. Ověření a provoz

Po merge do main otevřít GitHub → Actions → Direct Google Search Console monitoring → Run workflow.
Pokud proměnné chybí, monitor se bezpečně přeskočí. To není úspěšné propojení.
Při kompletním nastavení běh automaticky čte GSC, rotačně kontroluje indexaci článků a výsledky zapisuje pouze do soukromého sešitu.
Workflow log vypíše jen potvrzení zápisu, nikdy neveřejné metriky nebo dotazy.
Po prvním úspěšném běhu se dá aktivní SEO automatizace rozšířit o hodnocení této soukromé tabulky.

## Omezení

- Data o organickém výkonu mají typicky zpoždění 2–3 dny; běh každou minutu nemá přidanou hodnotu.
- URL Inspection vrací stav známý indexu Google, nikoli živý test; neslouží k vynucení indexace.
- Úspěšný GitHub build ještě nedokazuje HTTP 200 na produkční doméně.
- Bez přístupových práv GSC a sdíleného soukromého sešitu nejde automatizaci prohlásit za připojenou.
- Nepoužívat Google Indexing API k masovému hlášení běžných redakčních článků.
