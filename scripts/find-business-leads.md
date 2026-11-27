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

Německé marketingové agentury ze scraperu patří do **E-maily → Akvizice → Agentury · Německo**. Import přiřadí kategorii `agentury`, jazyk `de` a konkrétní německou šablonu. Přímý import i dávkový zápis používají stejné databázové pravidlo. Původní importní záznam slouží jako archiv. Ke skutečnému oslovení musí kontakt projít kontrolou a ověřením e-mailu a příslušná kampaň musí být zapnutá. Šablony a historie českých agentur jsou v části **Agentury · Česko**.

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

Pro samostatný import ve Windows slouží spárování počítače. Skript `scripts/pair-lead-import.ps1` uloží náhodný klíč přes Windows DPAPI pro aktuálního uživatele a vypíše jeho SHA-256 otisk. Správce registruje tento otisk v tabulce `pc_lead_ingest.devices` po nasazení migrace `pc_lead_review_ingest`. Odebráním otisku přístup odvolá. Import přijímá maximálně 20 řádků na požadavek a používá existující pravidla kontroly a směrování. Příkaz `--check-direct` ověří přístup prázdnou dávkou.

```powershell
node scripts/lib/de-agency-background.mjs --check-direct
node scripts/lib/de-agency-background.mjs --direct
```

Spárovaný počítač vyzvedává dávky na začátku i na konci plánovaného běhu. Přímý import lze vypnout pomocí `LEAD_ADMIN_DIRECT=0`. Na počítači bez spárování lze stále použít `LEAD_ADMIN_DIRECT=1` a přihlášení správce popsané výše. Dávka opustí frontu až po potvrzení zápisu. Opakování již přijaté dávky sloučí duplicity podle identifikátoru, e-mailu a domény.

## Zdroj vyhledávání

Výchozí volba používá [Seznam](https://o-seznam.cz/napoveda/vyhledavani/prubeh-vyhledavani/). Po nastavení `SERPER_API_KEY` používá [Serper](https://serper.dev/) s parametrem země a jazyka. Zdroj lze zvolit ručně přes `--engine seznam`, `--engine serper` nebo `--engine bing`. Bing se čte přes RSS a při testu v Česku měl slabší relevanci.

### Overture Places pro Německo

V místním panelu vyber zemi a zapni **Přidat agentury z Overture Places**. Panel na tomto PC každých pět minut zkontroluje aktivní země a obory. Dostupná vydání kontroluje jednou denně. Nové vydání stáhne do místní mezipaměti, při změně obcí nebo pravidel přiřazení znovu použije uložený soubor. Obnovu provádí samostatný proces. Při chybě se pokus zopakuje a příčina je vidět u země. Pokud právě běží katalogová dávka, obnova počká na její dokončení.

Katalog obsahuje weby reklamních, marketingových, online marketingových a PR agentur s adresou v dané zemi. Plán vede samostatnou pozici pro každou obec. Při obnově ponechá zpracované domény na místě, doplní nové na konec a při změně vydání vyřadí zaniklé položky. Do fronty pro kontrolu se dostávají až kontakty ověřené na firemních webech. [Overture Places a původ dat](https://docs.overturemaps.org/guides/places/)

Německé souřadnice se porovnávají s oficiálními hranicemi VG250 podle osmimístného klíče AGS. Obce se stejným názvem lze rozlišit podle polohy. U hranice se ponechá pouze jednoznačná shoda názvu. Rozpor názvu s polygonem je veden zvlášť. V ostatních zemích se porovnává lokalita s nastaveným seznamem měst a známými místními či cizojazyčnými názvy. Panel u země ukazuje počty přiřazených webů a nepřiřazených adres. Hranice obcí © BKG (rok stažení je uveden v panelu), dl-de/by-2-0. [Zdroje VG250](https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf)

K ruční obnově poslouží příkaz níže. Export potřebuje Python s DuckDB a httpfs. Cestu k vlastní instalaci Pythonu lze nastavit přes `LEAD_FINDER_PYTHON`. Na tomto PC se DuckDB načítá z adresáře `artifacts/private/lead-finder/python-packages`.

```powershell
node scripts/refresh-lead-catalogs.mjs
```

## Automatický sběr německých marketingových agentur

Po běžném vyhledávání plánovač využívá zbývající čas do sedmé minuty běhu pro ověření známých webů z Overture. V jedné dávce sdílí více obcí kapacitu 40 webů a osm souběžných kontrol. Každá obec má vlastní pozici v katalogu a historii. Přednost má právě prohledávaná obec, následovaná povolenými obcemi podle priority. Rozpracovaná dávka doběhne a před další se znovu zkontroluje pauza i rozsah plánu. Místní panel zobrazuje počet nových záznamů potvrzených přímým importem za posledních 60 minut. Během první hodiny ukazuje také začátek měření.

Úloha **Atmosferi - DE Marketing Agencies** v Plánovači Windows běží při přihlášení a pak každých 15 minut. Zpracuje až šest stránek výsledků na běh a střídá čekající dotazy téže obce. Když zbývá jediný dotaz, může v jednom běhu projít až šest jeho navazujících stránek. V základní části běhu kontroluje nejvýše 120 webů a současně čte až osm různých webů. Prochází všechny politicky samostatné obce z registru [Destatis GV100AD](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html). Marketing má sedm různých dotazů na obec. Na začátku bere větší města, ručně lze obec posunout dopředu.

Seznam předává vlastní odkaz na další stránku. Skript si odkaz uloží a naváže na něj i mezi běhy. Dotaz označí jako dokončený, až zdroj další stránku nenabídne nebo na hranici 500 výsledků prokazatelně vrátí první stránku. Když vyprší čas požadavku a v dávce je volný požadavek, zkusí tutéž stránku jednou znovu. Jinak ji uloží k opakování v některé z dalších dávek. Bing pokračuje až k prázdné stránce nebo opakování stejné sady výsledných URL. Serper končí při vyčerpání výsledků, opakování domén nebo po 100 stranách. Dokončený dotaz se po 30 dnech znovu zařadí do plánu. Počet nalezených firem závisí na dosahu vyhledávače a na veřejně dostupném obsahu firemních webů.

Vyhledávač zpracovává vždy jednu obec. Jakmile dokončí její dotazy, zkontroluje nalezené weby a uloží výsledky, může zbývající požadavky téhož běhu využít pro další obec. Rozpracovanou obec a pozici jednotlivých dotazů si pamatuje mezi běhy. I když všechny zbývající dotazy čekají na opakování po chybě, další obec vybere až po jejich dokončení. Ruční priorita se projeví při výběru další obce. Pokud obec v panelu pozastavíš, její dotazy zůstanou uložené a plánovač může přejít jinam. V automatickém běhu se velikost stránky Seznamu zvýší na 20 výsledků, jakmile se pokračování dostane na vhodný násobek 20. Počet požadavků na vyhledávač zůstává stejný a pozice se nepřeskakují.

Stav a nastavení jsou na [místním panelu](http://127.0.0.1:4317/). Lze měnit obory, pozastavit sběr, vyhledat obec, změnit její prioritu nebo ji zařadit k nové kontrole. Panel ukazuje rozpracovanou obec, kolik dotazů je hotových a kdy se může opakovat dotaz po chybě. Zobrazuje také frontu importu, nedávné dávky a exporty CSV.

V **E-maily → Agentury → Sběr kontaktů** lze na tomto PC připojit živý souhrn místního panelu. Prohlížeč může při prvním připojení požádat o povolení přístupu k místní síti.

Každý běh vytváří CSV s nalezenými kontakty. Záznamy s e-mailem připravuje do `artifacts/private/lead-finder/de-agencies/pending`. Spárovaný počítač odesílá dávky přímo do adminu. Při nedostupnosti spojení je zachová ve frontě do dalšího pokusu. Úspěšně zpracované dávky se přesouvají do `imported`.

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
