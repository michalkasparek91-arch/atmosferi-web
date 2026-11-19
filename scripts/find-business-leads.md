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

Přepínač `--write-admin` ukládá nové kontakty s e-mailem do **Agentury · akvizice → K prověření**. Skript porovnává domény a e-maily s evidencí a při opakovaném běhu zachovává stav existujících kontaktů. Telefon a zdroje ukládá do poznámky. Skript eviduje kontakty k ruční kontrole. Odesílání e-mailů se z něj nespouští.

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
