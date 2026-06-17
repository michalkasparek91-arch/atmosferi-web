import { createClient } from "npm:@supabase/supabase-js@2";

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

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing GEMINI_API_KEY" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: configData } = await supabase.from("app_settings").select("value").eq("key", "scraper_config").maybeSingle();
    let enrichEngine = "gemini";
    if (configData && configData.value && configData.value.enrich_engine) {
       enrichEngine = configData.value.enrich_engine;
    }

    if (enrichEngine === "both") {
       enrichEngine = Math.random() > 0.5 ? "gemini" : "groq";
    }

    // We process the enrichment asynchronously and immediately return success to not block the frontend
    // In Edge Functions on Deno Deploy, background tasks after response might get killed if not handled properly, 
    // but Deno Deploy allows `waitUntil` or returning the response while promise continues.
    // However, it's safer to just await it since we can afford to keep the connection open up to a few minutes,
    // OR we process them in the background using `EdgeRuntime.waitUntil` if available.
    // For simplicity and safety in Supabase, we'll process them synchronously if batch is small, or use a worker approach.
    // We process up to 50 leads in a single batch to save Gemini API requests
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
        return { id: lead.id, company_name: lead.company_name || lead.full_name || "Neznámý", email: lead.email, website: targetUrl };
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

      try {
        let textOut = "";
        
        if (enrichEngine === "groq") {
            const groqApiKey = Deno.env.get("GROQ_API_KEY");
            if (!groqApiKey) return;
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqApiKey}` },
                body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: PROMPT }], temperature: 0.1 })
            });
            
            if (groqRes.ok) {
                try {
                    const { error: usageErr } = await supabase.from("api_usage_logs").insert({
                        engine: "groq", 
                        service_name: "enrich-imported-leads", 
                        requests_count: 1
                    });
                    if (usageErr) console.error("Chyba při zápisu do api_usage_logs:", usageErr);
                } catch(e) { console.error("Vyjimka pri zapisu api_usage_logs:", e); }

                const resJson = await groqRes.json();
                textOut = resJson.choices?.[0]?.message?.content?.trim() || "";
            } else {
                console.error("Groq error:", await groqRes.text());
                return;
            }
        } else {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }] }], generationConfig: { temperature: 0.1 } }) 
            });

            if (geminiRes.ok) {
                try {
                    const { error: usageErr } = await supabase.from("api_usage_logs").insert({
                        engine: "gemini", 
                        service_name: "enrich-imported-leads", 
                        requests_count: 1
                    });
                    if (usageErr) console.error("Chyba při zápisu do api_usage_logs:", usageErr);
                } catch(e) { console.error("Vyjimka pri zapisu api_usage_logs:", e); }

              const resJson = await geminiRes.json();
              textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            } else {
                console.error("Gemini error:", await geminiRes.text());
                return;
            }
        }

        if (!textOut) return;

        // Odstranění formátování Markdownu
        textOut = textOut.replace(/```json/g, "").replace(/```/g, "").trim();

        const firstBracket = textOut.indexOf('[');
        const lastBracket = textOut.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          textOut = textOut.substring(firstBracket, lastBracket + 1);
          const extractedArray = JSON.parse(textOut);
          
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
