import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export function isEligibleForOutreach(lead: Record<string, any>, templateSlug: string) {
  return !!lead.email && lead.marketing_notifications !== false && lead.email_notifications !== false
    && !lead.outreach_import_review && !(lead.tags || []).includes("známé")
    && (!lead.outreach_template_slug || lead.outreach_template_slug === templateSlug);
}

export async function availableOutreachLeads(db: SupabaseClient, template: { slug: string; category: string; language: string }) {
  const excluded = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("email_outbox").select("lead_id")
      .eq("template_slug", template.slug).not("lead_id", "is", null)
      .order("id").range(from, from + 999);
    if (error) throw error;
    for (const row of data) excluded.add(row.lead_id);
    if (data.length < 1000) break;
  }
  const languages = ["cs", "cz"].includes(template.language) ? ["cs", "cz", "sk"] : [template.language];
  const leads: Record<string, any>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("marketing_leads").select("*")
      .eq("category", template.category).in("language", languages)
      .order("id").range(from, from + 999);
    if (error) throw error;
    leads.push(...data.filter(l => !excluded.has(l.id) && isEligibleForOutreach(l, template.slug)));
    if (data.length < 1000) break;
  }
  return leads;
}
