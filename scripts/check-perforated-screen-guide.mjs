import fs from 'node:fs';
import assert from 'node:assert/strict';

const file='perforated-metal-facade-screen-rendering-review.html';
const source='external-sun-shading-louvers-architectural-rendering-review.html';
const origin='https://www.atmosferi.com/';
const url=origin+file;
const html=fs.readFileSync(file,'utf8');
assert.match(html,/<html lang="en">/);
assert.equal((html.match(/<h1[\\s>]/g)||[]).length,1,'one H1');
assert(html.includes('name="viewport"'),'mobile viewport');
assert(html.includes('<link rel="canonical" href="'+url+'">'),'self canonical');
assert.match(html,/<meta name="robots" content="index, follow/);
for(const css of ['site','redesign','brand-header','seo-services','seo-guides']){
 assert(html.includes('href="assets/'+css+'.css"'),'missing CSS '+css);
}
for(const key of ['og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image'])assert(html.includes(key),'missing social metadata '+key);
const data=JSON.parse(html.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/)[1]);
const article=data['@graph'].find(x=>x['@type']==='Article');
const page=data['@graph'].find(x=>x['@type']==='WebPage');
assert(article && page,'Article and WebPage schema');
assert.equal(article.datePublished,'2026-11-21');
assert.equal(article.dateModified,'2026-11-21');
assert.equal(article.mainEntityOfPage['@id'],url+'#webpage');
assert.equal(page.url,url);
assert.equal(article.inLanguage,'en');
assert(!html.includes('hreflang='),'no invented translations');
assert(html.includes('Fictional illustrative scenario'),'fiction disclosed');
assert(!/<p>\\s*<ul/.test(html),'list not nested in paragraph');
assert(fs.readFileSync(source,'utf8').includes('href="'+file+'"'),'incoming contextual link');
assert(fs.readFileSync('sitemap.xml','utf8').includes('<loc>'+url+'</loc>'),'sitemap generated entry');
for(const [,href] of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){
 if(/^(?:https?:|mailto:)/.test(href))continue;
 if(href==='/guides'){assert(fs.existsSync('guides.html'));continue;}
 assert(fs.existsSync(href.replace(/^\\//,'')),'broken local link '+href);
}
console.log('Perforated-screen guide: canonical, Article/WebPage schema, dates, metadata, links, mobile viewport and sitemap OK.');
