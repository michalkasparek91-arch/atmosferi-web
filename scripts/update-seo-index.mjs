import fs from 'node:fs';
const origin='https://www.atmosferi.com';
const core=['index.html','work.html','services.html','pricing.html','studio.html','contact.html','case.html'];
const translated=['websites-for-architects.html','weby-pro-architekty.html','webdesign-fuer-architekten.html','nettsider-for-arkitekter.html'];
const langs=['en','cs','de','nb'];
const languageNav=`<nav class="international-links" aria-label="Website design for architects by language"><span>Websites for architects</span><a href="websites-for-architects.html" hreflang="en" lang="en">English</a><a href="weby-pro-architekty.html" hreflang="cs" lang="cs">Česky</a><a href="webdesign-fuer-architekten.html" hreflang="de" lang="de">Deutsch</a><a href="nettsider-for-arkitekter.html" hreflang="nb" lang="nb">Norsk</a></nav>`;
for(const file of core){
 let html=fs.readFileSync(file,'utf8').replaceAll('https://atmosferi.com','https://www.atmosferi.com');
 // These query-string translations canonicalize to the English page and are
 // not static equivalents. Only declare the new fully translated URL cluster.
 html=html.replace(/<link rel="alternate" hreflang="(?:cs|de)"[^>]*>\r?\n/g,'');
 html=html.replace(/<footer\b[\s\S]*?<\/footer>/,footer=>footer
  .replace(/<nav class="international-links"[\s\S]*?<\/nav>\s*/g,'')
  .replace('</footer>',`${languageNav}\n</footer>`));
 if(file==='index.html'){
  html=html.replace(/<title>[^<]*<\/title>/,'<title>Web Design for Architects &amp; Architectural Visualisation | Atmosferi</title>');
 }
 fs.writeFileSync(file,html);
}
const vizFile='demos/atmosferi-viz/index.html';
fs.writeFileSync(vizFile,fs.readFileSync(vizFile,'utf8')
 .replaceAll('https://atmosferi.com','https://www.atmosferi.com')
 .replace(/<link rel="alternate" hreflang="(?:cs|de)"[^>]*>\r?\n/g,''));
fs.writeFileSync('robots.txt',`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
await import('./generate-sitemap.mjs');
console.log(`Updated crawlable language links on ${core.length} pages.`);
