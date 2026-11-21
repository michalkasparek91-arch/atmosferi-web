import { readFile } from 'node:fs/promises';
import { websiteUrl, hostKey } from './business-lead-web.mjs';
import { openPlan, overtureJob } from './de-agency-plan.mjs';
export { overtureJob };

const terms = new Map([
  ['advertising_agency', 'Werbeagentur'], ['internet_marketing_service', 'Online-Marketing-Agentur'],
  ['marketing_agency', 'Marketingagentur'], ['public_relations', 'Kommunikationsagentur'],
]);
const cityKey = (name) => name.normalize('NFC').trim().toLocaleLowerCase('de');

export function loadOverture(db, { release, rows }) {
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(release) || !Array.isArray(rows) || !rows.length) throw new Error('Neplatné vydání Overture.');
  const cities = new Map();
  for (const { name, ags } of db.prepare('select name, ags from municipalities where active=1').all()) {
    const key = cityKey(name);
    cities.set(key, cities.has(key) ? null : ags);
  }
  const sites = new Map();
  let unmatched = 0;
  for (const [id, title, category, websites, locality, datasets] of rows) {
    const ags = cities.get(cityKey(locality));
    if (!ags) { unmatched++; continue; }
    if (!terms.has(category) || !id || !Array.isArray(websites)) throw new Error('Neplatný záznam Overture.');
    for (const website of websites) {
      const url = websiteUrl(website);
      if (!url) continue;
      const key = ags + ':' + hostKey(url);
      if (!sites.has(key)) sites.set(key, [ags, terms.get(category), url.href, title || '', id, (datasets ?? []).join(', ')]);
    }
  }
  if (!sites.size) throw new Error('Žádná použitelná doména v aktivním registru.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const previous = db.prepare("select value from settings where key='overture_release'").get();
    if (previous && JSON.parse(previous.value) === release) {
      db.exec('COMMIT');
      return { release, unchanged: true };
    }
    if (db.prepare("select 1 from jobs where term=? and status='running' limit 1").get(overtureJob)) {
      throw new Error('Právě probíhá dávka Overture. Obnovte katalog po jejím dokončení.');
    }
    db.exec(`create table if not exists overture_sites (
      id integer primary key, ags text not null, searchTerm text not null, url text not null,
      title text not null, placeId text not null, datasets text not null
    ); create index if not exists overture_city on overture_sites(ags,id)`);
    db.exec('delete from overture_sites');
    const add = db.prepare('insert into overture_sites (ags,searchTerm,url,title,placeId,datasets) values (?,?,?,?,?,?)');
    for (const site of sites.values()) add.run(...site);
    db.prepare('delete from search_progress where kind=? and term=?').run('marketing', overtureJob);
    db.prepare('delete from jobs where kind=? and term=?').run('marketing', overtureJob);
    const { changes: municipalities } = db.prepare("insert into jobs(ags,kind,term) select distinct ags,'marketing',? from overture_sites").run(overtureJob);
    db.prepare("insert or replace into settings(key,value) values ('overture_release',?)").run(JSON.stringify(release));
    db.exec('COMMIT');
    return { release, listings: rows.length, unmatched, sites: sites.size, municipalities };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function overturePage(db, ags, cursor, size = 20) {
  const start = Number(cursor ?? 0);
  if (!Number.isSafeInteger(start) || start < 0) throw new Error('Neplatná pozice v Overture.');
  if (!Number.isInteger(size) || size < 1 || size > 20) throw new Error('Neplatná velikost stránky Overture.');
  const rows = db.prepare(`select id,url,title,searchTerm,placeId,datasets from overture_sites
    where ags=? and id>? order by id limit ?`).all(ags, start, size + 1);
  const release = JSON.parse(db.prepare("select value from settings where key='overture_release'").get().value);
  const results = rows.slice(0, size).map(row => ({ ...row, release }));
  return { results, nextCursor: rows.length > size ? String(results.at(-1).id) : null };
}

if (import.meta.main) {
  const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const db = openPlan();
  try { console.log(JSON.stringify(loadOverture(db, snapshot))); }
  finally { db.close(); }
}
