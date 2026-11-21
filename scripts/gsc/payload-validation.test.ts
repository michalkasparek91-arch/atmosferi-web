import { validateReport } from "../../supabase/functions/gsc-ingest/validation.ts";

const assert = (actual: unknown, expected: unknown) => {
  if (actual !== expected) throw new Error("Expected " + String(expected) + ", received " + String(actual));
};
function fixture() {
  return {
    checked_at: new Date().toISOString(),
    site: "sc-domain:atmosferi.com",
    period_start: "2026-10-20", period_end: "2026-11-18",
    clicks: 42, impressions: 1270, ctr: 0.033, average_position: 13.6,
    inspected_urls: 2, indexed_urls: 1, inspection_errors: 0,
    inspections: [
      {
        url: "https://www.atmosferi.com/article.html", verdict: "VERDICT_UNSPECIFIED",
        coverage_state: "Discovered - currently not indexed",
        indexing_state: "INDEXING_STATE_UNSPECIFIED",
        last_crawl_time: "",google_canonical: "",user_canonical: "",error: ""
      },
      {
        url: "https://www.atmosferi.com/guides", verdict: "PASS",
        coverage_state: "Submitted and indexed",
        indexing_state: "INDEXING_ALLOWED", last_crawl_time: "2026-11-21T12:00:00Z",
        google_canonical: "https://www.atmosferi.com/guides",user_canonical:"https://www.atmosferi.com/guides",error:""
      }
    ],
    queries: [
      { query: "web architektura ostrava",clicks:30,impressions:700,ctr:0.043,average_position:8.4 },
      { query: "web architect",clicks:12,impressions:570,ctr:0.021,average_position:20.1 }
    ],
    pages: [
      { url: "https://atmosferi.com/?lang=cs&utm_source=google",clicks:20,impressions:1000,ctr:0.02,average_position:12 },
      { url: "http://blog.atmosferi.com/old-case-study?x=1#photos",clicks:22,impressions:270,ctr:0.081,average_position:18 }
    ]
  };
}
Deno.test("valid GSC domain-property report with protocol variants, query URLs and Google enum", () => {
  assert(validateReport(fixture()), null);
});
Deno.test("Google page analytics may show other subdomains but never off-site domains", () => {
  const f = fixture();
  f.pages[1].url = "https://atmosferi.com.evil.example/sneaky";
  assert(validateReport(f),"INVALID_PAGES");
});
Deno.test("URL inspection must remain on our own canonical https host", () => {
  const f = fixture();
  f.inspections[0].url = "http://www.atmosferi.com/article.html";
  assert(validateReport(f),"INVALID_INSPECTIONS");
});
Deno.test("property cannot be swapped to another GSC account", () => {
  const f = fixture();
  f.site = "sc-domain:zrobee.cz";
  assert(validateReport(f),"INVALID_PROPERTY");
});
Deno.test("stale or future report cannot be replayed", () => {
  const f = fixture();
  f.checked_at = new Date(Date.now()-3600_000).toISOString();
  assert(validateReport(f),"INVALID_CHECK_TIME");
  f.checked_at = new Date(Date.now()+3600_000).toISOString();
  assert(validateReport(f),"INVALID_CHECK_TIME");
});
Deno.test("rejects wrong inspection counts but accepts unknown verdict statuses", () => {
  const f = fixture();
  f.inspected_urls = 3;
  assert(validateReport(f),"INVALID_COUNTS");
});
Deno.test("never reflects private query and URL values in diagnostic codes", () => {
  const f = fixture();
  f.pages[0].url = "https://other-domain.example/?private_key=secret";
  const result = validateReport(f);
  assert(result,"INVALID_PAGES");
  if(JSON.stringify(result).includes("secret"))throw Error("Leaked private field in diagnostic");
});
Deno.test("allows error-only inspection entries, preserving failure diagnostics privately", () => {
  const f = fixture();
  f.inspections[0].verdict = "ERROR";
  f.inspections[0].error = "Google API request to searchconsole.googleapis.com failed with HTTP 429";
  f.inspection_errors = 1;
  assert(validateReport(f),null);
});
