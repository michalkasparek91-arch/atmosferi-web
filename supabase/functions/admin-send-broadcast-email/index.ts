import { createClient } from "npm:@supabase/supabase-js@2";
import { getVocative } from "../_shared/notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[BroadcastEmail] Invoked at:", new Date().toISOString());

  let bodyData: any = {};
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[BroadcastEmail] Auth: No Bearer token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("[BroadcastEmail] Config: Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    let userId = "system";
    const isServiceRole = authHeader === `Bearer ${serviceKey}`;

    try {
      bodyData = await req.json();
    } catch (e) {
      console.error("[BroadcastEmail] Error parsing JSON:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }

    let {
      mode,
      isTest,
      testEmail,
      templateType,
      subject,
      title,
      body,
      ctaText,
      ctaUrl,
      rawHtml,
      filters,
      sniperJobId,
      sniperEmails,
      isAbTest,
      subjectB,
      variantDistribution,
      campaignId,
      senderEmail,
    } = bodyData;

    if (campaignId) {
      console.log(`[BroadcastEmail] Loading campaign from DB: ${campaignId}`);
      const { data: campaign, error: campaignFetchError } = await supabaseAdmin
        .from("email_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      
      if (campaignFetchError || !campaign) {
        console.error("[BroadcastEmail] DB: Campaign not found", campaignFetchError);
        return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: corsHeaders });
      }

      if (campaign.target_audience === 'sniper') {
        mode = 'sniper';
        sniperJobId = campaign.job_id;
      } else {
        mode = 'broadcast';
      }

      subject = campaign.subject;
      title = campaign.title;
      body = campaign.body;
      ctaText = campaign.cta_text;
      ctaUrl = campaign.cta_url;
      isAbTest = campaign.is_ab_test;
      subjectB = campaign.subject_b;
      variantDistribution = campaign.variant_distribution;
      senderEmail = campaign.sender_email || senderEmail;
      
      filters = campaign.target_filters;
      rawHtml = campaign.content_payload?.rawHtml;
      
      if (mode === 'sniper') {
        sniperEmails = campaign.content_payload?.sniperEmails;
      }
    }

    console.log(`[BroadcastEmail] Request: mode=${mode}, isTest=${isTest || false}, campaignId=${campaignId || "None"}`);

    if (!isServiceRole) {
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await supabaseUser.auth.getUser();

      if (authError || !user) {
        console.error("[BroadcastEmail] Auth: User verification failed", authError);
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      userId = user.id;

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();
      if (profileError || !profile?.is_admin) {
        console.error("[BroadcastEmail] Auth: User is not admin", profileError);
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    if (!rawHtml) {
      console.error("[BroadcastEmail] Error: Missing rawHtml content");
      return new Response(JSON.stringify({ error: "Missing rawHtml (content_payload)" }), { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      console.error("[BroadcastEmail] Brevo: Missing BREVO_API_KEY");
      return new Response(JSON.stringify({ error: "Missing BREVO_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalHtmlTemplate = rawHtml;
    let jobData: any = null;

    if (mode === "sniper") {
      if (!sniperJobId)
        return new Response(JSON.stringify({ error: "Missing sniperJobId" }), { status: 400, headers: corsHeaders });

      const { data: job, error: jobError } = await supabaseAdmin
        .from("jobs")
        .select(`*, service_subcategories(name, category_form), service_categories(name)`)
        .eq("id", sniperJobId)
        .single();

      if (jobError || !job) {
        console.error("[BroadcastEmail] Sniper: Job not found", jobError);
        return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: corsHeaders });
      }
      jobData = job;

      const jTitle = job.title || job.service_subcategories?.name || "Nová zakázka";
      const jCity = job.city || "Neuvedeno";
      const jCategory = job.service_categories?.name || "Služby";
      const jDescSnippet = job.description
        ? job.description.length > 300
          ? job.description.substring(0, 300) + "..."
          : job.description
        : "Bez popisu";
      const jUrl = `https://atmosferi.com/sdilena-zakazka/${job.id}`;
      const jPriceNote = job.price_note || "Není stanovena.";
      const jFullDesc = jDescSnippet; 

      let cName = "Zákazník";
      if (job.customer_id) {
        const { data: custProfile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", job.customer_id)
          .single();
        if (custProfile && custProfile.full_name) cName = custProfile.full_name.split(" ")[0];
      }

      finalHtmlTemplate = finalHtmlTemplate
        .replace(/{{jobTitle}}/g, jTitle)
        .replace(/{{jobCity}}/g, jCity)
        .replace(/{{jobCategory}}/g, jCategory)
        .replace(/{{category_form}}/g, (job.service_subcategories as any)?.category_form || jCategory)
        .replace(/{{jobDescriptionSnippet}}/g, jDescSnippet)
        .replace(/{{jobDescription}}/g, jFullDesc)
        .replace(/{{jobPublicUrl}}/g, jUrl)
        .replace(/{{jobUrl}}/g, jUrl)
        .replace(/{{priceNote}}|{{cena_rozpocet}}|{{rozpocet}}/g, jPriceNote)
        .replace(/{{customerName}}/g, cName);
    }

    let emailsToSend: { email: string; name: string; variant?: "A" | "B"; data?: any }[] = [];

    if (isTest) {
      if (!testEmail)
        return new Response(JSON.stringify({ error: "Missing testEmail" }), { status: 400, headers: corsHeaders });
      emailsToSend = [{ email: testEmail, name: "Test" }];
    } else {
      if (mode === "sniper") {
        emailsToSend = (sniperEmails || []).map((e: string) => ({ email: e, name: "" }));
      } else if (mode === "crm") {
        const { data: crmRecipients, error: crmError } = await supabaseAdmin
          .from("unified_contacts")
          .select("email, full_name, marketing_notifications, engagement_score")
          .eq("marketing_notifications", true)
          .order("engagement_score", { ascending: false })
          .limit(10);

        if (crmError) {
          console.error("[BroadcastEmail] Audience: CRM fetch error", crmError);
          throw crmError;
        }
        emailsToSend = (crmRecipients || []).map((r) => ({
          email: r.email,
          name: r.full_name ? r.full_name.split(" ")[0] : "",
        }));
      } else {
        let query = supabaseAdmin.from("unified_contacts").select("email, full_name, first_name_vocative, city, user_type, is_pro, credits, tags, marketing_notifications");

        query = query.eq("marketing_notifications", true);

        if (filters?.target === "workers") {
          query = query.or("user_type.eq.worker,user_type.eq.both");
        } else if (filters?.target === "customers") {
          query = query.or("user_type.eq.customer,user_type.eq.both");
        } else if (filters?.target === "pro") {
          query = query.eq("is_pro", true);
        }

        if (filters?.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
          query = query.overlaps("tags", filters.tags);
        }

        const { data: dbRecipients, error: recipError } = await query;
        if (recipError) {
          console.error("[BroadcastEmail] Audience: DB fetch error", recipError);
          throw recipError;
        }

        (dbRecipients || []).forEach((r) => {
          emailsToSend.push({ 
            email: r.email, 
            name: r.full_name ? r.full_name.split(" ")[0] : "",
            data: r
          });
        });
      }
    }

    const uniqueEmailsMap = new Map();
    for (const item of emailsToSend) uniqueEmailsMap.set(item.email, item);
    
    const adminEmail = "michal.kasparek91@gmail.com";
    if (!isTest && !uniqueEmailsMap.has(adminEmail)) {
      uniqueEmailsMap.set(adminEmail, { email: adminEmail, name: "Michal" });
    }

    emailsToSend = Array.from(uniqueEmailsMap.values());

    if (emailsToSend.length === 0) {
      if (campaignId) {
        await supabaseAdmin.from("email_campaigns").update({ status: 'completed', recipients_count: 0 }).eq("id", campaignId);
      }
      return new Response(JSON.stringify({ success: true, recipients: 0, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isAbTest) {
      const total = emailsToSend.length;
      const distribution = variantDistribution || 50;
      const countA = Math.round(total * (distribution / 100));
      for (let i = 0; i < total; i++) emailsToSend[i].variant = i < countA ? "A" : "B";
    } else {
      for (let i = 0; i < emailsToSend.length; i++) emailsToSend[i].variant = "A";
    }

    let sentCount = 0;
    let failedCount = 0;

    if (!isTest && !campaignId) {
      const effectiveTarget = mode === "sniper" ? "sniper" : filters?.target || "admin-broadcast";
      console.log(`[BroadcastEmail] Creating campaign: ${subject} for ${effectiveTarget}`);

      const { data: newCampaign, error: campaignError } = await supabaseAdmin
        .from("email_campaigns")
        .insert({
          admin_id: userId,
          subject: subject || (mode === "sniper" ? "Sniper Campaign" : "Bez předmětu"),
          title: title || "Bez nadpisu",
          body: mode === "sniper" ? `Job ID: ${sniperJobId}` : body || "Bez obsahu",
          cta_text: ctaText || null,
          cta_url: ctaUrl || null,
          target_audience: effectiveTarget,
          recipients_count: emailsToSend.length,
          sent_count: 0,
          failed_count: 0,
          is_ab_test: isAbTest || false,
          subject_b: subjectB || null,
          variant_distribution: variantDistribution || 50,
          job_id: mode === "sniper" ? sniperJobId : null,
          status: 'sending',
          target_filters: filters || {},
          content_payload: { rawHtml, sniperEmails }
        })
        .select("id")
        .single();

      if (campaignError) {
        console.error("[BroadcastEmail] DB: Failed to create campaign record", JSON.stringify(campaignError));
      } else if (newCampaign) {
        campaignId = newCampaign.id;
        console.log(`[BroadcastEmail] DB: Campaign record created ID=${campaignId}`);
      }
    }

    // --- 5. BATCH SENDING WITH BREVO ---
    const batchSize = 100;
    const emailLogsData: { campaign_id: string; resend_id: string; ab_variant: string; recipient_email: string }[] = [];

    const fromEmail = senderEmail || "info@atmosferi.com";
    const fromName = "Atmosferi";

    for (let i = 0; i < emailsToSend.length; i += batchSize) {
      const batch = emailsToSend.slice(i, i + batchSize);
      
      const messageVersions = batch.map((recipient) => {
        const userData = (recipient as any).data || {};
        const firstNamePart = recipient.name || '';
        const greetingName = userData.first_name_vocative || getVocative(userData.full_name || firstNamePart);
        
        const replaceAll = (text: string) => {
          if (!text) return text;
          return text
            .replace(/{{workerName}}/g, greetingName)
            .replace(/{{first_name_vocative}}/g, greetingName)
            .replace(/{{first_name}}/g, firstNamePart)
            .replace(/{{full_name}}/g, userData.full_name || recipient.email)
            .replace(/{{city}}/g, userData.city || 'ČR')
            .replace(/{{credits}}/g, String(userData.credits || 0))
            .replace(/{{user_type}}/g, userData.user_type === 'worker' ? 'pracovník' : 'zákazník')
            .replace(/{{unsubscribeUrl}}/g, `${supabaseUrl}/functions/v1/handle-unsubscribe?email=${encodeURIComponent(recipient.email)}`);
        };

        const personalizedHtml = replaceAll(finalHtmlTemplate);
        const effectiveSubject = recipient.variant === "B" ? subjectB : subject;
        let finalSubject = effectiveSubject || (mode === "sniper" ? `Nová zakázka ${jobData?.city ? `v ${jobData.city}` : ""}` : "Zpráva od Atmosferi");

        finalSubject = replaceAll(finalSubject);
        
        if (mode === "sniper" && jobData) {
          const jTitle = jobData.title || jobData.service_subcategories?.name || "Nová zakázka";
          const jCity = jobData.city || "Neuvedeno";
          const jCategory = jobData.service_categories?.name || "Služby";
          const categoryForm = jobData.service_subcategories?.category_form || jCategory;

          finalSubject = finalSubject
            .replace(/{{jobTitle}}/g, jTitle)
            .replace(/{{jobCity}}/g, jCity)
            .replace(/{{jobCategory}}/g, jCategory)
            .replace(/{{category_form}}/g, categoryForm);
        }

        return {
          to: [{ email: recipient.email }],
          subject: finalSubject,
          htmlContent: personalizedHtml,
        };
      });

      console.log(`[BroadcastEmail] Brevo: Sending batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(emailsToSend.length / batchSize)}`);

      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: { name: fromName, email: fromEmail },
            messageVersions: messageVersions,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[BroadcastEmail] Brevo: Batch error", errorText);
          failedCount += batch.length;
        } else {
          const resData = await response.json();
          // For simplicity, assume all in batch succeeded if the API call was 200/201.
          batch.forEach((recipient, idx) => {
            sentCount++;
            if (campaignId) {
              emailLogsData.push({
                campaign_id: campaignId,
                resend_id: resData.messageId || `brevo_${Date.now()}_${idx}`, // Fallback if no array of IDs is returned
                ab_variant: recipient.variant || "A",
                recipient_email: recipient.email,
              });
            }
          });
        }
      } catch (err) {
        console.error("[BroadcastEmail] Brevo: Exception in batch", err);
        failedCount += batch.length;
      }
    }

    if (campaignId) {
      console.log(`[BroadcastEmail] Post: Updating campaign ${campaignId} results (sent=${sentCount}, failed=${failedCount})`);

      await supabaseAdmin
        .from("email_campaigns")
        .update({ 
          sent_count: sentCount, 
          failed_count: failedCount,
          status: failedCount === emailsToSend.length && failedCount > 0 ? 'failed' : 'completed',
          completed_at: new Date().toISOString()
        } as any)
        .eq("id", campaignId);

      if (emailLogsData.length > 0) {
        console.log(`[BroadcastEmail] Post: Inserting ${emailLogsData.length} logs`);
        for (let j = 0; j < emailLogsData.length; j += 100) {
          await supabaseAdmin.from("email_logs").insert(emailLogsData.slice(j, j + 100));
        }
      }
    }

    console.log(`[BroadcastEmail] Done: Sent=${sentCount}, Failed=${failedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        recipients: emailsToSend.length,
        sent: sentCount,
        failed: failedCount,
        campaignId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[BroadcastEmail] FATAL:", error);
    if (bodyData?.campaignId) {
       const supabaseUrl = Deno.env.get("SUPABASE_URL");
       const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
       const supabaseAdmin = createClient(supabaseUrl!, serviceKey!);
       await supabaseAdmin.from("email_campaigns").update({ status: 'failed' }).eq("id", bodyData.campaignId);
    }
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
