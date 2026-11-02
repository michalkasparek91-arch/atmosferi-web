import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { validateMailDomain } from "../_shared/mail-domain.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: authorized, error: authError } = await db.rpc("verify_atmosferi_email_cron_token", {
    p_token: req.headers.get("x-atmosferi-cron-token") || "",
  });
  if (authError || authorized !== true) return json({ error: "Unauthorized" }, 401);
  let claimed = false;
  let checked = 0;
  try {
    const { data, error } = await db.rpc("claim_email_validation");
    if (error) throw error;
    if (!data) return json({ skipped: "busy_or_disabled" });
    claimed = true;
    const started = Date.now();
    const { data: pending, error: pendingError } = await db.rpc("pending_email_domains", { max_rows: 200 });
    if (pendingError) throw pendingError;
    for (let i = 0; i < pending.length && Date.now() - started < 40000; i += 10) {
      const results = await Promise.all(pending.slice(i, i + 10).map(async ({ domain }: { domain: string }) => ({
        domain, status: await validateMailDomain(domain),
      })));
      for (const r of results) {
        const { error: saveError } = await db.rpc("apply_email_domain_validation", { p_domain: r.domain, p_status: r.status });
        if (saveError) throw saveError;
        checked++;
      }
    }
    const { error: finishError } = await db.from("email_validation_state").update({
      lease_until: null, last_run_at: new Date().toISOString(), last_error: null, checked_domains: checked,
    }).eq("id", 1);
    if (finishError) throw finishError;
    return json({ checked_domains: checked, remaining_in_batch: pending.length - checked });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (claimed) await db.from("email_validation_state").update({
      lease_until: null, last_run_at: new Date().toISOString(), last_error: message.slice(0, 500), checked_domains: checked,
    }).eq("id", 1);
    return json({ error: message }, 500);
  }
});
