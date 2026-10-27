# Akviziční e-maily: oprava a nasazení

Projekt: **Atmosferi**, `paryiowezqlnffanxtnt`. Nepoužívat projekt Zrobee.

## Zjištěné příčiny

- Horní tlačítko používalo `virtualBatches[0].template_id`, ale API vrací `template.id`.
- Nápis AUTO-SEND byl statický. Ruční vlny běžely pouze v prohlížeči.
- Produkční `auto_process-sniper-outbox` běží hodinově s prázdným tělem a bez service-role autentizace; současný endpoint potřebuje konkrétní akci a administrátora.
- Zastavení po chybě se zobrazovalo jako dokončená kampaň.
- Vlny vytvářely jen jeden chunk konceptů, takže `has_more` nezahrnovalo další dostupné kontakty.
- Existující částečný unikátní index neodpovídá PostgREST `ON CONFLICT(template_slug,lead_id)`.
- SMTP secrets existují (`SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`), ale nejsou zapojené do odesílače. Digest portu v produkci odpovídá **587**. Hodnoty přihlašovacích údajů nebyly čteny.

## Co je připravené

Serverový cron každé tři minuty odešle nejvýše pět zpráv, střídá aktivní šablony a funguje bez otevřeného prohlížeče. Společný limit je 300 pokusů za kalendářní den v Europe/Prague. Započítává odeslané zprávy i rezervované pokusy; změna delivery statusu limit nesnižuje.

Databázový zámek serializuje ruční a automatické odesílání. `dispatch_attempted_at` rezervuje každý pokus před voláním poskytovatele. Při přerušení nebo nejasném výsledku se zpráva sama znovu neodešle. SMTP chyba automatiku pozastaví. Automatika je po migraci vypnutá.

SMTP je samostatná volba bez automatického fallbacku. Používá TLS na portu 465, ověřuje certifikát, odesílá z autentizované schránky (`SMTP_FROM` může určit její zobrazované jméno) a původního odesílatele ponechává v Reply-To. Podporuje existující `SMTP_USERNAME` i alternativní `SMTP_USER`.

## Nasazení

1. Zpřístupnit projekt Atmosferi připojenému Supabase konektoru nebo přihlášenému CLI. Přihlášení v Chrome nemění účet konektoru/CLI.
2. Aplikovat migraci `20261027092124_acquisition_dispatch_smtp.sql`. Vyžaduje existující pg_cron, pg_net a Vault. Zkontrolovat advisories a RLS nové tabulky; RPC mají EXECUTE pouze pro service_role.
3. Nasadit `campaign-batcher`, `process-sniper-outbox` a `dispatch-acquisition-emails` se sdílenými soubory a import mapou. V repozitáři jsou `deno.json` a `deno.lock` pro reprodukovatelné ověření.
4. Nasadit administraci standardním buildem projektu.
5. Nastavit **serverové Edge secrets**: `SMTP_HOST=smtp.forpsi.com`, `SMTP_PORT=465`, uživatele celé schránky do `SMTP_USERNAME` a její heslo do `SMTP_PASSWORD`. Stávající host ani heslo nepovažovat bez ověření za FORPSI údaje. Volitelně `SMTP_FROM=Atmosferi <adresa-schranky>`.
6. Ve Vault vytvořit `project_url=https://paryiowezqlnffanxtnt.supabase.co` a `service_role_key` s klíčem stejného projektu. Nedávat je do veřejného app_settings ani do prohlížeče/zdrojového kódu. Cron bez těchto secrets nic nevolá.
7. Nejdříve odeslat jeden test z vybraného konceptu na vlastní adresu přes volbu FORPSI SMTP a ověřit doručení a hlavičky SPF/DKIM. FORPSI může vyžadovat povolení odesílání ze země datacentra Supabase (Irsko).
8. Zapnout automatiku:

   ```sql
   update public.email_dispatch_state
   set enabled = true, provider = 'smtp', daily_limit = 300, last_error = null
   where id = 1;
   ```

9. Ověřit dva po sobě jdoucí běhy: `last_run_at`, `last_error`, změny `email_outbox`, společný denní počet a doručení. Starou úlohu `auto_process-sniper-outbox` deaktivovat v automation_jobs, aby se neobnovovala triggerem. Nepoužívat pro nový endpoint veřejný anon klíč.

## Pozastavení a řešení nejasných pokusů

```sql
update public.email_dispatch_state set enabled = false where id = 1;
select id, status, provider, dispatch_attempted_at, sent_at, error_message
from public.email_outbox
where dispatch_attempted_at is not null and sent_at is null;
```

Nejprve ověřit poskytovatelovy logy a doručení. Teprve pokud je potvrzeno, že zpráva nebyla přijata, lze u **konkrétního ověřeného ID** resetovat `dispatch_attempted_at=null`, `status='draft'`, `error_message=null`. Plošně pokusy neresetovat; SMTP neposkytuje idempotentní potvrzení po ztrátě spojení. Rezervace bez výsledku snižují dnešní limit záměrně.

## Kontroly

```powershell
deno check --config=supabase/functions/deno.json supabase/functions/process-sniper-outbox/index.ts supabase/functions/campaign-batcher/index.ts supabase/functions/dispatch-acquisition-emails/index.ts
deno test --config=supabase/functions/deno.json --allow-env supabase/functions/_shared/outreach-leads_test.ts supabase/functions/_shared/smtp_test.ts supabase/functions/dispatch-acquisition-emails/index_test.ts
cd admin
npm run build
```

Testy nemají povolenou síť a žádné zprávy neodesílají.

SQL migrace byla navíc ověřena v transakci v projektu Atmosferi s následným `ROLLBACK`: první zámek se získal, druhý byl odmítnut, denní rozpočet odpovídal 300 a veřejné role neměly EXECUTE na interní RPC. Tento test není nasazení.

Dokumentace: [Supabase omezení portů](https://supabase.com/docs/guides/functions/limits), [FORPSI SMTP](https://support.forpsi.com/kb/a3156/smtp-server-configuration.aspx).
