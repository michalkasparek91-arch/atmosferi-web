import fs from 'node:fs';
export const origin='https://www.atmosferi.com';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
// Root HTML files are shipped by the existing build. Deliberately exclude the
// dynamic case shell, internal exports and fictional demo practice websites.
const excluded=new Set(['case.html','email-templates.html','extracted_html.html','index-print.html']);
const files=fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!excluded.has(f));
files.push('demos/atmosferi-viz/index.html');
const pages=[];
for(const file of files){
 const html=fs.readFileSync(file,'utf8');
 if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))continue;
 const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
 if(!canonical)throw new Error(`${file}: indexable public page needs a canonical URL`);
 const expected=origin+'/'+(file==='index.html'?'':file);
 if(canonical!==expected)throw new Error(`${file}: canonical must be ${expected}, got ${canonical}`);
 const alternates=[...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)/gi)].map(m=>({lang:m[1],href:m[2]}));
 pages.push({file,url:canonical,alternates});
}
const byUrl=new Map(pages.map(p=>[p.url,p]));
for(const p of pages){
 const languages=new Set();
 for(const a of p.alternates){
  if(languages.has(a.lang))throw new Error(`${p.file}: duplicate hreflang ${a.lang}`);
  languages.add(a.lang);
  const target=byUrl.get(a.href);
  if(!target)throw new Error(`${p.file}: alternate is not an indexable local page: ${a.href}`);
  if(!target.alternates.some(b=>b.href===p.url))throw new Error(`${p.file}: missing reciprocal alternate from ${target.file}`);
 }
}
pages.sort((a,b)=>a.url.localeCompare(b.url));
fs.writeFileSync('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map(p=>`  <url>\n    <loc>${escape(p.url)}</loc>${p.alternates.map(a=>`\n    <xhtml:link rel="alternate" hreflang="${escape(a.lang)}" href="${escape(a.href)}"/>`).join('')}\n  </url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync('robots.txt',`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Generated sitemap with ${pages.length} indexable canonical URLs.`);
