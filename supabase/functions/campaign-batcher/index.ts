import { createClient } from "npm:@supabase/supabase-js@2";
import { availableOutreachLeads, countAvailableOutreachLeads } from "../_shared/outreach-leads.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!token) throw new Error("Unauthorized");
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (error || !user) throw new Error("Unauthorized");
      const { data: profile } = await supabaseClient.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) throw new Error("Forbidden");
    }

    const { action, template_id, batch_size, limit: audienceLimit } = await req.json();

    if (action === "get_batches") {
      // 1. Fetch active templates
      const { data: templates, error: tErr } = await supabaseClient
        .from("email_templates")
        .select("*")
        .eq("is_enabled", true);
        
      if (tErr) throw tErr;

      const results = [];

      for (const t of templates) {
        if (!t.category || !t.language) continue;

        // Jen počet — nenačítáme celé řádky (dřív to byly desítky MB na jedno zobrazení).
        const availableCount = await countAvailableOutreachLeads(supabaseClient, t);
        const { count: drafts, error: draftError } = await supabaseClient.from("email_outbox")
          .select("id", { count: "exact", head: true }).eq("template_slug", t.slug).in("status", ["draft", "pending"]).is("dispatch_attempted_at", null);
        if (draftError) throw draftError;
        const totalAudience = availableCount + (drafts || 0);

        if (totalAudience > 0) {
          const batches = [];
          let remaining = totalAudience;
          let batchIndex = 1;
          
          while (remaining > 0) {
            const size = Math.min(300, remaining);
            batches.push({
              id: `${t.id}-batch-${batchIndex}`,
              size: size,
              status: size === 300 ? "ready" : "waiting",
              batch_index: batchIndex
            });
            remaining -= size;
            batchIndex++;
          }

          results.push({
            template: t,
            total_audience: totalAudience,
            batches: batches
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (action === "process_batch") {
      if (!template_id) throw new Error("Missing template_id");
      
      const limit = batch_size || 300;
      
      const { data: template } = await supabaseClient
        .from("email_templates")
        .select("*")
        .eq("id", template_id)
        .single();
        
      if (!template) throw new Error("Template not found");

      const leadsToProcess = await availableOutreachLeads(supabaseClient, template, limit);

      // If there are new leads to add, insert them (ignoring duplicates)
      if (leadsToProcess.length > 0) {
        const outboxInserts = leadsToProcess.map((lead: any) => ({
          template_slug: template.slug,
          lead_id: lead.id,
          status: "draft",
          icebreaker: lead.ai_icebreaker || "",
        }));

        // Use upsert with ignoreDuplicates so existing records don't cause errors
        const { error: insertError } = await supabaseClient
          .from("email_outbox")
          .upsert(outboxInserts, { onConflict: "template_slug,lead_id", ignoreDuplicates: true });
        if (insertError) throw insertError;
      }

      // Now send all current drafts for this template via process-sniper-outbox
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const { data: draftsToSend } = await supabaseClient
        .from("email_outbox")
        .select("id")
        .eq("template_slug", template.slug)
        .eq("status", "draft")
        .order("created_at", { ascending: true })
        .limit(batch_size || 300);

      if (!draftsToSend || draftsToSend.length === 0) {
        return new Response(
          JSON.stringify({ success: true, processed: 0, message: "No drafts to send" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const draftIds = draftsToSend.map((d: any) => d.id);

      const sendRes = await fetch(`${supabaseUrl}/functions/v1/process-sniper-outbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
        body: JSON.stringify({ action: "send_selected_drafts", draftIds }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok || sendData?.error) throw new Error(sendData?.error || "Sender failed");

      return new Response(
        JSON.stringify({ success: true, processed: draftIds.length, sent_count: sendData?.sent_count, failed_count: sendData?.failed_count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "recover_pending") {
      const { data, error } = await supabaseClient
        .from("email_outbox")
        .update({ status: "draft" })
        .eq("status", "pending")
        .is("dispatch_attempted_at", null)
        .select("id");
        
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, recovered: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Kontakty jednoho publika — pro rozbalený řádek skupiny v adminu.
    // Načítá se až na vyžádání, aby přehled zůstal rychlý.
    if (action === "get_audience") {
      const { data: template, error: tErr } = await supabaseClient
        .from("email_templates").select("*").eq("id", template_id).single();
      if (tErr) throw tErr;

      const max = Math.min(Number(audienceLimit) || 50, 200);
      const leads = await availableOutreachLeads(supabaseClient, template, max);
      const slim = leads.map((l: any) => ({
        id: l.id,
        company_name: l.company_name || l.full_name || "—",
        email: l.email,
        city: l.city,
        country: l.country,
        premium_score: l.premium_score,
        decision_maker_name: l.decision_maker_name,
        discovered_by: l.discovered_by,
        website: l.website,
      }));

      return new Response(
        JSON.stringify({ success: true, total: slim.length, leads: slim }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "debug_leads" || action === "audience_diagnostics") {
      // Proč kontakt není v žádném publiku? Publikum filtruje PĚT podmínek
      // (kategorie, jazyk, e-mail, import review, odhlášení) — stačí, aby
      // selhala jedna, a lead je neviditelný. Tady spočítáme každou zvlášť.
      const { data: templates } = await supabaseClient
        .from("email_templates").select("category, language").eq("is_enabled", true);
      const validPairs = new Set<string>();
      const validCategories = new Set<string>();
      for (const t of templates || []) {
        if (!t.category || !t.language) continue;
        validCategories.add(t.category);
        const langs = ["cs", "cz"].includes(t.language) ? ["cs", "cz", "sk"] : [t.language];
        for (const l of langs) validPairs.add(`${t.category}|${l}`);
      }

      const leads: Record<string, any>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabaseClient
          .from("marketing_leads")
          .select("id, category, language, email, tags, outreach_import_review, marketing_notifications, email_notifications")
          .order("id").range(from, from + 999);
        if (error) throw error;
        leads.push(...(data || []));
        if (!data || data.length < 1000) break;
      }

      const reasons = {
        celkem: leads.length,
        bez_emailu: 0,
        bez_kategorie: 0,
        bez_jazyka: 0,
        kategorie_bez_sablony: 0,
        jazyk_bez_sablony: 0,
        ceka_na_revizi_importu: 0,
        odhlaseno_nebo_zname: 0,
        v_publiku: 0,
      };
      const pairs: Record<string, number> = {};
      const unmatchedCategories: Record<string, number> = {};
      const unmatchedLanguages: Record<string, number> = {};

      for (const l of leads) {
        const cat = (l.category || "").trim();
        const lang = (l.language || "").trim();
        pairs[`${cat || "—"} | ${lang || "—"}`] = (pairs[`${cat || "—"} | ${lang || "—"}`] || 0) + 1;

        if (!l.email) { reasons.bez_emailu++; continue; }
        if (l.marketing_notifications === false || l.email_notifications === false || (l.tags || []).includes("známé")) {
          reasons.odhlaseno_nebo_zname++; continue;
        }
        if (l.outreach_import_review) { reasons.ceka_na_revizi_importu++; continue; }
        if (!cat) { reasons.bez_kategorie++; continue; }
        if (!lang) { reasons.bez_jazyka++; continue; }
        if (!validCategories.has(cat)) {
          reasons.kategorie_bez_sablony++;
          unmatchedCategories[cat] = (unmatchedCategories[cat] || 0) + 1;
          continue;
        }
        if (!validPairs.has(`${cat}|${lang}`)) {
          reasons.jazyk_bez_sablony++;
          unmatchedLanguages[`${cat} | ${lang}`] = (unmatchedLanguages[`${cat} | ${lang}`] || 0) + 1;
          continue;
        }
        reasons.v_publiku++;
      }

      const top = (o: Record<string, number>, n = 15) =>
        Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n)
          .map(([k, v]) => ({ klic: k, pocet: v }));

      return new Response(
        JSON.stringify({
          success: true,
          reasons,
          dvojice_kategorie_jazyk: top(pairs, 25),
          kategorie_bez_sablony: top(unmatchedCategories),
          jazyky_bez_sablony: top(unmatchedLanguages),
          summary: pairs, // zpětná kompatibilita
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
