import { readFile } from 'node:fs/promises';
import { websiteUrl, hostKey } from './business-lead-web.mjs';
import { openPlan, overtureJob } from './de-agency-plan.mjs';
import { cityAliasesByCountry, markets } from './business-lead-markets.mjs';
import { germanBoundaries } from './business-lead-boundaries.mjs';
export { overtureJob };

const terms = new Map([
  ['advertising_agency', 'Werbeagentur'], ['internet_marketing_service', 'Online-Marketing-Agentur'],
  ['marketing_agency', 'Marketingagentur'], ['public_relations', 'Kommunikationsagentur'],
]);
const cityKey = name => (name ?? '').normalize('NFC').trim().toLowerCase();
const releaseKey = country => country === 'DE' ? 'overture_release' : 'overture_release_' + country;

function appendSites(db, byCity) {
  const oldSites = db.prepare('select id,url,eligible from overture_sites where ags=? order by id');
  const insert = db.prepare('insert into overture_sites (ags,searchTerm,url,title,placeId,datasets,address) values (?,?,?,?,?,?,?)');
  const ensureJob = db.prepare("insert or ignore into jobs(ags,kind,term) values (?,'marketing',?)");
  const resume = db.prepare(`update search_progress set cursor=?,seen=?
    where ags=? and kind='marketing' and term=? and engine='overture' and cursor is null
    and exists(select 1 from jobs where ags=? and kind='marketing' and term=? and status='done')`);
  const requeue = db.prepare("update jobs set status='pending',due=0 where ags=? and kind='marketing' and term=? and status='done'");
  let added = 0, municipalities = 0;
  for (const [ags, rows] of byCity) {
    const previous = oldSites.all(ags);
    const hosts = new Set(previous.filter(row => row.eligible).map(row => hostKey(new URL(row.url))));
    const extra = rows.filter(row => !hosts.has(hostKey(new URL(row[2]))));
    if (!extra.length) continue;
    // A completed job has a null cursor. Take its old end before appending;
    // partial and retrying jobs already have the cursor they need.
    ensureJob.run(ags, overtureJob);
    if (previous.length) resume.run(String(previous.at(-1).id), JSON.stringify([...hosts]), ags, overtureJob, ags, overtureJob);
    requeue.run(ags, overtureJob);
    for (const row of extra) insert.run(...row);
    added += extra.length;
    municipalities++;
  }
  return { added, municipalities };
}

export function loadOverture(db, { release, country = 'DE', rows }, boundaries) {
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(release) || !Array.isArray(rows) || !rows.length) throw new Error('Neplatné vydání Overture.');
  if (!Object.hasOwn(markets,country)) throw new Error('Neznámá země katalogu.');
  const registry = db.prepare('select name,ags from municipalities where active=1 and country=?').all(country);
  if (!registry.length) throw new Error('Nejdřív ulož obce této země v místním panelu.');
  const activeIds = new Set(registry.map(row => row.ags));
  const cities = new Map();
  for (const { name, ags } of registry) {
    const key = cityKey(name);
    if (!cities.has(key)) cities.set(key, []);
    cities.get(key).push(ags);
  }
  const aliases = new Map();
  for (const [name, alternatives] of Object.entries(cityAliasesByCountry[country] ?? {})) {
    const ids = cities.get(cityKey(name));
    if (ids?.length === 1) for (const alias of alternatives) {
      if (!cities.has(cityKey(alias))) aliases.set(cityKey(alias), ids);
    }
  }
  const byCity = new Map();
  const sites = new Map();
  const rejectedIds = new Set();
  const coverage = {release,country,listings:rows.length,exact:0,alias:0,geometry:0,unknown:0,ambiguous:0,conflict:0};
  coverage.boundaries = Boolean(boundaries);
  coverage.boundaryYear = boundaries?.year ?? null;
  for (const [id, title, category, websites, locality, datasets, postcode, , lon, lat] of rows) {
    if (!terms.has(category) || !id || !Array.isArray(websites)) throw new Error('Neplatný záznam Overture.');
    const keyCity = cityKey(locality);
    const candidates = cities.get(keyCity) ?? aliases.get(keyCity) ?? [];
    const spatialId = boundaries?.locate(lon,lat);
    if (spatialId && (!activeIds.has(spatialId) || (candidates.length && !candidates.includes(spatialId)))) {
      coverage.conflict++;
      rejectedIds.add(id);
      continue;
    }
    const ags = spatialId ?? (candidates.length === 1 ? candidates[0] : null);
    if (!ags) { coverage[candidates.length ? 'ambiguous' : 'unknown']++; continue; }
    coverage[candidates.length !== 1 ? 'geometry' : aliases.has(keyCity) ? 'alias' : 'exact']++;
    for (const website of websites) {
      const url = websiteUrl(website);
      if (!url) continue;
      const key = ags + ':' + hostKey(url);
      if (sites.has(key)) continue;
      const address = spatialId && candidates.length !== 1 ? JSON.stringify({locality,postcode,ambiguous:candidates.length>1}) : null;
      const site = [ags, terms.get(category), url.href, title || '', id, (datasets ?? []).join(', '), address];
      sites.set(key, site);
      if (!byCity.has(ags)) byCity.set(ags, []);
      byCity.get(ags).push(site);
    }
  }
  coverage.sites = sites.size;
  coverage.municipalities = byCity.size;
  coverage.unmatched = coverage.unknown + coverage.ambiguous + coverage.conflict;
  const ownCities = 'select ags from municipalities where country=?';
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare("select 1 from jobs where term=? and status='running' and ags in ("+ownCities+") limit 1").get(overtureJob,country)) {
      throw new Error('V této zemi právě běží dávka Overture. Aktualizaci zopakujte po jejím dokončení.');
    }
    const setting = db.prepare('insert or replace into settings(key,value) values (?,?)');
    const previous = db.prepare('select value from settings where key=?').get(releaseKey(country));
    const previousRelease = previous && JSON.parse(previous.value);
    const same = previousRelease === release;
    if (previousRelease && previousRelease.localeCompare(release,'en',{numeric:true}) > 0) throw new Error('V plánu už je novější vydání.');
    const lastCoverage = db.prepare('select value from settings where key=?').get('overture_coverage_'+country);
    if (lastCoverage && JSON.parse(lastCoverage.value).boundaries && !boundaries)
      throw new Error('Pro obnovu této země použij katalog se souřadnicemi a hranicemi.');
    if (!same && previous && !sites.size) throw new Error('Prázdný katalog by přepsal předchozí vydání.');
    let excluded = 0;
    if (previous) {
      const hide = db.prepare('update overture_sites set eligible=0 where id=?');
      const metadata = db.prepare('update overture_sites set searchTerm=?, url=?, title=?, placeId=?, datasets=?, address=? where id=?');
      const old = db.prepare('select * from overture_sites where eligible=1 and ags in ('+ownCities+')');
      for (const row of old.all(country)) {
        const candidate = sites.get(row.ags + ':' + hostKey(new URL(row.url)));
        if (!candidate && (!same || rejectedIds.has(row.placeId))) excluded += hide.run(row.id).changes;
        if (candidate && [row.searchTerm,row.url,row.title,row.placeId,row.datasets,row.address].some((v,i) => v !== candidate[i+1]))
          metadata.run(...candidate.slice(1),row.id);
      }
    }
    const delta = appendSites(db, byCity);
    setting.run(releaseKey(country),JSON.stringify(release));
    setting.run('overture_coverage_'+country, JSON.stringify(coverage));
    db.exec('COMMIT');
    return { ...coverage, added:delta.added, excluded, unchanged:Boolean(same && !delta.added && !excluded) };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function overturePage(db, ags, cursor, size = 20) {
  const start = Number(cursor ?? 0);
  if (!Number.isSafeInteger(start) || start < 0) throw new Error('Neplatná pozice v Overture.');
  if (!Number.isInteger(size) || size < 1 || size > 20) throw new Error('Neplatná velikost stránky Overture.');
  const rows = db.prepare(`select id,url,title,searchTerm,placeId,datasets,address from overture_sites
    where ags=? and id>? and eligible=1 order by id limit ?`).all(ags, start, size + 1);
  const {country} = db.prepare('select country from municipalities where ags=?').get(ags);
  const release = JSON.parse(db.prepare('select value from settings where key=?').get(releaseKey(country)).value);
  const results = rows.slice(0, size).map(({address,...row}) => ({ ...row, release, catalogAddress:address ? JSON.parse(address) : null }));
  return { results, nextCursor: rows.length > size ? String(results.at(-1).id) : null };
}

if (import.meta.main) {
  const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const boundaries = snapshot.country === 'DE' && snapshot.rows.some(row => Number.isFinite(row[8])) ? await germanBoundaries() : null;
  const db = openPlan();
  try { console.log(JSON.stringify(loadOverture(db, snapshot,boundaries))); }
  finally { db.close(); }
}
