// Evidence-only recommendations based on the private Google Search Console
// 28-day snapshots. Do not sum overlapping windows or treat URL Inspection's
// sampled results as a complete indexation report.
export type GscPerformance = {
  url?: string;
  query?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  average_position: number;
};
export type GscPrioritySnapshot = {
  checked_at: string;
  period_start: string;
  period_end: string;
  clicks: number;
  impressions: number;
  pages: GscPerformance[];
  queries: GscPerformance[];
};
export type PageOpportunity = {
  url: string;
  impressions: number;
  clicks: number;
  position: number;
  kind: "visibility" | "snippet";
};
export type QueryOpportunity = {
  query: string;
  impressions: number;
  position: number;
};
function isAtmosferiUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      (url.hostname === "atmosferi.com" || url.hostname.endsWith(".atmosferi.com")) &&
      !url.username && !url.password && !url.port;
  } catch { return false; }
}
const valid = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;

export function prioritizeGscPages(pages: readonly GscPerformance[]): PageOpportunity[] {
  return pages
    .filter(row => isAtmosferiUrl(row.url) &&
      valid(row.impressions) && valid(row.clicks) &&
      valid(row.average_position) && valid(row.ctr) && row.ctr <= 1 &&
      (row.impressions >= 20 && row.average_position >= 20 ||
        row.impressions >= 100 && row.average_position <= 10 && row.ctr < 0.015))
    .map(row => ({
      url: row.url!,
      impressions: row.impressions,
      clicks: row.clicks,
      position: row.average_position,
      kind: (row.average_position >= 20 ? "visibility" : "snippet") as "visibility" | "snippet"
    }))
    .sort((a,b) => b.impressions - a.impressions || a.position - b.position)
    .slice(0, 5);
}
export function prioritizeGscQueries(rows: readonly GscPerformance[]): QueryOpportunity[] {
  return rows.filter(row =>
      typeof row.query === "string" && row.query.trim().length > 0 &&
      valid(row.impressions) && row.impressions >= 10 &&
      valid(row.average_position) && row.average_position >= 20)
    .map(row => ({
      query: row.query!.trim().slice(0, 180),
      impressions: row.impressions,
      position: row.average_position
    }))
    .sort((a,b)=>b.impressions-a.impressions || a.position-b.position)
    .slice(0, 5);
}
export function hasIndependentComparison(reports: readonly GscPrioritySnapshot[]): boolean {
  if (reports.length < 2) return false;
  const latest = reports[0];
  const latestStart = Date.parse(latest.period_start+"T00:00:00Z");
  const prior = reports.slice(1).find(row =>
    Number.isFinite(Date.parse(row.period_end+"T00:00:00Z")) &&
    Date.parse(row.period_end+"T00:00:00Z") < latestStart);
  // 28-day rolling windows overlap every six hours, so showing changes
  // between consecutive snapshots as a growth figure would be misleading.
  return Boolean(prior);
}
export function countGoogleUnknownInspections(
  rows: readonly {verdict:string;coverage_state:string}[]
): number {
  return rows.filter(row =>
    row.verdict === "NEUTRAL" &&
    /url is unknown to google/i.test(row.coverage_state || "")
  ).length;
}
