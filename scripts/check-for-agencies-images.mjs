import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const html = fs.readFileSync("for-agencies.html", "utf8");
const js = fs.readFileSync("assets/for-agencies.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const tags = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
const srcs = tags.map(tag => tag.match(/\bsrc="([^"]+)"/)?.[1]).filter(Boolean);
assert(srcs.length >= 28, "The real agency showcase should retain its images");
assert.equal((html.match(/src="\/img\/agencies\/michal\.webp"/g) || []).length, 1, "Only the About section may show the portrait");
assert(!html.includes('src="/img/michal-card.jpg"'), "No repeated portrait thumbnails");
assert(html.includes('class="f-why__process"'), "Design-to-code card replaces Why portrait");
assert(html.includes('class="f-person f-person--intro"'), "Hero intro CTA without headshot");
assert(html.includes('class="f-person f-person--talk f-person--email"'), "Contact links to email without headshot");
assert(fs.readFileSync("assets/for-agencies.css","utf8").includes(".f-process__art"), "Process card styling exists");
assert(srcs.every(x => !x.startsWith("img/")), "Images must not depend on URL cleanups or trailing slash");
for (const src of srcs.filter(x => x.startsWith("/img/"))) {
  const asset = path.join(process.cwd(), src.slice(1).split("?")[0]);
  assert(fs.existsSync(asset), "Missing image asset: " + src);
}
for (const file of ["zrobee/desk-home.webp", "card-otavation.webp"]) {
  const ref = "/img/agencies/" + file;
  const img = tags.find(tag => tag.includes('src="' + ref + '"'));
  assert(img && img.includes('loading="eager"'), "Main card not eager: " + ref);
  assert(img.includes('fetchpriority="high"'), "Main card priority missing: " + ref);
  assert(html.includes('rel="preload" as="image" href="' + ref + '"'), "Preload missing: " + ref);
}
assert(!html.includes('src="img/') && !html.includes('poster="img/'), "All media URLs must be root-relative");
assert(js.includes("dataset.imageRetryUsed") && js.includes('addEventListener("error", retryImage)'), "One-shot image recovery missing");
assert(js.includes('url.searchParams.set("asset_retry", "1")'), "Recovery must bypass a failed cached request");
assert(pkg.scripts.prebuild.includes("node scripts/check-for-agencies-images.mjs"), "Image test must run in prebuild");
assert(html.includes('id="uvodni-call"') && html.includes('data-agency-call-request'), "Intro call invitation must exist");
assert(html.includes('class="f-person" href="#uvodni-call"'), "Hero must surface intro-call booking early");
assert(html.includes('class="f-form__call-intro ag-call-only"') && html.includes('data-agency-call-reset'), "Switchable call enquiry form missing");
assert(html.includes('Stačí e-mail. Termín a odkaz na Google Meet potvrdím osobně.'), "Do not claim a calendar slot is booked");
assert(!html.includes("calendar.app.google/"), "Do not invent an appointment scheduler link");
assert(html.includes('assets/agency-booking-config.js'), "Google Calendar config script is loaded");
assert(html.includes('data-agency-booking-on') && html.includes('data-agency-booking-off'), "Both booking and fallback states exist");
assert(html.includes('Raději napsat zprávu'), "Booking UI retains contact fallback");
const bookingConfig=fs.readFileSync("assets/agency-booking-config.js","utf8");
assert(bookingConfig.includes('ATMOSFERI_AGENCY_APPOINTMENT_URL'), "One explicit booking URL setting");
assert(js.includes('validAppointmentUrl') && js.includes('calendar.app.google') && js.includes('calendar.google.com'), "Restrict appointment URLs to Google");
assert(js.includes('noopener noreferrer'), "External calendar link must be safe");
assert(js.includes('source: callRequest ? "agency-intro-call"'), "Meeting enquiries must be identifiable");
assert(js.includes('form.classList.contains("is-call-request")'), "Call mode must not require a project brief");
assert(js.includes('call_request: callRequest'), "Preserve call intent in inquiry metadata");
assert(fs.readFileSync("assets/for-agencies.css","utf8").includes(".f-call__in"), "Call invitation styling missing");
for(const [path,lang] of [["assets/for-agencies-i18n.js","de"],["assets/i18n-fr.js","fr"]]) {
  const translations=fs.readFileSync(path,"utf8");
  assert(translations.includes("Požádat o úvodní call"), "Missing "+lang+" call translation");
}

console.log("For-agencies image URLs, file existence, priority and one-shot retry OK.");
