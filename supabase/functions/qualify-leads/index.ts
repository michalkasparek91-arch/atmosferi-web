import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { getApiKeys } from "../_shared/api_keys.ts";
import { callAIWithFallback, parseJsonArray } from "../_shared/ai-router.ts";
import { looksLikeDirectory } from "../_shared/lead-quality.ts";

// ─────────────────────────────────────────────────────────────────────────────
// KVALIFIKACE KONTAKTŮ (Cerebras — free tier, 1M tokenů/den)
//
// PROČ: po sběru bez AI má řada kontaktů místo názvu firmy titulek stránky
// ("Home [www.xy.at]", "Top 20 Architekten Wels"). A {{studio}} se dosazuje
// do PŘEDMĚTU e-mailu — takový předmět firmu spolehlivě odradí.
//
// CO DĚLÁ, pro každý kontakt:
//   1. brand_name    — čistý, oslovitelný název do předmětu
//   2. is_target     — je to vůbec firma, kterou chceme oslovit?
//   3. premium_score — odhad potenciálu 1–100 (dnes mají všichni 50)
//   4. description   — jedna věta, čím se firma zabývá
//
// Nevhodné kontakty (katalogy, portály, e-shopy) se označí příznakem
// outreach_import_review = true, čímž vypadnou z publika — nemažou se.
//
// Skóre je zásadní: při limitu 300 e-mailů denně trvá 75 tis. kontaktů
// osm měsíců. Rozhoduje tedy POŘADÍ, v jakém se oslovují.
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM =
  "Jsi B2B analytik. Hodnotis firmy pro architektonicke studio, ktere prodava " +
  "vizualizace a weby architektum, interierovym studiim a developerum. " +
  "Odpovidas VZDY pouze validnim JSON polem objektu, bez markdownu.";

function buildPrompt(batch: any[]): string {
  return `Pro kazdy zaznam nize vrat objekt s poli:
- id: prevezmi ze vstupu
- brand_name: kratky oslovitelny nazev firmy do predmetu e-mailu.
  Odstran pravni formu (s.r.o., GmbH, AG, Ltd, Oy, AS, zt), domeny, oddelovace
  a marketingove privlastky. Z "Home [www.toprealimmobilien.at]" udelej
  "Toprealimmobilien". Z "CHRPA stavebni spolecnost Pardubice" udelej "Chrpa".
  Kdyz nazev nedava smysl, odvod ho z domeny e-mailu.
- is_target: true/false. FALSE u katalogu, portalu, srovnavacu, zebricku,
  inzertnich serveru, e-shopu, uradu a skol. TRUE u skutecnych architektonickych
  a interierovych studii, projekcnich kancelari a developeru.
  PRIKLADY FALSE: "Top 20 Architekten Wels, 2026" (zebricek, ne firma),
  "Immobilienmakler in Wels finden" (vyhledavac), "Home [www.xy.at]" (titulek
  stranky bez firmy), cokoli s letopoctem v nazvu nebo se slovy finden /
  vergleich / ranking / nejlepsi.
- premium_score: 1-100, odhad potencialu jako klienta. Vys u studii s vlastni
  znackou a portfoliem, niz u jednotlivcu bez webu.
- description: JEDNA veta cesky, cim se firma zabyva. Kdyz nevis, vrat "".

Odpovez POUZE JSON polem. Zadny jiny text.

ZAZNAMY:
${JSON.stringify(batch)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 200, 500);
    const batchSize = Math.min(Number(body.batch_size) || 25, 40);

    const { data: cfgRow } = await supabase.from("app_settings")
      .select("value").eq("key", "scraper_config").maybeSingle();
    const cfg = cfgRow?.value || {};

    // Cerebras je na free tieru jediny spolehlivy; ostatni jen jako zaloha.
    const allowed: string[] = Array.isArray(cfg.qualify_chain) && cfg.qualify_chain.length
      ? cfg.qualify_chain
      : ["cerebras", "nvidia", "groq"];
    const models: Record<string, string> = {
      cerebras: cfg.cerebras_model || "gpt-oss-120b",
      nvidia: cfg.nvidia_model || "meta/llama-3.3-70b-instruct",
      groq: cfg.groq_model || "llama-3.3-70b-versatile",
    };

    // Nekvalifikovane kontakty: brand_name jeste nemaji.
    const { data: leads, error } = await supabase
      .from("marketing_leads")
      .select("id, company_name, email, website, city, country, category")
      .not("email", "is", null)
      .or("brand_name.is.null,brand_name.eq.")
      .order("premium_score", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Neni co kvalifikovat.", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keys = await getApiKeys(supabase);
    let updated = 0, rejected = 0, failedBatches = 0;
    let provider = "";

    // Zjevne katalogy vyradime deterministicky — AI se na to spolehnout neda
    // a usetrime tokeny. Teprve zbytek jde na posouzeni modelu.
    const obvious = leads.filter((l: any) => looksLikeDirectory(l.company_name || "", l.website || "", l.email || ""));
    for (const l of obvious) {
      const { error: e2 } = await supabase.from("marketing_leads")
        .update({ outreach_import_review: true, brand_name: "—", updated_at: new Date().toISOString() })
        .eq("id", l.id);
      if (!e2) { rejected++; updated++; }
    }
    const toAsk = leads.filter((l: any) => !obvious.includes(l));

    for (let i = 0; i < toAsk.length; i += batchSize) {
      const batch = toAsk.slice(i, i + batchSize).map((l: any) => ({
        id: l.id,
        nazev: l.company_name,
        email: l.email,
        web: l.website || "",
        mesto: l.city || "",
        obor: l.category || "",
      }));

      let items: any[] = [];
      try {
        const res = await callAIWithFallback({
          supabase, keys, allowed, models,
          system: SYSTEM, user: buildPrompt(batch), jsonMode: true, timeoutMs: 60000,
        });
        provider = res.provider;
        items = parseJsonArray(res.text);
      } catch (e) {
        failedBatches++;
        console.error("Davka selhala:", (e as Error).message);
        continue; // dalsi davka; uz zpracovane zustavaji ulozene
      }

      const byId = new Map(leads.map((l: any) => [l.id, l]));
      for (const it of items) {
        if (!it?.id) continue;
        const src: any = byId.get(it.id);
        // Deterministicke pravidlo prebiji verdikt AI.
        const hardBlock = src
          ? looksLikeDirectory(it.brand_name || src.company_name || "", src.website || "", src.email || "")
          : false;
        const isTarget = it.is_target !== false && !hardBlock;
        const patch: Record<string, any> = {
          brand_name: String(it.brand_name || "").trim().slice(0, 80) || null,
          updated_at: new Date().toISOString(),
        };
        if (it.description) patch.description = String(it.description).trim().slice(0, 400);
        const score = Number(it.premium_score);
        if (Number.isFinite(score)) patch.premium_score = Math.max(1, Math.min(100, Math.round(score)));
        // Nevhodne kontakty nemazeme — jen je vyradime z publika.
        if (!isTarget) { patch.outreach_import_review = true; rejected++; }

        const { error: upErr } = await supabase.from("marketing_leads").update(patch).eq("id", it.id);
        if (!upErr) updated++;
      }

      await supabase.from("api_usage_logs")
        .insert({ engine: provider || "cerebras", service_name: "qualify-leads", requests_count: 1 })
        .then(() => {}, () => {});
    }

    const { count: remaining } = await supabase.from("marketing_leads")
      .select("id", { count: "exact", head: true })
      .not("email", "is", null).or("brand_name.is.null,brand_name.eq.");

    return new Response(JSON.stringify({
      ok: true, provider, nacteno: leads.length, vyrazeno_bez_AI: obvious.length, aktualizovano: updated,
      vyrazeno_jako_necil: rejected, selhalo_davek: failedBatches, zbyva_kvalifikovat: remaining ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
