import { createClient } from "npm:@supabase/supabase-js@2";

// Cron-only endpoint. Never accept an anon key or an arbitrary signed-in user.
export async function dispatchAcquisitionEmails(req: Request) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!key || req.method !== "POST" || req.headers.get("Authorization") !== `Bearer ${key}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, key);
  try {
    const { data: state, error } = await db.from("email_dispatch_state").select("*").eq("id", 1).single();
    if (error) throw error;
    if (!state.enabled) return Response.json({ skipped: "disabled" });
    if (state.lease_until && new Date(state.lease_until).getTime() > Date.now()) return Response.json({ skipped: "busy" });
    const { data: remaining, error: budgetError } = await db.rpc("email_dispatch_remaining", { max_daily: state.daily_limit });
    if (budgetError) throw budgetError;
    if (remaining <= 0) return Response.json({ skipped: "daily_limit" });

    const batchesResponse = await fetch(`${url}/functions/v1/campaign-batcher`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_batches" }),
    });
    const batches = await batchesResponse.json();
    if (!batchesResponse.ok || batches.error) throw new Error(batches.error || "Cannot load audiences");
    const templates = (batches.data || []).map((batch: { template: { id: string; category: string; language: string } }) => batch.template)
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));
    const previous = templates.findIndex((t: { id: string }) => t.id === state.last_template_id);
    const ordered = [...templates.slice(previous + 1), ...templates.slice(0, previous + 1)];
    for (const template of ordered) {
      if (!template.category || !template.language) continue;
      const response = await fetch(`${url}/functions/v1/process-sniper-outbox`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_template_batch", template_id: template.id,
          provider: state.provider, batch_limit: Math.min(5, remaining), create_drafts: true }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || `Sender HTTP ${response.status}`);
      const { error: saveError } = await db.from("email_dispatch_state").update({
        last_template_id: template.id, last_run_at: new Date().toISOString(),
        last_error: result.failed_count ? `Selhalo ${result.failed_count} zpráv; zkontrolujte email_outbox.` : null,
      }).eq("id", 1);
      if (saveError) throw saveError;
      // One bounded wave per invocation; cron continues without an open browser.
      if (result.sent_count || result.failed_count) return Response.json(result);
    }
    await db.from("email_dispatch_state").update({ last_run_at: new Date().toISOString(), last_error: null }).eq("id", 1);
    return Response.json({ skipped: "no_audience" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.from("email_dispatch_state").update({ last_run_at: new Date().toISOString(), last_error: message }).eq("id", 1);
    return Response.json({ error: message }, { status: 500 });
  }
}

if (import.meta.main) Deno.serve(dispatchAcquisitionEmails);
