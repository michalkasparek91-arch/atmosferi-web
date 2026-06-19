import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHUNK_SIZE = {
  brevo: 10,
  ses: 2,
} as const;

const SEND_DELAY_MS = {
  brevo: 100,
  ses: 1100,
} as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCzechGender(fullName: string): "M" | "F" {
  if (!fullName) return "M";
  const parts = fullName.trim().split(" ");
  const firstName = parts[0].toLowerCase();
  const lastName = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  if (lastName.endsWith("ová") || lastName.endsWith("á")) return "F";
  if (firstName.endsWith("a") || firstName.endsWith("e") || firstName === "dagmar" || firstName === "miriam") {
    const maleExceptions = ["honza", "míša", "mára", "sáva", "baťa", "přemek", "péťa", "jirka", "tomáša"];
    if (!maleExceptions.includes(firstName)) return "F";
  }
  return "M";
}

function cleanCompanyName(name: string | null | undefined): string {
  if (!name) return "";
  let cleaned = name.replace(/\b(spol\.?\s*s\.?\s*r\.?\s*o\.?|s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|gmbh|gbr|ltd|inc|llc|mbh|ug|ag|k\.?\s*s\.?|v\.?\s*o\.?\s*s\.?|e\.?\s*v\.?|kgaa|ohg|kg|partg)(?!\w)/gi, "").trim();
  cleaned = cleaned.replace(/\s*&\s*co\.?\s*/gi, "").trim();
  cleaned = cleaned.replace(/,\s*$/, "").trim();

  if (cleaned === cleaned.toUpperCase() && cleaned.match(/[A-Z]/)) {
    cleaned = cleaned.split(" ").map((word: string) => {
      if (word.length > 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    }).join(" ");
  }
  return cleaned;
}

async function fetchAllOutboxLeadIds(
  supabaseAdmin: SupabaseClient,
  templateSlug: string,
): Promise<string[]> {
  const allLeadIds: string[] = [];
  let from = 0;
  const limit = 1000;

  while (true) {
    const { data } = await supabaseAdmin
      .from("email_outbox")
      .select("lead_id")
      .eq("template_slug", templateSlug)
      .not("lead_id", "is", null)
      .range(from, from + limit - 1);

    if (!data || data.length === 0) break;
    allLeadIds.push(...data.map((o: { lead_id: string }) => o.lead_id));
    if (data.length < limit) break;
    from += limit;
  }

  return allLeadIds;
}

async function ensureDraftsForTemplate(
  supabaseAdmin: SupabaseClient,
  template: Record<string, any>,
  limit: number,
): Promise<number> {
  const excludedLeadIds = await fetchAllOutboxLeadIds(supabaseAdmin, template.slug);

  let langFilter = [template.language];
  if (template.language === "cs" || template.language === "cz") {
    langFilter = ["cs", "cz", "sk"];
  }

  const { data: availableLeads, error: leadsErr } = await supabaseAdmin
    .from("marketing_leads")
    .select("*")
    .eq("category", template.category)
    .in("language", langFilter);

  if (leadsErr) throw leadsErr;

  const leadsToProcess = (availableLeads || [])
    .filter((l: { id: string }) => !excludedLeadIds.includes(l.id))
    .slice(0, limit);

  if (leadsToProcess.length === 0) return 0;

  const outboxInserts = leadsToProcess.map((lead: Record<string, any>) => ({
    template_slug: template.slug,
    lead_id: lead.id,
    status: "draft",
    icebreaker: lead.ai_icebreaker || "Zaujala mě vaše práce.",
  }));

  const { error: upsertErr } = await supabaseAdmin
    .from("email_outbox")
    .insert(outboxInserts);

  if (upsertErr) throw upsertErr;
  return leadsToProcess.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceCall = token === serviceKey;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    if (!isServiceCall) {
      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    const {
      action,
      draftIds,
      targetEmail,
      template_id,
      batch_limit,
      provider: rawProvider,
      create_drafts,
    } = await req.json();

    const provider = rawProvider === "ses" ? "ses" : "brevo";
    const chunkSize = CHUNK_SIZE[provider];

    let resolvedDraftIds = draftIds;

    if (action === "send_template_batch") {
      if (!template_id) throw new Error("Missing template_id");

      const { data: template, error: templateErr } = await supabaseAdmin
        .from("email_templates")
        .select("*")
        .eq("id", template_id)
        .single();

      if (templateErr || !template) {
        throw new Error(`Template not found: ${templateErr?.message || template_id}`);
      }

      const requestedBatchSize = batch_limit || 300;

      if (create_drafts !== false) {
        const created = await ensureDraftsForTemplate(supabaseAdmin, template, requestedBatchSize);
        console.log(`[send_template_batch] Ensured ${created} new drafts for template ${template.slug}`);
      }

      const { data: draftsToSend, error: fetchDraftsErr } = await supabaseAdmin
        .from("email_outbox")
        .select("id")
        .eq("template_slug", template.slug)
        .eq("status", "draft")
        .order("created_at", { ascending: true })
        .limit(requestedBatchSize);

      if (fetchDraftsErr) throw fetchDraftsErr;
      if (!draftsToSend || draftsToSend.length === 0) {
        return new Response(JSON.stringify({
          sent_count: 0,
          failed_count: 0,
          has_more: false,
          message: "No drafts found — check that leads exist for this template category/language.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      resolvedDraftIds = draftsToSend.map((d: { id: string }) => d.id);
      console.log(`[send_template_batch] Found ${resolvedDraftIds.length} drafts for template ${template.slug}, sending chunk of ${chunkSize}`);
    }

    if (action === "send_selected_drafts" || action === "send_template_batch") {
      if (!resolvedDraftIds || !Array.isArray(resolvedDraftIds)) {
        throw new Error("Missing draftIds");
      }

      const idsThisRun = action === "send_template_batch"
        ? resolvedDraftIds.slice(0, chunkSize)
        : resolvedDraftIds;

      let sent_count = 0;
      let failed_count = 0;
      let quotaHit = false;
      let quotaMessage: string | undefined;

      for (let i = 0; i < idsThisRun.length; i++) {
        const draftId = idsThisRun[i];

        await sleep(SEND_DELAY_MS[provider]);

        const { data: draft, error: fetchErr } = await supabaseAdmin
          .from("email_outbox")
          .select(`
            *,
            template:email_templates!email_outbox_template_slug_fkey(*),
            lead:marketing_leads(*),
            worker:profiles(*),
            job:jobs(title, city, description, budget_min, budget_max, price_note, service_subcategories(name, category_form))
          `)
          .eq("id", draftId)
          .single();

        if (fetchErr || !draft) {
          console.error(`[send] Failed to load draft ${draftId}:`, fetchErr?.message);
          failed_count++;
          continue;
        }

        const template = draft.template || {};
        const recipientEmail = targetEmail || draft.worker?.email || draft.lead?.email;
        if (!recipientEmail) {
          failed_count++;
          continue;
        }

        let personName = draft.worker?.full_name || draft.lead?.decision_maker_name;
        if (personName?.trim().toLowerCase() === "studio") {
          personName = null;
        }
        const companyName = cleanCompanyName(draft.lead?.company_name || draft.lead?.full_name);

        let filters: Record<string, unknown> = {};
        if (typeof template.segment_filters === "string") {
          try { filters = JSON.parse(template.segment_filters); } catch { /* ignore */ }
        } else if (template.segment_filters && typeof template.segment_filters === "object") {
          filters = template.segment_filters;
        }

        let jmenoValue = "Neznámý";
        let osloveniValue = "Neznámý";

        if (personName) {
          jmenoValue = personName;
          osloveniValue = personName.split(" ")[0];
          
          const gender = getCzechGender(jmenoValue);
          const formatStr = gender === "M" 
             ? (filters.osloveni_format_m || filters.osloveni_format) 
             : (filters.osloveni_format_f || filters.osloveni_format); // Fallback to generic if missing

          if (formatStr) {
            osloveniValue = (formatStr as string)
              .replace(/\{value\}|\{\{jmeno\}\}/gi, jmenoValue)
              .replace(/\{\{osloveni\}\}/gi, osloveniValue);
          }
        } else if (companyName) {
          const lang = template.language || "cz";
          const fallbackTemplate = filters?.jmeno_fallback as string | undefined;
          if (fallbackTemplate) {
            jmenoValue = fallbackTemplate.replace(/{{firma}}|{{studio}}/g, companyName);
            osloveniValue = jmenoValue;
          } else if (lang === "de") {
            jmenoValue = `liebes Team von ${companyName}`;
            osloveniValue = "týme";
          } else if (lang === "en") {
            jmenoValue = `Team at ${companyName}`;
            osloveniValue = "team";
          } else {
            jmenoValue = `týme z ${companyName}`;
            osloveniValue = "týme";
          }
        }
        const isWorker = !!draft.worker;

        const isCompanyOnly = !personName && !!companyName;
        const activeBody = (isCompanyOnly && filters.body_fallback)
          ? (filters.body_fallback as string)
          : (template.body || "");

        const bodyWithIcebreaker = draft.icebreaker
          ? (activeBody.includes("{{icebreaker}}")
            ? activeBody.replace(/{{icebreaker}}/g, draft.icebreaker)
            : `${draft.icebreaker}\n\n${activeBody}`)
          : activeBody;

        const replaceVars = (txt: string | null | undefined) => {
          if (!txt) return "";
          const projektValue = draft.lead?.last_project 
            ? (filters.project_format as string ? (filters.project_format as string).replace(/\{value\}|\{\{projekt\}\}/gi, draft.lead.last_project) : draft.lead.last_project)
            : ((filters.project_fallback as string) || "Váš projekt");

          let replaced = txt
            .replace(/{{osloveni}}/g, osloveniValue)
            .replace(/{{jmeno}}/g, jmenoValue)
            .replace(/{{mesto_v_meste}}/g, draft.job?.city ? `v ${draft.job.city}` : "v okolí")
            .replace(/{{mesto}}/g, draft.job?.city || "Vaše město")
            .replace(/{{obor_2pad}}|{{podkategorie_2pad}}/g, draft.job?.service_subcategories?.category_form || "oboru")
            .replace(/{{obor}}/g, draft.job?.service_subcategories?.name || "Řemeslo")
            .replace(/{{nazev_zakazky}}/g, draft.job?.title || "Nová zakázka")
            .replace(/{{popis_zakazky}}/g, draft.job?.description || "")
            .replace(/{{cena_rozpocet}}|{{rozpocet}}/g, draft.job?.price_note || "Není stanovena")
            .replace(/{{zakaznik}}/g, "Zákazník")
            .replace(/{{projekt}}/g, projektValue)
            .replace(/{{firma}}|{{studio}}/g, companyName || name || "Vaše studio")
            .replace(/{{odkaz_zakazky}}/g, template.cta_url || "https://zrobee.cz");

          replaced = replaced.replace(/Guten Tag liebes Team/gi, "Guten Tag, liebes Team");
          replaced = replaced.replace(/Hallo liebes Team/gi, "Hallo, liebes Team");
          return replaced;
        };

        let currentProvider = provider;
        let providersTried = 0;
        let success = false;
        let lastError = "";
        let finalMessageId: string | undefined;
        let finalHtml: string | undefined;

        while (providersTried < 2 && !success) {
          providersTried++;

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
            psFooterText: template.ps_footer_text ?? (filters.ps_footer_text as string),
            showJobWidget: template.show_job_widget ?? false,
            showCtaButton: template.show_cta_button ?? true,
            signatureGreeting: (filters.signature_greeting as string) || template.signature_greeting,
            signatureRole: (filters.signature_role as string) || template.signature_role,
            signatureEmail: (filters.signature_email as string) || template.signature_email,
            heroCaption: (filters.hero_caption as string) || template.hero_caption,
            heroTagline: (filters.hero_tagline as string) || template.hero_tagline,
            segmentFilters: filters,
            provider: currentProvider,
          });

          if (result.success) {
            success = true;
            finalMessageId = result.messageId;
            finalHtml = result.html;
          } else {
            lastError = String(result.error);
            const errStr = lastError.toLowerCase();
            const isQuota = errStr.includes("quota") || errStr.includes("limit") || errStr.includes("429") || errStr.includes("too many") || errStr.includes("plan") || errStr.includes("throttl") || errStr.includes("rate") || errStr.includes("credit");

            if (isQuota) {
              console.log(`[ProcessSniperOutbox] Quota hit for ${currentProvider}: ${lastError}. Falling back...`);
              if (providersTried < 2) {
                currentProvider = currentProvider === "ses" ? "brevo" : "ses";
                await sleep(SEND_DELAY_MS[currentProvider]);
              } else {
                quotaHit = true;
                quotaMessage = lastError;
              }
            } else {
              break; // Not a quota error, break and fail this draft
            }
          }
        }

        if (success) {
          sent_count++;
          if (!targetEmail) {
            let htmlArchiveUrl = null;
            if (finalHtml) {
              const filename = `${draftId}.html`;
              const { error: uploadError } = await supabaseAdmin.storage
                .from("email_archive")
                .upload(filename, finalHtml, { contentType: "text/html", upsert: true });
              if (!uploadError) {
                const { data } = supabaseAdmin.storage.from("email_archive").getPublicUrl(filename);
                htmlArchiveUrl = data.publicUrl;
              } else {
                console.error("[ProcessSniperOutbox] Failed to upload HTML archive:", uploadError);
              }
            }

            await supabaseAdmin.from("email_outbox").update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider: currentProvider,
              provider_message_id: finalMessageId,
              delivery_status: "sent",
              html_archive_url: htmlArchiveUrl,
            }).eq("id", draftId);
          }
        } else if (quotaHit) {
          break; // Break the outer loop for the chunk
        } else {
          // Hard fail for this draft (e.g. invalid email)
          failed_count++;
          if (!targetEmail) {
            await supabaseAdmin.from("email_outbox").update({
              status: "failed",
              // We can't easily add an error_message column if it doesn't exist, but changing status is enough to prevent infinite loop.
            }).eq("id", draftId);
          }
        }
      }

      let remainingDrafts = 0;
      if (action === "send_template_batch" && template_id) {
        const { data: templateRow } = await supabaseAdmin
          .from("email_templates")
          .select("slug")
          .eq("id", template_id)
          .single();

        if (templateRow?.slug) {
          const { count } = await supabaseAdmin
            .from("email_outbox")
            .select("id", { count: "exact", head: true })
            .eq("template_slug", templateRow.slug)
            .eq("status", "draft");
          remainingDrafts = count || 0;
        }
      }

      if (quotaHit) {
        return new Response(JSON.stringify({
          sent_count,
          failed_count: failed_count + remainingDrafts,
          has_more: remainingDrafts > 0,
          error: `Odesílání přerušeno: Dosažen limit e-mailů (${quotaMessage}). Zbývající e-maily zůstaly v konceptech.`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        sent_count,
        failed_count,
        has_more: remainingDrafts > 0,
        remaining: remainingDrafts,
        chunk_size: chunkSize,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error("[ProcessSniperOutbox] Unhandled error:", err?.message, err?.stack);
    return new Response(JSON.stringify({
      error: err?.message || String(error),
      stack: err?.stack?.split("\n").slice(0, 5).join("\n"),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
