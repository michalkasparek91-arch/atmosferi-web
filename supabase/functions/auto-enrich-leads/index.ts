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

    // Select 50 oldest updated leads that need enrichment
    const { data: leads } = await supabase
      .from("marketing_leads")
      .select("id, email, full_name, company_name, website, city, category, updated_at")
      .not("website", "is", null)
      .neq("website", "")
      .or("city.is.null,category.is.null")
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(50);

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

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }] }], generationConfig: { temperature: 0.1 } }) 
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      const errMsg = `Chyba od Google API: ${errBody}`;
      await logJobFailure(supabase, jobName, errMsg);
      return new Response(JSON.stringify({ ok: false, error: errMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resJson = await geminiRes.json();
    let textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    if (!textOut) {
       const finishReason = resJson.candidates?.[0]?.finishReason || "UNKNOWN_REASON";
       const errMsg = `Odpověď od AI je prázdná (finishReason: ${finishReason}). Může se jednat o bezpečnostní filtr.`;
       await logJobFailure(supabase, jobName, errMsg);
       return new Response(JSON.stringify({ ok: false, error: errMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Odstranění formátování Markdownu
    textOut = textOut.replace(/```json/g, "").replace(/```/g, "").trim();

    const firstBracket = textOut.indexOf('[');
    const lastBracket = textOut.lastIndexOf(']');
    
    let extractedArray: any[] = [];
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      textOut = textOut.substring(firstBracket, lastBracket + 1);
      try {
        extractedArray = JSON.parse(textOut);
      } catch (e: any) {
        const errMsg = `JSON Parse Chyba: ${e.message}`;
        await logJobFailure(supabase, jobName, errMsg);
        return new Response(JSON.stringify({ ok: false, error: errMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let updatedCount = 0;
    
    // Zpracovat vrácená data
    for (const extracted of extractedArray) {
      const lead = leads.find((l: any) => l.id === extracted.id);
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

    await logJobSuccess(supabase, jobName, { processed: leads.length, updated: updatedCount });

    return new Response(JSON.stringify({ ok: true, processed: leads.length, updated: updatedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
