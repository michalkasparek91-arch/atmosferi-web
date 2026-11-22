import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const html = fs.readFileSync("for-agencies.html", "utf8");
const js = fs.readFileSync("assets/for-agencies.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const tags = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
const srcs = tags.map(tag => tag.match(/\bsrc="([^"]+)"/)?.[1]).filter(Boolean);
assert(srcs.length >= 28, "The real agency showcase should retain its images");
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

console.log("For-agencies image URLs, file existence, priority and one-shot retry OK.");
