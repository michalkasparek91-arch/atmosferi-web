import { availableOutreachLeads, isEligibleForOutreach } from "./outreach-leads.ts";

Deno.test("imported contacts use exactly their reviewed template and preserve suppression", () => {
  const lead = { email: "business@example.test", outreach_template_slug: "realtor-sk", tags: [] };
  if (!isEligibleForOutreach(lead,"realtor-sk") || isEligibleForOutreach(lead,"developer-sk")) throw new Error("Wrong role template allowed");
  for (const flag of [{outreach_import_review:true},{marketing_notifications:false},{email_notifications:false},{tags:["známé"]}]) {
    if (isEligibleForOutreach({...lead,...flag},"realtor-sk")) throw new Error("Suppressed/review contact was eligible");
  }
});
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

function mockDb(rows: Record<string, unknown>[], excluded: string[], fail = false) {
  const languages: unknown[] = [];
  return {
    languages,
    db: { from(table: string) {
      const query = {
        select() { return query; }, eq() { return query; }, not() { return query; }, order() { return query; },
        in(_column: string, value: unknown) { languages.push(value); return query; },
        range(from: number, to: number) {
          return Promise.resolve({
            data: (table === "email_outbox" ? excluded.map(lead_id => ({ lead_id })) : rows).slice(from, to + 1),
            error: fail ? new Error("Database unavailable") : null,
          });
        },
      };
      return query;
    } } as unknown as SupabaseClient,
  };
}

Deno.test("audience continues beyond 1000 previously contacted leads", async () => {
  const rows = Array.from({ length: 2005 }, (_, i) => ({ id: String(i), email: `${i}@example.test`, tags: [] }));
  const { db } = mockDb(rows, rows.slice(0, 1500).map(r => r.id));
  const result = await availableOutreachLeads(db, { slug: "test", category: "architect", language: "de" });
  if (result.length !== 505 || result[0].id !== "1500" || result.at(-1)?.id !== "2004") throw new Error("Pagination lost or duplicated contacts");
});

Deno.test("exclude known contacts and empty addresses; retain Czech/Slovak matching", async () => {
  const { db, languages } = mockDb([
    { id: "1", email: "known@example.test", tags: ["známé"] },
    { id: "2", email: "", tags: [] },
    { id: "3", email: "new@example.test", tags: [] },
  ], []);
  const result = await availableOutreachLeads(db, { slug: "test", category: "architect", language: "cz" });
  if (result.length !== 1 || result[0].id !== "3" || JSON.stringify(languages[0]) !== '["cs","cz","sk"]') throw new Error("Audience filters failed");
});

Deno.test("database errors stop dispatch instead of treating contacts as unsent", async () => {
  const { db } = mockDb([], [], true);
  let threw = false;
  try { await availableOutreachLeads(db, { slug: "test", category: "architect", language: "de" }); }
  catch { threw = true; }
  if (!threw) throw new Error("A failed exclusion query must not allow duplicate sends");
});
