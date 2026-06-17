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

async function logApiUsage(supabase: any, engine: string, serviceName: string) {
  try {
    const { error } = await supabase.from("api_usage_logs").insert({
      engine, service_name: serviceName, requests_count: 1
    });
    if (error) console.error(`Chyba pri zapisu do api_usage_logs (${engine}):`, error);
  } catch(e) { console.error("Vyjimka pri zapisu api_usage_logs:", e); }
}

// Gemini model cascade: try cheapest free-tier model first, fall back on quota/overload
async function callGeminiWithFallback(apiKey: string, body: any): Promise<Response> {
  // Free-tier RPD: gemini-2.0-flash=200, gemini-2.5-flash=20, gemini-1.5-flash=1500
  const models = [
    "gemini-2.0-flash",      // 200 req/day — best balance
    "gemini-2.5-flash-lite", // lightweight fallback
    "gemini-1.5-flash",      // 1500 req/day — last resort
  ];
  let lastRes: Response | null = null;
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    if (res.ok) return res;
    if (res.status === 429 || res.status === 503) {
      console.warn(`Gemini model ${model} unavailable (${res.status}), trying next...`);
      lastRes = res;
      continue;
    }
    return res; // other error — return immediately
  }
  return lastRes!;
}

async function runGeminiEngine(supabase: any, targetCountry: string, targetKeyword: string, targetCity: string, promptTemplate: string): Promise<{ discoveredList?: any[], error?: string }> {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return { error: "Chybi GEMINI_API_KEY v Supabase Secrets!" };
    
    const SEARCH_PROMPT = promptTemplate
      .replace(/{{targetCountry}}/g, targetCountry)
      .replace(/{{targetKeyword}}/g, targetKeyword)
      .replace(/{{targetCity}}/g, targetCity || "nahodne vybrane mesto");

    const geminiRes = await callGeminiWithFallback(apiKey, {
      contents: [{ role: "user", parts: [{ text: SEARCH_PROMPT }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 16000 }
    });

    if (!geminiRes.ok) {
       const errBody = await geminiRes.text();
       return { error: `Chyba od Google API: ${errBody}` };
    }

    const resJson = await geminiRes.json();
    let textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    if (!textOut) {
       const finishReason = resJson.candidates?.[0]?.finishReason || "UNKNOWN_REASON";
       return { error: `Odpoved od AI je prazdna (finishReason: ${finishReason}).` };
    }
    
    textOut = textOut.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBracket = textOut.indexOf('[');
    const lastBracket = textOut.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      textOut = textOut.substring(firstBracket, lastBracket + 1);
    }

    try { 
      const parsed = JSON.parse(textOut);
      await logApiUsage(supabase, "gemini", "autonomous-web-sniper");
      return { discoveredList: parsed };
    } catch (e: any) { 
      return { error: `JSON CHYBA (Gemini): ${e.message}. Urvek: ${textOut.substring(0, 500)}` };
    }
}

async function runOpenRouterEngine(supabase: any, targetCountry: string, targetKeyword: string, targetCity: string, promptTemplate: string): Promise<{ discoveredList?: any[], error?: string }> {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return { error: "Chybi OPENROUTER_API_KEY v Supabase Secrets!" };

    const SEARCH_PROMPT = promptTemplate
      .replace(/{{targetCountry}}/g, targetCountry)
      .replace(/{{targetKeyword}}/g, targetKeyword)
      .replace(/{{targetCity}}/g, targetCity || "nahodne vybrane mesto");

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://atmosferi.cz",
        "X-Title": "Atmosferi CRM"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: SEARCH_PROMPT }],
        temperature: 0.7
      })
    });

    if (!orRes.ok) {
      const errBody = await orRes.text();
      return { error: `Chyba od OpenRouter API: ${errBody}` };
    }

    const resJson = await orRes.json();
    let textOut = resJson.choices?.[0]?.message?.content?.trim() || "";
    if (!textOut) return { error: "Odpoved od OpenRouter je prazdna." };

    textOut = textOut.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBracket = textOut.indexOf('[');
    const lastBracket = textOut.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      textOut = textOut.substring(firstBracket, lastBracket + 1);
    }

    try {
      const parsed = JSON.parse(textOut);
      await logApiUsage(supabase, "openrouter", "autonomous-web-sniper");
      return { discoveredList: parsed };
    } catch (e: any) {
      return { error: `JSON CHYBA (OpenRouter): ${e.message}. Urvek: ${textOut.substring(0, 500)}` };
    }
}

async function runGroqPlacesEngine(supabase: any, targetCountry: string, targetKeyword: string, targetCity: string): Promise<{ discoveredList?: any[], error?: string, debug?: string }> {
    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");
    
    if (!placesKey || !groqKey) {
        return { error: "Chybi GOOGLE_PLACES_API_KEY ci GROQ_API_KEY v Supabase Secrets!" };
    }

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

    if (!placesRes.ok) return { error: `Google Places API chyba: ${await placesRes.text()}` };

    const placesData = await placesRes.json();
    const places = placesData.places || [];
    const validPlaces = places.filter((p: any) => p.websiteUri);

    if (validPlaces.length === 0) {
        return { discoveredList: [], debug: `Nalezeno ${places.length} mist v Google Places pro '${query}', ale zadne nemelo websiteUri.` };
    }

    const discoveredList: any[] = [];
    let groqErrors = 0;
    let fetchErrors = 0;
    let noEmailFound = 0;
    
    // Limit na 5 kvuli Groq TPD free-tier limitu (100k tokenu/den).
    const promises = validPlaces.slice(0, 5).map(async (place: any) => { 
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const pageRes = await fetch(place.websiteUri, { signal: controller.signal }).catch(() => null);
            clearTimeout(timeoutId);
            
            if (!pageRes || !pageRes.ok) { fetchErrors++; return null; }
            
            let html = await pageRes.text();
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                       .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ')
                       .substring(0, 10000);
                       
            const companyName = place.displayName?.text || "";
            const address = place.formattedAddress || "";
            const phone = place.nationalPhoneNumber || "";

            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "You are a precise data extractor. Extract the requested info and return ONLY a valid JSON array. DO NOT wrap it in markdown or provide any other text." },
                        { role: "user", content: `Given this text from website ${place.websiteUri} of company "${companyName}", extract their contact info and output ONLY a valid JSON array of 1 object: [{"company_name": "${companyName}", "email": "...", "phone": "${phone}", "website": "${place.websiteUri}", "city": "${targetCity}", "country": "${targetCountry}", "language": "cs", "full_address": "${address}", "description": "...", "decision_maker_name": "", "premium_score": 50, "ai_icebreaker": "..."}]. If no email found, return []. Text: ${html}` }
                    ],
                    temperature: 0.1
                })
            });

            if (groqRes.ok) {
                await logApiUsage(supabase, "groq", "autonomous-web-sniper");
                const groqData = await groqRes.json();
                let textOut = groqData.choices?.[0]?.message?.content || "";
                const fb = textOut.indexOf('[');
                const lb = textOut.lastIndexOf(']');
                if (fb !== -1 && lb !== -1) textOut = textOut.substring(fb, lb + 1);
                else textOut = textOut.replace(/```json/g, "").replace(/```/g, "").trim();
                
                try {
                    const parsed = JSON.parse(textOut);
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].email && parsed[0].email.includes("@")) {
                        discoveredList.push(parsed[0]);
                    } else { noEmailFound++; }
                } catch { groqErrors++; }
            } else { groqErrors++; }
        } catch (e) { fetchErrors++; console.error("Error processing place", place.websiteUri, e); }
    });

    await Promise.all(promises);

    const debugMsg = `Google Places: ${places.length} vysledku, ${validPlaces.length} melo web. Zpracovano max 5. Chyby fetch: ${fetchErrors}, Groq chyby: ${groqErrors}, bez emailu: ${noEmailFound}, platnych kontaktu: ${discoveredList.length}.`;
    return { discoveredList, debug: debugMsg };
}

function deduplicateByEmail(list: any[]): any[] {
  const seen = new Set<string>();
  return list.filter(item => {
    if (!item.email || !item.email.includes("@")) return false;
    const key = item.email.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
      keywords: ["architekt", "interierovy design", "developer"],
      cities: [],
      countries: ["Ceska republika", "Nemecko"]
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
    const targetCountry = targetCountries[Math.floor(Math.random() * targetCountries.length)] || "Ceska republika";
    
    const activeCities = (config.active_cities && config.active_cities.length > 0) ? config.active_cities : config.cities;
    let targetCities = body.targetCities && body.targetCities.length > 0 ? body.targetCities : (activeCities || []);
    
    const TOP_CITIES_BY_COUNTRY: Record<string, string[]> = {
      "Ceska republika": ["Praha", "Brno", "Ostrava", "Plzen", "Liberec", "Olomouc", "Ceske Budejovice", "Hradec Kralove", "Pardubice", "Zlin"],
      "Nemecko": ["Berlin", "Hamburg", "Mnichov", "Koln", "Frankfurt", "Stuttgart", "Dusseldorf", "Lipsko", "Dortmund", "Essen"],
      "Slovensko": ["Bratislava", "Kosice", "Presov", "Zilina", "Nitra", "Banska Bystrica", "Trnava", "Martin", "Trencin", "Poprad"],
      "Rakousko": ["Viden", "Styrsky Hradec", "Linec", "Salcburk", "Innsbruck", "Klagenfurt", "Villach", "Wels"]
    };

    if (TOP_CITIES_BY_COUNTRY[targetCountry]) {
        targetCities = targetCities.filter((city: string) => TOP_CITIES_BY_COUNTRY[targetCountry].includes(city));
    } else {
        targetCities = [];
    }

    const targetCity = targetCities.length > 0 ? targetCities[Math.floor(Math.random() * targetCities.length)] : "";

    const DEFAULT_PROMPT = `Jsi autonomni vyhledavaci agent pro B2B akviziciu. Cilovy stat: {{targetCountry}}. Obor: "{{targetKeyword}}". 
TVUJ UKOL: 
1. Zamer se PRESNE na toto mesto: {{targetCity}} (pokud chybi, vymysli si nahodne jine nez hlavni mesto).
2. Pomoci nastroje Google Search najdi realne firmy v tomto meste pro zadany obor.
3. Extrahuj z jejich webu nebo z Googlu kontakty. Najdi MAXIMALNE 15 firem, ktere maji uvedenou E-MAILOVOU ADRESU. Firmy bez e-mailu ignoruj!

Vrat JSON pole. Povinna pole pro kazdy objekt: company_name, email, phone, website, city, country (nazev zeme VZDY V CESTINE, napr. Finsko, Australie), language (cs, en, de...), full_address, description, decision_maker_name (prazdny retezec pokud nelze), premium_score (1-100).
Odpovez POUZE validnim polem objektu v JSON formatu. VAROVANI: uvnitr textovych hodnot nesmi byt neescapovane uvozovky!`;
    const promptTemplate = config.prompt_template || DEFAULT_PROMPT;

    // --- Determine which discovery engines are active ---
    // Each enabled engine runs independently; results are merged & deduplicated.
    const engineOverride = body.engine;
    const activeEngines: string[] = [];

    if (engineOverride) {
      activeEngines.push(engineOverride);
    } else {
      if (config.use_gemini_engine !== false)       activeEngines.push("gemini");
      if (config.use_groq_places_engine === true)   activeEngines.push("groq_places");
      if (config.use_openrouter_engine === true)    activeEngines.push("openrouter");
    }

    if (activeEngines.length === 0) {
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: "Vsechny enginy jsou vypnute." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Aktivni enginy: ${activeEngines.join(", ")} | kw: ${targetKeyword} | mesto: ${targetCity}`);

    const engineResults = await Promise.allSettled(
      activeEngines.map((eng) => {
        if (eng === "groq_places") return runGroqPlacesEngine(supabase, targetCountry, targetKeyword, targetCity);
        if (eng === "openrouter")  return runOpenRouterEngine(supabase, targetCountry, targetKeyword, targetCity, promptTemplate);
        return runGeminiEngine(supabase, targetCountry, targetKeyword, targetCity, promptTemplate);
      })
    );

    let allDiscovered: any[] = [];
    const debugParts: string[] = [];

    for (let i = 0; i < engineResults.length; i++) {
      const eng = activeEngines[i];
      const result = engineResults[i];
      if (result.status === "rejected") {
        debugParts.push(`${eng}: selhalo (${result.reason})`);
        continue;
      }
      const value = result.value as any;
      if (value.error) {
        debugParts.push(`${eng}: chyba - ${value.error}`);
      } else {
        const list = value.discoveredList || [];
        debugParts.push(`${eng}: nalezeno ${list.length} kontaktu`);
        allDiscovered = allDiscovered.concat(list);
      }
    }

    const discoveredList = deduplicateByEmail(allDiscovered);

    if (discoveredList.length === 0) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0 });
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: debugParts.join(" | ") }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      if (tc.includes("cesk") || tc.includes("czech")) marketId = "cz";
      else if (tc.includes("nemeck") || tc.includes("deutsch") || tc.includes("german")) marketId = "de";
      else if (tc.includes("rakous") || tc.includes("austria") || tc.includes("sterreich")) marketId = "at";
      else if (tc.includes("slovensko") || tc.includes("slovak")) marketId = "sk";
      else if (tc.includes("australi")) marketId = "au";
      else if (tc.includes("finsko") || tc.includes("finland")) marketId = "f";
      else if (tc.includes("usa") || tc.includes("united states")) marketId = "us";
      else if (tc.includes("vcarsko") || tc.includes("switzerland") || tc.includes("schweiz")) marketId = "ch";
      else if (tc.includes("norsko") || tc.includes("norway")) marketId = "no";
      else marketId = item.language || "cs";

      let categoryId = "architekti";
      const tk = targetKeyword.toLowerCase();
      if (tk.includes("interier") || tk.includes("design")) categoryId = "interiery";
      else if (tk.includes("develop")) categoryId = "developeri";
      else if (tk.includes("urban") || tk.includes("verejn")) categoryId = "urbanismus";
      else if (tk === "samostatny architekt") categoryId = "architekt";

      const { data: newLead, error: insertErr } = await supabase.from("marketing_leads").insert({
          email: cleanEmail,
          full_name: item.company_name || "B2B Partner",
          company_name: item.company_name || "B2B Partner",
          phone: normalizePhone(item.phone || ""),
          website: item.website || "",
          city: item.city || "Nezname mesto",
          country: item.country || targetCountry,
          language: marketId,
          ai_icebreaker: null,
          decision_maker_name: item.decision_maker_name || null,
          premium_score: item.premium_score ? parseInt(item.premium_score) : null,
          full_address: item.full_address || `${item.city || ""}, ${targetCountry}`,
          category: categoryId,
          subcategory: targetKeyword,
          description: item.description || "Nalezeno autonomne",
          company_description: item.description || "Nalezeno autonomne",
          source: "ai_web_sniper",
      }).select().single();

      if (!insertErr && newLead) newSavedCount++;
      else if (insertErr) lastInsertError = insertErr.message;
    }

    await logJobSuccess(supabase, jobName, { discovered_count: newSavedCount, engines: activeEngines });
    
    if (newSavedCount === 0 && discoveredList.length > 0) {
       return new Response(JSON.stringify({ 
         ok: true, discovered_count: 0, total_found_by_ai: discoveredList.length,
         message: "Nalezeno, ale preskoceno (chybal e-mail nebo uz v CRM existuji).",
         debug_output: `${debugParts.join(" | ")} | DB chyba: ${lastInsertError || "zadna"}`
       }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, discovered_count: newSavedCount, engines: activeEngines, message: "Hotovo." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: `INTERNI CHYBA FUNKCE: ${String(err.message || err)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
