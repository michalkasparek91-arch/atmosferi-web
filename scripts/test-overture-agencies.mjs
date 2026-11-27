import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openPlan, claimJobs, finishJobs, currentMunicipality, updateControl, recordImport, recentImports } from './lib/de-agency-plan.mjs';
import { loadOverture, overtureJob, overturePage } from './lib/overture-agencies.mjs';
import { collect, search } from './find-business-leads.mjs';
import { municipalBoundaryIndex } from './lib/business-lead-boundaries.mjs';
import { scopeConfig, updateScope } from './lib/de-agency-plan.mjs';
import { siteLocality } from './lib/business-lead-web.mjs';

test('a namesake requires the catalog postcode on the company site', () => {
  const candidate = {country:'DE',targetCity:'Neustadt',catalogAddress:{ambiguous:true,locality:'Neustadt',postcode:'12345'}};
  const place = siteLocality(candidate);
  assert.equal(place.matches('kontakt in neustadt'),false);
  assert.equal(place.matches('12346 neustadt'),false);
  assert.equal(place.matches('kontakt: 12345 neustadt'),true);
  const district = siteLocality({...candidate,targetCity:'Beispiel',catalogAddress:{ambiguous:false,locality:'Ortsteil',postcode:'12345'}});
  assert.equal(district.matches('ortsteil'),false);
  assert.equal(district.matches('12345 ortsteil'),true);
});

test('polygons distinguish same-name municipalities, respect holes and withhold conflicting addresses', t => {
  const db = openPlan(':memory:');
  t.after(() => db.close());
  db.exec("insert into municipalities(ags,name,search_name,district,land,population) values ('a','Neustadt','','','',1),('b','Neustadt','','','',1),('c','Other','','','',1)");
  const map = municipalBoundaryIndex();
  const box = (x,y,w) => [[x,y],[x+w,y],[x+w,y+w],[x,y+w],[x,y]];
  map.add('a',{type:'Polygon',coordinates:[box(10,50,1),box(10.4,50.4,0.2)]});
  map.add('b',{type:'MultiPolygon',coordinates:[[box(11,50,1)]]});
  assert.equal(map.locate(10.5,50.5),null);
  assert.equal(map.locate(11.0001,50.5),null);
  const row = (id,city,x,y) => [id,'Agency','marketing_agency',['https://'+id+'.example'],city,[],null,null,x,y];
  const release = '2026-11-18.0';
  const rows = [row('one','Neustadt',10.2,50.2),row('two','Neustadt',11.2,50.2),row('three','Ortsteil',10.2,50.2),
    row('edge','Neustadt',11.0001,50.5),row('wrong','Other',10.2,50.2),row('outside','Ortsteil',13,55)];
  loadOverture(db,{release,rows:[rows[4]]});
  const report = loadOverture(db,{release,country:'DE',rows},map);
  assert.deepEqual([report.geometry,report.ambiguous,report.conflict,report.unknown,report.excluded],[3,1,1,1,1]);
  assert.deepEqual(overturePage(db,'a',null).results.map(r=>r.placeId),['one','three']);
  assert.equal(overturePage(db,'c',null).results.length,0);
  assert.equal(loadOverture(db,{release,country:'DE',rows},map).unchanged,true);
  assert.equal(scopeConfig(db).markets.DE.catalog.unmatched,3);
});

test('foreign catalog follows country selection and new releases resume at the first added domain', t => {
  const db = openPlan(':memory:');
  t.after(() => db.close());
  db.exec("insert into municipalities(ags,name,search_name,district,land,population) values ('de','Wien','','','',1)");
  const row = (id,city) => [id,'Agency','marketing_agency',['https://'+id+'.example'],city,[]];
  const release = '2026-10-21.0';
  loadOverture(db,{release,rows:[row('g','Wien')]});
  updateScope(db,{country:'AT',active:['AT'],overture:true,cities:['Wien'],keywords:{marketing:[],architect:[],developer:[]},revision:0});
  loadOverture(db,{country:'AT',release,rows:[row('a','Vienna'),row('retired','Wien')]});
  const [job] = claimJobs(db,10,{catalogOnly:true});
  assert.equal(job.country,'AT');
  finishJobs(db,[{...job,paging:{engine:'overture',cursor:null,number:1},matches:new Set()}],[]);
  const update = loadOverture(db,{country:'AT',release:'2026-11-18.0',rows:[row('a','Wien'),row('b','Wien')]});
  assert.deepEqual([update.added,update.excluded],[1,1]);
  const [next] = claimJobs(db,10,{catalogOnly:true});
  assert.deepEqual(overturePage(db,next.ags,next.previous_cursor).results.map(r=>r.placeId),['b']);
  assert.equal(overturePage(db,'de',null).results[0].release,release);
  assert.equal(overturePage(db,next.ags,null).results.length,2);
});

test('same-release city aliases append unseen hosts and retain independent completed and partial cursors', t => {
  const db = openPlan(':memory:');
  t.after(() => db.close());
  db.exec(`insert into municipalities(ags,name,search_name,district,land,population) values
    ('01','Köln','koln','','',3), ('02','München','munchen','','',2), ('03','Nürnberg','nurnberg','','',1),
    ('04','Neustadt','neustadt','','',0), ('05','Neustadt','neustadt','','',0)`);
  const row = (id,city) => [id,'Agency','marketing_agency', ['https://'+id+'.example'],city,[]];
  const data = { release:'2026-11-18.0', rows:[row('a','Köln'),row('b','München'),row('c','München')] };
  loadOverture(db,data);
  for (const [city, size] of [['01',20],['02',1]]) {
    const [job] = claimJobs(db,1,{catalogOnly:true});
    assert.equal(job.ags,city);
    const page = overturePage(db,city,null,size);
    finishJobs(db,[{...job,matches:new Set(page.results.map(r=>new URL(r.url).hostname)),
      paging:{engine:'overture',number:1,cursor:page.nextCursor}}],[]);
  }
  data.rows.push(row('a','Cologne'),row('d','Cologne'),row('e','Munich'),row('f','Nuremberg'),row('g','Neustadt'));
  const [running] = claimJobs(db,1,{catalogOnly:true});
  assert.throws(()=>loadOverture(db,data),/právě běží/);
  assert.equal(db.prepare('select count(*) n from overture_sites').get().n,3);
  finishJobs(db,[{...running,error:'temporary failure'}],[]);
  assert.equal(loadOverture(db,data).added,3);
  assert.equal(loadOverture(db,data).unchanged,true);
  for (const [city,ids] of [['01',['d']],['02',['c','e']],['03',['f']]]) {
    const progress = db.prepare('select cursor from search_progress where ags=?').get(city);
    assert.deepEqual(overturePage(db,city,progress?.cursor).results.map(r=>r.placeId),ids);
  }
  assert.equal(db.prepare("select status from jobs where ags='02'").get().status,'retry');
  assert.equal(db.prepare("select count(*) n from jobs where ags in ('04','05')").get().n,0);
});

test('small towns share eight workers, preserve their own cursor and serialize shared domains', async t => {
  const db = openPlan(':memory:');
  t.after(() => db.close());
  const rows = [];
  for (let city = 0; city < 10; city++) {
    const name = 'Stadt ' + city;
    db.prepare("insert into municipalities(ags,name,search_name,district,land,population) values(?,?,?,'','',?)")
      .run(String(city),name,name,100-city);
    const size = city === 8 ? 17 : 1;
    for (let n=0; n<size; n++) {
      const host = city < 2 ? 'shared.example' : `city${city}-${n}.example`;
      rows.push([`${city}-${n}`,name,'advertising_agency',['https://' + host],name,[]]);
    }
  }
  loadOverture(db,{release:'2026-11-18.0',rows});
  const activeHosts = new Set();
  const seenIds = new Set();
  let peak = 0;
  for (let pass=0; pass<3; pass++) {
    const jobs = claimJobs(db,12,{ catalogOnly:true, catalogSiteLimit:12 });
    if (pass === 0) assert.equal(jobs.length,9);
    const batch = await collect({countries:'DE',types:'marketing',engine:'bing',limit:'12'},{
      jobs, searchBudget:jobs.length, visited:()=>false,
      overturePage:(job,cursor,size)=>overturePage(db,job.ags,cursor,size),
      visit(job){ job.batchFetched=(job.batchFetched || 0)+1; }, save:()=>finishJobs(db,jobs,[]),
    },async site=>{
      const host=site.url.hostname;
      assert.equal(activeHosts.has(host),false);
      activeHosts.add(host);
      peak=Math.max(peak,activeHosts.size);
      assert.equal(seenIds.has(site.placeId),false);
      seenIds.add(site.placeId);
      assert.equal(site.placeId.split('-')[0],site.job.ags);
      assert.equal(site.targetCity,site.job.name);
      assert.equal(site.searchTerm,'Werbeagentur');
      await new Promise(resolve=>setTimeout(resolve,2));
      activeHosts.delete(host);
      return null;
    });
    assert.ok(batch.sites<=12);
    if (pass===0) {
      assert.equal(db.prepare("select count(*) n from jobs where status='done'").get().n,8);
      assert.ok(db.prepare("select cursor from search_progress where ags='8'").get().cursor);
    }
  }
  assert.equal(peak,8);
  assert.equal(seenIds.size,rows.length);
  assert.deepEqual(claimJobs(db,12,{catalogOnly:true}),[]);
  assert.equal(db.prepare("select sum(fetched) n from run_history").get().n,rows.length);
});

test('hourly import count ignores duplicates and expires old receipts', t=>{
  const db=openPlan(':memory:');
  t.after(()=>db.close());
  const end=Date.now();
  recordImport(db,'old',6,end-3600000);
  recordImport(db,'current',3,end-500);
  recordImport(db,'current',0,end);
  recordImport(db,'duplicate',0,end);
  assert.equal(recentImports(db,end).inserted,3);
  assert.equal(recentImports(db,end+3600000).inserted,0);
});

test('idle work checks only catalogued sites, leaves the search city in place and obeys pause and scope', async t => {
  const db = openPlan(':memory:');
  t.after(() => db.close());
  db.exec(`insert into municipalities(ags,name,search_name,district,land,population) values
    ('11000000','Berlin','berlin','','Berlin',2),('02000000','Hamburg','hamburg','','Hamburg',1);
    insert into jobs(ags,kind,term) values ('11000000','marketing','Marketingagentur')`);
  loadOverture(db, { release: '2026-11-18.0', rows: [['p','Agency','marketing_agency',['https://agency.example'],'Hamburg',[]]] });
  const [regular] = claimJobs(db,1);
  finishJobs(db,[{ ...regular, matches:new Set(), paging:{ engine:'seznam', number:1, cursor:'next-page' } }],[]);
  const claim = () => claimJobs(db,1,{ catalogOnly:true });
  updateControl(db,{ paused:true }); assert.deepEqual(claim(),[]);
  updateControl(db,{ paused:false, kinds:['architect'] }); assert.deepEqual(claim(),[]);
  updateControl(db,{ kinds:['marketing'] });
  const [job] = claim();
  assert.equal(job.name,'Hamburg');
  assert.equal(job.term,overtureJob);
  let searches = 0;
  t.mock.method(globalThis,'fetch',async () => { searches++; throw new Error('Unexpected search engine'); });
  await collect({ countries:'DE',types:'marketing',engine:'bing',limit:'40' }, {
    jobs:[job], searchBudget:1, overturePage:(job,cursor,size)=>overturePage(db,job.ags,cursor,size),
    visited:()=>false,visit(){},save:()=>finishJobs(db,[job],[]),
  },async () => null);
  assert.equal(searches,0);
  assert.deepEqual(claim(),[]);
  assert.equal(currentMunicipality(db).ags,'11000000');
  assert.equal(claimJobs(db,1)[0].previous_cursor,'next-page');
});

test('municipal collector resumes Overture once per domain across batches', () => {
  const db = openPlan(':memory:');
  try {
    db.exec(`insert into settings values ('registry','true');
      insert into municipalities(ags,name,search_name,district,land,population) values
      ('11000000','Berlin','berlin','Berlin','Berlin',1),('02','Neustadt','neustadt','A','A',1),
      ('03','Neustadt','neustadt','B','B',1)`);
    const rows = Array.from({ length: 42 }, (_, n) =>
      [String(n), 'Agentur', 'advertising_agency', [`https://agentur${n}.de`], 'Berlin', ['dataset']]);
    rows.push(rows[0], ['other', 'Agentur', 'marketing_agency', ['https://other.de'], 'Neustadt', []]);
    const snapshot = { release: '2026-11-18.0', rows };
    assert.equal(loadOverture(db, snapshot).sites, 42);
    const ids = new Set();
    for (const [index, size] of [20, 20, 2].entries()) {
      const [job] = claimJobs(db, 1);
      assert.equal(job.term, overtureJob);
      const { results, nextCursor } = overturePage(db, job.ags, job.previous_cursor);
      assert.equal(results.length, size);
      assert.equal(Boolean(nextCursor), index < 2);
      assert.ok(results.every(row => row.searchTerm === 'Werbeagentur' && row.release === snapshot.release));
      for (const row of results) ids.add(row.placeId);
      job.paging = { engine: 'overture', cursor: nextCursor, number: index + 1 };
      job.matches = ids;
      finishJobs(db, [job], []);
      assert.equal(loadOverture(db, snapshot).unchanged, true);
    }
    assert.equal(ids.size, 42);
    assert.equal(claimJobs(db, 1).length, 0);
  } finally { db.close(); }
});

test('spare crawl capacity consumes local rows without skipping the next unvisited host', async () => {
  const db = openPlan(':memory:');
  try {
    db.exec(`insert into settings values ('registry','true');
      insert into municipalities(ags,name,search_name,district,land,population) values
      ('11000000','Berlin','berlin','Berlin','Berlin',1)`);
    const rows = Array.from({ length: 52 }, (_, n) =>
      [String(n), 'Agentur', 'marketing_agency', [`https://studio${n}.example`], 'Berlin', []]);
    loadOverture(db, { release: '2026-11-18.0', rows });
    const fetched = [];
    for (const count of [25, 24]) {
      const jobs = claimJobs(db, 1);
      const batch = await collect({ countries: 'DE', types: 'marketing', engine: 'seznam', limit: '25' }, {
        jobs, searchBudget: 1,
        visited: (_, host) => ['studio1.example', 'studio15.example', 'studio25.example'].includes(host),
        overturePage: (job, cursor, size) => overturePage(db, job.ags, cursor, size),
        visit() {}, save: () => finishJobs(db, jobs, []),
      }, async site => { fetched.push(site.url.hostname); return null; });
      assert.equal(batch.sites, count);
      assert.equal(batch.requests, 1);
    }
    assert.equal(new Set(fetched).size, 49);
    assert.equal(claimJobs(db, 1).length, 0);
  } finally { db.close(); }
});

test('Seznam accepts only the confirmed end-of-range redirect', async t => {
  const first = 'https://search.seznam.cz/?q=Werbeagentur';
  const html = '<a data-e-a="heading" title="Přejít na: https://example.de" href="https://example.de">Agentur</a>' +
    '<a data-e-a="next" href="/?q=Werbeagentur&amp;from=20">Další</a>';
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, url: first, text: async () => html }));
  const page = offset => search('Werbeagentur', 'DE', 'de', 'seznam', first + '&from=' + offset, { pageable: true });
  assert.equal((await page(500)).sourceLimit, true);
  await assert.rejects(page(480), /přesměroval/);
});

test('Bing continues through overlapping domains and stops at a repeated result page after restart', async t => {
  const pages = ['a', 'b', 'c', 'b'];
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    const path = pages[requests++];
    return { ok: true, text: async () => `<rss><item><link>https://studio.example/${path}</link></item></rss>` };
  });
  const values = { countries: 'DE', types: 'marketing', engine: 'bing', limit: '40' };
  const job = { name: 'Berlin', ags: '11000000', kind: 'marketing', term: 'Werbeagentur' };
  const background = { jobs: [job], visited: () => true, save() {}, searchBudget: 2 };
  await collect(values, background);
  assert.equal(job.paging.cursor, '3');
  job.previous_engine = 'bing';
  job.previous_cursor = job.paging.cursor;
  job.previous_pages = job.paging.number;
  job.previous_hosts = JSON.stringify({ hosts: [...job.matches], signatures: [...job.signatures] });
  await collect(values, background);
  assert.equal(requests, 4);
  assert.equal(job.paging.cursor, null);
  assert.equal(job.matches.size, 1);
});
