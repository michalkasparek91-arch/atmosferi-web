// Validate GSC reports without exposing queries, URLs, or performance data in errors.
// Search Console's domain properties include http/https, subdomains, and query
// strings in page-dimension results, unlike canonical URL Inspection requests.
type RecordValue = Record<string, unknown>;
const SITE = "sc-domain:atmosferi.com";
const HOST = "atmosferi.com";
const knownVerdicts = new Set(["PASS", "FAIL", "NEUTRAL", "PARTIAL", "UNKNOWN", "ERROR", "VERDICT_UNSPECIFIED"]);

function obj(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function str(value: unknown, max = 2048): value is string {
  return typeof value === "string" && value.length <= max;
}
function num(value: unknown, min = 0, max = 1_000_000_000): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
function date(value: unknown): value is string {
  return str(value, 10) && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}
function urlForSite(value: unknown, inspection: boolean): boolean {
  if (!str(value, 2048)) return false;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password || parsed.port || parsed.hash) return false;
    if (inspection) {
      return parsed.protocol === "https:" && parsed.hostname === "www.atmosferi.com" && !parsed.search;
    }
    // GSC domain property includes all protocols and subdomains. The URL
    // query is essential for measuring canonical/duplicate page patterns.
    return (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      (parsed.hostname === HOST || parsed.hostname.endsWith("." + HOST));
  } catch {
    return false;
  }
}
function validAnalytics(rows: unknown, dimension: "query" | "url"): boolean {
  return Array.isArray(rows) && rows.length <= 25 &&
    rows.every(row => obj(row) &&
      (dimension === "url" ? urlForSite(row.url, false) : str(row.query)) &&
      num(row.clicks) && num(row.impressions) &&
      num(row.ctr, 0, 1) && num(row.average_position, 0, 10_000));
}
function validInspections(rows: unknown): boolean {
  return Array.isArray(rows) && rows.length <= 32 &&
    rows.every(row => obj(row) &&
      urlForSite(row.url, true) &&
      str(row.verdict, 40) && knownVerdicts.has(row.verdict) &&
      ["coverage_state","indexing_state","last_crawl_time","google_canonical","user_canonical","error"]
        .every(k => str(row[k])));
}

/** Returns a fixed, safe error code. Never reflect input data in responses/logs. */
export function validateReport(report: unknown, now = Date.now()): string | null {
  if (!obj(report)) return "INVALID_OBJECT";
  if (report.site !== SITE) return "INVALID_PROPERTY";
  if (!date(report.period_start) || !date(report.period_end) ||
      report.period_start > report.period_end) return "INVALID_PERIOD";
  if (typeof report.checked_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(report.checked_at) ||
      Number.isNaN(Date.parse(report.checked_at)) ||
      Math.abs(now - Date.parse(report.checked_at)) > 20 * 60_000) return "INVALID_CHECK_TIME";

  const metrics: [string, number, number][] = [
    ["clicks",0,1_000_000_000], ["impressions",0,1_000_000_000],
    ["ctr",0,1], ["average_position",0,10_000],
    ["inspected_urls",0,32], ["indexed_urls",0,32], ["inspection_errors",0,32]
  ];
  if (!metrics.every(([k,min,max]) => num(report[k],min,max))) return "INVALID_METRICS";
  if (!validInspections(report.inspections)) return "INVALID_INSPECTIONS";
  if (!validAnalytics(report.queries, "query")) return "INVALID_QUERIES";
  if (!validAnalytics(report.pages, "url")) return "INVALID_PAGES";

  if (report.inspected_urls !== report.inspections.length ||
      Number(report.indexed_urls) > Number(report.inspected_urls) ||
      Number(report.inspection_errors) > Number(report.inspected_urls)) return "INVALID_COUNTS";

  return null;
}
