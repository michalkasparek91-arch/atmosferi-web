import fs from 'node:fs';
import assert from 'node:assert/strict';

const page='guides.html';
const origin='https://www.atmosferi.com';
const html=fs.readFileSync(page,'utf8');
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert(html.includes('<html lang="en">'), 'guides: language');
assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,'guides: one H1');
assert(html.includes('<link rel="canonical" href="'+origin+'/guides">'),'guides: clean canonical');
assert(html.includes('name="robots" content="index, follow'), 'guides: indexable');
assert(html.includes('name="viewport"'),'guides: responsive viewport');
assert(sitemap.includes('<loc>'+origin+'/guides</loc>'),'guides: canonical sitemap entry');
assert(vercel.rewrites.some(r=>r.source==='/guides' && r.destination==='/guides.html'),'guides: Vercel rewrite');
assert(vercel.redirects.some(r=>r.source==='/guides.html' && r.destination==='/guides'),'guides: Vercel HTML redirect');
for (const path of ['assets/site.css','assets/brand-header.css','assets/seo-services.css','assets/guides-index.css','assets/guides-index.js']) {
  assert(html.includes(path),'guides: missing asset '+path);
  assert(fs.existsSync(path),'guides: asset not found '+path);
}
const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert(schema['@type']==='CollectionPage' && schema.url===origin+'/guides','guides: CollectionPage schema');
const categories=['digital','visualisation','development','technical'];
for (const id of categories) {
  assert(html.includes('id="'+id+'"') && html.includes('href="#'+id+'"'),'guides: missing category '+id);
}
const excluded=new Set(['guides.html']);
const articleFiles=fs.readdirSync('.').filter(file=>file.endsWith('.html')&&!excluded.has(file)).filter(file=>{
  const source=fs.readFileSync(file,'utf8');
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(source))return false;
  for (const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let json;try{json=JSON.parse(match[1]);}catch{continue;}
    const nodes=Array.isArray(json['@graph'])?json['@graph']:[json];
    if(nodes.some(node=>node['@type']==='Article'||(Array.isArray(node['@type'])&&node['@type'].includes('Article'))))return true;
  }
  return false;
});
const listed=[...html.matchAll(/<article class="guidehub-entry"[\s\S]*?<a href="([^"]+\.html)">/g)].map(m=>m[1]);
assert(listed.length>=20,'guides: archive unexpectedly small');
assert.equal(listed.length,articleFiles.length,'guides: editorial count must match Article pages');
assert.equal(new Set(listed).size,listed.length,'guides: duplicate links');
for(const file of articleFiles){
  assert(listed.includes(file),'guides: missing article '+file);
  assert(fs.existsSync(file),'guides: broken article '+file);
}
for(const href of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const link=href[1].split(/[?#]/)[0];
  if(!link || /^(?:https?:|mailto:)/.test(link) || link==='/guides')continue;
  assert(fs.existsSync(link.replace(/^\//,'')),'guides: broken local URL '+link);
}
for(const f of ['index.html','work.html','services.html','studio.html','contact.html','pricing.html']){
  assert(fs.readFileSync(f,'utf8').includes('href="/guides"'),f+': no directory navigation');
}
assert(html.includes('data-guides-search')&&html.includes('data-guide-row'),'guides: searchable static rows');
assert(html.includes('aria-controls="guidehub-results"'),'guides: search target');
console.log('Guides directory OK: '+listed.length+' indexable Article pages in four groups, canonical route, sitemap, links, structured data and core-page navigation.');
