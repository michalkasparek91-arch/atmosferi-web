// Private Search Console ingestion.
// The caller is authenticated using a signed GitHub Actions OIDC token, NOT
// a Supabase service_role key in GitHub. No browser or anonymous access.
import { createRemoteJWKSet, jwtVerify } from "jose";
import { validateReport } from "./validation.ts";

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
  const invalidField = validateReport(report);
  if (invalidField) {
    // Static classification only; no private URL, search query, or metric values.
    return respond(422, "Invalid Search Console report (" + invalidField + ")");
  }

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
