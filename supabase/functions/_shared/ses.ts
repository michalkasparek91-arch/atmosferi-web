// ses.ts — Amazon SES SMTP transport for Deno Edge Functions
// Uses denomailer for SMTP/STARTTLS on port 587
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface SesEmailPayload {
  from: string;       // e.g. "Atmosferi <info@atmosferi.com>" or just "info@atmosferi.com"
  to: string;         // recipient email
  subject: string;
  html: string;       // raw HTML body — passed completely untouched
  replyTo?: string;
}

export async function sendViaSes(payload: SesEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const host = Deno.env.get("SMTP_HOST");
  const port = parseInt(Deno.env.get("SMTP_PORT") || "465");
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");

  if (!host || !username || !password) {
    console.error("[SES] Missing SMTP credentials in environment (SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD)");
    return { success: false, error: "Missing SES SMTP credentials in environment variables" };
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: port,
        tls: port === 465, // Use true implicit TLS if port is 465
        auth: {
          username,
          password,
        },
      },
    });

    // Parse from address: "Name <email>" or just "email"
    let fromStr = payload.from;
    
    const sendResult = await client.send({
      from: fromStr,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { inReplyTo: payload.replyTo } : {}),
    });

    await client.close();

    console.log(`[SES] Email sent successfully to: ${payload.to}`);
    return { success: true, messageId: typeof sendResult === "object" ? (sendResult as any)?.messageId : undefined };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error(`[SES] Failed to send to ${payload.to}:`, errMsg);

    // Detect SES sandbox / quota / verification limits
    if (
      errMsg.includes("Daily sending quota exceeded") ||
      errMsg.includes("Maximum sending rate exceeded") ||
      errMsg.includes("Email address is not verified") ||
      errMsg.includes("MessageRejected") ||
      errMsg.includes("Throttling") ||
      errMsg.includes("AccessDenied")
    ) {
      return { success: false, error: `SES Limit: ${errMsg}` };
    }

    return { success: false, error: errMsg };
  }
}
