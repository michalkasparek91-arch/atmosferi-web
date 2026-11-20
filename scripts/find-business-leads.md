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

Obor určuje obor vyhledávacího dotazu. Firma se do sběru zařadí, když její vlastní web uvádí odpovídající činnost. Specializace se zapíše, když ji web potvrzuje. U cíleného dotazu bez potvrzené specializace zůstane poznámka **Specializace k ověření**. CSV a poznámka v adminu obsahují hledaný výraz. V Německu lze jednotlivý výraz ověřit například příkazem `node scripts/find-business-leads.mjs --countries DE --cities Berlin --types architect --term Innenarchitektur`.

Přímé zpracování už připravené fronty používá stejné přihlášení správce a stejné ukládání do **K prověření**. Před přepnutím ověřte přístup příkazem `--check-direct` se stejnými přihlašovacími proměnnými jako u `--write-admin`.

```powershell
node scripts/lib/de-agency-background.mjs --check-direct
node scripts/lib/de-agency-background.mjs --direct
```

S `LEAD_ADMIN_DIRECT=1` v prostředí úlohy Windows se připravené dávky budou importovat po každém plánovaném běhu, i když se při něm nesbírají nové kontakty. Úloha musí dostat platné přihlášení popsané výše. Po ověření přímého importu lze vypnout dosavadní automatizaci v Codexu. Dávka opustí frontu až po potvrzení zápisu Supabase.

## Zdroj vyhledávání

Výchozí volba používá [Seznam](https://o-seznam.cz/napoveda/vyhledavani/prubeh-vyhledavani/). Po nastavení `SERPER_API_KEY` používá [Serper](https://serper.dev/) s parametrem země a jazyka. Zdroj lze zvolit ručně přes `--engine seznam`, `--engine serper` nebo `--engine bing`. Bing se čte přes RSS a při testu v Česku měl slabší relevanci.

## Automatický sběr německých marketingových agentur

Úloha **Atmosferi - DE Marketing Agencies** v Plánovači Windows běží při přihlášení a pak každých 15 minut. Zpracuje až šest stránek výsledků na běh a střídá čekající dotazy téže obce. Když zbývá jediný dotaz, může v jednom běhu projít až šest jeho navazujících stránek. Kontroluje nejvýše 120 webů na dávku a současně čte až osm různých webů. Prochází všechny politicky samostatné obce z registru [Destatis GV100AD](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html). Marketing má sedm různých dotazů na obec. Na začátku bere větší města, ručně lze obec posunout dopředu.

Seznam předává vlastní odkaz na další stránku. Skript si odkaz uloží a naváže na něj i mezi běhy. Dotaz označí jako dokončený, až zdroj další stránku nenabídne nebo vyčerpá podporovaný rozsah. Když vyprší čas požadavku a v dávce je volný požadavek, zkusí tutéž stránku jednou znovu. Jinak ji uloží k opakování v některé z dalších dávek. Bing a Serper používají číslované stránky a končí při vyčerpání výsledků, opakování domén nebo po 100 stranách. Dokončený dotaz se po 30 dnech znovu zařadí do plánu. Počet nalezených firem závisí na dosahu vyhledávače a na veřejně dostupném obsahu firemních webů.

Plánovač zpracovává vždy jednu obec. Jakmile dokončí její dotazy, zkontroluje nalezené weby a uloží výsledky, může zbývající požadavky téhož běhu využít pro další obec. Rozpracovanou obec a pozici jednotlivých dotazů si pamatuje mezi běhy. I když všechny zbývající dotazy čekají na opakování po chybě, další obec vybere až po jejich dokončení. Ruční priorita se projeví při výběru další obce. Pokud obec v panelu pozastavíš, její dotazy zůstanou uložené a plánovač může přejít jinam. V automatickém běhu se velikost stránky Seznamu zvýší na 20 výsledků, jakmile se pokračování dostane na vhodný násobek 20. Počet požadavků na vyhledávač zůstává stejný a pozice se nepřeskakují.

Stav a nastavení jsou na [místním panelu](http://127.0.0.1:4317/). Lze měnit obory, pozastavit sběr, vyhledat obec, změnit její prioritu nebo ji zařadit k nové kontrole. Panel ukazuje rozpracovanou obec, kolik dotazů je hotových a kdy se může opakovat dotaz po chybě. Zobrazuje také frontu importu, nedávné dávky a exporty CSV.

V **E-maily → Agentury → Sběr kontaktů** lze na tomto PC připojit živý souhrn místního panelu. Prohlížeč může při prvním připojení požádat o povolení přístupu k místní síti.

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
