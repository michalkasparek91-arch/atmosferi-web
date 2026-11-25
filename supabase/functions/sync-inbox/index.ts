// Reads the michal@atmosferi.com mailbox over IMAP (read-only, nothing is marked as read)
// and sorts what arrived since the last run:
//   • replies from contacted people  -> email_replies (+ AI sentiment and a suggested answer)
//   • bounces (mailer-daemon)        -> hard bounce blocks the address everywhere
//   • automatic replies              -> kept, but archived
// Everything else in the mailbox (newsletters, invoices, personal mail) is ignored.
// Runs from pg_cron every 10 minutes (x-atmosferi-cron-token) or from the admin.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.0";
import { ImapFlow } from "npm:imapflow@1.0.171";
import PostalMime from "npm:postal-mime@2.4.4";
import { getApiKeys } from "../_shared/api_keys.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-atmosferi-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

const FIRST_RUN_DAYS = 30;
const MAX_PER_RUN = 150;
const OWN = /@atmosferi\.com$/i;
const DAEMON = /(mailer-daemon|postmaster|mail delivery (subsystem|system)|delivery status notification)/i;
const AUTO_SUBJECT = /^(automatic reply|auto(matic)?[- ]?reply|autoreply|out of (the )?office|automatická odpověď|automatische antwort|abwesenheit|absence|réponse automatique|fraværende|poza biurem|nepřítomn)/i;

type Header = { key: string; value: string };
type Parsed = {
  from?: { address?: string; name?: string }; subject?: string; text?: string; html?: string;
  messageId?: string; date?: string; headers?: Header[];
};

function header(p: Parsed, key: string) {
  return (p.headers || []).find(h => h.key.toLowerCase() === key)?.value || "";
}

// Drop the quoted history under a reply so the admin shows what they actually wrote.
function stripQuoted(text: string) {
  const lines = (text || "").replace(/\r/g, "").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const l = line.trim();
    if (/^(On .+wrote:|Dne .+(napsal|napsala)|Am .+schrieb|Le .+a écrit|Den .+skrev|-{2,}\s*(Original Message|Původní zpráva|Ursprüngliche Nachricht)|From:\s|Od:\s|Von:\s|De :\s)/i.test(l)) break;
    if (l.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 8000);
}

// Delivery-status report (RFC 3464) or the plain-text variants of common servers.
function parseBounce(raw: string, p: Parsed) {
  const finals = [...raw.matchAll(/(?:Final|Original)-Recipient:\s*rfc822;\s*<?([^\s<>;]+@[^\s<>;]+)>?/gi)].map(m => m[1].toLowerCase());
  const status = raw.match(/^Status:\s*([245])\.\d{1,3}\.\d{1,3}/im)?.[1];
  const action = raw.match(/^Action:\s*(\w+)/im)?.[1]?.toLowerCase();
  const body = `${p.text || ""}\n${raw.slice(0, 20000)}`;
  const softWords = /(mailbox (is )?full|over quota|quota exceeded|temporar|try again later|delayed|greylist)/i.test(body);
  let hard = status ? status === "5" : action === "failed";
  if (action === "delayed" || status === "4" || (softWords && status !== "5")) hard = false;
  const reason = (raw.match(/^Diagnostic-Code:\s*(.+)$/im)?.[1] || p.subject || "bounce").trim().slice(0, 500);
  return { recipients: [...new Set(finals)], hard, reason };
}

async function contacted(db: SupabaseClient, email: string) {
  const { data: agency } = await db.from("agency_outreach_leads").select("id").eq("email", email)
    .not("outreach_status", "in", "(new,queued)").limit(1);
  if (agency?.length) return true;
  const { data: leads } = await db.from("marketing_leads").select("id").ilike("email", email.replace(/[%_]/g, "\\$&")).limit(5);
  if (!leads?.length) return false;
  const { count } = await db.from("email_outbox").select("id", { count: "exact", head: true })
    .in("lead_id", leads.map((l: { id: string }) => l.id)).in("status", ["sent", "failed"]);
  return (count || 0) > 0;
}

async function blockAddress(db: SupabaseClient, email: string, reason: string) {
  await db.from("email_recipient_suppression").upsert({ email, reason: "mailbox_bounce" }, { onConflict: "email", ignoreDuplicates: true });
  await db.from("agency_outreach_leads").update({ outreach_status: "do_not_contact", last_error: reason, updated_at: new Date().toISOString() }).eq("email", email);
  const { data: leads } = await db.from("marketing_leads").select("id,tags").ilike("email", email.replace(/[%_]/g, "\\$&"));
  for (const l of leads || []) {
    const tags = [...new Set([...(l.tags || []), "email:suppressed", "email:bounced"])];
    await db.from("marketing_leads").update({ outreach_email_ready: false, outreach_import_review: true, tags }).eq("id", l.id);
  }
}

async function classify(db: SupabaseClient, fromName: string, subject: string, text: string) {
  try {
    const keys = await getApiKeys(db);
    const apiKey = keys.GEMINI_API_KEY;
    if (!apiKey) return { sentiment: "other", draft: "" };
    const prompt = `Jsi asistent architekta Michala Kašpárka (Atmosferi°: vizualizace a weby pro architekty, vývoj pro agentury). Přišla odpověď na jeho e-mailové oslovení.
Odesílatel: ${fromName}
Předmět: ${subject}
Text: ${text.slice(0, 4000)}

1. Urči sentiment, přesně jedna hodnota: "interested" (zájem, chce detaily nebo schůzku), "not_now" (teď ne), "unsubscribe" (nechce další e-maily, "ne"), "question" (konkrétní dotaz), "other".
2. Napiš krátký zdvořilý návrh odpovědi ve stejném jazyce, v jakém psal odesílatel. Podepiš se "Michal".
Vrať jen JSON: {"sentiment":"...","draft_reply":"..."}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }),
    });
    if (!res.ok) return { sentiment: "other", draft: "" };
    const out = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    const ok = ["interested", "not_now", "unsubscribe", "question", "other"];
    return { sentiment: ok.includes(parsed.sentiment) ? parsed.sentiment : "other", draft: String(parsed.draft_reply || "") };
  } catch {
    return { sentiment: "other", draft: "" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return json({ error: "Missing server configuration" }, 500);
  const db = createClient(url, serviceKey);

  // Cron token or a signed-in admin.
  let ok = false;
  const token = req.headers.get("x-atmosferi-cron-token");
  if (token) ok = (await db.rpc("verify_atmosferi_email_cron_token", { p_token: token })).data === true;
  const auth = req.headers.get("Authorization");
  if (!ok && auth?.startsWith("Bearer ")) {
    const { data: { user } } = await createClient(url, anonKey, { global: { headers: { Authorization: auth } } }).auth.getUser();
    if (user) ok = (await db.from("profiles").select("is_admin").eq("id", user.id).single()).data?.is_admin === true;
  }
  if (!ok) return json({ error: "Unauthorized" }, 401);

  const host = Deno.env.get("IMAP_HOST"), user = Deno.env.get("IMAP_USER"), pass = Deno.env.get("IMAP_PASSWORD");
  if (!host || !user || !pass) return json({ error: "Chybí IMAP_HOST, IMAP_USER nebo IMAP_PASSWORD." }, 500);

  const { data: state } = await db.from("email_inbox_sync_state").select("*").eq("id", 1).single();
  const stats = { replies: 0, bounces: 0, blocked: 0, auto: 0, skipped: 0, scanned: 0 };
  const client = new ImapFlow({ host, port: Number(Deno.env.get("IMAP_PORT") || 993), secure: true, auth: { user, pass }, logger: false });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const box = client.mailbox as { uidValidity: bigint };
      const validity = Number(box.uidValidity);
      let lastUid = state?.uid_validity && Number(state.uid_validity) === validity ? Number(state.last_uid || 0) : 0;

      let uids: number[];
      if (lastUid > 0) {
        uids = (await client.search({ uid: `${lastUid + 1}:*` }, { uid: true })) || [];
      } else {
        uids = (await client.search({ since: new Date(Date.now() - FIRST_RUN_DAYS * 86400e3) }, { uid: true })) || [];
      }
      uids = uids.filter(u => u > lastUid).sort((a, b) => a - b).slice(0, MAX_PER_RUN);

      if (uids.length) {
        for await (const msg of client.fetch(uids.join(","), { uid: true, source: true }, { uid: true })) {
          stats.scanned++;
          lastUid = Math.max(lastUid, msg.uid);
          const raw = msg.source ? new TextDecoder().decode(msg.source) : "";
          if (!raw) continue;
          const p = (await PostalMime.parse(raw)) as Parsed;
          const from = (p.from?.address || "").toLowerCase();
          const subject = p.subject || "";
          const messageId = p.messageId || `uid-${validity}-${msg.uid}`;
          const receivedAt = p.date ? new Date(p.date).toISOString() : new Date().toISOString();
          const isReport = /multipart\/report/i.test(header(p, "content-type")) || /report-type=delivery-status/i.test(raw.slice(0, 4000));

          // 1) Bounces
          if (DAEMON.test(from) || DAEMON.test(p.from?.name || "") || isReport) {
            const b = parseBounce(raw, p);
            const targets = b.recipients.filter(e => !OWN.test(e));
            for (const email of targets) if (b.hard) { await blockAddress(db, email, b.reason); stats.blocked++; }
            if (targets.length) {
              stats.bounces++;
              await db.from("email_replies").upsert({
                message_id: messageId, kind: "bounce", bounced_email: targets.join(", "), from_email: from || "mailer-daemon",
                from_name: p.from?.name || "Mail Delivery", subject, body_text: (b.hard ? "Trvale nedoručitelné: " : "Dočasně nedoručeno: ") + b.reason,
                ai_sentiment: b.hard ? "bounce" : "soft_bounce", status: "archived", received_at: receivedAt,
              }, { onConflict: "message_id", ignoreDuplicates: true });
            } else stats.skipped++;
            continue;
          }

          // 2) Only people we have actually written to; the rest of the mailbox is none of our business.
          if (!from || OWN.test(from) || !(await contacted(db, from))) { stats.skipped++; continue; }
          const text = stripQuoted(p.text || (p.html || "").replace(/<[^>]+>/g, " "));

          // 3) Automatic replies
          const autoSubmitted = header(p, "auto-submitted");
          const isAuto = (autoSubmitted && autoSubmitted.toLowerCase() !== "no") || !!header(p, "x-autoreply") || !!header(p, "x-autorespond")
            || /auto_reply|auto-reply/i.test(header(p, "precedence")) || AUTO_SUBJECT.test(subject.replace(/^(re|aw|odp|sv|fw|wg):\s*/i, ""));
          if (isAuto) {
            stats.auto++;
            await db.from("email_replies").upsert({
              message_id: messageId, kind: "auto", from_email: from, from_name: p.from?.name || from, subject, body_text: text,
              ai_sentiment: "auto", status: "archived", received_at: receivedAt,
            }, { onConflict: "message_id", ignoreDuplicates: true });
            continue;
          }

          // 4) A real reply
          const { data: exists } = await db.from("email_replies").select("id").eq("message_id", messageId).maybeSingle();
          if (exists) continue;
          const ai = await classify(db, p.from?.name || from, subject, text);
          const { error } = await db.from("email_replies").insert({
            message_id: messageId, kind: "reply", from_email: from, from_name: p.from?.name || from, subject, body_text: text,
            ai_sentiment: ai.sentiment, ai_draft_reply: ai.draft, status: "unread", received_at: receivedAt,
          });
          if (!error) stats.replies++;
          if (ai.sentiment === "unsubscribe") {
            await db.from("email_recipient_suppression").upsert({ email: from, reason: "reply_unsubscribe" }, { onConflict: "email", ignoreDuplicates: true });
          }
        }
      }

      await db.from("email_inbox_sync_state").update({
        uid_validity: validity, last_uid: lastUid, last_run_at: new Date().toISOString(), last_error: null,
        replies_total: (state?.replies_total || 0) + stats.replies,
        bounces_total: (state?.bounces_total || 0) + stats.bounces,
        skipped_total: (state?.skipped_total || 0) + stats.skipped,
      }).eq("id", 1);
    } finally {
      lock.release();
    }
    await client.logout();
    return json({ ok: true, ...stats });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("email_inbox_sync_state").update({ last_run_at: new Date().toISOString(), last_error: message.slice(0, 500) }).eq("id", 1);
    try { client.close(); } catch { /* already closed */ }
    return json({ error: message }, 500);
  }
});
