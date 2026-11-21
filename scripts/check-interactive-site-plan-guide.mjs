import fs from "node:fs";
import assert from "node:assert/strict";

const file = "interactive-site-plan-property-development-guide.html";
const canonical = "https://www.atmosferi.com/" + file;
const html = fs.readFileSync(file, "utf8");
const hub = fs.readFileSync("guides.html", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const fetchTitle = html.match(/<title>([^<]+)<\/title>/)?.[1];
assert(fetchTitle?.includes("Interactive Site Plans for Property Developments"), "distinct title");
assert(html.includes('<html lang="en">'), "English language");
assert(html.includes('<link rel="canonical" href="' + canonical + '">'), "self canonical");
assert(html.includes('<meta name="robots" content="index, follow'), "indexable page");
assert.equal((html.match(/<h1\b/g) || []).length, 1, "exactly one H1");
assert(html.includes('<meta name="description" content="How to plan an interactive site map'), "descriptive snippet");
assert(html.includes('<meta name="viewport"'), "responsive");
const structured = html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
assert(structured, "structured data is present");
const graph = JSON.parse(structured[1])["@graph"];
const article = graph?.find(n => n["@type"] === "Article");
const webpage = graph?.find(n => n["@type"] === "WebPage");
assert(article && webpage, "article and page JSON-LD");
assert.equal(article.datePublished, "2026-11-21", "truthful publication date");
assert.equal(article.inLanguage, "en");
assert.equal(webpage.url, canonical);
assert.equal(article.mainEntityOfPage["@id"], canonical + "#webpage");
assert(html.includes("not a real client project, verified map or production inventory integration"), "fictional concept disclosure");
assert(html.includes("These are example field relationships, not an actual property listing"), "fictional data disclosure");
assert(html.includes('href="demos/quay/index.html#explore"'), "links to real Quay concept");
assert(html.includes('href="interactive-floor-plan-design-real-estate.html"'), "service link");
assert(html.includes('href="interactive-floor-plans-property-development-website.html"'), "apartment guide link");
assert(html.includes('href="property-development-website-unit-availability-sync.html"'), "inventory maintenance link");
assert(html.includes('href="/guides"'), "guide index navigation");

for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const target = match[1];
  if (/^(?:https?:|mailto:|#)/.test(target)) continue;
  if (target === "/guides") continue;
  const localFile = target.split(/[?#]/)[0].replace(/^\//, "");
  if(localFile) assert(fs.existsSync(localFile), "Missing local linked resource: " + localFile);
}
for(const incoming of [
  "interactive-floor-plan-design-real-estate.html",
  "interactive-floor-plans-property-development-website.html",
  "residential-development-website-content-checklist.html"
]){
  assert(fs.readFileSync(incoming, "utf8").includes('href="' + file + '"'), incoming + ": no contextual inbound link");
}
assert(sitemap.includes("<loc>" + canonical + "</loc>"), "canonical included in sitemap");
assert(hub.includes('href="' + file + '"'), "automatically included in /guides");
const development = hub.match(/<section class="guidehub-section wrap" id="development"[\s\S]*?<\/section>/);
assert(development && development[0].includes('href="' + file + '"'), "correct property-development category in /guides");
console.log("Interactive site plan guide passed: metadata, schema, truthful concept, sitemap, dynamic guides category, links and inbound cluster.");
