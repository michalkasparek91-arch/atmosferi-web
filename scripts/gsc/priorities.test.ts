import {
  prioritizeGscPages, prioritizeGscQueries,
  hasIndependentComparison, countGoogleUnknownInspections,
  type GscPrioritySnapshot
} from "../../admin/src/lib/gsc-priorities.ts";

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Assertion failed: " + JSON.stringify({ actual, expected }));
  }
};
const row = (url: string, impressions: number, pos: number, ctr = 0.01) =>
  ({ url, clicks: 1, impressions, average_position: pos, ctr });

Deno.test("real first GSC report yields a visibility issue, not a CTR issue", () => {
  const result = prioritizeGscPages([
    row("https://www.atmosferi.com/interactive-floor-plans-property-development-website.html", 316, 60.46, 0.003),
    row("https://atmosferi.com/", 30, 5.1, 0.033),
    row("https://www.atmosferi.com/cms-for-architecture-portfolio-website.html", 12, 31),
  ]);
  assertEquals(result.length, 1);
  assertEquals(result[0].kind, "visibility");
  assertEquals(result[0].impressions, 316);
});

Deno.test("eligible high-rank low-CTR page is a snippet opportunity only at 100 impressions", () => {
  const result = prioritizeGscPages([
    row("https://www.atmosferi.com/pricing.html", 80, 4, 0.005),
    row("https://www.atmosferi.com/contact.html", 140, 6, 0.004),
  ]);
  assertEquals(result.length, 1);
  assertEquals(result[0].kind, "snippet");
});

Deno.test("external malicious search-result URLs and subdomain lookalikes are excluded", () => {
  const result = prioritizeGscPages([
    row("https://www.atmosferi.com.evil.example/index.html", 800, 55),
    row("https://evil.example/index.html", 800, 55),
    row("javascript:alert(1)", 800, 55),
    row("https://example.com@evil.example/index.html", 800, 55),
    row("https://blog.atmosferi.com/verified.html", 22, 31)
  ]);
  assertEquals(result.length, 1);
  assertEquals(result[0].url, "https://blog.atmosferi.com/verified.html");
});

Deno.test("low-sample and brand queries do not create misleading SEO action cards", () => {
  const result = prioritizeGscQueries([
    {query:"interactive floor plan service provider",impressions:58,clicks:0,ctr:0,average_position:44.7},
    {query:"atmosferi",impressions:25,clicks:2,ctr:0.08,average_position:3.08},
    {query:"cms architect",impressions:3,clicks:0,ctr:0,average_position:47}
  ]);
  assertEquals(result.map(x=>x.query), ["interactive floor plan service provider"]);
});

Deno.test("successive 6-hour 28-day snapshots must not be compared as growth", () => {
  const snap = (periodStart:string,periodEnd:string):GscPrioritySnapshot => ({
    checked_at:periodEnd+"T20:00:00Z",period_start:periodStart,period_end:periodEnd,
    clicks:4,impressions:378,queries:[],pages:[]
  });
  assertEquals(hasIndependentComparison([snap("2026-10-22","2026-11-18")]), false);
  assertEquals(hasIndependentComparison([
    snap("2026-10-22","2026-11-18"),snap("2026-10-22","2026-11-17")
  ]), false);
  assertEquals(hasIndependentComparison([
    snap("2026-10-22","2026-11-18"),snap("2026-09-20","2026-10-19")
  ]), true);
});

Deno.test("only confirmed unknown-to-Google sample results contribute to unknown-URL count", () => {
  assertEquals(countGoogleUnknownInspections([
    {verdict:"NEUTRAL",coverage_state:"URL is unknown to Google"},
    {verdict:"PASS",coverage_state:"Indexed"},
    {verdict:"ERROR",coverage_state:"URL is unknown to Google"},
    {verdict:"NEUTRAL",coverage_state:"Crawled - currently not indexed"}
  ]),1);
});
