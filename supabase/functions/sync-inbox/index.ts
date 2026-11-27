// Reads the michal@atmosferi.com mailbox over IMAP (read-only, nothing is marked as read)
// and sorts what arrived since the last run:
//   • replies from contacted people  -> email_replies (+ AI sentiment and a suggested answer)
//   • bounces (mailer-daemon)        -> hard bounce blocks the address everywhere
//   • automatic replies              -> kept, but archived
// Everything else in the mailbox (newsletters, invoices, personal mail) is ignored.
// Runs from pg_cron every 10 minutes (x-atmosferi-cron-token) or from the admin.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.0";
import { MiniImap } from "../_shared/mini-imap.ts";
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
const MAX_PER_RUN = 120;     // headers only; full messages are downloaded just for bounces and replies
const TIME_BUDGET_MS = 60_000; // stop early and save progress well before the edge function limit
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

// Which of these senders have we actually written to? One batch of queries per run
// (exact matches, so the big marketing_leads table is never scanned).
async function contactedSet(db: SupabaseClient, emails: string[]) {
  const out = new Set<string>();
  const list = [...new Set(emails.filter(Boolean))];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const { data: agency } = await db.from("agency_outreach_leads").select("email")
      .in("email", chunk).not("outreach_status", "in", "(new,queued)");
    (agency || []).forEach((r: { email: string }) => out.add(r.email.toLowerCase()));
    const { data: leads } = await db.from("marketing_leads").select("id,email").in("email", chunk);
    const ids = (leads || []).map((l: { id: string }) => l.id);
    if (ids.length) {
      const { data: sent } = await db.from("email_outbox").select("lead_id").in("lead_id", ids).in("status", ["sent", "failed"]);
      const sentIds = new Set((sent || []).map((r: { lead_id: string }) => r.lead_id));
      (leads || []).forEach((l: { id: string; email: string }) => { if (sentIds.has(l.id)) out.add(l.email.toLowerCase()); });
    }
  }
  return out;
}

async function blockAddress(db: SupabaseClient, email: string, reason: string) {
  await db.from("email_recipient_suppression").upsert({ email, reason: "mailbox_bounce" }, { onConflict: "email", ignoreDuplicates: true });
  await db.from("agency_outreach_leads").update({ outreach_status: "do_not_contact", last_error: reason, updated_at: new Date().toISOString() }).eq("email", email);
  const { data: leads } = await db.from("marketing_leads").select("id,tags").eq("email", email);
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
  const rescan = !token && (await req.clone().json().catch(() => ({}))).rescan === true;

  const host = Deno.env.get("IMAP_HOST"), user = Deno.env.get("IMAP_USER"), pass = Deno.env.get("IMAP_PASSWORD");
  if (!host || !user || !pass) return json({ error: "Chybí IMAP_HOST, IMAP_USER nebo IMAP_PASSWORD." }, 500);

  const { data: state } = await db.from("email_inbox_sync_state").select("*").eq("id", 1).single();
  // Breadcrumbs: if the platform stops the function mid-run, the admin still sees how far it got.
  const step = (text: string) => db.from("email_inbox_sync_state").update({ last_error: `Probíhá: ${text}` }).eq("id", 1);
  await step("připojuji se ke schránce");
  const stats = { replies: 0, bounces: 0, blocked: 0, auto: 0, skipped: 0, scanned: 0, more: false };
  const client = new MiniImap(25_000);

  try {
    await client.connect(host, Number(Deno.env.get("IMAP_PORT") || 993), Deno.env.get("IMAP_TLS") !== "0");
    await client.login(user, pass);
    await step("přihlášeno, otevírám INBOX");
    const validity = await client.examine("INBOX");   // read-only: nothing gets marked as read
    {
      let lastUid = state?.uid_validity && Number(state.uid_validity) === validity ? Number(state.last_uid || 0) : 0;
      if (rescan) lastUid = 0;   // admin asked to go through the last 30 days again (duplicates are ignored)

      let uids = lastUid > 0
        ? await client.searchUids(`UID ${lastUid + 1}:*`)
        : await client.searchUids(`SINCE ${MiniImap.since(new Date(Date.now() - FIRST_RUN_DAYS * 86400e3))}`);
      uids = uids.filter(u => u > lastUid).slice(0, MAX_PER_RUN);
      const deadline = Date.now() + TIME_BUDGET_MS;

      await step(`čtu hlavičky ${uids.length} zpráv`);
      // Pass 1: only From and Subject (small, fast).
      type Meta = { uid: number; from: string; name: string; subject: string };
      const metas: Meta[] = [];
      const heads = await client.fetchBodies(uids, "BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)]");
      for (const uid of uids) {
        const h = heads.get(uid);
        const hp = h ? ((await PostalMime.parse(new Uint8Array([...h, 13, 10, 13, 10]))) as unknown as Parsed) : {};
        metas.push({ uid, from: String(hp.from?.address || "").toLowerCase(), name: String(hp.from?.name || ""), subject: String(hp.subject || "") });
      }
      const known = await contactedSet(db, metas.map(m => m.from).filter(f => f && !OWN.test(f) && !DAEMON.test(f)));
      const isDaemonMeta = (m: Meta) => DAEMON.test(m.from) || DAEMON.test(m.name)
        || /delivery status notification|undeliver|nedoručiteln|unzustellbar|returned mail/i.test(m.subject);
      const wantedCount = metas.filter(m => isDaemonMeta(m) || known.has(m.from)).length;

      // Pass 2: bounces and messages from people we wrote to, downloaded 10 at a time
      // (first 200 kB of each: headers and text, never the big attachments).
      let sources = new Map<number, Uint8Array>();
      let done = 0;
      for (let idx = 0; idx < metas.length; idx++) {
        const meta = metas[idx];
        if (Date.now() > deadline) break;
        const wantedMeta = isDaemonMeta(meta) || known.has(meta.from);
        if (!wantedMeta) { stats.scanned++; stats.skipped++; lastUid = meta.uid; continue; }
        if (!sources.has(meta.uid)) {
          const batch = metas.slice(idx).filter(m => isDaemonMeta(m) || known.has(m.from)).slice(0, 10).map(m => m.uid);
          await db.from("email_inbox_sync_state").update({
            uid_validity: validity, last_uid: lastUid, last_error: `Probíhá: stahuji zprávy ${done + 1}–${done + batch.length} z ${wantedCount}`,
          }).eq("id", 1);
          sources = await client.fetchBodies(batch, "BODY.PEEK[]<0.200000>");
        }
        const bytes = sources.get(meta.uid);
        stats.scanned++;
        lastUid = meta.uid;
        done++;
        if (!bytes || !bytes.length) { stats.skipped++; continue; }
        const isDaemon = isDaemonMeta(meta);
        const raw = new TextDecoder().decode(bytes);
        // Parse the original bytes so every charset (UTF-8, ISO-8859-2, Windows-1250) decodes correctly.
        const p = (await PostalMime.parse(bytes)) as unknown as Parsed;
        const from = (p.from?.address || meta.from).toLowerCase();
        const subject = p.subject || meta.subject;
        const messageId = p.messageId || `uid-${validity}-${meta.uid}`;
        const receivedAt = p.date ? new Date(p.date).toISOString() : new Date().toISOString();
        const isReport = /multipart\/report/i.test(header(p, "content-type")) || /report-type=delivery-status/i.test(raw.slice(0, 4000));

        // 1) Bounces
        if (isDaemon || isReport) {
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
        } else {
          const text = stripQuoted(p.text || (p.html || "").replace(/<[^>]+>/g, " "));
          // 2) Automatic replies
          const autoSubmitted = header(p, "auto-submitted");
          const isAuto = (autoSubmitted && autoSubmitted.toLowerCase() !== "no") || !!header(p, "x-autoreply") || !!header(p, "x-autorespond")
            || /auto_reply|auto-reply/i.test(header(p, "precedence")) || AUTO_SUBJECT.test(subject.replace(/^(re|aw|odp|sv|fw|wg):\s*/i, ""));
          if (isAuto) {
            stats.auto++;
            await db.from("email_replies").upsert({
              message_id: messageId, kind: "auto", from_email: from, from_name: p.from?.name || from, subject, body_text: text,
              ai_sentiment: "auto", status: "archived", received_at: receivedAt,
            }, { onConflict: "message_id", ignoreDuplicates: true });
          } else {
            // 3) A real reply
            const { data: exists } = await db.from("email_replies").select("id").eq("message_id", messageId).maybeSingle();
            if (!exists) {
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
        }
      }
      stats.more = (metas.length > 0 && lastUid < metas[metas.length - 1].uid) || uids.length === MAX_PER_RUN;

      await db.from("email_inbox_sync_state").update({
        uid_validity: validity, last_uid: lastUid, last_run_at: new Date().toISOString(), last_error: null,
        replies_total: (state?.replies_total || 0) + stats.replies,
        bounces_total: (state?.bounces_total || 0) + stats.bounces,
        skipped_total: (state?.skipped_total || 0) + stats.skipped,
      }).eq("id", 1);
    }
    await client.logout();
    return json({ ok: true, ...stats });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("email_inbox_sync_state").update({ last_run_at: new Date().toISOString(), last_error: message.slice(0, 500) }).eq("id", 1);
    client.close();
    return json({ error: message }, 500);
  }
});
