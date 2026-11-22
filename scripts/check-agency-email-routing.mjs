import fs from "node:fs";
import assert from "node:assert/strict";

const sender = fs.readFileSync("supabase/functions/dispatch-agency-emails/index.ts", "utf8");
const deWorkspace = fs.readFileSync("admin/src/components/admin/email/AcquisitionWorkspace.tsx", "utf8");
const czWorkspace = fs.readFileSync("admin/src/pages/admin/AdminAgencyOutreach.tsx", "utf8");
const root = JSON.parse(fs.readFileSync("package.json", "utf8"));

assert(sender.includes('.in("slug", ["agency-intro-cs", "agency-followup-cs"])'), "CZ dispatcher must only load Czech templates");
assert(sender.includes('if (lead.review_state !== "ready")'), "manual send must check review status");
assert(sender.includes('["agency-intro-cs", "agency-followup-cs"].includes(body.slug)'), "test action must reject unknown / German slugs");
assert(sender.includes("const bodyWithOptOut ="), "unsubscription visible in all MIME versions");
assert(sender.includes("html: toHtml(bodyWithOptOut") && sender.includes("text: bodyWithOptOut"), "HTML and plain-text opt-out consistent");
assert(deWorkspace.includes('slug = "atmosferi-agenturen-de"'), "German audience must use dedicated template slug");
assert(deWorkspace.includes('outreach_template_slug: slug'), "German audience mapping must be explicit");
assert(deWorkspace.includes('"atmosferi-agenturen-de-followup"'), "German follow-up draft must be discoverable");
assert(deWorkspace.includes('to="/emaily/sablony"'), "German template library must be reachable");
assert(deWorkspace.includes("outreach_email_ready: false"), "approving DE agency must not enable email sending");
assert(czWorkspace.includes("pouze českým agenturám"), "CZ template editor must disclose its scope");
assert(root.scripts.prebuild.includes("node scripts/check-agency-email-routing.mjs"), "routing guard must run in prebuild");

console.log("Agency email routing QA passed: Czech-only sender, approval gate, explicit DE drafts and opt-out parity.");
