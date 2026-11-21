import fs from 'node:fs';
import { inspectionQueue } from './inspection-queue.mjs';

const DOMAIN = 'atmosferi.com';
const SITE = 'sc-domain:' + DOMAIN;
const ORIGIN = 'https://www.' + DOMAIN;
const TOKEN = process.env.GSC_ACCESS_TOKEN || '';
const INGEST_ENDPOINT = 'https://paryiowezqlnffanxtnt.supabase.co/functions/v1/gsc-ingest';

function dateUTC(d) { return d.toISOString().slice(0,10); }
function daysBefore(date, n) { return new Date(date.getTime()-n*86400_000); }
function inspectableArticleUrls() {
  const candidates=[];
  for (const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))) {
    const source=fs.readFileSync(file,'utf8');
    if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(source)) continue;
    for (const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      let json;
      try {json=JSON.parse(match[1]);} catch {continue;}
      const nodes = Array.isArray(json['@graph']) ? json['@graph'] : [json];
      const article=nodes.find(node=>[node['@type']].flat().includes('Article'));
      if (!article) continue;
      const url=ORIGIN+'/'+file;
      const canonical=source.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
      if (canonical !== url) break; // inspect only valid canonical articles
      const date=String(article.datePublished||article.dateModified||'').slice(0,10);
      candidates.push({url,date});
      break;
    }
  }
  return candidates.sort((a,b)=>b.date.localeCompare(a.date)||a.url.localeCompare(b.url));
}
function inspectableServiceUrls() {
  const candidates=[];
  for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))) {
    const source=fs.readFileSync(file,'utf8');
    if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(source))continue;
    const canonical=source.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
    if(canonical!==ORIGIN+'/'+file)continue;
    for(const match of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
      let data;
      try{data=JSON.parse(match[1]);}catch{continue;}
      const nodes=Array.isArray(data['@graph'])?data['@graph']:[data];
      if(nodes.some(n=>[n?.['@type']].flat().includes('Service'))){
        candidates.push(canonical);
        break;
      }
    }
  }
  return candidates.sort();
}
function inspectablePublicUrls() {
  const clean = {'guides.html':'guides','for-agencies.html':'for-agencies'};
  const known = new Set();
  for (const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))) {
    const source=fs.readFileSync(file,'utf8');
    if (/<meta\\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(source)) continue;
    const canonical=source.match(/<link\\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
    const expected=ORIGIN + '/' + (file === 'index.html' ? '' : (clean[file] || file));
    if (canonical === expected) known.add(canonical);
  }
  return [...known].sort();
}
async function google(url,{method='GET',body}={}) {
  const res=await fetch(url,{
    method,
    headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  if (!res.ok) {
    // This runs in a PUBLIC repository. Never print response bodies or GSC data.
    const host=new URL(url).hostname;
    throw new Error('Google API request to '+host+' failed with HTTP '+res.status);
  }
  return await res.json();
}
function searchAnalytics(startDate,endDate,dimensions=[],rowLimit=100) {
  return google('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(SITE)+'/searchAnalytics/query',{
    method:'POST',body:{startDate,endDate,dimensions,rowLimit,type:'web'}
  });
}
async function inspect(url) {
  try {
    const result=await google('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{
      method:'POST',body:{inspectionUrl:url,siteUrl:SITE,languageCode:'en-US'}
    });
    const details=result.inspectionResult?.indexStatusResult||{};
    return {
      url,
      verdict:details.verdict||'UNKNOWN',
      coverage:details.coverageState||'',
      indexing:details.indexingState||'',
      lastCrawl:details.lastCrawlTime||'',
      googleCanonical:details.googleCanonical||'',
      userCanonical:details.userCanonical||'',
      error:''
    };
  } catch(error) {
    // Record only status, never the potentially sensitive upstream response.
    return {url,verdict:'ERROR',coverage:'',indexing:'',lastCrawl:'',googleCanonical:'',userCanonical:'',error:error.message};
  }
}
function analyticsRows(rows,dimension) {
  return (rows || []).map(row=>({
    [dimension]:String(row.keys?.[0] || ''),
    clicks:Number(row.clicks||0),
    impressions:Number(row.impressions||0),
    ctr:Number(row.ctr||0),
    average_position:Number(row.position||0)
  }));
}
async function githubOidcToken() {
  const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL || '';
  const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN || '';
  if(!endpoint||!requestToken)throw Error('GitHub OIDC environment is unavailable. Enable id-token: write on the workflow.');
  const url=new URL(endpoint);
  url.searchParams.set('audience',INGEST_ENDPOINT);
  const response=await fetch(url,{
    headers:{Authorization:'Bearer '+requestToken,Accept:'application/json'}
  });
  if(!response.ok)throw Error('GitHub OIDC token request failed (HTTP '+response.status+')');
  const data=await response.json();
  if(typeof data.value!=='string'||!data.value)throw Error('GitHub OIDC response is missing a signed token');
  return data.value;
}
async function writePrivateReport(payload) {
  const signedToken=await githubOidcToken();
  const response=await fetch(INGEST_ENDPOINT,{
    method:'POST',
    headers:{
      'Authorization':'Bearer '+signedToken,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(payload)
  });
  if(!response.ok) {
    // Only log a fixed validation category, never GSC metrics, URLs or queries.
    let validationCategory='';
    if(response.status===422) {
      try {
        const result=await response.json();
        const match=String(result?.message||'').match(/^Invalid Search Console report \((INVALID_[A-Z_]+)\)$/);
        if(match)validationCategory=' ['+match[1]+']';
      } catch { /* no private data can reach public GitHub logs */ }
    }
    throw new Error('Private OIDC-authenticated GSC ingestion failed (HTTP '+response.status+')'+validationCategory+'. No private data written to logs.');
  }
}

async function main(){
  const now=new Date();
  const articles=inspectableArticleUrls();
  const services=inspectableServiceUrls();
  const canonicalUrls=inspectablePublicUrls();
  if(process.argv.includes('--dry-run')){
    if(articles.length<10)throw Error('Expected at least 10 editorial articles');
    const priority=ORIGIN+'/interactive-floor-plans-property-development-website.html';
    const service=ORIGIN+'/interactive-floor-plan-design-real-estate.html';
    if(!services.includes(service))throw Error('Commercial service landing is not discoverable for Search Console inspection');
    const urls=inspectionQueue(now,articles,services,canonicalUrls,[{keys:[priority],impressions:316}]);
    if(new Set(urls).size!==urls.length)throw Error('Duplicate URLs selected');
    if(urls.length>32)throw Error('URL Inspection batch exceeds private validator limit');
    for(const url of [ORIGIN+'/',ORIGIN+'/guides',priority,service]){
      if(!urls.includes(url))throw Error('Critical index-monitor URL omitted from batch: '+url);
    }
    if(urls.some(url=>!canonicalUrls.includes(url)))throw Error('Non-canonical or unknown page in inspection queue');
    const slot=Math.floor(now.getTime()/(6*3600_000));
    const monitored=new Set();
    const cycles=Math.ceil(articles.length/16)+Math.ceil(services.length/4)+8;
    for(let i=0;i<cycles;i++){
      const auditTime=new Date((slot+i)*6*3600_000);
      inspectionQueue(auditTime,articles,services,canonicalUrls,[{keys:[priority],impressions:316}])
        .forEach(url=>monitored.add(url));
    }
    if(articles.some(article=>!monitored.has(article.url)))throw Error('Rotating GSC archive does not cover all canonical articles');
    if(services.some(url=>!monitored.has(url)))throw Error('Rotating GSC archive does not cover all canonical services');
    console.log('Direct GSC integration dry-run OK: '+articles.length+' editorial articles, '+services.length+' service pages, '+canonicalUrls.length+' indexable canonical pages; all articles/services covered across test cycles. No credentials or external APIs used.');
    return;
  }
  if(!TOKEN)throw Error('Google Search Console token is not configured. Grant the service account access and enable OIDC.');
  const sites=await google('https://www.googleapis.com/webmasters/v3/sites');
  if(!(sites.siteEntry||[]).some(x=>x.siteUrl===SITE&&x.permissionLevel!=='siteUnverifiedUser')){
    throw new Error('Service account has no verified Search Console access to '+SITE+'. Grant access to exact domain property.');
  }
  const endDate=dateUTC(daysBefore(now,3));
  const startDate=dateUTC(daysBefore(now,30));
  const [total,queries,pages]=await Promise.all([
    searchAnalytics(startDate,endDate,[],1),
    searchAnalytics(startDate,endDate,['query'],25),
    searchAnalytics(startDate,endDate,['page'],25)
  ]);
  const queue=inspectionQueue(now,articles,services,canonicalUrls,pages.rows||[]);
  const inspections=[];
  for(const url of queue)inspections.push(await inspect(url));
  const checkedAt=now.toISOString();
  const t=total.rows?.[0]||{};
  const indexed=inspections.filter(x=>x.verdict==='PASS').length;
  const errors=inspections.filter(x=>x.verdict==='ERROR').length;
  await writePrivateReport({
    checked_at:checkedAt,site:SITE,period_start:startDate,period_end:endDate,
    clicks:Number(t.clicks||0),impressions:Number(t.impressions||0),
    ctr:Number(t.ctr||0),average_position:Number(t.position||0),
    inspected_urls:inspections.length,indexed_urls:indexed,inspection_errors:errors,
    inspections:inspections.map(x=>({
      url:x.url,verdict:x.verdict,coverage_state:x.coverage,
      indexing_state:x.indexing,last_crawl_time:x.lastCrawl,
      google_canonical:x.googleCanonical,user_canonical:x.userCanonical,error:x.error
    })),
    queries:analyticsRows(queries.rows,'query'),
    pages:analyticsRows(pages.rows,'url')
  });
  // This workflow runs in a public repo. No private counts or query data in logs.
  console.log('Direct Search Console audit completed; results saved to private Supabase for the Atmosferi admin.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
