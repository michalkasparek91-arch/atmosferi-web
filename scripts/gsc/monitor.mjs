import fs from 'node:fs';

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
function inspectionQueue(now, articles) {
  const newest=articles.slice(0,5).map(x=>x.url);
  const rotationSize=18;
  const slot=Math.floor(now.getTime()/(6*3600_000));
  const rotation=Array.from({length:Math.min(rotationSize,articles.length)},(_,i)=>articles[(slot*rotationSize+i)%articles.length]?.url).filter(Boolean);
  return [...new Set([ORIGIN+'/guides',...newest,...rotation])];
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
  if(!response.ok)throw new Error('Private OIDC-authenticated GSC ingestion failed (HTTP '+response.status+'). No private data written to logs.');
}

async function main(){
  const now=new Date();
  const articles=inspectableArticleUrls();
  if(process.argv.includes('--dry-run')){
    if(articles.length<10)throw Error('Expected at least 10 editorial articles');
    const urls=inspectionQueue(now,articles);
    if(new Set(urls).size!==urls.length)throw Error('Duplicate URLs selected');
    if(urls.some(url=>!url.startsWith(ORIGIN+'/')))throw Error('Non-canonical host in queue');
    console.log('Direct GSC integration dry-run OK: '+articles.length+' editorial articles, '+urls.length+' canonical inspection candidates. No credentials or external APIs used.');
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
  const queue=inspectionQueue(now,articles);
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
