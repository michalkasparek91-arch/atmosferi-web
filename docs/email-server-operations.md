# Serverové rozesílání Atmosferi

Rozesílání nezávisí na prohlížeči ani na počítači správce. Supabase Cron spouští `validate-lead-domains` každou minutu a `dispatch-acquisition-emails` každé tři minuty mezi 08:00 a 19:00 v Europe/Prague.

Obě serverové úlohy ověřují token uložený ve Vaultu přes `verify_atmosferi_email_cron_token`. Token se nečte do klienta. Samotný odesílač nadále vyžaduje administrátorský JWT nebo service role.

## Ochrany

- `email_recipient_suppression`: historické bounces, spam, odhlášení, placeholder adresy a neplatná syntaxe. Kontakty se nemažou; drží se mimo publikum.
- `outreach_email_ready` vznikne až po úspěšné DNS kontrole domény a kontrole stávajících zákazů oslovení. Podmínka platí pro vytvoření publika i výběr dříve vytvořených konceptů.
- `email_recipient_is_ready` znovu kontroluje aktuální cache a suppression před odesláním. Záznamy starší 30 dní se neakceptují.
- DNS timeout / SERVFAIL znamená `unknown`, tedy neodesílat a zkusit ověření později. Null MX znamená výslovně nepřijímanou poštu. Platná doména nepotvrzuje existenci konkrétní schránky.
- Zámky brání souběžným běhům. Pokus o odeslání se rezervuje před voláním poskytovatele; nejasný výsledek se automaticky neposílá znovu.
- Pro opatrné obnovení po problémech platí limit 25 zpráv denně a nejvýše 5 v jedné serverové vlně. Provider zůstává Brevo, aby se zachovala existující zpětná vazba o doručení.
- První nový bounce, stížnost nebo odhlášení pro zprávu odeslanou od `safety_started_at` vypne rozesílání a nastaví `safety_paused=true`. Už běžící odeslání nelze vzít zpět. Starší zpožděná událost vyřadí adresu, ale nezastaví novou kontrolní sérii.

## Provoz

Stav je v `email_dispatch_state` a `email_validation_state`; výsledky domén v `email_domain_check`. Chyby jsou viditelné v administraci. Succeeded záznam v `cron.job_run_details` sám o sobě neprokazuje úspěšné HTTP volání: kontroluj také `net._http_response` a časy posledního dokončeného běhu.

Při bezpečnostní pauze zkontroluj nové události a konkrétní adresy. Nevynulovávej suppression ani preference. Limit nezvyšuj automaticky na 300; nejprve potřebuješ skutečné výsledky doručení. Po ručně ověřené nápravě se nová kontrolní série zahájí nastavením `enabled=true`, `safety_paused=false`, `safety_started_at=now()` a vhodného `daily_limit`. Neměň tento čas kvůli pouhému skrytí chyb.

Ověření kódu bez odesílání:

    deno test --config=supabase/functions/deno.json --allow-env supabase/functions/_shared/mail-domain_test.ts supabase/functions/_shared/outreach-leads_test.ts

Referenční postup cronů: https://supabase.com/docs/guides/functions/schedule-functions
