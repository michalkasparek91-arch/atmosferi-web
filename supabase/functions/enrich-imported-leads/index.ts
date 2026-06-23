import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { getApiKeys } from "../_shared/api_keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { emails } = await req.json().catch(() => ({}));
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "No emails provided" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keys = await getApiKeys(supabaseAdmin);
    const apiKey = keys.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing GEMINI_API_KEY" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: configData } = await supabase.from("app_settings").select("value").eq("key", "scraper_config").maybeSingle();
    let enrichEngine = "gemini";
    if (configData && configData.value && configData.value.enrich_engine) {
       enrichEngine = configData.value.enrich_engine;
    }

    // Determine active enrich engines (independently toggled)
    const useGemini = enrichEngine === "gemini" || enrichEngine === "both" || enrichEngine === "all";
    const useGroq   = enrichEngine === "groq"   || enrichEngine === "both" || enrichEngine === "all";
    const useOpenRouter = enrichEngine === "openrouter" || enrichEngine === "all";

    // We process the enrichment asynchronously and immediately return success to not block the frontend
    const batch = emails.slice(0, 50);

    const { data: leads } = await supabase
      .from("marketing_leads")
      .select("*")
      .in("email", batch);

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No leads found for these emails" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Return response immediately, process in background
    const processEnrichment = async () => {
      const leadsToProcess = leads.filter(l => l.website && l.website.trim() !== "" && (!l.city || !l.category));
      if (leadsToProcess.length === 0) return;

      const inputForAI = leadsToProcess.map(lead => {
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
- city: Město působnosti (např. Praha, Brno)
- country: Oficiální název země působnosti. Název země MUSÍ BÝT VŽDY V ČEŠTINĚ (např. "Finsko", "Austrálie").
- language: Zkratka jazyka webu (cs, sk, de, en atd.)
- phone: Telefonní číslo ve formátu s předvolbou
- description: Krátký popis toho, co firma dělá (1-2 věty)
- category: Hlavní kategorie (MUSÍŠ vybrat přesně jednu: architekti, interiery, developeri, realitky, urbanismus, architekt, remeslnici)
- subcategory: Specifická podkategorie
- email: Výsledná e-mailová adresa (nová nalezená, nebo původní)
Vrať POUZE validní pole objektů v JSON formátu (bez markdown značek, čisté pole).`;

      function parseAIJson(raw: string): any[] {
        let text = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const fb = text.indexOf('[');
        const lb = text.lastIndexOf(']');
        if (fb !== -1 && lb !== -1 && lb > fb) text = text.substring(fb, lb + 1);
        try { return JSON.parse(text); } catch { return []; }
      }

      async function logUsage(engine: string) {
        try {
          const { error } = await supabase.from("api_usage_logs").insert({ engine, service_name: "enrich-imported-leads", requests_count: 1 });
          if (error) console.error(`api_usage_logs error (${engine}):`, error);
        } catch(e) { console.error("api_usage_logs exception:", e); }
      }

      try {
        const mergedResults: Record<string, any> = {};
        const engineTasks: Promise<void>[] = [];

        if (useGroq) {
          engineTasks.push((async () => {
            const groqApiKey = keys.GROQ_API_KEY;
            if (!groqApiKey) { console.warn("Missing GROQ_API_KEY"); return; }
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqApiKey}` },
                body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: PROMPT }], temperature: 0.1 })
            });
            if (!groqRes.ok) { console.error("Groq error:", await groqRes.text()); return; }
            await logUsage("groq");
            const arr = parseAIJson((await groqRes.json()).choices?.[0]?.message?.content || "");
            for (const item of arr) if (item.id) mergedResults[item.id] = { ...mergedResults[item.id], ...item };
          })());
        }

        if (useOpenRouter) {
          engineTasks.push((async () => {
            const orKey = keys.OPENROUTER_API_KEY;
            if (!orKey) { console.warn("Missing OPENROUTER_API_KEY"); return; }
            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${orKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://atmosferi.cz", "X-Title": "Atmosferi CRM" },
              body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: PROMPT }], temperature: 0.1 })
            });
            if (!orRes.ok) { console.error("OpenRouter error:", await orRes.text()); return; }
            await logUsage("openrouter");
            const arr = parseAIJson((await orRes.json()).choices?.[0]?.message?.content || "");
            for (const item of arr) if (item.id) mergedResults[item.id] = { ...mergedResults[item.id], ...item };
          })());
        }

        if (useGemini) {
          engineTasks.push((async () => {
            const models = ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"];
            let geminiRes: Response | null = null;
            for (const model of models) {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 16000 } })
              });
              if (res.ok) { geminiRes = res; break; }
              if (res.status === 429 || res.status === 503) { console.warn(`Gemini ${model} unavailable (${res.status}), trying next`); geminiRes = res; continue; }
              geminiRes = res; break;
            }
            if (!geminiRes || !geminiRes.ok) { console.error("Gemini error:", await geminiRes?.text()); return; }
            await logUsage("gemini");
            const resJson = await geminiRes.json();
            const arr = parseAIJson(resJson.candidates?.[0]?.content?.parts?.[0]?.text || "");
            for (const item of arr) if (item.id) mergedResults[item.id] = { ...mergedResults[item.id], ...item };
          })());
        }

        await Promise.allSettled(engineTasks);
        const extractedArray = Object.values(mergedResults);
          
          for (const extracted of extractedArray) {
            const lead = leadsToProcess.find(l => l.id === extracted.id);
            if (!lead) continue;
            
              const updatePayload: any = {
                company_name: lead.company_name || extracted.company_name || null,
                city: lead.city || extracted.city || null,
                country: lead.country || extracted.country || "Česká republika",
                language: lead.language || extracted.language || null,
                phone: lead.phone || extracted.phone || null,
                description: lead.description || extracted.description || null,
                category: lead.category || extracted.category || null,
                subcategory: lead.subcategory || extracted.subcategory || null,
                premium_score: lead.premium_score || extracted.premium_score || 50,
                decision_maker_name: lead.decision_maker_name || extracted.decision_maker_name || null,
                last_project: lead.last_project || extracted.last_project || null,
                ai_icebreaker: lead.ai_icebreaker || extracted.ai_icebreaker || null,
              };

              if (extracted.email && extracted.email.includes("@") && extracted.email.toLowerCase() !== lead.email.toLowerCase()) {
                updatePayload.email = extracted.email.toLowerCase();
                
                if (!lead.email.includes("@placeholder.zrobee.cz")) {
                  const currentSecondary = lead.secondary_emails || [];
                  if (!currentSecondary.includes(lead.email)) {
                    updatePayload.secondary_emails = [...currentSecondary, lead.email];
                  }
                }
              }

              const { error: updateError } = await supabase.from("marketing_leads").update(updatePayload).eq("id", lead.id);
              
              // Fallback if email update failed (e.g. duplicate key)
              if (updateError && updatePayload.email) {
                delete updatePayload.email;
                await supabase.from("marketing_leads").update(updatePayload).eq("id", lead.id);
              }
            }
      } catch (e) {
        console.error("Enrichment failed for batch", e);
      }
    };

    // Process sequentially to respect Gemini API rate limits
    await processEnrichment().catch(console.error);

    return new Response(JSON.stringify({ ok: true, message: `Enrichment finished for ${batch.length} leads` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
