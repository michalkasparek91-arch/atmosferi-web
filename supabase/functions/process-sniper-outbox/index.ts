import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { action, draftIds, targetEmail } = await req.json();

    if (action === "send_selected_drafts") {
      if (!draftIds || !Array.isArray(draftIds)) {
        throw new Error("Missing draftIds");
      }

      let sent_count = 0;
      let failed_count = 0;

      for (const draftId of draftIds) {
        const { data: draft, error: fetchErr } = await supabaseAdmin
          .from("email_outbox")
          .select(`
            *,
            template:email_templates(*),
            lead:marketing_leads(*),
            worker:profiles(*),
            job:jobs(title, city, description, budget_min, budget_max, price_note, service_subcategories(name, category_form))
          `)
          .eq("id", draftId)
          .single();

        if (fetchErr || !draft) {
          failed_count++;
          continue;
        }

        const template = draft.template || {};
        const recipientEmail = targetEmail || draft.worker?.email || draft.lead?.email;
        if (!recipientEmail) {
          failed_count++;
          continue;
        }

        const name = draft.worker?.full_name || draft.lead?.company_name || draft.lead?.full_name || "Neznámý";
        const isWorker = !!draft.worker;

        const bodyWithIcebreaker = draft.icebreaker 
          ? (template.body?.includes("{{icebreaker}}") 
            ? template.body.replace(/{{icebreaker}}/g, draft.icebreaker)
            : `${draft.icebreaker}\n\n${template.body || ""}`)
          : (template.body || "");

        const replaceVars = (txt: string | null | undefined) => {
          if (!txt) return "";
          return txt
            .replace(/{{osloveni}}/g, "Petře") // Mock or real parsing if needed
            .replace(/{{jmeno}}/g, name)
            .replace(/{{mesto_v_meste}}/g, draft.job?.city ? `v ${draft.job.city}` : "v okolí")
            .replace(/{{mesto}}/g, draft.job?.city || "Vaše město")
            .replace(/{{obor_2pad}}|{{podkategorie_2pad}}/g, draft.job?.service_subcategories?.category_form || "oboru")
            .replace(/{{obor}}/g, draft.job?.service_subcategories?.name || "Řemeslo")
            .replace(/{{nazev_zakazky}}/g, draft.job?.title || "Nová zakázka")
            .replace(/{{popis_zakazky}}/g, draft.job?.description || "")
            .replace(/{{cena_rozpocet}}|{{rozpocet}}/g, draft.job?.price_note || "Není stanovena")
            .replace(/{{zakaznik}}/g, "Zákazník")
            .replace(/{{odkaz_zakazky}}/g, template.cta_url || "https://zrobee.cz");
        };

        const result = await sendEmail({
          from: template.sender_email,
          to: recipientEmail,
          subject: replaceVars(template.subject || template.name),
          title: replaceVars(template.heading || template.title || template.name),
          body: replaceVars(bodyWithIcebreaker),
          emoji: template.emoji || "",
          ctaText: replaceVars(template.cta_text || template.ctaText || "Zobrazit"),
          ctaUrl: replaceVars(template.cta_url || "https://zrobee.cz"),
          secondaryText: template.secondary_text ? replaceVars(template.secondary_text) : undefined,
          layoutType: template.layout_type || "standard",
          jobCity: replaceVars(draft.job?.city || template.job_city),
          jobCategory: replaceVars(draft.job?.service_subcategories?.name || template.job_category),
          jobDescription: replaceVars(draft.job?.description || template.job_description),
          priceNote: replaceVars(draft.job?.price_note || template.price_note),
          customerName: "Zákazník",
          workerName: isWorker ? name : undefined,
          urgencyBannerEnabled: template.urgency_banner_enabled ?? false,
          promoBannerEnabled: template.promo_banner_enabled ?? false,
          psFooterEnabled: template.ps_footer_enabled ?? false,
          showJobWidget: template.show_job_widget ?? false,
          showCtaButton: template.show_cta_button ?? true,
        });

        if (result.success) {
          sent_count++;
          if (!targetEmail) {
            await supabaseAdmin.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", draftId);
          }
        } else {
          failed_count++;
        }
      }

      return new Response(JSON.stringify({ sent_count, failed_count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error("[ProcessSniperOutbox] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
