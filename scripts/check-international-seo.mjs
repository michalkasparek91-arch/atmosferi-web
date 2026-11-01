import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin='https://www.atmosferi.com';
const pages=new Map([['en','websites-for-architects.html'],['cs','weby-pro-architekty.html'],['de','webdesign-fuer-architekten.html'],['nb','nettsider-for-arkitekter.html']]);
for(const [lang,file] of pages){
 const h=fs.readFileSync(file,'utf8');
 assert(h.includes(`<html lang="${lang}">`),`${file}: language`);
 assert.equal((h.match(/<h1[\s>]/g)||[]).length,1,`${file}: one H1`);
 assert(h.includes(`<link rel="canonical" href="${origin}/${file}">`),`${file}: self canonical`);
 for(const [l,f] of pages)assert(h.includes(`hreflang="${l}" href="${origin}/${f}"`),`${file}: reciprocal ${l}`);
 assert(h.includes(`hreflang="x-default" href="${origin}/${pages.get('en')}"`));
 const graph=JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(graph['@graph'][0].inLanguage,lang);
 assert.equal(graph['@graph'][1]['@type'],'Service');
 assert(!h.includes('assets/i18n.js'),'Static language must not be replaced by stored preference');
 for(const [,href] of h.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){
  if(/^(?:https?:|mailto:)/.test(href))continue;
  assert(fs.existsSync(href.replace(/^\//,'')),`${file}: broken local asset/link ${href}`);
 }
 assert(h.includes('<details>')&&h.includes('mailto:info@atmosferi.com'));
}
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const locations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(locations).size,locations.length);
for(const file of pages.values())assert(locations.includes(`${origin}/${file}`));
for(const url of locations){assert(url.startsWith(origin+'/'));assert(fs.existsSync(url.slice(origin.length+1)||'index.html'));}
assert(fs.readFileSync('robots.txt','utf8').includes(`${origin}/sitemap.xml`));
for(const file of ['index.html','work.html','services.html','pricing.html','studio.html','contact.html']){
 const h=fs.readFileSync(file,'utf8');
 for(const f of pages.values())assert(h.includes(`href="${f}"`),`${file}: language page not discoverable`);
 assert(!/hreflang="(?:cs|de)" href="[^"\n]+\?lang=/.test(h),`${file}: misleading query-string alternate`);
}
console.log(`SEO checks passed: ${pages.size} static languages; ${locations.length} sitemap URLs; metadata, reciprocal hreflang, schema, links and assets.`);
