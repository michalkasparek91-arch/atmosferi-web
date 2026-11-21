// Private Search Console ingestion.
// The caller is authenticated using a signed GitHub Actions OIDC token, NOT
// a Supabase service_role key in GitHub. No browser or anonymous access.
import { createRemoteJWKSet, jwtVerify } from "jose";

const REPO = "michalkasparek91-arch/atmosferi-web";
const REPO_ID = "1260597613";
const REF = "refs/heads/main";
const WORKFLOW_REF = REPO + "/.github/workflows/gsc-monitor.yml@" + REF;
const SITE = "sc-domain:atmosferi.com";
const AUDIENCE = "https://paryiowezqlnffanxtnt.supabase.co/functions/v1/gsc-ingest";
const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS = createRemoteJWKSet(new URL(ISSUER + "/.well-known/jwks"));

const respond = (status: number, message: string) =>
  new Response(JSON.stringify({ ok: status >= 200 && status < 300, message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

type Entry = Record<string, unknown>;

function object(value: unknown): value is Entry {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function string(value: unknown, max = 1200): value is string {
  return typeof value === "string" && value.length <= max;
}
function number(value: unknown, min = 0, max = 1_000_000_000): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
function date(value: unknown): value is string {
  return string(value, 10) && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + "T00:00:00Z").getTime());
}
function siteUrl(value: unknown): value is string {
  if (!string(value, 700)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && ["atmosferi.com","www.atmosferi.com"].includes(parsed.hostname) && !parsed.username && !parsed.password &&
      parsed.port === "" && !parsed.hash && !parsed.search;
  } catch {
    return false;
  }
}
function metric(row: unknown, key: string): boolean {
  return object(row) && number(row[key]);
}
function performanceArray(value: unknown, identifier: "query" | "url"): value is Entry[] {
  return Array.isArray(value) && value.length <= 25 &&
    value.every((row) => object(row) &&
      (identifier === "url" ? siteUrl(row.url) : string(row.query, 700)) &&
      metric(row, "clicks") && metric(row, "impressions") &&
      number(row.ctr, 0, 1) && number(row.average_position, 0, 10000));
}
function inspectionArray(value: unknown): value is Entry[] {
  return Array.isArray(value) && value.length <= 32 &&
    value.every((row) => object(row) &&
      siteUrl(row.url) &&
      ["PASS","FAIL","NEUTRAL","PARTIAL","UNKNOWN","ERROR"].includes(String(row.verdict)) &&
      ["coverage_state","indexing_state","last_crawl_time","google_canonical","user_canonical","error"].every(k => string(row[k], 1200)) &&
      (!row.google_canonical || siteUrl(row.google_canonical) || string(row.google_canonical, 1200)) &&
      (!row.user_canonical || siteUrl(row.user_canonical) || string(row.user_canonical, 1200)));
}
function validReport(value: unknown): value is Entry {
  if (!object(value)) return false;
  if (value.site !== SITE || !date(value.period_start) || !date(value.period_end)) return false;
  if (value.period_start > value.period_end) return false;
  if (typeof value.checked_at !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value.checked_at) ||
    Number.isNaN(Date.parse(value.checked_at))) return false;
  if (Math.abs(Date.now() - Date.parse(value.checked_at)) > 20 * 60_000) return false;
  const metrics: [string, number, number][] = [
    ["clicks",0,1000000000], ["impressions",0,1000000000], ["ctr",0,1],
    ["average_position",0,10000], ["inspected_urls",0,32],
    ["indexed_urls",0,32], ["inspection_errors",0,32]
  ];
  if (!metrics.every(([k,min,max])=>number(value[k],min,max))) return false;
  if (!inspectionArray(value.inspections) ||
      !performanceArray(value.queries,"query") ||
      !performanceArray(value.pages,"url")) return false;
  return Number(value.inspected_urls) === value.inspections.length &&
    Number(value.indexed_urls) <= Number(value.inspected_urls) &&
    Number(value.inspection_errors) <= Number(value.inspected_urls);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, "Method not allowed");
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return respond(401, "Missing authorization");
  const jwt = authorization.slice("Bearer ".length);
  if (jwt.length > 10000) return respond(401, "Invalid authorization");

  let runId: number;
  try {
    const { payload } = await jwtVerify(jwt, JWKS, {
      issuer: ISSUER, audience: AUDIENCE,
      algorithms: ["RS256"], maxTokenAge: "5m", clockTolerance: "5s",
    });
    if (payload.sub !== "repo:" + REPO + ":ref:" + REF ||
        payload.repository !== REPO ||
        String(payload.repository_id) !== REPO_ID ||
        payload.ref !== REF ||
        payload.workflow_ref !== WORKFLOW_REF ||
        !["schedule","workflow_dispatch"].includes(String(payload.event_name))) {
      return respond(403, "Unauthorized workflow");
    }
    runId = Number(payload.run_id);
    if (!Number.isSafeInteger(runId) || runId <= 0) return respond(403, "Invalid workflow run");
  } catch {
    return respond(401, "Invalid authorization");
  }

  let content: string;
  try {
    if (Number(request.headers.get("Content-Length") || 0) > 96_000) return respond(413,"Payload too large");
    content = await request.text();
    if (content.length > 96_000) return respond(413,"Payload too large");
  } catch {
    return respond(400,"Invalid request body");
  }

  let report: unknown;
  try { report=JSON.parse(content); } catch { return respond(400,"Malformed JSON"); }
  if (!validReport(report)) return respond(422, "Invalid Search Console report");

  // The privileged credential is available ONLY inside Supabase, not in Actions.
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return respond(503, "Ingestion not configured");

  const data = report as Entry;
  const payload = {
    github_run_id: runId,
    checked_at: data.checked_at,
    site: SITE,
    period_start: data.period_start,
    period_end: data.period_end,
    clicks: data.clicks,
    impressions: data.impressions,
    ctr: data.ctr,
    average_position: data.average_position,
    inspected_urls: data.inspected_urls,
    indexed_urls: data.indexed_urls,
    inspection_errors: data.inspection_errors,
    inspections: data.inspections,
    queries: data.queries,
    pages: data.pages,
  };
  try {
    const response = await fetch(supabaseUrl + "/rest/v1/gsc_reports", {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return respond(502, "Private report storage failed");
    return respond(200, "Report accepted securely");
  } catch {
    return respond(502, "Private report storage unavailable");
  }
});
