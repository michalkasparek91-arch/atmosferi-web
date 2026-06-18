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

    const body = await req.json().catch(() => ({}));
    console.log("Brevo webhook received:", JSON.stringify(body));

    // Brevo Webhook Payload contains `event`, `email`, and `message-id`
    const event = body.event;
    const email = body.email;
    const messageId = body["message-id"];

    if (!event || !email) {
      return new Response(JSON.stringify({ ok: false, message: "Missing event or email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Map Brevo event to our internal status
    let newStatus = null;
    switch (event) {
      case "delivered":
        newStatus = "delivered";
        break;
      case "opened":
      case "unique_opened":
        newStatus = "opened";
        break;
      case "click":
        newStatus = "clicked";
        break;
      case "hard_bounce":
      case "soft_bounce":
      case "blocked":
      case "invalid_email":
        newStatus = "bounced";
        break;
      case "complaint":
      case "spam":
        newStatus = "spam";
        break;
      case "unsubscribed":
      case "unsubscribe":
        newStatus = "unsubscribed";
        break;
    }

    if (!newStatus) {
      return new Response(JSON.stringify({ ok: true, message: `Ignored event: ${event}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let matchColumn = "";
    let matchValue = "";

    // Prefer message-id if available
    if (messageId) {
      matchColumn = "resend_id";
      matchValue = messageId;
    } else {
      matchColumn = "recipient_email";
      matchValue = email;
    }

    // Update email_logs
    const { error: logsError } = await supabase
      .from("email_logs")
      .update({ status: newStatus })
      .eq(matchColumn, matchValue);

    if (logsError) {
      console.error("Failed to update email_logs:", logsError);
    }

    // Also update email_outbox
    if (messageId) {
      const { error: outboxError } = await supabase
        .from("email_outbox")
        .update({ delivery_status: newStatus })
        .eq("provider_message_id", messageId);
        
      if (outboxError) {
        console.error("Failed to update email_outbox:", outboxError);
      }
    }

    return new Response(JSON.stringify({ ok: true, message: "Webhook processed", status: newStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Delivery webhook error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
