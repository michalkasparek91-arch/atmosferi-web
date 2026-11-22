import assert from "node:assert/strict";
import fs from "node:fs";
import { emailLocale, localizeAtmosferiUrl as url, localizeEmailBody as body } from "../supabase/functions/_shared/email-localization.mjs";

for (const [code, expected] of [
  ["de", "de"], ["at", "de"], ["ch", "de"],
  ["cz", "cs"], ["cs", "cs"], ["sk", "cs"],
  ["en", "en"], ["us", "en"], ["au", "en"], ["f", "en"],
  ["no", "en"], ["hu", "en"]
]) assert.equal(emailLocale(code), expected, "Email locale " + code);

for (const [language, expected] of [
  ["de", "de"], ["at", "de"], ["ch", "de"],
  ["cz", "cs"], ["en", "en"], ["no", "en"]
]) {
  assert.equal(url("https://www.atmosferi.com/for-agencies", language),
    "https://www.atmosferi.com/for-agencies?lang=" + expected);
  assert.equal(url("https://atmosferi.com/demos/atmosferi-viz/index.html?lang=cs", language),
    "https://atmosferi.com/demos/atmosferi-viz/index.html?lang=" + expected);
  assert.equal(url("https://www.atmosferi.com", language),
    "https://www.atmosferi.com/?lang=" + expected);
}
assert.equal(url("https://www.atmosferi.com/for-agencies?utm_source=email#work", "de"),
  "https://www.atmosferi.com/for-agencies?utm_source=email&lang=de#work");
assert.equal(url("mailto:info@atmosferi.com", "de"), "mailto:info@atmosferi.com");
assert.equal(url("https://zrobee.cz/zakazky?lang=cs", "de"), "https://zrobee.cz/zakazky?lang=cs");
assert.equal(url("https://www.atmosferi.com/img/michal.jpg", "de"), "https://www.atmosferi.com/img/michal.jpg");
assert.equal(url("https://www.atmosferi.com/cms-for-architecture-portfolio-website.html", "de"),
  "https://www.atmosferi.com/cms-for-architecture-portfolio-website.html",
  "Do not promise a translation for a single-language editorial page");
assert.equal(body("Guten Tag\nhttps://www.atmosferi.com/for-agencies\nwww.atmosferi.com", "de"),
  "Guten Tag\nhttps://www.atmosferi.com/for-agencies?lang=de\nhttps://www.atmosferi.com/?lang=de");
assert.equal(body("Více: https://www.atmosferi.com/for-agencies. Odpověď: michal@atmosferi.com", "cz"),
  "Více: https://www.atmosferi.com/for-agencies?lang=cs. Odpověď: michal@atmosferi.com");
assert.equal(body("https://www.atmosferi.com/for-agencies?lang=de", "de"),
  "https://www.atmosferi.com/for-agencies?lang=de", "Localization must be idempotent");

const generator=fs.readFileSync("supabase/functions/_shared/EmailTemplateGenerator.ts","utf8");
const sender=fs.readFileSync("supabase/functions/dispatch-agency-emails/index.ts","utf8");
const page=fs.readFileSync("for-agencies.html","utf8");
const demo=fs.readFileSync("demos/atmosferi-viz/index.html","utf8");
const i18n=fs.readFileSync("assets/i18n.js","utf8");
assert(generator.includes("parseBodyText(localizeEmailBody(data.body, data.language))"), "Localized HTML letter text");
assert(generator.includes('localizeAtmosferiUrl(data.ctaUrl, data.language)'), "Localized CTA URL");
assert(generator.includes('localizeAtmosferiUrl("https://www.atmosferi.com", data.language)'), "Localized HTML signature");
assert(sender.includes('const bodyWithOptOut = localizeEmailBody('), "Localized Czech agency plain-text alternative");
assert(page.includes('data-i18n-langs="cs,en,de,fr"'), "Agency landing supports German, Czech and English");
assert(demo.includes('src="../../assets/i18n.js'), "Portfolio demo supports explicit URL language");
assert(i18n.includes('urlLang = qs.get("lang")') && i18n.includes('if (urlLang && LANGS.indexOf(urlLang) >= 0) saved = urlLang'), "Explicit email language must override stored browser preference");

console.log("Email localization checks: language mappings, HTML and plain-text links, CTAs, signatures and destination language.");
