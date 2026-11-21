// Aggregate a rotating set of Google URL Inspection results across report
// snapshots. A failed API request is not evidence that a URL left the index.
export type InspectionOutcome = {
  url: string;
  verdict: string;
  coverage_state: string;
  indexing_state: string;
  last_crawl_time: string;
  google_canonical: string;
  user_canonical: string;
  error: string;
};
export type InspectionSnapshot = {
  checked_at: string;
  inspections: InspectionOutcome[] | null;
};
export type InspectionHistoryRow = InspectionOutcome & {
  checked_at: string; // last conclusive result, or last error if none exists
  latest_attempt_at: string;
  latest_attempt_error: boolean;
  canonical_mismatch: boolean;
};
export function buildInspectionHistory(reports: readonly InspectionSnapshot[]): InspectionHistoryRow[] {
  const results = new Map<string, InspectionHistoryRow>();
  const newestFirst = [...reports].sort((a, b) => b.checked_at.localeCompare(a.checked_at));
  for (const report of newestFirst) {
    for (const result of report.inspections || []) {
      if (!result?.url) continue;
      const previous = results.get(result.url);
      if (!previous || (previous.verdict === "ERROR" && result.verdict !== "ERROR")) {
        results.set(result.url, {
          ...result,
          checked_at: report.checked_at,
          latest_attempt_at: previous?.latest_attempt_at ?? report.checked_at,
          latest_attempt_error: previous?.latest_attempt_error ?? result.verdict === "ERROR",
          canonical_mismatch: Boolean(result.google_canonical && result.google_canonical !== result.url)
        });
      }
    }
  }
  const priority = (result: InspectionHistoryRow): number => {
    if (result.verdict !== "PASS" && result.verdict !== "ERROR") return 0;
    if (result.canonical_mismatch) return 1;
    if (result.latest_attempt_error || result.verdict === "ERROR") return 2;
    return 3;
  };
  return [...results.values()].sort((a, b) =>
    priority(a) - priority(b) ||
    b.checked_at.localeCompare(a.checked_at) ||
    a.url.localeCompare(b.url)
  );
}
export function isInspectionIssue(result: InspectionHistoryRow): boolean {
  return result.verdict !== "PASS" || result.canonical_mismatch || result.latest_attempt_error;
}
export function summarizeInspectionHistory(rows: readonly InspectionHistoryRow[]) {
  return {
    known: rows.length,
    indexed: rows.filter(r => r.verdict === "PASS").length,
    // Google's NEUTRAL index verdict means "Excluded", not an API error.
    // Keep PARTIAL / VERDICT_UNSPECIFIED / UNKNOWN in the unknown category.
    nonIndexed: rows.filter(r => r.verdict === "FAIL" || r.verdict === "NEUTRAL").length,
    unknown: rows.filter(r => !["PASS", "FAIL", "NEUTRAL"].includes(r.verdict)).length,
    canonicalMismatches: rows.filter(r => r.canonical_mismatch).length,
    recentErrors: rows.filter(r => r.latest_attempt_error).length
  };
}
