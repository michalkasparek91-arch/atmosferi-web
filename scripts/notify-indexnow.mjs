import fs from 'node:fs';
const origin='https://www.atmosferi.com';
const key=fs.readFileSync('indexnow-key.txt','utf8').trim();
if(!/^[a-zA-Z0-9-]{8,128}$/.test(key))throw new Error('Invalid IndexNow key format');
const parse=xml=>{
 if(!/<urlset\b/.test(xml))throw new Error('Expected a sitemap URL set');
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
 if(!urls.length||new Set(urls).size!==urls.length)throw new Error('Empty or duplicate sitemap');
 for(const u of urls){const p=new URL(u);if(p.origin!==origin||p.search||p.hash)throw new Error(`Unexpected URL: ${u}`);}
 return urls;
};
if(process.argv.includes('--dry-run')){
 const urls=parse(fs.readFileSync('sitemap.xml','utf8'));
 console.log(`Dry run: ${urls.length} canonical URLs; verification file and payload valid. No network requests or submissions.`);
 process.exit(0);
}
async function get(url){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error(`${url}: HTTP ${r.status}`);
 return r.text();
}
// Always read production, never submit localhost, preview or build-only URLs.
// Verify deployed ownership and the live sitemap before any notification.
if((await get(`${origin}/indexnow-key.txt`)).trim()!==key)throw new Error('Production verification file is not deployed or does not match; nothing submitted.');
const urls=parse(await get(`${origin}/sitemap.xml`));
const expected=parse(fs.readFileSync('sitemap.xml','utf8'));
if(JSON.stringify([...urls].sort())!==JSON.stringify([...expected].sort()))throw new Error('Production sitemap differs from this release; nothing submitted.');
for(const u of urls){
 const r=await fetch(u,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error(`Indexable URL unavailable: ${u} (${r.status}); nothing submitted.`);
 if(/noindex/i.test(r.headers.get('x-robots-tag')||''))throw new Error(`Indexable URL blocked: ${u}`);
}
for(let i=0;i<urls.length;i+=10000){
 const r=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),
  body:JSON.stringify({host:new URL(origin).host,key,keyLocation:`${origin}/indexnow-key.txt`,urlList:urls.slice(i,i+10000)}),
 });
 if(![200,202].includes(r.status))throw new Error(`IndexNow rejected notification: HTTP ${r.status}`);
 console.log(`IndexNow received ${Math.min(10000,urls.length-i)} URLs (HTTP ${r.status}). Receipt does not confirm indexing.`);
}
