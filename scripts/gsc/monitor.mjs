import fs from 'node:fs';

const DOMAIN = 'atmosferi.com';
const SITE = 'sc-domain:' + DOMAIN;
const ORIGIN = 'https://www.' + DOMAIN;
const TOKEN = process.env.GSC_ACCESS_TOKEN || '';
const SPREADSHEET_ID = process.env.GSC_SPREADSHEET_ID || '';
const SHEETS = {
  Overview: ['checked_at_utc','site','period_start','period_end','clicks','impressions','ctr','average_position','inspected_urls','indexed_urls','other_urls','inspection_errors'],
  Inspection: ['checked_at_utc','url','verdict','coverage_state','indexing_state','last_crawl_time','google_canonical','user_canonical','error'],
  Queries: ['checked_at_utc','query','clicks','impressions','ctr','average_position'],
  LandingPages: ['checked_at_utc','url','clicks','impressions','ctr','average_position']
};

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
function valueRows(rows,checkedAt){
  return (rows||[]).map(row=>[checkedAt,...row.keys,Number(row.clicks||0),Number(row.impressions||0),Number(row.ctr||0),Number(row.position||0)]);
}
async function ensureTabs() {
  const path='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(SPREADSHEET_ID);
  const data=await google(path+'?fields=sheets(properties(title))');
  const existing=new Set((data.sheets||[]).map(s=>s.properties?.title).filter(Boolean));
  const missing=Object.keys(SHEETS).filter(name=>!existing.has(name));
  if(missing.length){
    await google(path+':batchUpdate',{method:'POST',body:{requests:missing.map(name=>({addSheet:{properties:{title:name}}}))}});
    for(const name of missing)await appendValues(name,[SHEETS[name]]);
  }
}
async function appendValues(tab,values){
  if(!values.length)return;
  const addr="'"+tab+"'!A:Z";
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(SPREADSHEET_ID)+'/values/'+encodeURIComponent(addr)+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  await google(url,{method:'POST',body:{majorDimension:'ROWS',values}});
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
  if(!TOKEN||!SPREADSHEET_ID)throw Error('GSC is not configured. Set GitHub Actions variables and WIF in the setup guide.');
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
  await ensureTabs();
  await appendValues('Overview',[[checkedAt,SITE,startDate,endDate,Number(t.clicks||0),Number(t.impressions||0),Number(t.ctr||0),Number(t.position||0),inspections.length,indexed,inspections.length-indexed-errors,errors]]);
  await appendValues('Inspection',inspections.map(x=>[checkedAt,x.url,x.verdict,x.coverage,x.indexing,x.lastCrawl,x.googleCanonical,x.userCanonical,x.error]));
  await appendValues('Queries',valueRows(queries.rows,checkedAt));
  await appendValues('LandingPages',valueRows(pages.rows,checkedAt));
  // Never print non-public query/traffic/index data to public GitHub Actions logs.
  console.log('Direct Google Search Console check completed. Private results written to the designated Google Sheet.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
