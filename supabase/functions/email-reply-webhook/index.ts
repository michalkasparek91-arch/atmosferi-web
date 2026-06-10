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
    
    // Generic robust payload extraction (supports Resend, Brevo, Sendgrid, etc.)
    const fromRaw = body.from || body.From || body.sender || "Neznámý Odesílatel <unknown@example.com>";
    const fromStr = typeof fromRaw === 'object' ? (fromRaw.Address || fromRaw.email || fromRaw.address || JSON.stringify(fromRaw)) : fromRaw;
    const subject = body.subject || body.Subject || "Bez předmětu";
    
    // Brevo sometimes uses 'text', 'extracted_text', 'TextBody', 'content'
    let textBody = body.text || body.TextBody || body.extracted_text || body.html || body.HtmlBody || "Žádný text";
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
        // Fallback for some Brevo/Postmark nested formats
        const item = body.items[0];
        textBody = textBody === "Žádný text" ? (item.TextBody || item.text || item.content || textBody) : textBody;
    }

    // Extract email from "Name <email>" string
    let fromEmail = fromStr;
    let fromName = fromStr;
    const emailMatch = typeof fromStr === 'string' ? fromStr.match(/<([^>]+)>/) : null;
    if (emailMatch) {
        fromEmail = emailMatch[1];
        fromName = fromStr.replace(/<[^>]+>/, "").trim() || fromEmail;
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    let aiSentiment = "other";
    let aiDraftReply = "";

    if (apiKey) {
      const PROMPT = `Jsi B2B asistent pro platformu Atmosferi.cz. Obdrželi jsme následující e-mailovou odpověď od potenciálního zákazníka nebo partnera.
Odesílatel: ${fromName}
Předmět: ${subject}
Text zprávy: ${textBody}

TVŮJ ÚKOL:
1. Urči SENTIMENT této zprávy. Musí to být přesně jedna z těchto hodnot:
"interested" (má zájem, chce detaily, schůzku), "not_now" (nyní nemá čas nebo zájem), "unsubscribe" (chce vyřadit z databáze, naštvaný), "question" (ptá se na něco specifického), "other" (ostatní).
2. Napiš profesionální, krátký a zdvořilý NÁVRH ODPOVĚDI (česky). Pokud se chce odhlásit, napiš, že ho mažeme z databáze a omlouváme se. Pokud má dotaz, odpověz. Pokud má zájem, navrhni další kroky (např. krátký hovor).

Výstup MUSÍ BÝT striktně ve formátu JSON:
{
  "sentiment": "interested|not_now|unsubscribe|question|other",
  "draft_reply": "Text odpovědi..."
}
Odpověz POUZE JSON objektem, ničím jiným.`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }] }], generationConfig: { temperature: 0.2 } }) 
      });

      if (geminiRes.ok) {
        const resJson = await geminiRes.json();
        const textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
        
        try {
            const firstBracket = textOut.indexOf('{');
            const lastBracket = textOut.lastIndexOf('}');
            if (firstBracket !== -1 && lastBracket !== -1) {
                const parsed = JSON.parse(textOut.substring(firstBracket, lastBracket + 1));
                if (parsed.sentiment) aiSentiment = parsed.sentiment;
                if (parsed.draft_reply) aiDraftReply = parsed.draft_reply;
            }
        } catch(e) {
            console.error("Failed to parse Gemini response", e);
        }
      }
    }

    // Insert to database
    await supabase.from("email_replies").insert({
        from_email: fromEmail,
        from_name: fromName,
        subject: subject,
        body_text: textBody,
        ai_sentiment: aiSentiment,
        ai_draft_reply: aiDraftReply,
        status: 'unread'
    });

    return new Response(JSON.stringify({ ok: true, message: "Reply processed." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Webhook error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
