import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { checkSmtpConnection } from "../_shared/smtp.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Missing server configuration" }, 500);

  const db = createClient(supabaseUrl, serviceKey);
  const secret = req.headers.get("x-atmosferi-cron-token") || "";
  const { data: authorized, error: authError } = await db.rpc("verify_atmosferi_email_cron_token", { p_token: secret });
  if (authError || authorized !== true) return json({ error: "Unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  // Authenticated diagnostics never sends a message or changes the sending switch.
  if (body.action === "check_smtp") return json(await checkSmtpConnection());

  try {
    const { data: state, error: stateError } = await db.from("email_dispatch_state").select("*").eq("id", 1).single();
    if (stateError || !state) throw stateError || new Error("Missing email_dispatch_state");
    if (!state.enabled) return json({ skipped: "disabled" });
    if (state.safety_paused) return json({ skipped: "delivery_safety_pause" });
    if (state.lease_until && new Date(state.lease_until).getTime() > Date.now()) return json({ skipped: "busy" });

    // Outbound campaigns only during Czech/European daytime. Never blast at night.
    const localHour = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Prague", hour: "2-digit", hourCycle: "h23",
    }).format(new Date()));
    if (localHour < 8 || localHour >= 19) return json({ skipped: "outside_business_hours" });

    const { data: remaining, error: budgetError } = await db.rpc("email_dispatch_remaining", { max_daily: state.daily_limit });
    if (budgetError) throw budgetError;
    if (Number(remaining) <= 0) return json({ skipped: "daily_limit" });

    // Only opt-in-for-automation templates, NOT every active manual campaign.
    const { data: templates, error: templateError } = await db.from("email_templates")
      .select("id,slug,category,language")
      .eq("is_enabled", true)
      .eq("trigger_type", "cron")
      .order("id", { ascending: true });
    if (templateError) throw templateError;
    const eligible = (templates || []).filter(t => t.category && t.language);
    if (eligible.length === 0) return json({ skipped: "no_automated_templates" });

    const previous = eligible.findIndex(t => t.id === state.last_template_id);
    const ordered = [...eligible.slice(previous + 1), ...eligible.slice(0, previous + 1)];

    for (const template of ordered) {
      const response = await fetch(supabaseUrl + "/functions/v1/process-sniper-outbox", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + serviceKey, "apikey": serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_template_batch", template_id: template.id,
          provider: state.provider, batch_limit: Math.min(state.provider === "smtp" ? 1 : 5, Number(remaining)),
          create_drafts: true,
          require_recipient_evidence: true,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        // A missing audience is signalled as an empty batch; other errors must be visible.
        throw new Error(String(result.error || "Sender HTTP " + response.status));
      }
      const update = {
        last_template_id: template.id,
        last_run_at: new Date().toISOString(),
        last_error: result.failed_count ? "Failed messages: " + result.failed_count + "; inspect email_outbox." : null,
      };
      const { error: saveError } = await db.from("email_dispatch_state").update(update).eq("id", 1).eq("safety_paused", false);
      if (saveError) throw saveError;
      if (result.sent_count || result.failed_count || result.review_count) return json({
        sent_count: result.sent_count || 0,
        failed_count: result.failed_count || 0,
        review_count: result.review_count || 0,
        template_slug: template.slug,
      });
    }
    return json({ skipped: "no_audience" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("email_dispatch_state").update({
      last_run_at: new Date().toISOString(), last_error: message.slice(0, 1000),
    }).eq("id", 1).eq("safety_paused", false);
    console.error("dispatch-acquisition-emails:", message);
    return json({ error: message }, 500);
  }
});
