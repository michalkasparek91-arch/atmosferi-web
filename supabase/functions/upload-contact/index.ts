import { createClient } from "npm:@supabase/supabase-js@2";
import { logJobStart, logJobSuccess, logJobFailure } from "../_shared/automation-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jobName = "Upload Contact";
  let supabase: any;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    await logJobStart(supabase, jobName);

    const body = await req.json();
    const requiredFields = ["email", "company_name", "city"]; // minimal required set
    for (const f of requiredFields) {
      if (!body[f]) throw new Error(`Missing required field: ${f}`);
    }

    const phone = body.phone ? ("+" + body.phone.replace(/\s+/g, "")) : "";

    const { data: existing, error: existErr } = await supabase
      .from("marketing_leads")
      .select("id")
      .eq("email", body.email.toLowerCase().trim())
      .maybeSingle();
    if (existErr) console.warn("Exist check error", existErr);
    if (existing) {
      await logJobSuccess(supabase, jobName, { uploaded: false, reason: "duplicate" });
      return new Response(JSON.stringify({ ok: true, message: "Contact already exists" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: insertErr } = await supabase.from("marketing_leads").insert({
      email: body.email.toLowerCase().trim(),
      company_name: body.company_name,
      full_name: body.full_name || body.company_name,
      phone,
      website: body.website || "",
      city: body.city,
      full_address: body.full_address || "",
      description: body.description || "",
      source: "manual_upload",
    });

    if (insertErr) throw insertErr;

    await logJobSuccess(supabase, jobName, { uploaded: true });
    return new Response(JSON.stringify({ ok: true, message: "Contact saved" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
