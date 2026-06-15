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

        let targetUrl = lead.website;
        if (!targetUrl && lead.email && lead.email.includes('@')) {
          const domain = lead.email.split('@')[1].toLowerCase();
          const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'seznam.cz', 'centrum.cz', 'outlook.com', 'icloud.com', 'post.cz', 'volny.cz'];
          if (!genericDomains.includes(domain)) {
            targetUrl = `https://www.${domain}`;
          }
        }

        const PROMPT = `Jsi B2B akviziční agent. 
Máš k dispozici firmu: ${lead.company_name || lead.full_name || "Neznámý název"}, její web: ${targetUrl || "Neznámý"} a e-mail: ${lead.email}.
ÚKOL:
Využij své rozsáhlé znalostní databáze a doplň základní údaje o firmě do JSONu.
Původní e-mail (${lead.email}) zkontroluj a pokud znáš pro tuto firmu lepší B2B kontakt, vrať ten nový. Jinak vrať původní.
Povinné klíče:
- company_name: Oficiální název firmy
- city: Město působnosti (např. Praha, Brno)
- country: Oficiální název země působnosti. Název země MUSÍ BÝT VŽDY V ČEŠTINĚ (např. "Finsko" místo "Finland", "Austrálie" místo "Australia").
- language: Zkratka jazyka webu (cs, sk, de, en atd.)
- phone: Telefonní číslo ve formátu s předvolbou (např. +420...)
- description: Krátký popis toho, co firma dělá (1-2 věty)
- category: Hlavní kategorie. MUSÍŠ vybrat přesně jednu z tohoto seznamu: architekti, interiery, developeri, realitky, urbanismus, architekt, remeslnici. Nevymýšlej jiné.
- subcategory: Specifická podkategorie (např. truhlářství, bytový architekt, atd.)
- ai_icebreaker: Osobní otevírací odstavec do cold e-mailu chválící konkrétní část jejich práce nebo portfolio na webu. TENTO ODSTAVEC MUSÍ BÝT PSÁN V JAZYCE WEBU FIRMY (např. anglicky pro Austrálii, německy pro Německo)! NIKDY NEPOUŽÍVEJ OSLOVENÍ (jako "Dobrý den...", "Hello...", "Dear..."), napiš POUZE samotný text odstavce.
- email: Výsledná e-mailová adresa (nová nalezená, nebo původní pokud je dobrá)
Vrať POUZE validní JSON objekt.`;

        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }] }], generationConfig: { temperature: 0.3 } }) 
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
