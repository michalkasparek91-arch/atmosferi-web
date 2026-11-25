import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let supabase: any;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let bodyText = await req.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    console.log("SNS Webhook received:", body.Type);

    if (body.Type === "SubscriptionConfirmation") {
      // Confirm the SNS subscription
      console.log("Confirming SNS subscription:", body.SubscribeURL);
      await fetch(body.SubscribeURL);
      return new Response("Subscription confirmed", { status: 200, headers: corsHeaders });
    }

    if (body.Type === "Notification") {
      let message;
      try {
        message = JSON.parse(body.Message);
      } catch {
        return new Response("Invalid Message JSON", { status: 400 });
      }

      const notificationType = message.notificationType; // Delivery, Bounce, Complaint
      const mail = message.mail;
      if (!mail || !mail.messageId) {
        return new Response("No messageId found", { status: 400 });
      }

      // SES message IDs usually look like: 0107018c1b2c3d4e-1234abcd-1234-abcd-1234-abcd1234abcd-000000@eu-central-1.amazonses.com
      // Our nodemailer implementation returns messageId WITH angle brackets: <0107018c1b2c3d4e...amazonses.com>
      // We must strip angle brackets for comparison or keep them. Nodemailer gives `<ID>`. Amazon SNS gives `ID`.
      const rawMessageId = mail.messageId;
      const bracketMessageId = `<${rawMessageId}>`;

      let newStatus = null;
      if (notificationType === "Delivery") {
        newStatus = "delivered";
      } else if (notificationType === "Bounce") {
        newStatus = message.bounce?.bounceType === "Transient" ? "deferred" : "bounced";
      } else if (notificationType === "Complaint") {
        newStatus = "spam";
      }

      if (newStatus) {
        // We check for both forms of message ID because nodemailer adds brackets
        const reason = notificationType === "Bounce"
          ? String(message.bounce?.bouncedRecipients?.[0]?.diagnosticCode || message.bounce?.bounceSubType || "SES bounce").slice(0,1000)
          : notificationType === "Complaint" ? "SES complaint" : null;
        let update = supabase
          .from("email_outbox")
          .update({ delivery_status: newStatus, ...(reason ? { error_message: reason } : {}) })
          .in("provider_message_id", [rawMessageId, bracketMessageId]);
        if (newStatus === "delivered" || newStatus === "deferred") update = update.not("delivery_status", "in", "(bounced,spam,unsubscribed)");
        const { error: outboxError } = await update;

        if (outboxError) {
          console.error("Failed to update email_outbox:", outboxError);
          throw outboxError;
        }

        // A permanent bounce or a complaint retires the address everywhere,
        // including agency outreach (sent over SES SMTP, not tracked in email_outbox).
        const hard = (notificationType === "Bounce" && message.bounce?.bounceType === "Permanent") || notificationType === "Complaint";
        if (hard) {
          const recipients: string[] = (notificationType === "Bounce"
            ? (message.bounce?.bouncedRecipients || []) : (message.complaint?.complainedRecipients || []))
            .map((r: { emailAddress?: string }) => String(r.emailAddress || "").trim().toLowerCase()).filter(Boolean);
          for (const email of recipients) {
            await supabase.from("email_recipient_suppression")
              .upsert({ email, reason: notificationType === "Bounce" ? "ses_hard_bounce" : "ses_complaint" }, { onConflict: "email", ignoreDuplicates: true });
            await supabase.from("agency_outreach_leads")
              .update({ outreach_status: "do_not_contact", last_error: reason, updated_at: new Date().toISOString() })
              .eq("email", email);
          }
          await supabase.from("agency_outreach_log").update({ status: "failed", error: reason })
            .in("message_id", [rawMessageId, bracketMessageId]);
        }
      }
      return new Response(JSON.stringify({ ok: true, status: newStatus }), { headers: corsHeaders });
    }

    return new Response("Ignored", { headers: corsHeaders });

  } catch (err: any) {
    console.error("SES webhook error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { status: 500, headers: corsHeaders });
  }
});
