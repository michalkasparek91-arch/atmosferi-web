import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, template_id, batch_size } = await req.json();

    if (action === "get_batches") {
      // 1. Fetch active templates
      const { data: templates, error: tErr } = await supabaseClient
        .from("email_templates")
        .select("*")
        .eq("is_enabled", true);
        
      if (tErr) throw tErr;

      const results = [];

      for (const t of templates) {
        if (!t.category || !t.language) continue;

        // Fetch all outboxed lead_ids for this template
        const { data: outbox } = await supabaseClient
          .from("email_outbox")
          .select("lead_id")
          .eq("template_id", t.id)
          .not("lead_id", "is", null);
          
        const excludedLeadIds = outbox?.map((o: any) => o.lead_id) || [];

        // Count matching leads
        let query = supabaseClient
          .from("marketing_leads")
          .select("id", { count: "exact", head: true })
          .eq("category", t.category)
          .eq("language", t.language);

        const { count, error: countErr } = await query;
        
        if (countErr) continue;

        // Unfortunately, PostgREST doesn't support complex NOT IN counts easily if the list is huge,
        // so we fetch the leads ids and filter
        const { data: allLeads } = await supabaseClient
          .from("marketing_leads")
          .select("id")
          .eq("category", t.category)
          .eq("language", t.language);

        const availableLeads = (allLeads || []).filter((l: any) => !excludedLeadIds.includes(l.id));
        const totalAudience = availableLeads.length;

        if (totalAudience > 0) {
          const batches = [];
          let remaining = totalAudience;
          let batchIndex = 1;
          
          while (remaining > 0) {
            const size = Math.min(300, remaining);
            batches.push({
              id: `${t.id}-batch-${batchIndex}`,
              size: size,
              status: size === 300 ? "ready" : "waiting",
              batch_index: batchIndex
            });
            remaining -= size;
            batchIndex++;
          }

          results.push({
            template: t,
            total_audience: totalAudience,
            batches: batches
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (action === "process_batch") {
      if (!template_id) throw new Error("Missing template_id");
      
      const limit = batch_size || 300;
      
      const { data: template } = await supabaseClient
        .from("email_templates")
        .select("*")
        .eq("id", template_id)
        .single();
        
      if (!template) throw new Error("Template not found");

      // Fetch all outboxed lead_ids for this template
      const { data: outbox } = await supabaseClient
        .from("email_outbox")
        .select("lead_id")
        .eq("template_id", template.id)
        .not("lead_id", "is", null);
        
      const excludedLeadIds = outbox?.map((o: any) => o.lead_id) || [];

      // Fetch available leads
      const { data: availableLeads, error: leadsErr } = await supabaseClient
        .from("marketing_leads")
        .select("*")
        .eq("category", template.category)
        .eq("language", template.language);
        
      if (leadsErr) throw leadsErr;
      
      const leadsToProcess = (availableLeads || [])
        .filter((l: any) => !excludedLeadIds.includes(l.id))
        .slice(0, limit);

      if (leadsToProcess.length === 0) {
        return new Response(
          JSON.stringify({ success: true, processed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prepare outbox inserts
      const outboxInserts = leadsToProcess.map((lead: any) => ({
        template_id: template.id,
        template_slug: template.slug,
        lead_id: lead.id,
        status: "pending",
        icebreaker: lead.ai_icebreaker || "Dobrý den,\n\nZaujala mě vaše práce.",
      }));

      const { error: insertErr } = await supabaseClient
        .from("email_outbox")
        .insert(outboxInserts);
        
      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({ success: true, processed: outboxInserts.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
