import fs from 'node:fs';
import assert from 'node:assert/strict';

const filename='interactive-floor-plan-design-real-estate.html';
const url='https://www.atmosferi.com/'+filename;
const html=fs.readFileSync(filename,'utf8');
assert.match(html,/<html\s+lang="en"/);
assert.match(html,/<meta name="robots" content="index, follow/);
assert(html.includes('<link rel="canonical" href="'+url+'">'), 'self canonical');
assert.match(html,/<h1>Interactive floor plans for real estate websites\.<\/h1>/);
assert(html.includes('<title>Interactive Floor Plan Design & Development | Atmosferi</title>'), 'targeted service title');
assert(html.includes('How to choose an interactive floor plan service provider.'), 'commercial supplier evaluation intent');
assert(html.includes('id="provider"') && html.includes('01 / Test the actual buyer journey') && html.includes('03 / Make handover part of the offer'), 'concrete selection criteria');
assert(html.includes('Our <a href="demos/meridian/index.html">Meridian demo</a> is a fictional working concept'), 'no fabricated client evidence');
assert(html.includes('href="apartment-floor-plan-publication-qa.html"'), 'plan publication signoff link');
assert(fs.readFileSync('interactive-floor-plans-property-development-website.html','utf8').includes('Atmosferi interactive floor plan design and development service'), 'accurate commercial incoming anchor');

assert.match(html,/<meta name="description" content="Interactive floor plan design service for real estate developers/);
assert(html.includes('<link rel="stylesheet" href="assets/seo-services.css?v=20261120-r">'), 'uses shared responsive brand');
const ld=html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
assert(ld,'JSON-LD exists');
const schema=JSON.parse(ld[1]);
const nodes=schema['@graph'];
assert(nodes.some(n=>n['@type']==='WebPage'&&n.url===url&&n.about?.['@id']===url+'#service'),'WebPage relation');
assert(nodes.some(n=>n['@type']==='Service'&&n.url===url&&n.provider?.name==='Atmosferi°'),'accurate Service schema');
assert(!nodes.some(n=>n['@type']==='Article'),'a service landing is not an editorial guide');
assert.match(html,/Meridian<\/strong> is an interactive residential tower concept/);
assert.match(html,/not a completed commission for a real developer/);
assert.match(html,/All project names, units and availability shown in the concept are illustrative/);
assert.match(html,/href="demos\/meridian\/index.html" target="_blank" rel="noopener noreferrer"/);
assert.match(html,/href="start.html\?from=web"/,'lead CTA');
assert.match(html,/href="\/guides"/,'footer editorial link');
assert.match(html,/href="interactive-floor-plans-property-development-website.html"/,'educational guide');
assert.match(html,/href="property-development-website-unit-availability-sync.html"/,'maintenance guide');
assert.match(html,/href="property-development-website-enquiry-handoff.html"/,'handoff guide');

const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(x=>x[1]);
for(const href of links){
 if(href==='/guides')continue;
 if(href.startsWith('#')||href.startsWith('mailto:')||href.startsWith('https://'))continue;
 const path=href.split(/[?#]/)[0];
 assert(fs.existsSync(path),'Broken local link in service page: '+path);
}
const incoming=[
 'interactive-floor-plans-property-development-website.html',
 'websites-for-architects.html',
 'residential-development-website-content-checklist.html'
];
for(const file of incoming)assert(fs.readFileSync(file,'utf8').includes('href="'+filename+'"'),file+': missing contextual incoming link');
assert(fs.readFileSync('sitemap.xml','utf8').includes('<loc>'+url+'</loc>'),'service discoverable in canonical sitemap');
assert(!fs.readFileSync('guides.html','utf8').includes('href="'+filename+'"'),'keep service page distinct from Article guide directory');

console.log('Interactive floor plan service SEO checks OK: canonical, schema, indexability, links, CTA and honest concept disclaimer.');
