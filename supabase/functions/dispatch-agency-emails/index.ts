// Agency outreach sender.
//  action "run"      – cron (x-atmosferi-cron-token) or admin: sends the next small batch within the daily limit
//  action "send_one" – admin: sends the next e-mail (intro or follow-up) to one lead right now
//  action "test"     – admin: sends a template (or unsaved draft) to the test address with [TEST] in the subject
// All mail goes out over SMTP as michal@atmosferi.com (see SMTP_USER / SMTP_FROM).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.0";
import { sendViaSmtp } from "../_shared/smtp.ts";
import { generateAtmosferiEmailHtml } from "../_shared/EmailTemplateGenerator.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-atmosferi-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Lead = { id: string; company_name: string; contact_name: string | null; email: string; priority: string;
  outreach_status: string; last_contacted_at: string | null; followup_sent_at: string | null; sent_count: number };
type Template = { slug: string; subject: string; body: string };
type Settings = { enabled: boolean; daily_limit: number; followup_enabled: boolean; followup_after_days: number;
  sender_email: string; sender_name: string; test_email: string };

const OPT_OUT = "Pokud od nás nechcete další e-maily, stačí odpovědět „ne“ a už se neozvu.";

function cleanCompany(name: string) {
  const cleaned = name.replace(/\s*\(.*?\)/g, "")
    .replace(/,?\s*\b(s\.?\s*r\.?\s*o\.?|spol\.?\s*s\s*r\.?\s*o\.?|a\.?\s*s\.?|z\.?\s*s\.?|v\.?\s*o\.?\s*s\.?|k\.?\s*s\.?)(?!\w)/gi, "")
    .replace(/[,\s]+$/, "").trim();
  return cleaned || name.trim();
}
function personalize(text: string, lead: Pick<Lead, "company_name" | "contact_name">) {
  const firma = cleanCompany(lead.company_name || "") || "vaší agenturou";
  return text.replace(/\{\{\s*firma\s*\}\}/g, firma).replace(/\{\{\s*jmeno\s*\}\}/g, lead.contact_name || "");
}
// Same light letter as every other Atmosferi e-mail; the signature is part of the template text.
function toHtml(text: string, subject = "") {
  return generateAtmosferiEmailHtml({
    subject, body: text.trim(), language: "cz",
    heroImageEnabled: false, heroImageUrl: "", portfolioEnabled: false, portfolioImages: [],
    icebreakerEnabled: false, icebreakerText: "", signatureEnabled: false, signatureGreeting: "",
    signatureName: "", signatureRole: "", signatureEmail: "michal@atmosferi.com",
    psEnabled: false, psText: "", themeColor: "#0b0b0b", ctaButtonEnabled: false,
  });
}

async function deliver(db: SupabaseClient, s: Settings, opts: {
  lead: Lead | null; kind: "intro" | "followup" | "test"; to: string; subject: string; body: string;
}) {
  const result: { success: boolean; error?: string; messageId?: string; recipientRejected?: boolean } = await sendViaSmtp({
    from: `${s.sender_name} <${s.sender_email}>`, to: opts.to, subject: opts.subject,
    html: toHtml(opts.body, opts.subject), text: opts.body.trim() + "\n\n--\n" + OPT_OUT,
    headers: { "List-Unsubscribe": `<mailto:${s.sender_email}?subject=unsubscribe>` },
  });
  await db.from("agency_outreach_log").insert({
    lead_id: opts.lead?.id || null, kind: opts.kind, email: opts.to, subject: opts.subject,
    status: result.success ? "sent" : "failed", message_id: result.messageId || null,
    error: result.success ? null : result.error,
  });
  if (opts.lead) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (result.success) {
      patch.last_error = null;
      patch.sent_count = (opts.lead.sent_count || 0) + 1;
      if (opts.kind === "intro") { patch.outreach_status = "sent"; patch.last_contacted_at = now; }
      if (opts.kind === "followup") patch.followup_sent_at = now;
    } else {
      patch.last_error = result.error;
      // A hard bounce at RCPT means the address does not exist: never try it again.
      if (result.recipientRejected) patch.outreach_status = "do_not_contact";
    }
    await db.from("agency_outreach_leads").update(patch).eq("id", opts.lead.id);
  }
  return result;
}

function pragueNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague", weekday: "short", hour: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map(p => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday: parts.weekday };
}
const pragueDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date(iso));

async function suppressed(db: SupabaseClient, emails: string[]) {
  if (!emails.length) return new Set<string>();
  const { data } = await db.from("email_recipient_suppression").select("email").in("email", emails.map(e => e.toLowerCase()));
  return new Set((data || []).map((r: { email: string }) => r.email));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return json({ error: "Missing server configuration" }, 500);
  const db = createClient(url, serviceKey);

  // Either the cron token or a signed-in admin.
  let isCron = false, isAdmin = false;
  const cronToken = req.headers.get("x-atmosferi-cron-token");
  if (cronToken) {
    const { data } = await db.rpc("verify_atmosferi_email_cron_token", { p_token: cronToken });
    isCron = data === true;
  }
  const auth = req.headers.get("Authorization");
  if (!isCron && auth?.startsWith("Bearer ")) {
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).single();
      isAdmin = profile?.is_admin === true;
    }
  }
  if (!isCron && !isAdmin) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "run");
  if (isCron && action !== "run") return json({ error: "Forbidden" }, 403);

  const { data: settings, error: sErr } = await db.from("agency_outreach_settings").select("*").eq("id", 1).single();
  if (sErr || !settings) return json({ error: "Nelze načíst agency_outreach_settings: " + (sErr?.message || "řádek chybí") }, 500);
  const s = settings as Settings;
  const { data: tpls } = await db.from("agency_outreach_templates").select("slug,subject,body")
    .in("slug", ["agency-intro-cs", "agency-followup-cs"]);
  const intro = (tpls || []).find((t: Template) => t.slug === "agency-intro-cs") as Template | undefined;
  const followup = (tpls || []).find((t: Template) => t.slug === "agency-followup-cs") as Template | undefined;

  try {
    // ---- Test: always to the fixed test address, never touches a lead.
    if (action === "test") {
      const base = body.slug === "agency-followup-cs" ? followup : intro;
      const subject = String(body.subject ?? base?.subject ?? "");
      const text = String(body.body ?? base?.body ?? "");
      if (!subject || !text) return json({ error: "Šablona je prázdná." }, 400);
      const sample = { company_name: String(body.company_name || "Ukázková agentura s.r.o."), contact_name: null };
      const r = await deliver(db, s, { lead: null, kind: "test", to: s.test_email,
        subject: "[TEST] " + personalize(subject, sample), body: personalize(text, sample) });
      return r.success ? json({ ok: true, to: s.test_email }) : json({ error: r.error }, 502);
    }

    // ---- One lead, right now (admin).
    if (action === "send_one") {
      const { data: lead } = await db.from("agency_outreach_leads").select("*").eq("id", body.lead_id).single();
      if (!lead) return json({ error: "Kontakt nenalezen." }, 404);
      if (["replied", "meeting", "won", "not_interested", "do_not_contact"].includes(lead.outreach_status))
        return json({ error: "Kontakt už odpověděl nebo se nemá oslovovat." }, 409);
      if ((await suppressed(db, [lead.email])).size) return json({ error: "Adresa je na seznamu odhlášených." }, 409);
      const isFollow = ["sent", "opened"].includes(lead.outreach_status);
      if (isFollow && lead.followup_sent_at) return json({ error: "Připomenutí už odešlo." }, 409);
      const tpl = isFollow ? followup : intro;
      if (!tpl) return json({ error: "Chybí šablona." }, 500);
      const r = await deliver(db, s, { lead, kind: isFollow ? "followup" : "intro", to: lead.email,
        subject: personalize(tpl.subject, lead), body: personalize(tpl.body, lead) });
      return r.success ? json({ ok: true, kind: isFollow ? "followup" : "intro" }) : json({ error: r.error }, 502);
    }

    // ---- Scheduled batch.
    if (!s.enabled && isCron) return json({ skipped: "disabled" });
    const now = pragueNow();
    if (isCron && (["Sat", "Sun"].includes(now.weekday) || now.hour < 8 || now.hour >= 17))
      return json({ skipped: "outside_business_hours" });

    const { data: recent } = await db.from("agency_outreach_log").select("sent_at,kind,status")
      .gte("sent_at", new Date(Date.now() - 30 * 3600e3).toISOString()).neq("kind", "test").eq("status", "sent");
    const sentToday = (recent || []).filter((r: { sent_at: string }) => pragueDay(r.sent_at) === now.day).length;
    const remaining = s.daily_limit - sentToday;
    if (remaining <= 0) return json({ skipped: "daily_limit", sent_today: sentToday });
    // Spread the day: ~36 quarter-hour slots between 8 and 17, max 3 per run, no bursts.
    const slotsLeft = Math.max(1, (17 - now.hour) * 4);
    const batch = isCron ? Math.min(3, remaining, Math.max(1, Math.ceil(remaining / slotsLeft))) : Math.min(5, remaining);

    const queue: { lead: Lead; kind: "intro" | "followup"; tpl: Template }[] = [];
    if (s.followup_enabled && followup) {
      const before = new Date(Date.now() - s.followup_after_days * 86400e3).toISOString();
      const { data } = await db.from("agency_outreach_leads").select("*")
        .eq("review_state", "ready").in("outreach_status", ["sent", "opened"]).is("followup_sent_at", null)
        .lt("last_contacted_at", before).order("last_contacted_at").limit(batch);
      (data || []).forEach((lead: Lead) => queue.push({ lead, kind: "followup", tpl: followup }));
    }
    if (queue.length < batch && intro) {
      const { data } = await db.from("agency_outreach_leads").select("*")
        .eq("review_state", "ready").in("outreach_status", ["new", "queued"]).is("last_error", null)
        .order("priority").order("created_at").limit(batch - queue.length);
      (data || []).forEach((lead: Lead) => queue.push({ lead, kind: "intro", tpl: intro }));
    }
    const blocked = await suppressed(db, queue.map(q => q.lead.email));

    let sent = 0, failed = 0;
    for (const item of queue) {
      if (blocked.has(item.lead.email.toLowerCase())) {
        await db.from("agency_outreach_leads").update({ outreach_status: "do_not_contact", updated_at: new Date().toISOString() }).eq("id", item.lead.id);
        continue;
      }
      const r = await deliver(db, s, { lead: item.lead, kind: item.kind, to: item.lead.email,
        subject: personalize(item.tpl.subject, item.lead), body: personalize(item.tpl.body, item.lead) });
      if (r.success) sent++; else failed++;
      await new Promise(res => setTimeout(res, 2500));
    }
    await db.from("agency_outreach_settings").update({
      last_run_at: new Date().toISOString(),
      last_error: failed ? `${failed} e-mail(ů) se nepodařilo odeslat, viz historie.` : null,
    }).eq("id", 1);
    return json({ sent, failed, sent_today: sentToday + sent, queue_empty: queue.length === 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("agency_outreach_settings").update({ last_run_at: new Date().toISOString(), last_error: message }).eq("id", 1);
    return json({ error: message }, 500);
  }
});
