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
for(const url of locations){assert(url.startsWith(origin+'/'));const path=url.slice(origin.length+1)||'index.html';assert(fs.existsSync(path)||fs.existsSync(path+'.html'),`${url}: no file`);}
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


const atriumFile='atrium-smoke-curtain-architectural-rendering-review.html';
const atriumHtml=fs.readFileSync(atriumFile,'utf8');
const atriumUrl=origin+'/'+atriumFile;
assert.match(atriumHtml,/<html lang="en">/,'atrium: language');
assert.equal((atriumHtml.match(/<h1[\s>]/g)||[]).length,1,'atrium: one H1');
assert(atriumHtml.includes('<link rel="canonical" href="'+atriumUrl+'">'),'atrium: canonical');
assert.match(atriumHtml,/<meta name="robots" content="index, follow/,'atrium: indexable');
assert(atriumHtml.includes('name="viewport"'),'atrium: mobile viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(atriumHtml.includes('href="assets/'+css+'.css"'),'atrium: CSS '+css);
for(const key of ['og:title','og:url','og:description','twitter:card','twitter:title'])assert(atriumHtml.includes(key),'atrium: social '+key);
const atriumSchema=JSON.parse(atriumHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(atriumSchema['@graph'].some(item=>item['@type']===type),'atrium: schema '+type);
assert(atriumSchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-19'&&item.mainEntityOfPage['@id']===atriumUrl+'#webpage'),'atrium: schema date and URL');
assert(locations.includes(atriumUrl),'atrium: sitemap');
assert(fs.readFileSync('fire-door-closer-hold-open-interior-rendering-review.html','utf8').includes('href="'+atriumFile+'"'),'atrium: incoming link');
for(const [,href] of atriumHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.replace(/^\//,'')),'atrium: missing link '+href);}
console.log('Atrium smoke curtain guide metadata, schema, links, viewport and sitemap checks passed.');


const uncertaintyFile='architectural-visualisation-uncertainty-register.html';
const uncertaintyHtml=fs.readFileSync(uncertaintyFile,'utf8');
const uncertaintyUrl=origin+'/'+uncertaintyFile;
assert.match(uncertaintyHtml,/<html lang="en">/,'uncertainty: language');
assert.equal((uncertaintyHtml.match(/<h1[\s>]/g)||[]).length,1,'uncertainty: one H1');
assert(uncertaintyHtml.includes('<link rel="canonical" href="'+uncertaintyUrl+'">'),'uncertainty: canonical');
assert.match(uncertaintyHtml,/<meta name="robots" content="index, follow/,'uncertainty: indexable');
assert(uncertaintyHtml.includes('name="viewport"'),'uncertainty: mobile viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(uncertaintyHtml.includes('href="assets/'+css+'.css"'),'uncertainty: CSS '+css);
for(const key of ['og:title','og:description','og:url','twitter:card','twitter:title'])assert(uncertaintyHtml.includes(key),'uncertainty: social '+key);
const uncertaintySchema=JSON.parse(uncertaintyHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(uncertaintySchema['@graph'].some(item=>item['@type']===type),'uncertainty: schema '+type);
assert(uncertaintySchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-19'&&item.mainEntityOfPage['@id']===uncertaintyUrl+'#webpage'),'uncertainty: schema date and URL');
assert(locations.includes(uncertaintyUrl),'uncertainty: sitemap');
assert(fs.readFileSync('architectural-design-options-rendering-comparison.html','utf8').includes('href="'+uncertaintyFile+'"'),'uncertainty: incoming link');
for(const [,href] of uncertaintyHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.startsWith('/')?href.slice(1):href),'uncertainty: missing local link '+href);}
console.log('Uncertainty register guide SEO, schema, links, viewport and sitemap checks passed.');


// Property availability editorial guide: release metadata and discoverability.
const availabilityFile='property-development-website-unit-availability-sync.html';
const availabilityHtml=fs.readFileSync(availabilityFile,'utf8');
const availabilityUrl=origin+'/'+availabilityFile;
assert.match(availabilityHtml,/<html lang="en">/);
assert.equal((availabilityHtml.match(/<h1[\s>]/g)||[]).length,1,'availability: one H1');
assert(availabilityHtml.includes('<link rel="canonical" href="'+availabilityUrl+'">'),'availability: canonical');
assert.match(availabilityHtml,/<meta name="robots" content="index, follow/);
assert(availabilityHtml.includes('name="viewport"'),'availability: responsive viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(availabilityHtml.includes('href="assets/'+css+'.css"'),'availability: CSS '+css);
for(const key of ['og:title','og:description','og:url','twitter:card','twitter:title'])assert(availabilityHtml.includes(key),'availability: social '+key);
const availabilitySchema=JSON.parse(availabilityHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(availabilitySchema['@graph'].some(item=>item['@type']===type),'availability: schema '+type);
assert(availabilitySchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-20'&&item.mainEntityOfPage['@id']===availabilityUrl+'#webpage'),'availability: schema date and URL');
assert(locations.includes(availabilityUrl),'availability: sitemap');
assert(fs.readFileSync('interactive-floor-plans-property-development-website.html','utf8').includes('href="'+availabilityFile+'"'),'availability: incoming link');
for(const [,href] of availabilityHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.startsWith('/')?href.slice(1):href),'availability: missing link '+href);}
console.log('Apartment availability guide SEO, schema, links, viewport and sitemap checks passed.');


const enquiryFile='property-development-website-enquiry-handoff.html';
const enquiryHtml=fs.readFileSync(enquiryFile,'utf8');
const enquiryUrl=origin+'/'+enquiryFile;
assert.match(enquiryHtml,/<html lang="en">/,'enquiry: language');
assert.equal((enquiryHtml.match(/<h1[\s>]/g)||[]).length,1,'enquiry: one H1');
assert(enquiryHtml.includes('<link rel="canonical" href="'+enquiryUrl+'">'),'enquiry: canonical');
assert.match(enquiryHtml,/<meta name="robots" content="index, follow/,'enquiry: indexable');
assert(enquiryHtml.includes('name="viewport"'),'enquiry: viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(enquiryHtml.includes('href="assets/'+css+'.css"'),'enquiry: CSS '+css);
for(const key of ['og:title','og:description','og:url','twitter:card','twitter:title'])assert(enquiryHtml.includes(key),'enquiry: social '+key);
const enquirySchema=JSON.parse(enquiryHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(enquirySchema['@graph'].some(item=>item['@type']===type),'enquiry: schema '+type);
assert(enquirySchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-20'&&item.mainEntityOfPage['@id']===enquiryUrl+'#webpage'),'enquiry: schema date');
assert(locations.includes(enquiryUrl),'enquiry: sitemap');
assert(fs.readFileSync('interactive-floor-plans-property-development-website.html','utf8').includes('href="'+enquiryFile+'"'),'enquiry: incoming link');
for(const [,href] of enquiryHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.startsWith('/')?href.slice(1):href),'enquiry: broken link '+href);}
console.log('Enquiry handoff guide SEO, schema, links, viewport and sitemap checks passed.');


// Architecture portfolio taxonomy: standalone editorial guide, not a generated service page.
const taxonomyFile='architecture-portfolio-project-filters-taxonomy.html';
const taxonomyHtml=fs.readFileSync(taxonomyFile,'utf8');
const taxonomyUrl=origin+'/'+taxonomyFile;
assert.match(taxonomyHtml,/<html lang="en">/,'taxonomy: language');
assert.equal((taxonomyHtml.match(/<h1[\s>]/g)||[]).length,1,'taxonomy: one H1');
assert(taxonomyHtml.includes('<link rel="canonical" href="'+taxonomyUrl+'">'),'taxonomy: canonical');
assert.match(taxonomyHtml,/<meta name="robots" content="index, follow/,'taxonomy: indexable');
assert(taxonomyHtml.includes('name="viewport"'),'taxonomy: mobile viewport');
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(taxonomyHtml.includes('href="assets/'+css+'.css"'),'taxonomy: CSS '+css);
for(const key of ['og:title','og:description','og:url','twitter:card','twitter:title','twitter:description'])assert(taxonomyHtml.includes(key),'taxonomy: social '+key);
const taxonomySchema=JSON.parse(taxonomyHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
for(const type of ['Article','WebPage'])assert(taxonomySchema['@graph'].some(item=>item['@type']===type),'taxonomy: schema '+type);
assert(taxonomySchema['@graph'].some(item=>item['@type']==='Article'&&item.datePublished==='2026-11-20'&&item.mainEntityOfPage['@id']===taxonomyUrl+'#webpage'),'taxonomy: schema date and URL');
assert(locations.includes(taxonomyUrl),'taxonomy: sitemap');
assert(fs.readFileSync('cms-for-architecture-portfolio-website.html','utf8').includes('href="'+taxonomyFile+'"'),'taxonomy: incoming link');
for(const [,href] of taxonomyHtml.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.startsWith('/')?href.slice(1):href),'taxonomy: missing local link '+href);}
console.log('Portfolio taxonomy guide SEO, schema, links, viewport and sitemap checks passed.');

// General architecture studio contact form guide: verify editorial metadata and discoverability.
{
 const file='architecture-studio-contact-form-deliverability-qa.html', html=fs.readFileSync(file,'utf8'), url=origin+'/'+file;
 assert.match(html,/<html lang="en">/);
 assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,file+': one H1');
 assert(html.includes('<link rel="canonical" href="'+url+'">'),file+': canonical');
 assert.match(html,/<meta name="robots" content="index, follow/);
 assert(html.includes('name="viewport"'),file+': mobile viewport');
 for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(html.includes('href="assets/'+css+'.css"'),file+': CSS '+css);
 for(const key of ['og:title','og:description','og:url','twitter:card','twitter:title'])assert(html.includes(key),file+': social '+key);
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 for(const type of ['Article','WebPage'])assert(graph.some(x=>x['@type']===type),file+': schema '+type);
 assert(graph.some(x=>x['@type']==='Article'&&x.datePublished==='2026-11-20'&&x.mainEntityOfPage['@id']===url+'#webpage'),file+': date and entity');
 assert(locations.includes(url),file+': sitemap');
 assert(fs.readFileSync('cms-for-architecture-portfolio-website.html','utf8').includes('href="'+file+'"'),file+': incoming link');
 for(const [,href] of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(?:https?:|mailto:)/.test(href))continue;assert(fs.existsSync(href.startsWith('/')?href.slice(1):href),file+': broken local link '+href);}
 console.log('Architecture studio contact form QA guide checks passed.');
}
