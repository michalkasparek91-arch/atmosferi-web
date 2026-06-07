import { createClient } from "npm:@supabase/supabase-js@2";
import { isAutomationAllowed } from "../_shared/automation-guard.ts";
import { logJobStart, logJobSuccess, logJobFailure } from "../_shared/automation-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function normalizePhone(p: string): string {
  if (!p) return "";
  let clean = p.replace(/\s+/g, "");
  if (!clean.startsWith("+")) {
    if (clean.length === 9) clean = "+420" + clean;
  }
  return clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jobName = "Autonomous Web Discovery";
  let supabase: any;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const __gate = await isAutomationAllowed(supabase, "autonomous-web-sniper");
    if (!__gate.allowed) {
      console.log("[autonomous-web-sniper] Skipped: " + __gate.reason);
      return new Response(JSON.stringify({ skipped: true, reason: __gate.reason }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }


    await logJobStart(supabase, jobName);

    const body = await req.json().catch(() => ({}));
    const jobId = body.jobId;
    const forceSearch = body.forceSearch === true;

    if (!jobId) {
      throw new Error("Chybí ID zakázky (jobId)");
    }

    // 1. Fetch job details
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*, service_subcategories(*)")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      throw new Error(`Zakázka s ID ${jobId} nebyla nalezena: ${jobErr?.message || ""}`);
    }

    const jobCity = job.city || "ČR";
    const jobSubcategory = job.service_subcategories?.name || "Řemeslné práce";
    const jobLat = job.latitude;
    const jobLng = job.longitude;

    // 2. Check existing leads & workers around job coordinates
    let contactCount = 0;
    
    if (!forceSearch) {
      // Check profiles (workers)
      const { data: workers } = await supabase
        .from("profiles")
        .select("id, latitude, longitude, subcategory")
        .eq("user_type", "worker")
        .not("latitude", "is", null);

      if (workers && workers.length > 0) {
        for (const w of workers) {
          const matchSub = !w.subcategory || w.subcategory.toLowerCase().includes(jobSubcategory.toLowerCase());
          if (matchSub && jobLat && jobLng && w.latitude && w.longitude) {
            const dist = calculateDistance(jobLat, jobLng, w.latitude, w.longitude);
            if (dist <= 50) contactCount++;
          }
        }
      }

      // Check marketing leads
      const { data: leads } = await supabase
        .from("marketing_leads")
        .select("id, latitude, longitude, subcategory")
        .not("latitude", "is", null);

      if (leads && leads.length > 0) {
        for (const l of leads) {
          const matchSub = !l.subcategory || l.subcategory.toLowerCase().includes(jobSubcategory.toLowerCase());
          if (matchSub && jobLat && jobLng && l.latitude && l.longitude) {
            const dist = calculateDistance(jobLat, jobLng, l.latitude, l.longitude);
            if (dist <= 50) contactCount++;
          }
        }
      }

      console.log(`[WebSniper] Job ${jobId} (${jobCity}, ${jobSubcategory}): found ${contactCount} suitable contacts within 50km.`);
      
      if (contactCount >= 3) {
        await logJobSuccess(supabase, jobName, { discovered_count: 0, jobTitle: job.title, reason: "Dostatek stávajících kontaktů" });
        return new Response(JSON.stringify({ ok: true, discovered_count: 0, message: `V okolí je dostatek kontaktů (${contactCount}).` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[WebSniper] Initiating live web search via Google Grounding for job ${jobId}...`);

    const apiKey = Deno.env.get("GEMINI_API_KEY") || "AIzaSyBdn4Mg-tmRdsQYdjffNxGztM7mCxQE5pw";
    
    const SEARCH_PROMPT = `Jsi autonomní vyhledávací agent platformy Atmosferi.com.
Tvým úkolem je vyhledat na webu přes Google reálné a aktivní architektonické ateliéry, interiérové designéry, realitní makléře, stavební inženýry nebo developery v okolí obce/města ${jobCity} (Česká republika), kteří se specializují na "${jobSubcategory}".

Zajímají nás POUZE subjekty, u kterých na webu existuje e-mailová adresa. Vyhledej 5 až 10 takových firem z dané lokality a okolí.

Pro každou firmu vytěž přesně tyto informace:
1. "company_name": Oficiální název firmy nebo celé jméno a příjmení živnostníka
2. "email": E-mailová adresa
3. "phone": Telefonní číslo (vlož českou předvolbu +420)
4. "website": Odkaz na webové stránky nebo profil v katalogu
5. "city": Obec nebo město sídla / působiště
6. "full_address": Kompletní poštovní adresa (ulice, č.p., město, PSČ)
7. "latitude" a "longitude": Přibližné GPS souřadnice jako reálná čísla (např. 49.82 a 18.26)
8. "description": Detailní textové shrnutí (alespoň 2-3 věty) o tom, na co se firma specializuje, jaké provádí práce, jaké má zkušenosti a reference.

Odpověz POUZE čistým validním JSON polem objektů. Žádný markdown, žádné zpětné uvozovky.`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: SEARCH_PROMPT }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!geminiRes.ok) {
      const errTxt = await geminiRes.text();
      throw new Error(`Gemini Grounding API chyba: ${errTxt}`);
    }

    const resJson = await geminiRes.json();
    let textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    // Strip markdown formatting if any
    textOut = textOut.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let discoveredList: any[] = [];
    try {
      discoveredList = JSON.parse(textOut);
    } catch (parseErr) {
      console.error("[WebSniper] Could not parse JSON from Gemini output:", textOut);
      throw new Error("AI nevrátila validní formát JSON.");
    }

    if (!Array.isArray(discoveredList) || discoveredList.length === 0) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0, jobTitle: job.title });
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, message: "Nebyly objeveny žádné firmy s e-mailem." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[WebSniper] Gemini discovered ${discoveredList.length} potential leads. Inserting into CRM...`);

    let newSavedCount = 0;
    const newlySavedLeads: any[] = [];

    for (const item of discoveredList) {
      if (!item.email || !item.email.includes("@")) continue;
      const cleanEmail = item.email.toLowerCase().trim();

      // Check if email exists in profiles or leads
      const { data: pExist } = await supabase.from("profiles").select("id").eq("email", cleanEmail).maybeSingle();
      if (pExist) continue;

      const { data: lExist } = await supabase.from("marketing_leads").select("id").eq("email", cleanEmail).maybeSingle();
      if (lExist) continue;

      const phoneNorm = normalizePhone(item.phone || "");

      const { data: newLead, error: insertErr } = await supabase
        .from("marketing_leads")
        .insert({
          email: cleanEmail,
          full_name: item.company_name || "Prověřený profesionál",
          company_name: item.company_name || "Prověřený profesionál",
          phone: phoneNorm,
          website: item.website || "",
          city: item.city || jobCity,
          full_address: item.full_address || `${item.city || jobCity}, ČR`,
          latitude: item.latitude ? parseFloat(item.latitude) : jobLat,
          longitude: item.longitude ? parseFloat(item.longitude) : jobLng,
          category: job.category_id || "Řemeslné práce",
          subcategory: jobSubcategory,
          description: item.description || `Specialista na ${jobSubcategory}`,
          company_description: item.description || `Specialista na ${jobSubcategory}`,
          source: "ai_web_sniper",
        })
        .select()
        .single();

      if (!insertErr && newLead) {
        newSavedCount++;
        newlySavedLeads.push(newLead);
      }
    }

    console.log(`[WebSniper] Successfully saved ${newSavedCount} new leads to CRM. Generating Sniper Outbox drafts...`);

    let outboxDraftsCount = 0;
    for (const lead of newlySavedLeads) {
      try {
        const icePrompt = `Jsi zakladatel platformy Atmosferi.com. Napiš POUZE JEDNU přirozenou, údernou a vysoce realistickou větu v češtině (striktní vykání, "Vám", "Váš").
Cílem je uctivě oslovit architekta/designéra/makléře a rovnou přejít k věci s nabídkou konkrétní poptávky/zakázky z jejich okolí.
Věta musí znít jako od člověka z masa a kostí, žádné robotické fráze. Musí to být velmi krátké.

Firma: ${lead.company_name}
Lokalita firmy: ${lead.city}
Název zakázky: ${job.title}
Město zakázky: ${job.city}

Příklad 1: "Dobrý den, všiml jsem si Vašeho skvělého portfolia a napadlo mě se Vám ozvat s čerstvou poptávkou na ${job.title.toLowerCase()} v ${job.city} – měli byste na to teď kapacitu?"
Příklad 2: "Dobrý den, máme tu teď klienta z ${job.city}, který řeší ${job.title.toLowerCase()} a Váš profil mě zaujal. Měl byste o to případně zájem?"

Žádný podpis na konec. Odpověz PŘÍMO samotným textem zprávy.`;

        const iceRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: icePrompt }] }],
            generationConfig: { temperature: 0.8 }
          })
        });

        if (iceRes.ok) {
          const iceData = await iceRes.json();
          let iceText = iceData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          iceText = iceText.replace(/^["']|["']$/g, "").trim();

          if (iceText) {
            if (lead.phone && lead.phone.length > 5) {
              await supabase.from("whatsapp_outbox").insert({
                lead_id: lead.id,
                job_id: jobId,
                phone_number: lead.phone,
                ai_message: iceText,
                status: job.sniper_auto_approve ? "pending" : "draft",
                template_slug: "sniper-a-zvrdavost"
              });
              
              try {
                await supabase.from("admin_notifications").insert({
                  title: "📱 WhatsApp Sniper",
                  message: `Připravena zpráva pro: ${lead.company_name}\n„${iceText}“`,
                  link: "/admin/emaily?tab=outbox",
                  type: "success"
                });
              } catch (e) {
                console.warn("Failed to create WhatsApp notification", e);
              }
            } else {
              await supabase.from("email_outbox").insert({
                lead_id: lead.id,
                job_id: jobId,
                template_slug: "sniper-a-zvrdavost",
                icebreaker: iceText,
                status: job.sniper_auto_approve ? "ready_for_outbox" : "draft"
              });
            }
            outboxDraftsCount++;
          }
        }
      } catch (e) {
        console.error(`[WebSniper] Failed outbox draft for lead ${lead.id}:`, e);
      }
    }

    // 4. Create admin notification
    if (newSavedCount > 0) {
      try {
        await supabase.from("admin_notifications").insert({
          title: "🌐 AI Web Discovery: Objeveni noví dodavatelé",
          message: `Pro zakázku „${job.title}“ (${jobCity}) bylo na webu objeveno ${newSavedCount} nových firem. Připraveno ${outboxDraftsCount} oslovení v Outboxu.`,
          link: "/admin/emaily?tab=outbox",
          type: "success"
        });
      } catch (ne) {
        console.warn("[WebSniper] Notification error:", ne);
      }
    }

    await logJobSuccess(supabase, jobName, { discovered_count: newSavedCount, outbox_count: outboxDraftsCount, jobTitle: job.title });

    return new Response(JSON.stringify({ 
      ok: true, 
      discovered_count: newSavedCount, 
      outbox_count: outboxDraftsCount,
      message: `Úspěšně dohledáno a uloženo ${newSavedCount} firem z webu.` 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});