# Vyhledávání firemních kontaktů na Windows

Spusťte z kořene repozitáře v PowerShellu. Skript používá Node.js 24, který je na tomto PC nainstalovaný.

```powershell
node scripts/find-business-leads.mjs --cities Praha --limit 15
node scripts/find-business-leads.mjs --countries CZ,SK,DE,AT --pages 2 --limit 80
node scripts/find-business-leads.mjs --countries CZ --types architect,developer --limit 30
```

Vyhledávání používá místní názvy oborů a měst. Výchozí je Česko a všechny tři obory. Pro architekty vyhledává studia, pro developery firmy v realitním developmentu. Volba `--help` vypíše země a další možnosti.

Skript hledá veřejně uvedený e-mail a telefon na firemních webech. Výsledný CSV soubor je v `artifacts/private/lead-finder/` a obsahuje i odkazy na stránky, kde byl kontakt nalezen. Město vyplní, pokud jeho název najde na webu firmy. Každý běh vytváří nový soubor. Kontakty pouze s telefonem zůstávají v CSV, protože admin vyžaduje e-mail.

## Přímý zápis do adminu

Přepínač `--write-admin` ukládá nové kontakty s e-mailem do **E-maily → Agentury → K prověření**. Skript porovnává domény a e-maily s evidencí a při opakovaném běhu zachovává stav existujících kontaktů. Telefon a zdroje ukládá do poznámky. Skript eviduje kontakty k ruční kontrole. Odesílání e-mailů se z něj nespouští.

```powershell
$leadAdmin = Get-Credential -Message 'Přihlášení správce Atmosferi'
$env:LEAD_ADMIN_EMAIL = $leadAdmin.UserName
$env:LEAD_ADMIN_PASSWORD = $leadAdmin.GetNetworkCredential().Password
try {
    node scripts/find-business-leads.mjs --cities Praha --limit 15 --write-admin
} finally {
    Remove-Item Env:LEAD_ADMIN_EMAIL, Env:LEAD_ADMIN_PASSWORD
}
```

Přihlášení používá stávající účet správce a veřejný klíč adminu. Pro účet s MFA lze předat platný přístupový token v `LEAD_ADMIN_ACCESS_TOKEN`. CSV s e-maily lze také nahrát přes **Import CSV k prověření** v adminu.

## Zdroj vyhledávání

Výchozí volba používá [Seznam](https://o-seznam.cz/napoveda/vyhledavani/prubeh-vyhledavani/). Po nastavení `SERPER_API_KEY` používá [Serper](https://serper.dev/) s parametrem země a jazyka. Zdroj lze zvolit ručně přes `--engine seznam`, `--engine serper` nebo `--engine bing`. Bing se čte přes RSS a při testu v Česku měl slabší relevanci.

## Automatický sběr německých marketingových agentur

Úloha **Atmosferi - DE Marketing Agencies** v Plánovači Windows běží při přihlášení a pak každých 15 minut. Vybírá až šest čekajících kombinací obec, obor a hledaný výraz. Kontroluje nejvýše 120 webů na dávku a současně čte až osm různých webů. Prochází všechny politicky samostatné obce z registru [Destatis GV100AD](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html). Marketing má sedm různých dotazů na obec. Na začátku bere větší města, ručně lze obec posunout dopředu. Neúspěšný dotaz se zopakuje a dokončený se znovu naplánuje po 30 dnech. Počet nalezených firem závisí na veřejných výsledcích vyhledávače a obsahu firemních webů.

Stav a nastavení jsou na [místním panelu](http://127.0.0.1:4317/). Lze měnit obory, pozastavit sběr, vyhledat obec, změnit její prioritu nebo ji zařadit k nové kontrole. Panel ukazuje aktivní a dokončené dotazy, frontu importu, nedávné dávky a exporty CSV.

Každý běh vytváří CSV s nalezenými kontakty. Záznamy s e-mailem připravuje do `artifacts/private/lead-finder/de-agencies/pending`. Automatizace **Atmosferi – import německých agentur** v Codexu vyzvedává dávky každých 30 minut a zapisuje je do **K prověření** přes připojený Supabase. Když Codex není dostupný, sběr při přihlášeném Windows pokračuje a dávky zůstávají ve frontě. Úspěšně zpracované dávky se přesouvají do `imported`.

Denní log Windows a místní plán SQLite jsou ve složce `artifacts/private/lead-finder/de-agencies/`. První instalace nebo aktualizace registru a úloh se provádí z kořene repozitáře v PowerShellu.

```powershell
.\scripts\refresh-de-municipalities.ps1
.\scripts\install-de-agency-task.ps1
```

Ruční spuštění a stav registrované úlohy lze ověřit také v PowerShellu.

```powershell
Start-ScheduledTask -TaskName 'Atmosferi - DE Marketing Agencies'
Get-ScheduledTaskInfo -TaskName 'Atmosferi - DE Marketing Agencies'
```
