// ses.ts — Amazon SES HTTP API transport for Deno Edge Functions
// Uses the official AWS SDK for JavaScript v3

import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses";

export interface SesEmailPayload {
  from: string;       // e.g. "Atmosferi <info@atmosferi.com>" or just "info@atmosferi.com"
  to: string;         // recipient email
  subject: string;
  html: string;       // raw HTML body — passed completely untouched
  replyTo?: string;
}

export async function sendViaSes(payload: SesEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const region = Deno.env.get("AWS_REGION") || "eu-central-1"; // Assume Frankfurt by default

  if (!accessKeyId || !secretAccessKey) {
    console.error("[SES] Missing AWS credentials in environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)");
    return { success: false, error: "Missing AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)" };
  }

  try {
    const client = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new SendEmailCommand({
      Source: payload.from,
      Destination: {
        ToAddresses: [payload.to],
      },
      Message: {
        Subject: {
          Data: payload.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: payload.html,
            Charset: "UTF-8",
          },
        },
      },
      ReplyToAddresses: payload.replyTo ? [payload.replyTo] : undefined,
    });

    const response = await client.send(command);

    console.log(`[SES] Email sent successfully via HTTP API to: ${payload.to}`);
    return { success: true, messageId: response.MessageId };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error(`[SES] Failed to send to ${payload.to}:`, errMsg);

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
