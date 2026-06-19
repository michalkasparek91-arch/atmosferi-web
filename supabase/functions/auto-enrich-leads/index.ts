import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const jobName = "Auto Enrich Leads";
  let supabase: any;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    await logJobStart(supabase, jobName);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      const errMsg = "Missing GEMINI_API_KEY";
      await logJobFailure(supabase, jobName, errMsg);
      return new Response(JSON.stringify({ ok: false, error: errMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: configData } = await supabase.from("app_settings").select("value").eq("key", "scraper_config").maybeSingle();
    let batchSize = 50;
    let enrichEngine = "gemini";
    if (configData && configData.value) {
       if (configData.value.ai_batch_size) batchSize = configData.value.ai_batch_size;
       if (configData.value.enrich_engine) enrichEngine = configData.value.enrich_engine;
    }

    // Determine active enrich engines (independently toggled)
    const useGemini = enrichEngine === "gemini" || enrichEngine === "both" || enrichEngine === "all";
    const useGroq   = enrichEngine === "groq"   || enrichEngine === "both" || enrichEngine === "all";
    const useOpenRouter = enrichEngine === "openrouter" || enrichEngine === "all";

    // Select oldest updated leads that need enrichment
    const { data: leads } = await supabase
      .from("marketing_leads")
      .select("id, email, full_name, company_name, website, city, category, updated_at")
      .not("website", "is", null)
      .neq("website", "")
      .or("city.is.null,category.is.null")
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (!leads || leads.length === 0) {
      await logJobSuccess(supabase, jobName, { message: "No more leads to enrich" });
      return new Response(JSON.stringify({ ok: true, message: "No leads to enrich" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inputForAI = leads.map((lead: any) => {
      let targetUrl = lead.website;
      if (!targetUrl && lead.email && lead.email.includes('@')) {
        const domain = lead.email.split('@')[1].toLowerCase();
        const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'seznam.cz', 'centrum.cz', 'outlook.com', 'icloud.com', 'post.cz', 'volny.cz'];
        if (!genericDomains.includes(domain)) {
          targetUrl = `https://www.${domain}`;
        }
      }
      return { id: lead.id, company_name: lead.company_name || lead.full_name || "Neznamy", email: lead.email, website: targetUrl };
    });

    const PROMPT = `Jsi B2B akviziční agent. 
Máš k dispozici seznam firem ve formátu JSON:
${JSON.stringify(inputForAI)}

ÚKOL:
Využij své rozsáhlé znalostní databáze a doplň základní údaje o každé firmě. Původní e-mail zkontroluj a pokud znáš pro tuto firmu lepší B2B kontakt, vrať ten nový, jinak původní.
Vrať validní JSON POLE objektů. Každý objekt MUSÍ obsahovat:
- id: ID firmy (převezmi ze vstupu)
- company_name: Oficiální název firmy
- brand_name: Krátký hovorový název firmy bez s.r.o. a přívlastků typu 'stavební společnost'. Z 'Kvalitní stavby s.r.o.' udělej 'Kvalitní stavby'. Z 'CHRPA stavební společnost' udělej 'Chrpa'.
- city: Město působnosti (např. Praha, Brno)
- country: Oficiální název země působnosti. Název země MUSÍ BÝT VŽDY V ČEŠTINĚ (např. "Finsko", "Austrálie").
- language: Zkratka jazyka webu (cs, sk, de, en atd.)
- phone: Telefonní číslo ve formátu s předvolbou
- description: Krátký popis toho, co firma dělá (1-2 věty)
- decision_maker_name: Jméno kontaktní osoby (majitel, jednatel, hlavní architekt). DŮLEŽITÉ: Uveď celé jméno, pokud ho na webu najdeš, jinak prázdný řetězec.
- last_project: Název posledního nebo hlavního projektu/reference, pokud je na webu uveden, jinak prázdný řetězec.
- category: Hlavní kategorie (MUSÍŠ vybrat přesně jednu: architekti, interiery, developeri, realitky, urbanismus, architekt, remeslnici)
- subcategory: Specifická podkategorie
- email: Výsledná e-mailová adresa (nová nalezená, nebo původní)
Vrať POUZE validní pole objektů v JSON formátu (bez markdown značek, čisté pole).`;

    // Helper to parse AI JSON output
    function parseAIJson(raw: string): any[] {
      let text = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const fb = text.indexOf('[');
      const lb = text.lastIndexOf(']');
      if (fb !== -1 && lb !== -1 && lb > fb) text = text.substring(fb, lb + 1);
      try { return JSON.parse(text); } catch { return []; }
    }

    // Helper to log api usage
    async function logUsage(engine: string) {
      try {
        const { error } = await supabase.from("api_usage_logs").insert({ engine, service_name: "auto-enrich-leads", requests_count: 1 });
        if (error) console.error(`api_usage_logs error (${engine}):`, error);
      } catch(e) { console.error("api_usage_logs exception:", e); }
    }

    // Call each active engine and merge results (later entries overwrite earlier for same id)
    const mergedResults: Record<string, any> = {};
    const engineErrors: Record<string, string> = {};
    const engineTasks: Promise<void>[] = [];

    if (useGroq) {
      engineTasks.push((async () => {
        const groqApiKey = Deno.env.get("GROQ_API_KEY");
        if (!groqApiKey) { engineErrors.groq = "Missing GROQ_API_KEY"; return; }
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqApiKey}` },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: PROMPT }], temperature: 0.1 })
        });
        if (!groqRes.ok) { engineErrors.groq = await groqRes.text(); return; }
        await logUsage("groq");
        const arr = parseAIJson((await groqRes.json()).choices?.[0]?.message?.content || "");
        if (arr.length === 0) engineErrors.groq = "Nezpracovatelný JSON (pravděpodobně oříznuto kvůli příliš velké dávce)";
        for (const item of arr) if (item.id) mergedResults[item.id] = { ...mergedResults[item.id], ...item };
      })().catch(e => { engineErrors.groq = e.message; }));
    }

    if (useOpenRouter) {
      engineTasks.push((async () => {
        const orKey = Deno.env.get("OPENROUTER_API_KEY");
        if (!orKey) { engineErrors.openrouter = "Missing OPENROUTER_API_KEY"; return; }
        const models = [
          "meta-llama/llama-3.3-70b-instruct:free",
          "google/gemma-4-31b-it:free",
          "nvidia/nemotron-3-super-120b-a12b:free",
          "openrouter/free"
        ];
        let orRes: Response | null = null;
        const orErrors: string[] = [];

        for (const model of models) {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://atmosferi.cz", "X-Title": "Atmosferi CRM" },
            body: JSON.stringify({ model: model, messages: [{ role: "user", content: PROMPT }], temperature: 0.1 })
          });
          if (res.ok) { orRes = res; break; }
          const errText = await res.text();
          orErrors.push(`${model}: ${res.status} - ${errText}`);
          if (res.status === 429 || res.status === 503 || res.status === 502 || res.status === 400 || res.status === 404) { continue; }
          break; // other error
        }

        if (!orRes || !orRes.ok) { 
          engineErrors.openrouter = `All OR models failed: ${orErrors.join(" | ")}`; 
          return; 
        }
        await logUsage("openrouter");
        const arr = parseAIJson((await orRes.json()).choices?.[0]?.message?.content || "");
        if (arr.length === 0) engineErrors.openrouter = "Nezpracovatelný JSON (pravděpodobně oříznuto kvůli příliš velké dávce)";
        for (const item of arr) if (item.id) mergedResults[item.id] = { ...mergedResults[item.id], ...item };
      })().catch(e => { engineErrors.openrouter = e.message; }));
    }

    if (useGemini) {
      engineTasks.push((async () => {
        // Cascade through Gemini models
        const models = [
          "gemini-2.5-flash",
          "gemini-2.0-flash", 
          "gemini-2.0-flash-exp", 
          "gemini-1.5-flash-latest", 
          "gemini-1.5-flash", 
          "gemini-1.5-pro"
        ];
        let geminiRes: Response | null = null;
        const geminiErrors: string[] = [];
        
        for (const model of models) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 16000 } })
          });
          if (res.ok) { geminiRes = res; break; }
          
          const errText = await res.text();
          geminiErrors.push(`${model}: ${res.status} - ${errText}`);
          
          if (res.status === 429 || res.status === 503 || res.status === 404 || res.status === 400) { continue; }
          break; // other error
        }
        
        if (!geminiRes || !geminiRes.ok) { 
            engineErrors.gemini = `All models failed: ${geminiErrors.join(" | ")}`; 
            return; 
        }
        await logUsage("gemini");
        const resJson = await geminiRes.json();
        const arr = parseAIJson(resJson.candidates?.[0]?.content?.parts?.[0]?.text || "");
        if (arr.length === 0) engineErrors.gemini = "Nezpracovatelný JSON (pravděpodobně oříznuto kvůli příliš velké dávce)";
        // Gemini result is authoritative – overrides others
        for (const item of arr) if (item.id) mergedResults[item.id] = { ...mergedResults[item.id], ...item };
      })().catch(e => { engineErrors.gemini = e.message; }));
    }

    await Promise.allSettled(engineTasks);

    const extractedArray = Object.values(mergedResults);

    let updatedCount = 0;
    
    // Zpracovat vrácená data
    for (const extracted of extractedArray) {
      const lead = leads.find((l: any) => l.id === extracted.id);
      if (!lead) continue;
      
      const updatePayload: any = {
        company_name: lead.company_name || extracted.company_name || null,
        brand_name: lead.brand_name || extracted.brand_name || null,
        city: lead.city || extracted.city || null,
        country: lead.country || extracted.country || "Česká republika",
        language: lead.language || extracted.language || null,
        phone: lead.phone || extracted.phone || null,
        description: lead.description || extracted.description || null,
        decision_maker_name: lead.decision_maker_name || extracted.decision_maker_name || null,
        last_project: lead.last_project || extracted.last_project || null,
        category: lead.category || extracted.category || null,
        subcategory: lead.subcategory || extracted.subcategory || null,
        premium_score: lead.premium_score || extracted.premium_score || 50,
        updated_at: new Date().toISOString() // Touch updated_at!
      };

      if (extracted.email && extracted.email.includes("@") && extracted.email.toLowerCase() !== lead.email.toLowerCase()) {
        updatePayload.email = extracted.email.toLowerCase();
      }

      const { error: updateError } = await supabase.from("marketing_leads").update(updatePayload).eq("id", lead.id);
      
      if (updateError && updatePayload.email) {
        delete updatePayload.email;
        await supabase.from("marketing_leads").update(updatePayload).eq("id", lead.id);
      }
      updatedCount++;
    }

    // Touch ALL processed leads' updated_at so they go to the back of the queue if AI failed to return them
    const now = new Date().toISOString();
    const idsToTouch = leads.map((l: any) => l.id);
    await supabase.from("marketing_leads").update({ updated_at: now }).in("id", idsToTouch);

    await logJobSuccess(supabase, jobName, { processed: leads.length, updated: updatedCount, errors: engineErrors });

    return new Response(JSON.stringify({ ok: true, processed: leads.length, updated: updatedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
