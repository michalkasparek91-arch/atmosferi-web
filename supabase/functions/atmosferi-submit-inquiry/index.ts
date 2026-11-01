import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BREVO_KEY = Deno.env.get("BREVO_API_KEY") || "";
const ORIGINS = new Set([
  "https://atmosferi.com",
  "https://www.atmosferi.com",
  "https://atmosferi-web.vercel.app",
]);
const SOURCES = new Set(["websites-contact", "visuals-contact", "brief-builder"]);
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
} as Record<string, string>)[c]);
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const emailOk = (v: string) => v.length < 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function reply(origin: string, status: number, data: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://atmosferi.com",
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}
async function hashIP(ip: string) {
  const secret = SERVICE_KEY || "no_service_key";
  const bytes = new TextEncoder().encode(ip + ":" + secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return reply(origin, ORIGINS.has(origin) ? 204 : 403, {});
  if (!ORIGINS.has(origin)) return reply(origin, 403, { error: "origin_not_allowed" });
  if (req.method !== "POST") return reply(origin, 405, { error: "method_not_allowed" });
  if (!URL || !SERVICE_KEY) return reply(origin, 503, { error: "server_unavailable" });

  const length = Number(req.headers.get("content-length") || 0);
  if (length > 18000) return reply(origin, 413, { error: "too_large" });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw Error("Invalid payload");
  } catch { return reply(origin, 400, { error: "invalid_request" }); }

  // Bots generally fill invisible inputs. Return an innocuous response, without sending.
  if (clean(body.website, 100)) return reply(origin, 200, { ok: true });
  const source = clean(body.source, 40);
  if (!SOURCES.has(source)) return reply(origin, 400, { error: "invalid_source" });

  const name = clean(body.name, 160);
  const email = clean(body.email, 250).toLowerCase();
  const message = clean(body.message, 11500);
  const projectType = clean(body.project_type, 100);
  const budgetLabel = clean(body.budget, 90);
  const timeline = clean(body.timeline, 110);
  const startedAt = Number(body.started_at || 0);
  if (!emailOk(email)) return reply(origin, 422, { error: "invalid_email" });
  if (message.length < 10) return reply(origin, 422, { error: "message_too_short" });
  if (startedAt && (Date.now() - startedAt < 1600 || startedAt > Date.now() + 30000)) {
    return reply(origin, 429, { error: "try_again" });
  }

  const db = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = (req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 90);
  const ipHash = await hashIP(ip);
  try {
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const [ipResult, emailResult] = await Promise.all([
      db.from("project_briefs").select("id", { count: "exact", head: true })
        .contains("details", { ip_hash: ipHash }).gte("created_at", hourAgo),
      db.from("project_briefs").select("id", { count: "exact", head: true })
        .eq("email", email).gte("created_at", dayAgo),
    ]);
    if (ipResult.error || emailResult.error) throw Error("rate_limit_query_failed");
    if ((ipResult.count || 0) >= 6 || (emailResult.count || 0) >= 3) {
      return reply(origin, 429, { error: "rate_limited" });
    }

    const extra = body.details && typeof body.details === "object" && !Array.isArray(body.details)
      ? body.details as Record<string, unknown> : {};
    const details = {
      ...(JSON.stringify(extra).length <= 6000 ? extra : { details_omitted: true }),
      source,
      project_type: projectType || null,
      budget_label: budgetLabel || null,
      ip_hash: ipHash,
      origin,
    };
    const budget = typeof body.budget_number === "number" && body.budget_number >= 0
      ? Math.min(Math.round(body.budget_number), 1_000_000_000) : null;
    const mode = source === "visuals-contact" ? "viz" : source === "websites-contact" ? "web" :
      (body.mode === "viz" ? "viz" : "web");
    const record = {
      mode, name: name || null, email, budget, timeline: timeline || null,
      summary: message, details, source, status: "new",
    };
    const { data, error } = await db.from("project_briefs").insert(record).select("id").single();
    if (error || !data?.id) throw Error("database_insert_failed");

    // Store first. Only claim delivery after Brevo has acknowledged the notification.
    if (!BREVO_KEY) {
      console.error("Atmosferi contact notification: BREVO_API_KEY not configured");
      await db.from("project_briefs").update({ status: "notification_failed" }).eq("id", data.id);
      return reply(origin, 503, { error: "notification_unavailable", saved: true, reference: data.id });
    }
    const subject = "[" + (mode === "viz" ? "Visuals" : "Websites") + "] New enquiry · " + (name || email);
    const lines = [
      ["Source", source], ["Name", name], ["Email", email],
      ["Project type", projectType], ["Budget", budgetLabel],
      ["Timeline", timeline], ["Message", message],
    ].filter(([, val]) => !!val).map(([label, val]) =>
      "<p style=\"margin:0 0 14px\"><strong>" + escapeHtml(label) +
      "</strong><br>" + escapeHtml(val).replace(/\n/g, "<br>") + "</p>"
    ).join("");
    const payload = {
      sender: { name: "Atmosferi Website", email: "michal@atmosferi.com" },
      to: [{ email: "info@atmosferi.com", name: "Atmosferi" }],
      replyTo: { email, ...(name ? { name } : {}) },
      subject,
      htmlContent: "<div style=\"font:15px/1.6 Arial,sans-serif;color:#171717\"><h2>New website enquiry</h2>" +
        lines + "<p style=\"color:#777\">Reference: " + escapeHtml(data.id) + "</p></div>",
      textContent: [
        subject, "Source: " + source, "Name: " + name, "Email: " + email,
        "Project type: " + projectType, "Budget: " + budgetLabel,
        "Timeline: " + timeline, "", message, "", "Reference: " + data.id,
      ].join("\n"),
    };
    let sent = false;
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_KEY, "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });
      sent = response.ok;
      if (!sent) console.error("Atmosferi notification rejected by Brevo; HTTP", response.status);
    } catch (e) { console.error("Atmosferi notification network failure", String(e)); }
    await db.from("project_briefs").update({ status: sent ? "notified" : "notification_failed" }).eq("id", data.id);
    if (!sent) return reply(origin, 503, { error: "notification_unavailable", saved: true, reference: data.id });
    return reply(origin, 200, { ok: true, reference: data.id });
  } catch (e) {
    console.error("Atmosferi contact endpoint failed", String(e));
    return reply(origin, 503, { error: "server_unavailable" });
  }
});
