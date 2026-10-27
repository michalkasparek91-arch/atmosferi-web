import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { domainHasMx } from "../_shared/email_validation.ts";

// ─────────────────────────────────────────────────────────────────────────────
// OVĚŘENÍ DORUČITELNOSTI STÁVAJÍCÍ DATABÁZE
//
// Rozesílat na ~75 tis. nascrapovaných adres bez kontroly je nejrychlejší
// cesta, jak si nechat pozastavit SES účet (bounce rate nad 5 %).
//
// Ověřuje se DOMÉNA přes DNS-over-HTTPS, ne jednotlivá adresa — stejná doména
// se tak zkontroluje jednou a výsledek se uloží do email_domain_check.
// Kontakty na doméně bez MX záznamu se označí outreach_import_review = true,
// čímž vypadnou z publika. Nic se nemaže.
//
// Funkce je idempotentní a navazuje tam, kde minule skončila — klidně ji
// pověs na hodinový cron, dokud se backlog neprojede.
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json().catch(() => ({}));
    const maxDomains = Math.min(Number(body.limit) || 300, 800);
    const concurrency = Math.min(Number(body.concurrency) || 12, 25);
    const startedAt = Date.now();
    const budgetMs = Number(body.budget_ms) || 90_000;

    // Domény, které ještě nemáme ověřené.
    const { data: pending, error: pendErr } = await supabase.rpc("pending_email_domains", { max_rows: maxDomains });
    let domains: string[];

    if (pendErr) {
      // RPC není povinné — fallback: dotáhnout vzorek adres a vybrat domény v kódu.
      const { data: rows, error } = await supabase
        .from("marketing_leads").select("email")
        .not("email", "is", null)
        .limit(maxDomains * 20);
      if (error) throw error;
      const { data: known } = await supabase.from("email_domain_check").select("domain");
      const knownSet = new Set((known || []).map((d: any) => d.domain));
      const uniq = new Set<string>();
      for (const r of rows || []) {
        const d = String(r.email).toLowerCase().split("@")[1];
        if (d && !knownSet.has(d)) uniq.add(d);
        if (uniq.size >= maxDomains) break;
      }
      domains = [...uniq];
    } else {
      domains = (pending || []).map((r: any) => r.domain);
    }

    if (domains.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Vše ověřeno.", zkontrolovano: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Kontrola po dávkách, ať se nezahltí DNS ani časový limit funkce.
    const results: { domain: string; has_mx: boolean }[] = [];
    for (let i = 0; i < domains.length; i += concurrency) {
      if (Date.now() - startedAt > budgetMs) break;
      const slice = domains.slice(i, i + concurrency);
      const checked = await Promise.all(
        slice.map(async (d) => ({ domain: d, has_mx: await domainHasMx(d).catch(() => true) }))
      );
      results.push(...checked);
    }

    if (results.length > 0) {
      const { error: upErr } = await supabase.from("email_domain_check")
        .upsert(results.map(r => ({ ...r, checked_at: new Date().toISOString() })), { onConflict: "domain" });
      if (upErr) throw upErr;
    }

    // Kontakty na doménách bez MX vyřadit z publika.
    const bad = results.filter(r => !r.has_mx).map(r => r.domain);
    let vyrazeno = 0;
    for (const d of bad) {
      const { count } = await supabase.from("marketing_leads")
        .update({ outreach_import_review: true, updated_at: new Date().toISOString() }, { count: "exact" })
        .ilike("email", `%@${d}`)
        .eq("outreach_import_review", false);
      vyrazeno += count || 0;
    }

    return new Response(JSON.stringify({
      ok: true,
      zkontrolovano_domen: results.length,
      bez_mx: bad.length,
      vyrazeno_kontaktu: vyrazeno,
      zbyva_v_davce: domains.length - results.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
