import { createClient } from "npm:@supabase/supabase-js@2";
import { isAutomationAllowed } from "../_shared/automation-guard.ts";
import { logJobStart, logJobSuccess, logJobFailure } from "../_shared/automation-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string): string {
  if (!p) return "";
  let clean = p.replace(/\s+/g, "");
  if (!clean.startsWith("+")) {
    if (clean.length === 9) clean = "+420" + clean;
  }
  return clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jobName = "Continuous Web Discovery";
  let supabase: any;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const __gate = await isAutomationAllowed(supabase, "autonomous-web-sniper");
    if (!__gate.allowed) {
      console.log("[autonomous-web-sniper] Skipped: " + __gate.reason);
      return new Response(JSON.stringify({ skipped: true, reason: __gate.reason }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    await logJobStart(supabase, jobName);

    const body = await req.json().catch(() => ({}));
    const forceSearch = body.forceSearch === true;

    // 1. Fetch scraper config from DB
    const { data: configData, error: configErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "scraper_config")
      .maybeSingle();

    if (configErr) console.warn("Could not fetch scraper config:", configErr);

    const defaultConfig = {
      is_enabled: false,
      keywords: ["architekt", "interiérový designér", "developer"],
      cities: ["Praha", "Brno", "Ostrava"],
      countries: ["Česká republika", "Německo", "Rakousko", "Austrálie", "Finsko"]
    };

    const config = configData?.value || defaultConfig;

    if (!forceSearch && config.is_enabled !== true) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0, reason: "Autonomous mode is disabled in settings" });
      return new Response(JSON.stringify({ ok: true, message: "Autonomous scraping is disabled." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keywords = (config.keywords && config.keywords.length > 0) ? config.keywords : defaultConfig.keywords;
    const cities = (config.cities && config.cities.length > 0) ? config.cities : defaultConfig.cities;

    // Pick random keyword and city
    const targetKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const targetCity = cities[Math.floor(Math.random() * cities.length)];
    const targetCountry = (config.countries && config.countries.length > 0) ? config.countries[Math.floor(Math.random() * config.countries.length)] : (defaultConfig.countries ? defaultConfig.countries[0] : "Česká republika");

    console.log(`[WebSniper] Initiating live web search via Google Grounding for ${targetKeyword} in ${targetCity}, ${targetCountry}...`);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Chybí GEMINI_API_KEY proměnná prostředí");
    
    const SEARCH_PROMPT = `Jsi autonomní vyhledávací agent platformy Atmosferi.com.
Tvým úkolem je vyhledat na webu přes Google reálné a aktivní B2B firmy (konkrétně: "${targetKeyword}") působící v obci/městě ${targetCity}, ${targetCountry} (${targetCountry}) nebo v těsném okolí.

Zajímají nás POUZE subjekty, u kterých na webu existuje e-mailová adresa. Vyhledej 5 až 10 takových firem z dané lokality a okolí.

Pro každou firmu vytěž přesně tyto informace:
1. "company_name": Oficiální název firmy nebo celé jméno a příjmení živnostníka
2. "email": E-mailová adresa
3. "phone": Telefonní číslo (vlož mezinárodní předvolbu, např. +49 pro Německo)
4. "website": Odkaz na webové stránky nebo profil v katalogu
5. "city": Obec nebo město sídla / působiště
6. "full_address": Kompletní poštovní adresa (ulice, č.p., město, PSČ)
7. "description": Detailní textové shrnutí (alespoň 2-3 věty) o tom, na co se firma specializuje, jaké provádí práce a jaké má zkušenosti.

Odpověz POUZE čistým validním JSON polem objektů. Žádný markdown, žádné zpětné uvozovky.`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: SEARCH_PROMPT }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!geminiRes.ok) {
      const errTxt = await geminiRes.text();
      throw new Error(`Gemini Grounding API chyba: ${errTxt}`);
    }

    const resJson = await geminiRes.json();
    let textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    // Strip markdown formatting if any
    textOut = textOut.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let discoveredList: any[] = [];
    try {
      discoveredList = JSON.parse(textOut);
    } catch (parseErr) {
      console.error("[WebSniper] Could not parse JSON from Gemini output:", textOut);
      throw new Error("AI nevrátila validní formát JSON.");
    }

    if (!Array.isArray(discoveredList) || discoveredList.length === 0) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0, targetKeyword, targetCity });
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, message: "Nebyly objeveny žádné firmy s e-mailem." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[WebSniper] Gemini discovered ${discoveredList.length} potential leads. Inserting into CRM...`);

    let newSavedCount = 0;

    for (const item of discoveredList) {
      if (!item.email || !item.email.includes("@")) continue;
      const cleanEmail = item.email.toLowerCase().trim();

      // Check if email exists in profiles or leads
      const { data: pExist } = await supabase.from("profiles").select("id").eq("email", cleanEmail).maybeSingle();
      if (pExist) continue;

      const { data: lExist } = await supabase.from("marketing_leads").select("id").eq("email", cleanEmail).maybeSingle();
      if (lExist) continue;

      const phoneNorm = normalizePhone(item.phone || "");

      const { data: newLead, error: insertErr } = await supabase
        .from("marketing_leads")
        .insert({
          email: cleanEmail,
          full_name: item.company_name || "B2B Partner",
          company_name: item.company_name || "B2B Partner",
          phone: phoneNorm,
          website: item.website || "",
          city: item.city || targetCity,
          full_address: item.full_address || `${item.city || targetCity}, ČR`,
          category: "B2B",
          subcategory: targetKeyword,
          description: item.description || `Autonomně nalezený kontakt v kategorii ${targetKeyword}`,
          company_description: item.description || `Autonomně nalezený kontakt v kategorii ${targetKeyword}`,
          source: "ai_web_sniper",
        })
        .select()
        .single();

      if (!insertErr && newLead) {
        newSavedCount++;
      }
    }

    // Create admin notification
    if (newSavedCount > 0) {
      try {
        await supabase.from("admin_notifications").insert({
          title: "🌐 AI Sběr: Nové B2B kontakty",
          message: `Pro lokaci ${targetCity} (${targetKeyword}) bylo objeveno a uloženo ${newSavedCount} nových firem.`,
          link: "/admin/emaily?tab=crm",
          type: "success"
        });
      } catch (ne) {
        console.warn("[WebSniper] Notification error:", ne);
      }
    }

    await logJobSuccess(supabase, jobName, { discovered_count: newSavedCount, targetKeyword, targetCity });

    return new Response(JSON.stringify({ 
      ok: true, 
      discovered_count: newSavedCount, 
      targetKeyword,
      targetCity,
      message: `Úspěšně dohledáno a uloženo ${newSavedCount} firem z webu pro klíčové slovo ${targetKeyword} (${targetCity}).` 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});