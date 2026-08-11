import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { getApiKeys } from "../_shared/api_keys.ts";
import { callAIWithFallback, parseJsonArray } from "../_shared/ai-router.ts";

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

    const keys = await getApiKeys(supabase);
    const apiKey = keys.GEMINI_API_KEY;
    if (!apiKey) {
      const errMsg = "Missing GEMINI_API_KEY";
      await logJobFailure(supabase, jobName, errMsg);
      return new Response(JSON.stringify({ ok: false, error: errMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: configData } = await supabase.from("app_settings").select("value").eq("key", "scraper_config").maybeSingle();
    let batchSize = 50;
    let enrichEngine = "gemini";
    const cfg = configData?.value || {};
    if (cfg.ai_batch_size) batchSize = cfg.ai_batch_size;
    if (cfg.enrich_engine) enrichEngine = cfg.enrich_engine;

    // Per-provider model overrides (configured in Admin > AI Hub > Modely & Klíče)
    const groqModel      = cfg.groq_model      || "llama-3.3-70b-versatile";
    const geminiModel    = cfg.gemini_model    || "gemini-2.5-flash";
    const openrouterModel = cfg.openrouter_model || "openai/gpt-4o-mini";


    const deepseekModel  = cfg.deepseek_model  || "deepseek-chat";
    const siliconflowModel = cfg.siliconflow_model || "Qwen/Qwen2.5-72B-Instruct";
    const cerebrasModel = cfg.cerebras_model || "gpt-oss-120b"; // llama-3.3-70b was deprecated by Cerebras (Feb 2026)
    const mistralModel = cfg.mistral_model || "mistral-large-latest";
    const nvidiaModel = cfg.nvidia_model || "meta/llama-3.3-70b-instruct";

    const body = await req.json().catch(() => ({}));
    const engineOverride = body.engine;

    // Determine active enrich engines (independently toggled or overridden)
    const useGemini = engineOverride ? engineOverride === "gemini" : (configData?.value?.use_gemini_enrich_engine ?? (enrichEngine === "gemini" || enrichEngine === "both" || enrichEngine === "all"));
    const useGroq   = engineOverride ? engineOverride === "groq" : (configData?.value?.use_groq_enrich_engine ?? (enrichEngine === "groq" || enrichEngine === "both" || enrichEngine === "all"));
    const useOpenRouter = engineOverride ? engineOverride === "openrouter" : (configData?.value?.use_openrouter_enrich_engine ?? (enrichEngine === "openrouter" || enrichEngine === "all"));
    const useDeepSeek = engineOverride ? engineOverride === "deepseek" : (configData?.value?.use_deepseek_enrich_engine ?? (enrichEngine === "deepseek" || enrichEngine === "all"));
    const useSiliconFlow = engineOverride ? engineOverride === "siliconflow" : (configData?.value?.use_siliconflow_enrich_engine ?? (enrichEngine === "siliconflow" || enrichEngine === "all"));
    const useCerebras = engineOverride ? engineOverride === "cerebras" : (configData?.value?.use_cerebras_enrich_engine ?? (enrichEngine === "cerebras" || enrichEngine === "all"));
    const useMistral = engineOverride ? engineOverride === "mistral" : (configData?.value?.use_mistral_enrich_engine ?? (enrichEngine === "mistral" || enrichEngine === "all"));
    const useNvidia = engineOverride ? engineOverride === "nvidia" : (configData?.value?.use_nvidia_enrich_engine ?? (enrichEngine === "nvidia" || enrichEngine === "all"));

    // Select leads that haven't been enriched yet (description = null means not processed)
    const { data: leads } = await supabase
      .from("marketing_leads")
      .select("id, email, full_name, company_name, website, city, country, language, phone, description, decision_maker_name, category, subcategory, premium_score, last_project, updated_at")
      .or("description.is.null,description.eq.")
      .not("email", "is", null)
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
    const engineStats: Record<string, { processed: number }> = {};
    const engineTasks: Promise<void>[] = [];

    // Helper: split array into chunks
    function chunk<T>(arr: T[], size: number): T[][] {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    }

    // Per-engine rate-limit pacing: minimum gap between successive requests, derived
    // from the RPM sliders in Admin > AI Hub. Keeps free tiers (Groq/Gemini) under their limit.
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const rpmToGapMs = (rpm: number) => (rpm > 0 ? Math.ceil(60000 / rpm) : 0);
    const groqGapMs   = rpmToGapMs(cfg.groq_rpm_limit   ?? 30);
    const geminiGapMs = rpmToGapMs(cfg.gemini_rpm_limit ?? 15);

    if (useGroq) {
      engineTasks.push((async () => {
        const authKeys = [keys.GROQ_API_KEY, keys.GROQ_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.groq = "Missing GROQ_API_KEY"; return; }
        // Groq has low TPM limits on free tier — use smaller chunks (20 leads max)
        const groqModels = [groqModel, "llama-3.3-70b-versatile"].filter((v, i, a) => a.indexOf(v) === i);
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";
        let firstChunk = true;
        for (const chunkData of chunks) {
          if (!firstChunk && groqGapMs) await sleep(groqGapMs); // pace to stay under Groq RPM
          firstChunk = false;
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          let groqRes;
          for (const gModel of groqModels) {
            for (const ak of authKeys) {
              groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ak}` },
                body: JSON.stringify({ model: gModel, messages: [{ role: "user", content: chunkPrompt }], temperature: 0.1, max_tokens: 4000 })
              });
              if (groqRes.ok) break;
              lastErr = await groqRes.text();
              if (groqRes.status !== 401 && groqRes.status !== 429) break;
            }
            if (groqRes?.ok) break;
          }
          if (!groqRes || !groqRes.ok) { engineErrors.groq = lastErr || "All Groq models failed"; continue; }
          await logUsage("groq");
          const arr = parseAIJson((await groqRes.json()).choices?.[0]?.message?.content || "");
          for (const item of arr) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; totalProcessed++; }
        }
        engineStats.groq = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.groq) engineErrors.groq = "No items returned from Groq";
      })().catch(e => { engineErrors.groq = e.message; }));
    }

    if (useOpenRouter) {
      engineTasks.push((async () => {
        const authKeys = [keys.OPENROUTER_API_KEY, keys.OPENROUTER_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.openrouter = "Missing OPENROUTER_API_KEY"; return; }
        const models = [
          openrouterModel,
          "meta-llama/llama-3.3-70b-instruct:free",
          "deepseek/deepseek-chat:free",
        ].filter((v, i, a) => a.indexOf(v) === i);
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";
        
        for (const chunkData of chunks) {
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          let orRes: Response | null = null;
          const orErrors: string[] = [];

          for (const model of models) {
            for (const ak of authKeys) {
              const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${ak}`, "Content-Type": "application/json", "HTTP-Referer": "https://atmosferi.cz", "X-Title": "Atmosferi CRM" },
                body: JSON.stringify({ model: model, messages: [{ role: "user", content: chunkPrompt }], temperature: 0.1 })
              });
              if (res.ok) { orRes = res; break; }
              const errText = await res.text();
              orErrors.push(`${model}: ${res.status} - ${errText}`);
              if (res.status === 401 || res.status === 429) continue;
              break; 
            }
            if (orRes?.ok) break;
            const lastStatus = orErrors[orErrors.length - 1];
            if (lastStatus.includes("429") || lastStatus.includes("503") || lastStatus.includes("502") || lastStatus.includes("400") || lastStatus.includes("404")) continue;
            break;
          }

          if (!orRes || !orRes.ok) { 
            lastErr = `All OR models failed: ${orErrors.join(" | ")}`; 
            continue; 
          }
          await logUsage("openrouter");
          try {
            const arr = parseAIJson((await orRes.json()).choices?.[0]?.message?.content || "");
            for (const item of arr) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; totalProcessed++; }
          } catch(e: any) { lastErr = e.message; }
        }
        engineStats.openrouter = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.openrouter) engineErrors.openrouter = lastErr || "Nezpracovatelný JSON";
      })().catch(e => { engineErrors.openrouter = e.message; }));
    }

    if (useDeepSeek) {
      engineTasks.push((async () => {
        const authKeys = [keys.DEEPSEEK_API_KEY, keys.DEEPSEEK_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.deepseek = "Missing DEEPSEEK_API_KEY"; return; }
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";
        
        for (const chunkData of chunks) {
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          try {
            let res;
            for (const ak of authKeys) {
              res = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ak}` },
                body: JSON.stringify({
                  model: deepseekModel,
                  messages: [{ role: "system", content: "You are data enrichment AI. Always reply with valid JSON array." }, { role: "user", content: chunkPrompt }],
                  temperature: 0.1,
                  response_format: { type: "json_object" }
                })
              });
              if (res.ok) break;
              if (res.status !== 401 && res.status !== 429) break;
            }
            if (!res || !res.ok) { lastErr = `${res?.status} ${await res?.text()}`; continue; }
            const resJson = await res.json();
            let text = resJson.choices?.[0]?.message?.content || "";
            if (text) {
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const fb = text.indexOf('['); const lb = text.lastIndexOf(']');
                if (fb !== -1 && lb !== -1) text = text.substring(fb, lb + 1);
            }
            const parsed = JSON.parse(text);
            const finalArray = Array.isArray(parsed) ? parsed : Object.values(parsed).find((v: any) => Array.isArray(v)) || [];
            if (finalArray.length > 0) {
              for (const item of finalArray) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; totalProcessed++; }
              await logUsage("deepseek");
            }
          } catch(e: any) { lastErr = e.message; }
        }
        engineStats.deepseek = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.deepseek) engineErrors.deepseek = lastErr || "Nezpracovatelný JSON";
      })().catch(e => { engineErrors.deepseek = e.message; }));
    }

    if (useSiliconFlow) {
      engineTasks.push((async () => {
        const authKeys = [keys.SILICONFLOW_API_KEY, keys.SILICONFLOW_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.siliconflow = "Missing SILICONFLOW_API_KEY"; return; }
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";

        for (const chunkData of chunks) {
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          try {
            let res;
            for (const ak of authKeys) {
              res = await fetch("https://api.siliconflow.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ak}` },
                body: JSON.stringify({
                  model: siliconflowModel,
                  messages: [{ role: "system", content: "Return only a JSON array." }, { role: "user", content: chunkPrompt }],
                  temperature: 0.1
                })
              });
              if (res.ok) break;
              if (res.status !== 401 && res.status !== 429) break;
            }
            if (!res || !res.ok) { lastErr = `${res?.status} ${await res?.text()}`; continue; }
            const resJson = await res.json();
            let text = resJson.choices?.[0]?.message?.content || "";
            if (text) {
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const fb = text.indexOf('['); const lb = text.lastIndexOf(']');
                if (fb !== -1 && lb !== -1) text = text.substring(fb, lb + 1);
            }
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const item of parsed) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; totalProcessed++; }
              await logUsage("siliconflow");
            }
          } catch(e: any) { lastErr = e.message; }
        }
        engineStats.siliconflow = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.siliconflow) engineErrors.siliconflow = lastErr || "Nezpracovatelný JSON";
      })().catch(e => { engineErrors.siliconflow = e.message; }));
    }

    if (useCerebras) {
      engineTasks.push((async () => {
        const authKeys = [keys.CEREBRAS_API_KEY, keys.CEREBRAS_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.cerebras = "Missing CEREBRAS_API_KEY"; return; }
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";

        for (const chunkData of chunks) {
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          try {
            let res;
            for (const ak of authKeys) {
              res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ak}` },
                body: JSON.stringify({
                  model: cerebrasModel,
                  messages: [{ role: "system", content: "You are data enrichment AI. Always reply with valid JSON array." }, { role: "user", content: chunkPrompt }],
                  temperature: 0.1,
                  response_format: { type: "json_object" }
                })
              });
              if (res.ok) break;
              if (res.status !== 401 && res.status !== 429) break;
            }
            if (!res || !res.ok) { lastErr = `${res?.status} ${await res?.text()}`; continue; }
            const resJson = await res.json();
            let text = resJson.choices?.[0]?.message?.content || "";
            if (text) {
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const fb = text.indexOf('['); const lb = text.lastIndexOf(']');
                if (fb !== -1 && lb !== -1) text = text.substring(fb, lb + 1);
            }
            const parsed = JSON.parse(text);
            const finalArray = Array.isArray(parsed) ? parsed : Object.values(parsed).find((v: any) => Array.isArray(v)) || [];
            if (finalArray.length > 0) {
              for (const item of finalArray) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; totalProcessed++; }
              await logUsage("cerebras");
            }
          } catch(e: any) { lastErr = e.message; }
        }
        engineStats.cerebras = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.cerebras) engineErrors.cerebras = lastErr || "Nezpracovatelný JSON";
      })().catch(e => { engineErrors.cerebras = e.message; }));
    }

    if (useMistral) {
      engineTasks.push((async () => {
        const authKeys = [keys.MISTRAL_API_KEY, keys.MISTRAL_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.mistral = "Missing MISTRAL_API_KEY"; return; }
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";

        for (const chunkData of chunks) {
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          try {
            let res;
            for (const ak of authKeys) {
              res = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ak}` },
                body: JSON.stringify({
                  model: mistralModel,
                  messages: [{ role: "system", content: "You are data enrichment AI. Always reply with valid JSON array." }, { role: "user", content: chunkPrompt }],
                  temperature: 0.1,
                  response_format: { type: "json_object" }
                })
              });
              if (res.ok) break;
              if (res.status !== 401 && res.status !== 429) break;
            }
            if (!res || !res.ok) { lastErr = `${res?.status} ${await res?.text()}`; continue; }
            const resJson = await res.json();
            let text = resJson.choices?.[0]?.message?.content || "";
            if (text) {
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const fb = text.indexOf('['); const lb = text.lastIndexOf(']');
                if (fb !== -1 && lb !== -1) text = text.substring(fb, lb + 1);
            }
            const parsed = JSON.parse(text);
            const finalArray = Array.isArray(parsed) ? parsed : Object.values(parsed).find((v: any) => Array.isArray(v)) || [];
            if (finalArray.length > 0) {
              for (const item of finalArray) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; totalProcessed++; }
              await logUsage("mistral");
            }
          } catch(e: any) { lastErr = e.message; }
        }
        engineStats.mistral = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.mistral) engineErrors.mistral = lastErr || "Nezpracovatelný JSON";
      })().catch(e => { engineErrors.mistral = e.message; }));
    }

    if (useNvidia) {
      engineTasks.push((async () => {
        const authKeys = [keys.NVIDIA_API_KEY, keys.NVIDIA_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.nvidia = "Missing NVIDIA_API_KEY"; return; }
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";

        for (const chunkData of chunks) {
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          try {
            let res;
            for (const ak of authKeys) {
              // NVIDIA NIM is OpenAI-compatible; response_format omitted (unsupported on some models).
              res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ak}` },
                body: JSON.stringify({
                  model: nvidiaModel,
                  messages: [{ role: "system", content: "You are data enrichment AI. Always reply with a valid JSON array, nothing else." }, { role: "user", content: chunkPrompt }],
                  temperature: 0.1
                })
              });
              if (res.ok) break;
              if (res.status !== 401 && res.status !== 429) break;
            }
            if (!res || !res.ok) { lastErr = `${res?.status} ${await res?.text()}`; continue; }
            const resJson = await res.json();
            const arr = parseAIJson(resJson.choices?.[0]?.message?.content || "");
            if (arr.length > 0) {
              for (const item of arr) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item, _engine: "nvidia" }; totalProcessed++; }
              await logUsage("nvidia");
            }

          } catch(e: any) { lastErr = e.message; }
        }
        engineStats.nvidia = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.nvidia) engineErrors.nvidia = lastErr || "Nezpracovatelný JSON";
      })().catch(e => { engineErrors.nvidia = e.message; }));
    }

    if (useGemini) {
      engineTasks.push((async () => {
        const authKeys = [keys.GEMINI_API_KEY, keys.GEMINI_FALLBACK_API_KEY].filter(Boolean);
        if (authKeys.length === 0) { engineErrors.gemini = "Missing GEMINI_API_KEY"; return; }
        
        const models = [
          geminiModel,
          "gemini-2.0-flash",
          "gemini-1.5-flash-latest",
          "gemini-1.5-flash",
        ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate
        
        const chunks = chunk(inputForAI, 20);
        let totalProcessed = 0;
        let lastErr = "";
        let firstGeminiChunk = true;

        for (const chunkData of chunks) {
          if (!firstGeminiChunk && geminiGapMs) await sleep(geminiGapMs); // pace to stay under Gemini RPM
          firstGeminiChunk = false;
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          let geminiRes: Response | null = null;
          const geminiErrors: string[] = [];
          
          for (const model of models) {
            for (const ak of authKeys) {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ak}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: chunkPrompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 8000 } })
              });
              if (res.ok) { geminiRes = res; break; }
              
              const errText = await res.text();
              geminiErrors.push(`${model} (key: ${ak.slice(-4)}): ${res.status} - ${errText}`);
              if (res.status === 429 || res.status === 401) continue;
              break;
            }
            if (geminiRes?.ok) break;
            const lastStatus = geminiErrors[geminiErrors.length - 1];
            if (lastStatus.includes("429") || lastStatus.includes("503") || lastStatus.includes("404") || lastStatus.includes("400")) { continue; }
            break;
          }
          
          if (!geminiRes || !geminiRes.ok) { 
              lastErr = `All models failed: ${geminiErrors.join(" | ")}`; 
              continue; 
          }
          await logUsage("gemini");
          const resJson = await geminiRes.json();
          const arr = parseAIJson(resJson.candidates?.[0]?.content?.parts?.[0]?.text || "");
          for (const item of arr) if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; totalProcessed++; }
        }
        engineStats.gemini = { processed: totalProcessed };
        if (totalProcessed === 0 && !engineErrors.gemini) engineErrors.gemini = lastErr || "Nezpracovatelný JSON (pravděpodobně oříznuto)";
      })().catch(e => { engineErrors.gemini = e.message; }));
    }

    await Promise.allSettled(engineTasks);

    // ZÁCHRANA: když všem nakonfigurovaným providerům došly kvóty (Gemini 429,
    // Groq TPD, DeepSeek 402…), obohacování dřív skončilo na 0. Router zkusí
    // řetězec znovu a na konci vždy Pollinations — veřejný a BEZ KLÍČE.
    if (Object.keys(mergedResults).length === 0 && inputForAI.length > 0) {
      try {
        const allowed: string[] = [];
        if (useGemini) allowed.push("gemini");
        if (useGroq) allowed.push("groq");
        if (useCerebras) allowed.push("cerebras");
        if (useNvidia) allowed.push("nvidia");
        if (useOpenRouter) allowed.push("openrouter");
        if (useMistral) allowed.push("mistral");

        let rescued = 0;
        let rescueProvider = "";
        for (const chunkData of chunk(inputForAI, 20)) {
          const chunkPrompt = PROMPT.replace(JSON.stringify(inputForAI), JSON.stringify(chunkData));
          const res = await callAIWithFallback({
            supabase, keys, allowed,
            models: { gemini: geminiModel, groq: groqModel, cerebras: cerebrasModel, nvidia: nvidiaModel, openrouter: openrouterModel, mistral: mistralModel },
            system: "Jsi datovy obohacovac. Odpovidas VZDY pouze validnim JSON polem objektu.",
            user: chunkPrompt,
            jsonMode: true,
          });
          rescueProvider = res.provider;
          for (const item of parseJsonArray(res.text)) {
            if (item.id) { mergedResults[item.id] = { ...mergedResults[item.id], ...item }; rescued++; }
          }
        }
        if (rescued > 0) {
          engineStats[rescueProvider] = { processed: rescued };
          delete engineErrors[rescueProvider];
          await logUsage(rescueProvider);
          console.log(`[auto-enrich] Zachrana pres ${rescueProvider}: ${rescued} polozek`);
        }
      } catch (e: any) {
        engineErrors.router = `Zachranny retezec selhal: ${e.message}`;
      }
    }

    try {
      const { data: healthData } = await supabase.from("app_settings").select("value").eq("key", "api_health").maybeSingle();
      const currentHealth = healthData?.value || {};
      const testedEngines: string[] = [];
      if (useGroq) testedEngines.push("groq");
      if (useOpenRouter) testedEngines.push("openrouter");
      if (useDeepSeek) testedEngines.push("deepseek");
      if (useSiliconFlow) testedEngines.push("siliconflow");
      if (useGemini) testedEngines.push("gemini");
      if (useCerebras) testedEngines.push("cerebras");
      if (useMistral) testedEngines.push("mistral");
      if (useNvidia) testedEngines.push("nvidia");
      
      for (const eng of testedEngines) {
        const prev = currentHealth[eng] || {};
        const nowIso = new Date().toISOString();
        if (engineErrors[eng]) {
          currentHealth[eng] = { ...prev, status: "error", message: engineErrors[eng], updated_at: nowIso, last_run_enriched: engineStats[eng]?.processed ?? 0 };
        } else {
          currentHealth[eng] = { ...prev, status: "ok", message: "OK", updated_at: nowIso, last_success_at: nowIso, last_run_enriched: engineStats[eng]?.processed ?? 0 };
        }
      }
      await supabase.from("app_settings").upsert({ key: "api_health", value: currentHealth }, { onConflict: "key" });
    } catch (e) {
      console.error("Failed to update api_health", e);
    }

    const extractedArray = Object.values(mergedResults);

    let updatedCount = 0;
    
    // Zpracovat vrácená data
    for (const extracted of extractedArray) {
      const lead = leads.find((l: any) => l.id === extracted.id);
      if (!lead) continue;
      
      const engineTag = extracted._engine ? `ai:${extracted._engine}` : null;
      const existingTags = Array.isArray(lead.tags) ? lead.tags : [];
      const updatedTags = engineTag ? Array.from(new Set([...existingTags, engineTag])) : existingTags;

      const updatePayload: any = {
        company_name: lead.company_name || extracted.company_name || null,
        brand_name: extracted.brand_name || null,
        city: lead.city || extracted.city || null,
        country: lead.country || extracted.country || "Česká republika",
        language: lead.language || extracted.language || null,
        phone: lead.phone || extracted.phone || null,
        // Always write description (even "" sentinel) so the lead exits the description=null queue
        description: extracted.description || "",
        decision_maker_name: lead.decision_maker_name || extracted.decision_maker_name || null,
        last_project: lead.last_project || extracted.last_project || null,
        category: lead.category || extracted.category || null,
        subcategory: lead.subcategory || extracted.subcategory || null,
        premium_score: lead.premium_score || extracted.premium_score || 50,
        tags: updatedTags,
        updated_at: new Date().toISOString(),
      };



      if (extracted.email && extracted.email.includes("@") && extracted.email.toLowerCase() !== lead.email.toLowerCase()) {
        updatePayload.email = extracted.email.toLowerCase();
      }

      const { error: updateError } = await supabase.from("marketing_leads").update(updatePayload).eq("id", lead.id);
      
      if (updateError && updatePayload.email) {
        delete updatePayload.email;
        const { error: updErr2 } = await supabase.from("marketing_leads").update(updatePayload).eq("id", lead.id);
        if (updErr2) engineErrors.db_update = updErr2.message;
        else updatedCount++;
      } else if (updateError) {
        engineErrors.db_update = updateError.message;
      } else {
        updatedCount++;
      }
    }

    // For any leads the AI didn't return (e.g. truncated batch), set description="" as sentinel
    // so they exit the description=null queue and don't get reprocessed indefinitely.
    const enrichedIds = new Set(Object.keys(mergedResults));
    const idsNotReturned = leads.map((l: any) => l.id).filter((id: string) => !enrichedIds.has(id));
    if (idsNotReturned.length > 0) {
      await supabase.from("marketing_leads")
        .update({ description: "", updated_at: new Date().toISOString() })
        .in("id", idsNotReturned);
    }


    await logJobSuccess(supabase, jobName, { processed: leads.length, updated: updatedCount, errors: engineErrors });

    return new Response(JSON.stringify({ ok: true, processed: leads.length, updated: updatedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
