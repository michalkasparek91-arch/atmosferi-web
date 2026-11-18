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


const livingWall='living-wall-facade-architectural-rendering-review.html';
const livingHtml=fs.readFileSync(livingWall,'utf8');
const livingUrl=origin+'/'+livingWall;
assert.match(livingHtml,/<html lang="en">/, 'living wall: language');
assert.equal((livingHtml.match(/<h1[\s>]/g)||[]).length,1,'living wall: one H1');
assert(livingHtml.includes('<link rel="canonical" href="'+livingUrl+'">'),'living wall: self canonical');
assert.match(livingHtml,/<meta name="robots" content="index, follow/,'living wall: indexable');
assert(livingHtml.includes('name="viewport"'),'living wall: mobile viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(livingHtml.includes('href="assets/'+css+'.css"'),'living wall: stylesheet '+css);
for(const key of ['og:title','og:url','twitter:card'])assert(livingHtml.includes(key),'living wall: social '+key);
const livingSchema=JSON.parse(livingHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(livingSchema['@graph'].some(item=>item['@type']===type),'living wall: schema '+type);
assert(livingSchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-18'),'living wall: date');
assert(locations.includes(livingUrl),'living wall: sitemap');
assert(fs.readFileSync('green-roof-architectural-rendering-accuracy-review.html','utf8').includes('href="'+livingWall+'"'),'living wall: incoming link');
for(const [,href] of livingHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){
 if(/^(?:https?:|mailto:)/.test(href))continue;
 assert(fs.existsSync(href.replace(/^\//,'')),'living wall: missing local link '+href);
}
console.log('Living-wall guide SEO, schema, links, responsive viewport and sitemap checks passed.');


const lightningFile='lightning-protection-roof-architectural-rendering-review.html';
const lightningHtml=fs.readFileSync(lightningFile,'utf8');
const lightningUrl=origin+'/'+lightningFile;
assert.match(lightningHtml,/<html lang="en">/);
assert.equal((lightningHtml.match(/<h1[\s>]/g)||[]).length,1,'lightning: one H1');
assert(lightningHtml.includes('<link rel="canonical" href="'+lightningUrl+'">'),'lightning: canonical');
assert.match(lightningHtml,/<meta name="robots" content="index, follow/);
assert(lightningHtml.includes('name="viewport"'),'lightning: mobile viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(lightningHtml.includes('href="assets/'+css+'.css"'),'lightning: stylesheet '+css);
for(const key of ['og:title','og:url','twitter:card'])assert(lightningHtml.includes(key),'lightning: social '+key);
const lightningSchema=JSON.parse(lightningHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(lightningSchema['@graph'].some(item=>item['@type']===type),'lightning: schema '+type);
assert(lightningSchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-18'),'lightning: date');
assert(locations.includes(lightningUrl),'lightning: sitemap');
assert(fs.readFileSync('photovoltaic-roof-array-architectural-rendering-review.html','utf8').includes('href="'+lightningFile+'"'),'lightning: incoming link');
for(const [,href] of lightningHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.replace(/^\//,'')),'lightning: broken link '+href);}
console.log('Lightning protection guide SEO, schema, incoming links and sitemap checks passed.');


const escapeStairFile='external-escape-stair-architectural-rendering-review.html';
const escapeStairHtml=fs.readFileSync(escapeStairFile,'utf8');
const escapeStairUrl=origin+'/'+escapeStairFile;
assert.match(escapeStairHtml,/<html lang="en">/,'escape stair: language');
assert.equal((escapeStairHtml.match(/<h1[\s>]/g)||[]).length,1,'escape stair: one H1');
assert(escapeStairHtml.includes('<link rel="canonical" href="'+escapeStairUrl+'">'),'escape stair: canonical');
assert.match(escapeStairHtml,/<meta name="robots" content="index, follow/,'escape stair: indexable');
assert(escapeStairHtml.includes('name="viewport"'),'escape stair: mobile viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(escapeStairHtml.includes('href="assets/'+css+'.css"'),'escape stair: CSS '+css);
for(const key of ['og:title','og:url','og:description','twitter:card','twitter:title'])assert(escapeStairHtml.includes(key),'escape stair: social '+key);
const escapeStairSchema=JSON.parse(escapeStairHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(escapeStairSchema['@graph'].some(item=>item['@type']===type),'escape stair: schema '+type);
assert(escapeStairSchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-18'&&item.mainEntityOfPage['@id']===escapeStairUrl+'#webpage'),'escape stair: schema date and URL');
assert(locations.includes(escapeStairUrl),'escape stair: sitemap');
assert(fs.readFileSync('external-stair-drainage-slip-resistant-nosing-rendering-review.html','utf8').includes('href="'+escapeStairFile+'"'),'escape stair: incoming link');
for(const [,href] of escapeStairHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.replace(/^\//,'')),'escape stair: missing link '+href);}
console.log('External escape stair guide metadata, schema, links, viewport and sitemap checks passed.');


const solarCarportFile='solar-carport-architectural-rendering-review.html';
const solarCarportHtml=fs.readFileSync(solarCarportFile,'utf8');
const solarCarportUrl=origin+'/'+solarCarportFile;
assert.match(solarCarportHtml,/<html lang="en">/,'solar carport: language');
assert.equal((solarCarportHtml.match(/<h1[\s>]/g)||[]).length,1,'solar carport: one H1');
assert(solarCarportHtml.includes('<link rel="canonical" href="'+solarCarportUrl+'">'),'solar carport: canonical');
assert.match(solarCarportHtml,/<meta name="robots" content="index, follow/,'solar carport: indexable');
assert(solarCarportHtml.includes('name="viewport"'),'solar carport: mobile viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(solarCarportHtml.includes('href="assets/'+css+'.css"'),'solar carport: CSS '+css);
for(const key of ['og:title','og:url','og:description','twitter:card','twitter:title'])assert(solarCarportHtml.includes(key),'solar carport: social '+key);
const solarCarportSchema=JSON.parse(solarCarportHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(solarCarportSchema['@graph'].some(item=>item['@type']===type),'solar carport: schema '+type);
assert(solarCarportSchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-18'&&item.mainEntityOfPage['@id']===solarCarportUrl+'#webpage'),'solar carport: schema date and URL');
assert(locations.includes(solarCarportUrl),'solar carport: sitemap');
assert(fs.readFileSync('photovoltaic-roof-array-architectural-rendering-review.html','utf8').includes('href="'+solarCarportFile+'"'),'solar carport: incoming link');
for(const [,href] of solarCarportHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.replace(/^\//,'')),'solar carport: missing link '+href);}
console.log('Solar carport guide metadata, schema, links, viewport and sitemap checks passed.');

const substationFile='electrical-substation-enclosure-architectural-rendering-review.html';
const substationHtml=fs.readFileSync(substationFile,'utf8');
const substationUrl=origin+'/'+substationFile;
assert.match(substationHtml,/<html lang="en">/,'substation: language');
assert.equal((substationHtml.match(/<h1[\s>]/g)||[]).length,1,'substation: one H1');
assert(substationHtml.includes('<link rel="canonical" href="'+substationUrl+'">'),'substation: canonical');
assert.match(substationHtml,/<meta name="robots" content="index, follow/,'substation: indexable');
assert(substationHtml.includes('name="viewport"'),'substation: responsive viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(substationHtml.includes('href="assets/'+css+'.css"'),'substation: CSS '+css);
for(const key of ['og:title','og:url','og:description','twitter:card','twitter:title'])assert(substationHtml.includes(key),'substation: social '+key);
const substationSchema=JSON.parse(substationHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(substationSchema['@graph'].some(item=>item['@type']===type),'substation: schema '+type);
assert(substationSchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-19'&&item.mainEntityOfPage['@id']===substationUrl+'#webpage'),'substation: schema date and URL');
assert(locations.includes(substationUrl),'substation: sitemap');
assert(fs.readFileSync('air-source-heat-pump-outdoor-unit-architectural-rendering-review.html','utf8').includes('href="'+substationFile+'"'),'substation: incoming link');
for(const [,href] of substationHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.replace(/^\//,'')),'substation: missing link '+href);}
console.log('Substation guide metadata, schema, links, viewport and sitemap checks passed.');
