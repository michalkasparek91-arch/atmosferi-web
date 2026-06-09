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

    // Let's pass the arrays so AI can see the user's preferred cities
    const preferredCitiesList = cities.join(", ");
    
    // Pick a random country and random keyword
    const targetKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const targetCountry = (config.countries && config.countries.length > 0) ? config.countries[Math.floor(Math.random() * config.countries.length)] : (defaultConfig.countries ? defaultConfig.countries[0] : "Česká republika");

    console.log(`[WebSniper] Initiating live web search via Google Grounding for ${targetKeyword} in ${targetCountry}...`);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Chybí GEMINI_API_KEY proměnná prostředí");
    
    const SEARCH_PROMPT = `Jsi autonomní vyhledávací agent platformy Atmosferi.com pro B2B akvizici.
Tvé aktuální zadání:
1. Cílový stát: ${targetCountry}
2. Hledaný obor v češtině: "${targetKeyword}"
3. Preferovaná města: ${preferredCitiesList}

Tvé kroky:
Krok 1: Přelož hledaný obor "${targetKeyword}" do hlavního jazyka státu ${targetCountry}.
Krok 2: Vyber si jedno vhodné město ve státě ${targetCountry}. Zkus primárně vybrat některé z "Preferovaných měst", pokud se nachází v tomto státě. Pokud žádné z preferovaných měst neleží v ${targetCountry}, vyber si jakékoliv jiné významné ekonomické město v ${targetCountry}.
Krok 3: Udělej přes Google vyhledávání na reálné a aktivní firmy v tomto vybraném městě a státě, pro tento lokálně přeložený obor.

Zajímají nás POUZE firmy, u kterých lze dohledat e-mailovou adresu. Vyhledej 5 až 10 takových B2B firem.

Pro každou firmu vytěž přesně tyto informace a vrať je jako JSON pole objektů:
1. "company_name": Oficiální lokální název firmy
2. "email": E-mailová adresa
3. "phone": Telefonní číslo s mezinárodní předvolbou (např. +49 pro Německo, +61 pro Austrálii)
4. "website": Odkaz na webové stránky
5. "city": Město sídla (to, které jsi vybral)
6. "country": "${targetCountry}"
7. "language": Hlavní jazyk tohoto státu (např. "de", "en", "cs")
8. "full_address": Kompletní poštovní adresa
9. "description": Krátký popis toho, co firma dělá (v češtině).
10. "ai_icebreaker": Napiš jeden velmi osobní, přirozený a specifický otevírací odstavec (tzv. icebreaker) do cold e-mailu V JAZYCE CÍLOVÉHO STÁTU (language). Icebreaker musí vycházet z toho, co firma dělá, chválit její práci nebo projekty. Nesmí to znít jako robot. Např. pro architekty: "I was looking at your recent residential projects on your website and absolutely loved the minimalist approach..."

Odpověz POUZE validním polem objektů v JSON formátu. Nic jiného nepiš.`;

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
    
    // Extract JSON block using regex if it's wrapped in markdown
    const jsonMatch = textOut.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch) {
      textOut = jsonMatch[1].trim();
    } else {
      // fallback basic stripping
      textOut = textOut.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    }

    let discoveredList: any[] = [];
    try {
      discoveredList = JSON.parse(textOut);
    } catch (parseErr) {
      console.error("[WebSniper] Could not parse JSON from Gemini output:", textOut);
      // Wait, if it failed parsing, let's just log it and act like 0 discovered instead of crashing the whole function
      discoveredList = [];
    }

    if (!Array.isArray(discoveredList) || discoveredList.length === 0) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0, targetKeyword });
      return new Response(JSON.stringify({ 
        ok: true, 
        discovered_count: 0, 
        message: "Nebyly objeveny žádné firmy s e-mailem.",
        debug_output: textOut 
      }), {
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
          city: item.city || "Neznámé město",
          country: item.country || targetCountry,
          language: item.language || "cs",
          ai_icebreaker: item.ai_icebreaker || "",
          full_address: item.full_address || `${item.city || "Neznámé město"}, ${targetCountry}`,
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

    const actualCity = discoveredList.length > 0 ? discoveredList[0].city : "Neznámé město";

    // Create admin notification
    if (newSavedCount > 0) {
      try {
        await supabase.from("admin_notifications").insert({
          title: "🌐 AI Sběr: Nové B2B kontakty",
          message: `Pro stát ${targetCountry} (${targetKeyword}) bylo objeveno a uloženo ${newSavedCount} nových firem.`,
          link: "/admin/emaily?tab=crm",
          type: "success"
        });
      } catch (ne) {
        console.warn("[WebSniper] Notification error:", ne);
      }
    }

    await logJobSuccess(supabase, jobName, { discovered_count: newSavedCount, targetKeyword });

    return new Response(JSON.stringify({ 
      ok: true, 
      discovered_count: newSavedCount,
      total_found_by_ai: discoveredList.length,
      targetKeyword,
      targetCity: actualCity,
      message: `Úspěšně dohledáno a uloženo ${newSavedCount} firem z webu pro klíčové slovo ${targetKeyword} (${actualCity}, ${targetCountry}).` 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});