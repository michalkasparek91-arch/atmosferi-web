import { createClient } from "npm:@supabase/supabase-js@2";

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

async function logJobStart(supabase: any, jobName: string) {
  return await supabase.from("automation_jobs").update({ 
      last_run_at: new Date().toISOString(), last_run_status: "running", last_run_error: null 
  }).eq("job_name", jobName);
}
async function logJobSuccess(supabase: any, jobName: string, metadata: any) {
  return await supabase.from("automation_jobs").update({ 
      last_run_status: "success", metadata, updated_at: new Date().toISOString()
  }).eq("job_name", jobName);
}
async function logJobFailure(supabase: any, jobName: string, error: string) {
  return await supabase.from("automation_jobs").update({ 
      last_run_status: "failure", last_run_error: error, updated_at: new Date().toISOString()
  }).eq("job_name", jobName);
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

    await logJobStart(supabase, jobName);
    const body = await req.json().catch(() => ({}));
    const forceSearch = body.forceSearch === true;

    const { data: configData } = await supabase.from("app_settings").select("value").eq("key", "scraper_config").maybeSingle();

    const defaultConfig = {
      is_enabled: false,
      keywords: ["architekt", "interiérový design", "developer"],
      cities: [],
      countries: ["Česká republika", "Německo"]
    };

    const config = configData?.value || defaultConfig;

    if (!forceSearch && config.is_enabled !== true) {
      return new Response(JSON.stringify({ ok: true, message: "Autonomous scraping is disabled." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activeKeywords = (config.active_keywords && config.active_keywords.length > 0) ? config.active_keywords : config.keywords;
    const keywords = (activeKeywords && activeKeywords.length > 0) ? activeKeywords : defaultConfig.keywords;
    const targetKeywords = body.targetKeywords && body.targetKeywords.length > 0 ? body.targetKeywords : keywords;
    const targetKeyword = targetKeywords[Math.floor(Math.random() * targetKeywords.length)];
    
    const activeCountries = (config.active_countries && config.active_countries.length > 0) ? config.active_countries : config.countries;
    const countries = (activeCountries && activeCountries.length > 0) ? activeCountries : defaultConfig.countries;
    const targetCountries = body.targetCountries && body.targetCountries.length > 0 ? body.targetCountries : countries;
    const targetCountry = targetCountries[Math.floor(Math.random() * targetCountries.length)] || "Česká republika";
    
    const activeCities = (config.active_cities && config.active_cities.length > 0) ? config.active_cities : config.cities;
    let targetCities = body.targetCities && body.targetCities.length > 0 ? body.targetCities : (activeCities || []);
    
    const TOP_CITIES_BY_COUNTRY: Record<string, string[]> = {
      "Česká republika": ["Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice", "Hradec Králové", "Pardubice", "Zlín", "Ústí nad Labem", "Kladno", "Karlovy Vary", "Jihlava"],
      "Německo": ["Berlín", "Hamburk", "Mnichov", "Kolín nad Rýnem", "Frankfurt nad Mohanem", "Stuttgart", "Düsseldorf", "Lipsko", "Dortmund", "Essen", "Brémy", "Drážďany", "Hannover", "Norimberk"],
      "Slovensko": ["Bratislava", "Košice", "Prešov", "Žilina", "Nitra", "Banská Bystrica", "Trnava", "Martin", "Trenčín", "Poprad"],
      "Rakousko": ["Vídeň", "Štýrský Hradec", "Linec", "Salcburk", "Innsbruck", "Klagenfurt", "Villach", "Wels", "Sankt Pölten", "Dornbirn"]
    };

    if (TOP_CITIES_BY_COUNTRY[targetCountry]) {
        const validCitiesForCountry = TOP_CITIES_BY_COUNTRY[targetCountry];
        targetCities = targetCities.filter((city: string) => validCitiesForCountry.includes(city));
    } else {
        targetCities = [];
    }

    const targetCity = targetCities.length > 0 ? targetCities[Math.floor(Math.random() * targetCities.length)] : "";
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: "Chybí GEMINI_API_KEY v Supabase Secrets!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const DEFAULT_PROMPT = `Jsi autonomní vyhledávací agent pro B2B akvizici. Cílový stát: {{targetCountry}}. Obor: "{{targetKeyword}}". 
TVŮJ ÚKOL: 
1. Zaměř se PŘESNĚ na toto město: {{targetCity}} (pokud chybí, vymysli si náhodně jiné než hlavní město).
2. Pomocí nástroje Google Search najdi reálné firmy v tomto městě pro zadaný obor.
3. Extrahuj z jejich webů nebo z Googlu kontakty. Najdi MAXIMÁLNĚ 12-15 firem, které mají uvedenou E-MAILOVOU ADRESU (toto je naprosto kritické, firmy bez e-mailu musíš ignorovat!). Vzhledem k vyššímu limitu tokenů se neboj vypsat až 15 firem najednou!

Vrať JSON pole. Povinná pole pro každý objekt: company_name, email, phone, website, city, country, language (např. cs, en, de), full_address, description, ai_icebreaker (osobní otevírací odstavec do e-mailu v jazyce dané země chválící jejich práci), decision_maker_name (pokud nelze dohledat tak ""), premium_score (číslo 1-100 podle kvality prezentace).
Odpověz POUZE validním polem objektů v JSON formátu. VAROVÁNÍ: Uvnitř textových hodnot nesmíš používat neescapované uvozovky!`;

    const promptTemplate = config.prompt_template || DEFAULT_PROMPT;
    
    const SEARCH_PROMPT = promptTemplate
      .replace(/{{targetCountry}}/g, targetCountry)
      .replace(/{{targetKeyword}}/g, targetKeyword)
      .replace(/{{targetCity}}/g, targetCity || "náhodně vybrané město");

    let geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: SEARCH_PROMPT }] }], tools: [{ googleSearch: {} }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } }) 
    });

    if (!geminiRes.ok && geminiRes.status === 503) {
       geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
         method: "POST", headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: SEARCH_PROMPT }] }], tools: [{ googleSearch: {} }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } })
       });
    }

    if (!geminiRes.ok) {
       const errBody = await geminiRes.text();
       return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: `Chyba od Google API: ${errBody}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resJson = await geminiRes.json();
    let textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    // Extrémně robustní čtení - najde první znak [ a poslední ] a zbytek osekne
    const firstBracket = textOut.indexOf('[');
    const lastBracket = textOut.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      textOut = textOut.substring(firstBracket, lastBracket + 1);
    }

    let discoveredList: any[] = [];
    try { 
      discoveredList = JSON.parse(textOut); 
    } catch (e: any) { 
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: `JSON CHYBA: ${e.message}. Úryvek: ${textOut.substring(0, 500)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!Array.isArray(discoveredList) || discoveredList.length === 0) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0 });
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: "Umělá inteligence nenašla žádné firmy, které by splňovaly přísná kritéria (s e-mailem)." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let newSavedCount = 0;
    let lastInsertError = null;
    for (const item of discoveredList) {
      if (!item.email || !item.email.includes("@")) continue;
      const cleanEmail = item.email.toLowerCase().trim();

      const { data: pExist } = await supabase.from("profiles").select("id").eq("email", cleanEmail).maybeSingle();
      if (pExist) continue;

      const { data: lExist } = await supabase.from("marketing_leads").select("id").eq("email", cleanEmail).maybeSingle();
      if (lExist) continue;

      let marketId = "cz";
      const tc = targetCountry.toLowerCase();
      if (tc === "česká republika" || tc === "ceska republika") marketId = "cz";
      else if (tc === "německo" || tc === "nemecko") marketId = "de";
      else if (tc === "rakousko") marketId = "at";
      else if (tc === "slovensko") marketId = "sk";
      else if (tc === "austrálie" || tc === "australie") marketId = "au";
      else if (tc === "finsko") marketId = "fi";
      else if (tc === "usa" || tc === "spojené státy") marketId = "us";
      else if (tc === "švýcarsko" || tc === "svycarsko") marketId = "ch";
      else if (tc === "norsko") marketId = "no";
      else marketId = item.language || "cs";

      let categoryId = "architekti";
      const tk = targetKeyword.toLowerCase();
      if (tk.includes("interiér") || tk.includes("interier")) categoryId = "interiery";
      else if (tk.includes("develop")) categoryId = "developeri";
      else if (tk.includes("urban") || tk.includes("veřejn") || tk.includes("verejn")) categoryId = "urbanismus";
      else if (tk === "samostatný architekt" || tk === "samostatny architekt") categoryId = "architekt";

      const { data: newLead, error: insertErr } = await supabase.from("marketing_leads").insert({
          email: cleanEmail,
          full_name: item.company_name || "B2B Partner",
          company_name: item.company_name || "B2B Partner",
          phone: normalizePhone(item.phone || ""),
          website: item.website || "",
          city: item.city || "Neznámé město",
          country: item.country || targetCountry,
          language: marketId,
          ai_icebreaker: item.ai_icebreaker || "",
          decision_maker_name: item.decision_maker_name || null,
          premium_score: item.premium_score ? parseInt(item.premium_score) : null,
          full_address: item.full_address || `${item.city || ""}, ${targetCountry}`,
          category: categoryId,
          subcategory: targetKeyword,
          description: item.description || "Nalezeno autonomně",
          company_description: item.description || "Nalezeno autonomně",
          source: "ai_web_sniper",
      }).select().single();

      if (!insertErr && newLead) {
          newSavedCount++;
      } else if (insertErr) {
          lastInsertError = insertErr.message;
      }
    }

    await logJobSuccess(supabase, jobName, { discovered_count: newSavedCount });
    
    if (newSavedCount === 0 && discoveredList.length > 0) {
       if (lastInsertError) {
          // Pokud selhalo ukládání, nesmíme poslat total_found_by_ai, jinak to frontend schová pod "info" hlášku
          return new Response(JSON.stringify({ 
            ok: true, 
            discovered_count: 0, 
            debug_output: `Kritická chyba: AI našla kontakty, ale databáze je odmítla uložit! Důvod z DB: ${lastInsertError}` 
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
       }
       return new Response(JSON.stringify({ 
         ok: true, 
         discovered_count: 0, 
         total_found_by_ai: discoveredList.length,
         message: "Nalezeno, ale přeskočeno (chyběl e-mail nebo už v CRM existují).",
         debug_output: JSON.stringify(discoveredList, null, 2)
       }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, discovered_count: newSavedCount, message: "Hotovo." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: `INTERNÍ CHYBA FUNKCE: ${String(err.message || err)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});