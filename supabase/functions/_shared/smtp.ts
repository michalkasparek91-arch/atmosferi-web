import nodemailer from "npm:nodemailer@7.0.10";

export async function sendViaSmtp(payload: {
  from: string; to: string; subject: string; html: string; bcc?: string;
}) {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER") || Deno.env.get("SMTP_USERNAME");
  const pass = Deno.env.get("SMTP_PASSWORD");
  const port = Number(Deno.env.get("SMTP_PORT") || "465");
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
      from: Deno.env.get("SMTP_FROM") || user,
      replyTo: payload.from,
    });
    if (!result.accepted?.includes(payload.to)) {
      return { success: false, error: "SMTP server nepřijal adresáta." };
    }
    return { success: true, messageId: result.messageId as string };
  } catch (error) {
    // Never include transport configuration or credentials in logs/responses.
    const err = error as { code?: string; responseCode?: number };
    return { success: false, error: `SMTP selhalo (${err.code || "UNKNOWN"}${err.responseCode ? ` / ${err.responseCode}` : ""}).` };
  } finally {
    transport.close();
  }
}
