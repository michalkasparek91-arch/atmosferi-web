import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='rammed-earth-wall-architectural-rendering-review.html';
const source='architectural-rendering-material-finish-approval-checklist.html';
const url='https://www.atmosferi.com/'+file;
const html=fs.readFileSync(file,'utf8');
assert.match(html,/<html lang="en">/);
assert.equal((html.match(/<h1[\\s>]/g)||[]).length,1);
assert.match(html,/<meta name="viewport"/);
assert(html.includes('<link rel="canonical" href="'+url+'">'));
assert.match(html,/<meta name="robots" content="index, follow/);
for(const css of ['site','redesign','brand-header','seo-services','seo-guides'])assert(html.includes('href="assets/'+css+'.css"'));
for(const meta of ['og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image'])assert(html.includes(meta));
const graph=JSON.parse(html.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/)[1])['@graph'];
const article=graph.find(x=>x['@type']==='Article'),page=graph.find(x=>x['@type']==='WebPage');
assert(article && page);
assert.equal(page.url,url);
assert.equal(article.mainEntityOfPage['@id'],url+'#webpage');
assert.equal(article.datePublished,'2026-11-22');
assert.equal(article.dateModified,'2026-11-22');
assert.equal(article.inLanguage,'en');
assert(!html.includes('hreflang='));
assert(html.includes('Fictional illustrative scenario'));
assert(fs.readFileSync(source,'utf8').includes('href="'+file+'"'));
assert(fs.readFileSync('sitemap.xml','utf8').includes('<loc>'+url+'</loc>'));
for(const [,href] of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)){
 if(/^(?:https?:|mailto:)/.test(href))continue;
 if(href==='/guides'){assert(fs.existsSync('guides.html'));continue;}
 assert(fs.existsSync(href.replace(/^\\//,'')),'missing '+href);
}
console.log('Rammed-earth visual QA: canonical, schema, links, metadata, mobile viewport and sitemap OK.');
