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

    // We process the enrichment asynchronously and immediately return success to not block the frontend
    // In Edge Functions on Deno Deploy, background tasks after response might get killed if not handled properly, 
    // but Deno Deploy allows `waitUntil` or returning the response while promise continues.
    // However, it's safer to just await it since we can afford to keep the connection open up to a few minutes,
    // OR we process them in the background using `EdgeRuntime.waitUntil` if available.
    // For simplicity and safety in Supabase, we'll process them synchronously if batch is small, or use a worker approach.
    // We'll limit to 20 emails per invocation for safety.
    const batch = emails.slice(0, 20);

    const { data: leads } = await supabase
      .from("marketing_leads")
      .select("*")
      .in("email", batch);

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No leads found for these emails" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Return response immediately, process in background
    const processEnrichment = async () => {
      for (const lead of leads) {
        if (!lead.website || lead.website.trim() === "") continue;
        
        // Skip if already reasonably enriched (has city, category, and icebreaker)
        if (lead.city && lead.category && lead.ai_icebreaker) continue;

        const PROMPT = `Jsi B2B akviziční agent. 
Máš k dispozici firmu: ${lead.company_name || lead.full_name} a její web: ${lead.website}.
ÚKOL:
Najdi na webu pomocí Google Search nebo přímým procházením základní údaje o firmě a doplň je do JSONu.
Povinné klíče:
- company_name: Oficiální název firmy
- city: Město působnosti (např. Praha, Brno)
- country: Oficiální název země působnosti. Pokud není z ČR/SR, normálně vypiš jinou zemi (např. Francie, Itálie).
- language: Zkratka jazyka webu (cs, sk, de, en atd.)
- phone: Telefonní číslo ve formátu s předvolbou (např. +420...)
- description: Krátký popis toho, co firma dělá (1-2 věty)
- category: Hlavní kategorie. MUSÍŠ vybrat přesně jednu z tohoto seznamu: architekti, interiery, developeri, urbanismus, architekt, remeslnici. Nevymýšlej jiné.
- subcategory: Specifická podkategorie (např. truhlářství, bytový architekt, atd.)
- ai_icebreaker: Osobní otevírací odstavec do cold e-mailu chválící konkrétní část jejich práce nebo portfolio na webu.
- email: E-mailová adresa firmy (pouze pokud ji na webu najdeš, jinak nech prázdné)
Vrať POUZE validní JSON objekt.`;

        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }] }], tools: [{ googleSearch: {} }], generationConfig: { temperature: 0.3 } }) 
          });

          if (geminiRes.ok) {
            const resJson = await geminiRes.json();
            let textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            
            const firstBracket = textOut.indexOf('{');
            const lastBracket = textOut.lastIndexOf('}');
            if (firstBracket !== -1 && lastBracket !== -1) {
              textOut = textOut.substring(firstBracket, lastBracket + 1);
              const extracted = JSON.parse(textOut);
              
              const updatePayload: any = {
                company_name: lead.company_name || extracted.company_name || null,
                city: lead.city || extracted.city || null,
                country: lead.country || extracted.country || "Česká republika",
                language: lead.language || extracted.language || null,
                phone: lead.phone || extracted.phone || null,
                description: lead.description || extracted.description || null,
                category: lead.category || extracted.category || null,
                subcategory: lead.subcategory || extracted.subcategory || null,
                ai_icebreaker: lead.ai_icebreaker || extracted.ai_icebreaker || null,
                premium_score: lead.premium_score || extracted.premium_score || 50,
              };

              if (lead.email.includes("@placeholder.zrobee.cz") && extracted.email && extracted.email.includes("@")) {
                updatePayload.email = extracted.email;
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
          console.error("Enrichment failed for", lead.email, e);
        }
      }
    };

    // Process sequentially to respect Gemini API rate limits
    await processEnrichment().catch(console.error);

    return new Response(JSON.stringify({ ok: true, message: `Enrichment finished for ${batch.length} leads` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
