import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * POZOR NA PŘENESENÁ DATA:
 * Tahle funkce se volá pro KAŽDOU aktivní šablonu při každém načtení fronty.
 * Dřív dělala `select("*")`, takže při ~45 šablonách a 75 tis. kontaktech
 * protekly desítky MB na jedno zobrazení stránky — zbytečně, protože
 * přehled potřebuje jen počet.
 *
 * Proto: stahujeme jen sloupce, které jsou opravdu potřeba, a pro počítání
 * publika jen `id`.
 */

/** Sloupce nutné k rozhodnutí, zda lze kontakt oslovit. */
const ELIGIBILITY_COLUMNS =
  "id,email,tags,outreach_import_review,marketing_notifications,email_notifications,outreach_template_slug";

/** Sloupce navíc pro zobrazení řádku v adminu. */
const DISPLAY_COLUMNS =
  "company_name,full_name,city,country,premium_score,decision_maker_name,discovered_by,website";

export function isEligibleForOutreach(lead: Record<string, any>, templateSlug: string) {
  return !!lead.email && lead.marketing_notifications !== false && lead.email_notifications !== false
    && !lead.outreach_import_review && !(lead.tags || []).includes("známé")
    && (!lead.outreach_template_slug || lead.outreach_template_slug === templateSlug);
}

/** ID kontaktů, které už pro danou šablonu leží v outboxu (nesmí se poslat znovu). */
async function excludedLeadIds(db: SupabaseClient, slug: string): Promise<Set<string>> {
  const excluded = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("email_outbox").select("lead_id")
      .eq("template_slug", slug).not("lead_id", "is", null)
      .order("id").range(from, from + 999);
    if (error) throw error;
    for (const row of data) excluded.add(row.lead_id);
    if (data.length < 1000) break;
  }
  return excluded;
}

function languagesFor(templateLanguage: string): string[] {
  return ["cs", "cz"].includes(templateLanguage) ? ["cs", "cz", "sk"] : [templateLanguage];
}

interface OutreachTemplate { slug: string; category: string; language: string }

/**
 * Jádro výběru. `columns` řídí, kolik dat se reálně přenese;
 * `limit` umožní přestat, jakmile máme dost řádků pro zobrazení.
 */
async function queryEligible(
  db: SupabaseClient,
  template: OutreachTemplate,
  columns: string,
  limit?: number,
): Promise<Record<string, any>[]> {
  const excluded = await excludedLeadIds(db, template.slug);
  const languages = languagesFor(template.language);
  const out: Record<string, any>[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("marketing_leads").select(columns)
      .eq("category", template.category).in("language", languages)
      .order("id").range(from, from + 999);
    if (error) throw error;

    for (const l of data as Record<string, any>[]) {
      if (excluded.has(l.id)) continue;
      if (!isEligibleForOutreach(l, template.slug)) continue;
      out.push(l);
      if (limit && out.length >= limit) return out;
    }
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * Počet kontaktů v publiku. Stahuje jen `id` + pole nutná k posouzení,
 * takže je řádově levnější než načítání celých řádků.
 */
export async function countAvailableOutreachLeads(
  db: SupabaseClient,
  template: OutreachTemplate,
): Promise<number> {
  const rows = await queryEligible(db, template, ELIGIBILITY_COLUMNS);
  return rows.length;
}

/**
 * Kontakty v publiku i s údaji pro zobrazení.
 * `limit` použij vždy, když jdou data na obrazovku — bez něj se načte celé publikum.
 */
export async function availableOutreachLeads(
  db: SupabaseClient,
  template: OutreachTemplate,
  limit?: number,
): Promise<Record<string, any>[]> {
  return await queryEligible(db, template, `${ELIGIBILITY_COLUMNS},${DISPLAY_COLUMNS}`, limit);
}
