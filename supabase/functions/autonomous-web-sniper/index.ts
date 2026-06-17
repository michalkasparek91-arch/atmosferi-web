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

async function runGeminiEngine(targetCountry: string, targetKeyword: string, targetCity: string, promptTemplate: string): Promise<{ discoveredList?: any[], error?: string }> {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return { error: "Chybí GEMINI_API_KEY v Supabase Secrets!" };
    }
    
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
       return { error: `Chyba od Google API: ${errBody}` };
    }

    const resJson = await geminiRes.json();
    let textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    if (!textOut) {
       const finishReason = resJson.candidates?.[0]?.finishReason || "UNKNOWN_REASON";
       return { error: `Odpověď od AI je prázdná (finishReason: ${finishReason}). Může se jednat o bezpečnostní filtr nebo chybu generování.` };
    }
    
    textOut = textOut.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBracket = textOut.indexOf('[');
    const lastBracket = textOut.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      textOut = textOut.substring(firstBracket, lastBracket + 1);
    }

    try { 
      const parsed = JSON.parse(textOut);
      // Log api usage
      try {
         await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/api_usage_logs`, {
             method: "POST",
             headers: {
                 "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                 "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
                 "Content-Type": "application/json",
                 "Prefer": "return=minimal"
             },
             body: JSON.stringify({ engine: "gemini", service_name: "autonomous-web-sniper", requests_count: 1 })
         });
      } catch(e) {}
      
      return { discoveredList: parsed };
    } catch (e: any) { 
      return { error: `JSON CHYBA: ${e.message}. Úryvek: ${textOut.substring(0, 500)}` };
    }
}

async function runGroqPlacesEngine(targetCountry: string, targetKeyword: string, targetCity: string): Promise<{ discoveredList?: any[], error?: string }> {
    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");
    
    if (!placesKey || !groqKey) {
        return { error: "Chybí GOOGLE_PLACES_API_KEY (nebo GOOGLE_MAPS_API_KEY) či GROQ_API_KEY v Supabase Secrets!" };
    }

    // 1. Vyhledání přes Google Places API
    const query = `${targetKeyword} ${targetCity}`;
    const placesRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": placesKey,
            "X-Goog-FieldMask": "places.displayName,places.websiteUri,places.formattedAddress,places.nationalPhoneNumber"
        },
        body: JSON.stringify({ textQuery: query, languageCode: "cs" })
    });

    if (!placesRes.ok) {
        return { error: `Google Places API chyba: ${await placesRes.text()}` };
    }

    const placesData = await placesRes.json();
    const places = placesData.places || [];
    const validPlaces = places.filter((p: any) => p.websiteUri);

    if (validPlaces.length === 0) {
        return { discoveredList: [] };
    }

    // 2. Pro každý nalezený web stáhneme HTML a pošleme do Groq
    const discoveredList: any[] = [];
    const promises = validPlaces.slice(0, 10).map(async (place: any) => { // limit na 10 pro jedno volání aby nedošlo k timeoutu
        try {
            // fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const pageRes = await fetch(place.websiteUri, { signal: controller.signal }).catch(() => null);
            clearTimeout(timeoutId);
            
            if (!pageRes || !pageRes.ok) return null;
            
            let html = await pageRes.text();
            // clean HTML
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                       .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ')
                       .substring(0, 10000); // 10k znaků stačí
                       
            const companyName = place.displayName?.text || "";
            const address = place.formattedAddress || "";
            const phone = place.nationalPhoneNumber || "";

            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-70b-8192",
                    messages: [
                        { role: "system", content: "You are a precise data extractor. Extract the requested info and return ONLY a valid JSON array. DO NOT wrap it in markdown or provide any other text." },
                        { role: "user", content: `Given this text from website ${place.websiteUri} of company "${companyName}", extract their contact info and output ONLY a valid JSON array of 1 object exactly matching this format: [{"company_name": "${companyName}", "email": "...", "phone": "${phone}", "website": "${place.websiteUri}", "city": "${targetCity}", "country": "${targetCountry}", "language": "cs", "full_address": "${address}", "description": "...", "decision_maker_name": "", "premium_score": 50, "ai_icebreaker": "..."}]. If no email is found, return an empty array []. Text: ${html}` }
                    ],
                    temperature: 0.1
                })
            });

            if (groqRes.ok) {
                // Log api usage
                try {
                   await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/api_usage_logs`, {
                       method: "POST",
                       headers: {
                           "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                           "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
                           "Content-Type": "application/json",
                           "Prefer": "return=minimal"
                       },
                       body: JSON.stringify({ engine: "groq", service_name: "autonomous-web-sniper", requests_count: 1 })
                   });
                } catch(e) {}

                const groqData = await groqRes.json();
                let textOut = groqData.choices?.[0]?.message?.content || "";
                textOut = textOut.replace(/```json/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(textOut);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].email && parsed[0].email.includes("@")) {
                    discoveredList.push(parsed[0]);
                }
            }
        } catch (e) {
            console.error("Error processing place", place.websiteUri, e);
        }
    });

    await Promise.all(promises);

    return { discoveredList };
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
    
    // Zjištění enginu k použití
    let engineToUse = body.engine;
    if (!engineToUse) {
        // pro CRON běh si vybereme aktivní engine
        const activeEngines = [];
        if (config.use_gemini_engine !== false) activeEngines.push("gemini");
        if (config.use_groq_places_engine === true) activeEngines.push("groq_places");
        
        if (activeEngines.length === 0) {
            return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: "Všechny enginy jsou vypnuté." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        engineToUse = activeEngines[Math.floor(Math.random() * activeEngines.length)];
    }

    console.log(`Používám vyhledávací engine: ${engineToUse} pro klíčové slovo: ${targetKeyword} a město: ${targetCity}`);

    let discoveredList: any[] = [];
    
    if (engineToUse === "groq_places") {
        const result = await runGroqPlacesEngine(targetCountry, targetKeyword, targetCity);
        if (result.error) {
            await logJobFailure(supabase, jobName, result.error);
            return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: result.error }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        discoveredList = result.discoveredList || [];
    } else {
        // default to gemini
        const DEFAULT_PROMPT = `Jsi autonomní vyhledávací agent pro B2B akvizici. Cílový stát: {{targetCountry}}. Obor: "{{targetKeyword}}". 
TVŮJ ÚKOL: 
1. Zaměř se PŘESNĚ na toto město: {{targetCity}} (pokud chybí, vymysli si náhodně jiné než hlavní město).
2. Pomocí nástroje Google Search najdi reálné firmy v tomto městě pro zadaný obor.
3. Extrahuj z jejich webů nebo z Googlu kontakty. Najdi MAXIMÁLNĚ 30-40 firem, které mají uvedenou E-MAILOVOU ADRESU (toto je naprosto kritické, firmy bez e-mailu musíš ignorovat!). Vzhledem k obrovskému limitu tokenů se neboj vypsat až 40 firem najednou!

Vrať JSON pole. Povinná pole pro každý objekt: company_name, email, phone, website, city, country (Název země MUSÍ BÝT VŽDY V ČEŠTINĚ, např. Finsko, Austrálie, USA), language (např. cs, en, de), full_address, description, decision_maker_name (pokud nelze dohledat tak ""), premium_score (číslo 1-100 podle kvality prezentace).
Odpověz POUZE validním polem objektů v JSON formátu. VAROVÁNÍ: Uvnitř textových hodnot nesmíš používat neescapované uvozovky!`;
        const promptTemplate = config.prompt_template || DEFAULT_PROMPT;
        const result = await runGeminiEngine(targetCountry, targetKeyword, targetCity, promptTemplate);
        if (result.error) {
            await logJobFailure(supabase, jobName, result.error);
            return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: result.error }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        discoveredList = result.discoveredList || [];
    }

    if (!Array.isArray(discoveredList) || discoveredList.length === 0) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0 });
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: `Engine ${engineToUse} nenašel žádné firmy s e-mailem.` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      if (tc === "česká republika" || tc === "ceska republika" || tc === "czech republic" || tc === "czechia") marketId = "cz";
      else if (tc === "německo" || tc === "nemecko" || tc === "deutschland" || tc === "germany") marketId = "de";
      else if (tc === "rakousko" || tc === "austria" || tc === "österreich") marketId = "at";
      else if (tc === "slovensko" || tc === "slovakia") marketId = "sk";
      else if (tc === "austrálie" || tc === "australie" || tc === "australia") marketId = "au";
      else if (tc === "finsko" || tc === "finland" || tc === "suomi") marketId = "f";
      else if (tc === "usa" || tc === "spojené státy" || tc === "united states") marketId = "us";
      else if (tc === "švýcarsko" || tc === "svycarsko" || tc === "switzerland" || tc === "schweiz") marketId = "ch";
      else if (tc === "norsko" || tc === "norway") marketId = "no";
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
          ai_icebreaker: null,
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