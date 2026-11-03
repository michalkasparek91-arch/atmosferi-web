import nodemailer from "npm:nodemailer@7.0.10";

export function smtpTlsPort(host: string, configured: number) {
  // Migrate the legacy FORPSI submission setting to its implicit-TLS endpoint.
  // Supabase blocks 587; this never falls back to unencrypted SMTP.
  const implicitTlsEndpoint = /(^|\.)forpsi\.(com|cz)\.?$/i.test(host.trim())
    || /^email-smtp\.[a-z0-9-]+\.amazonaws\.com$/i.test(host.trim());
  return configured === 587 && implicitTlsEndpoint ? 465 : configured;
}

export function smtpProviderMessageId(host: string, response: string, fallback: string) {
  // SES notifications use the ID from the SMTP acceptance response, not our MIME Message-ID.
  return /^email-smtp\.[a-z0-9-]+\.amazonaws\.com$/i.test(host.trim())
    ? response.match(/^250\s+Ok\s+([a-z0-9-]+)/i)?.[1] || fallback : fallback;
}

export async function checkSmtpConnection() {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER") || Deno.env.get("SMTP_USERNAME");
  const pass = Deno.env.get("SMTP_PASSWORD");
  const port = smtpTlsPort(host || "", Number(Deno.env.get("SMTP_PORT") || "465"));
  if (!host || !user || !pass) return { success: false, error: "Chybí serverové SMTP údaje." };
  if (port !== 465) return { success: false, error: `SMTP vyžaduje šifrovaný port 465 (server ${host.replace(/[^a-z0-9.:-]/gi, "")}, port ${port}).` };
  const transport = nodemailer.createTransport({ host, port, secure: true, auth: { user, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true } });
  try { await transport.verify(); return { success: true }; }
  catch (error) { const e = error as { code?: string; responseCode?: number }; return { success: false, error: `SMTP kontrola selhala (${e.code || "UNKNOWN"} / ${e.responseCode || 0}).` }; }
  finally { transport.close(); }
}

export async function sendViaSmtp(payload: {
  from: string; to: string; subject: string; html: string; bcc?: string;
}) {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER") || Deno.env.get("SMTP_USERNAME");
  const pass = Deno.env.get("SMTP_PASSWORD");
  const port = smtpTlsPort(host || "", Number(Deno.env.get("SMTP_PORT") || "465"));
  if (!host || !user || !pass) {
    return { success: false, error: "SMTP není nastaveno: chybí SMTP_HOST, SMTP_USER nebo SMTP_PASSWORD." };
  }
  if (port !== 465) {
    return { success: false, error: "SMTP v Supabase vyžaduje šifrovaný port 465 (porty 25 a 587 jsou blokované)." };
  }
  const transport = nodemailer.createTransport({
    host, port, secure: true,
    auth: { user, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  try {
    const result = await transport.sendMail({
      ...payload,
      // FORPSI requires a sender belonging to the authenticated mailbox.
      from: Deno.env.get("SMTP_FROM") || (user.includes("@") ? user : payload.from),
      replyTo: payload.from,
    });
    if (!result.accepted?.includes(payload.to)) {
      return { success: false, error: "SMTP server nepřijal adresáta." };
    }
    return { success: true, messageId: smtpProviderMessageId(host, String(result.response || ""), result.messageId as string) };
  } catch (error) {
    // Never include transport configuration or credentials in logs/responses.
    const err = error as { code?: string; responseCode?: number; command?: string };
    return { success: false, recipientRejected: err.command === "RCPT TO" && Number(err.responseCode) >= 500,
      error: `SMTP selhalo (${err.code || "UNKNOWN"}${err.responseCode ? ` / ${err.responseCode}` : ""}).` };
  } finally {
    transport.close();
  }
}
