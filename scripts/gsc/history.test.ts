const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Assertion failed: " + JSON.stringify({ actual, expected }));
  }
};
import {
  buildInspectionHistory,
  isInspectionIssue,
  summarizeInspectionHistory,
  type InspectionOutcome
} from "../../admin/src/lib/gsc-inspection-history.ts";

const result = (url: string, verdict: string, canonical = ""): InspectionOutcome => ({
  url, verdict, coverage_state: verdict === "PASS" ? "Indexed" : "Discovered - currently not indexed",
  indexing_state: "", last_crawl_time: "", google_canonical: canonical,
  user_canonical: "", error: verdict === "ERROR" ? "HTTP 429" : ""
});

Deno.test("rotation retains URLs from older batches and deduplicates them", () => {
  const reports = [
    { checked_at: "2026-11-21T18:00:00Z", inspections: [result("https://www.atmosferi.com/a.html", "PASS")] },
    { checked_at: "2026-11-21T12:00:00Z", inspections: [result("https://www.atmosferi.com/b.html", "FAIL"), result("https://www.atmosferi.com/a.html", "FAIL")] }
  ];
  const output = buildInspectionHistory(reports);
  assertEquals(output.length, 2);
  assertEquals(output.find(x => x.url.endsWith("a.html"))?.verdict, "PASS");
  assertEquals(output.find(x => x.url.endsWith("b.html"))?.verdict, "FAIL");
  assertEquals(output[0].url.endsWith("b.html"), true); // issues first
  assertEquals(reports[0].inspections.length, 1); // source unaffected
});

Deno.test("temporary API error does not overwrite an older indexed result", () => {
  const rows = buildInspectionHistory([
    { checked_at: "2026-11-21T18:00:00Z", inspections: [result("https://www.atmosferi.com/a.html", "ERROR")] },
    { checked_at: "2026-11-20T18:00:00Z", inspections: [result("https://www.atmosferi.com/a.html", "PASS")] }
  ]);
  assertEquals(rows[0].verdict, "PASS");
  assertEquals(rows[0].latest_attempt_error, true);
  assertEquals(rows[0].checked_at, "2026-11-20T18:00:00Z");
  assertEquals(rows[0].latest_attempt_at, "2026-11-21T18:00:00Z");
  assertEquals(isInspectionIssue(rows[0]), true);
});

Deno.test("Google-selected different canonical is an actionable warning", () => {
  const rows = buildInspectionHistory([{
    checked_at: "2026-11-21T18:00:00Z",
    inspections: [result("https://www.atmosferi.com/a.html", "PASS", "https://www.atmosferi.com/b.html")]
  }]);
  assertEquals(rows[0].canonical_mismatch, true);
  assertEquals(isInspectionIssue(rows[0]), true);
  assertEquals(summarizeInspectionHistory(rows).canonicalMismatches, 1);
});

Deno.test("no data or nonindex error remain clearly unknown", () => {
  assertEquals(summarizeInspectionHistory(buildInspectionHistory([])).known, 0);
  const rows = buildInspectionHistory([
    { checked_at: "2026-11-21T18:00:00Z", inspections: [result("https://www.atmosferi.com/a.html", "ERROR")] }
  ]);
  assertEquals(summarizeInspectionHistory(rows), {
    known: 1, indexed: 0, nonIndexed: 0, unknown: 1, canonicalMismatches: 0, recentErrors: 1
  });
});

Deno.test("replay order independent and newer final states win", () => {
  const old = { checked_at: "2026-11-20T18:00:00Z", inspections: [result("https://www.atmosferi.com/a.html", "FAIL")] };
  const newest = { checked_at: "2026-11-21T18:00:00Z", inspections: [result("https://www.atmosferi.com/a.html", "PASS")] };
  assertEquals(buildInspectionHistory([old, newest]), buildInspectionHistory([newest, old]));
});

Deno.test("Google NEUTRAL excluded URLs count as nonindexed, not unknown", () => {
  const rows = buildInspectionHistory([{
    checked_at: "2026-11-21T19:08:19Z",
    inspections: [
      { ...result("https://www.atmosferi.com/a.html", "NEUTRAL"), coverage_state: "URL is unknown to Google" },
      { ...result("https://www.atmosferi.com/b.html", "PASS"), coverage_state: "Indexed" },
      { ...result("https://www.atmosferi.com/c.html", "VERDICT_UNSPECIFIED"), coverage_state: "" }
    ]
  }]);
  const summary = summarizeInspectionHistory(rows);
  assertEquals(summary.known, 3);
  assertEquals(summary.indexed, 1);
  assertEquals(summary.nonIndexed, 1);
  assertEquals(summary.unknown, 1);
  assertEquals(isInspectionIssue(rows.find(row => row.verdict === "NEUTRAL")!), true);
});
