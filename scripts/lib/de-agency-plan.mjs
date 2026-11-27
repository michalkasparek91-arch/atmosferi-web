import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { termsByKind } from './business-lead-taxonomy.mjs';
import { markets } from './business-lead-markets.mjs';
import { createHash } from 'node:crypto';

export const workDir = fileURLToPath(new URL('../../artifacts/private/lead-finder/de-agencies/', import.meta.url));
export const overtureJob = 'Overture Places';
export const states = ['Schleswig-Holstein', 'Hamburg', 'Niedersachsen', 'Bremen', 'Nordrhein-Westfalen', 'Hessen', 'Rheinland-Pfalz',
  'Baden-Württemberg', 'Bayern', 'Saarland', 'Berlin', 'Brandenburg', 'Mecklenburg-Vorpommern', 'Sachsen', 'Sachsen-Anhalt', 'Thüringen'];
const kindNames = Object.keys(termsByKind);
const hour = 3_600_000;
const now = () => Date.now();
const label = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function openPlan(filename = join(workDir, 'plan.sqlite')) {
  if (filename !== ':memory:') mkdirSync(workDir, { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA busy_timeout=5000;
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS municipalities (
      ags TEXT PRIMARY KEY, name TEXT NOT NULL, search_name TEXT NOT NULL, district TEXT NOT NULL,
      land TEXT NOT NULL, population INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1, priority INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS jobs (
      ags TEXT NOT NULL REFERENCES municipalities(ags), kind TEXT NOT NULL, term TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', due INTEGER NOT NULL DEFAULT 0,
      started INTEGER, finished INTEGER, failures INTEGER NOT NULL DEFAULT 0,
      matches INTEGER NOT NULL DEFAULT 0, fetched INTEGER NOT NULL DEFAULT 0, contacts INTEGER NOT NULL DEFAULT 0,
      error TEXT, force INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (ags, kind, term)
    );
    CREATE TABLE IF NOT EXISTS visited (
      kind TEXT NOT NULL, host TEXT NOT NULL, until INTEGER NOT NULL, PRIMARY KEY (kind, host)
    );
    CREATE TABLE IF NOT EXISTS search_progress (
      ags TEXT NOT NULL, kind TEXT NOT NULL, term TEXT NOT NULL, engine TEXT NOT NULL,
      cursor TEXT, pages INTEGER NOT NULL, seen TEXT NOT NULL, PRIMARY KEY (ags, kind, term),
      FOREIGN KEY (ags, kind, term) REFERENCES jobs(ags, kind, term)
    );
    CREATE INDEX IF NOT EXISTS jobs_schedule ON jobs(kind, status, due);
    CREATE INDEX IF NOT EXISTS jobs_activity ON jobs((status='running') DESC, started DESC) WHERE started IS NOT NULL;
    CREATE INDEX IF NOT EXISTS municipality_name ON municipalities(name);
    CREATE TABLE IF NOT EXISTS plan_terms (country TEXT, kind TEXT, term TEXT, PRIMARY KEY(country,kind,term));
    CREATE TABLE IF NOT EXISTS plan_countries (country TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS run_history (id INTEGER PRIMARY KEY, ags TEXT, kind TEXT, term TEXT,
      finished INTEGER, status TEXT, pages INTEGER, fetched INTEGER, contacts INTEGER, error TEXT);
    CREATE TABLE IF NOT EXISTS import_receipts (batch TEXT PRIMARY KEY, confirmed INTEGER NOT NULL, inserted INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS import_receipts_time ON import_receipts(confirmed);
    CREATE TABLE IF NOT EXISTS overture_sites (
      id INTEGER PRIMARY KEY, ags TEXT NOT NULL, searchTerm TEXT NOT NULL, url TEXT NOT NULL,
      title TEXT NOT NULL, placeId TEXT NOT NULL, datasets TEXT NOT NULL, eligible INTEGER NOT NULL DEFAULT 1, address TEXT
    );
    CREATE INDEX IF NOT EXISTS overture_city ON overture_sites(ags,id);
    INSERT OR IGNORE INTO settings VALUES ('import_metrics_since', cast(unixepoch()*1000 as text));
    INSERT OR IGNORE INTO settings VALUES ('paused', 'false'), ('kinds', '["marketing"]');
  `);
  if (!db.prepare('pragma table_info(overture_sites)').all().some(col => col.name === 'eligible')) changes(db, () => {
    if (!db.prepare('pragma table_info(overture_sites)').all().some(col => col.name === 'eligible'))
      db.exec('alter table overture_sites add column eligible integer not null default 1');
  });
  if (!db.prepare('pragma table_info(overture_sites)').all().some(col => col.name === 'address')) changes(db, () => {
    if (!db.prepare('pragma table_info(overture_sites)').all().some(col => col.name === 'address'))
      db.exec('alter table overture_sites add column address text');
  });
  if (!db.prepare("pragma table_info(municipalities)").all().some(col => col.name === 'country')) changes(db, () => {
    if (!db.prepare("pragma table_info(municipalities)").all().some(col => col.name === 'country'))
      db.exec("alter table municipalities add column country text not null default 'DE'");
  });
  if (!readSetting(db, 'scope_ready')) changes(db, () => {
    if (readSetting(db, 'scope_ready')) return;
    db.exec("insert or ignore into plan_countries values ('DE')");
    const add = db.prepare('insert or ignore into plan_terms values (?,?,?)');
    for (const [kind, terms] of Object.entries(termsByKind)) for (const term of terms) add.run('DE', kind, term);
    add.run('DE', 'marketing', overtureJob);
    writeSetting(db, 'scope_ready', true);
  });
  db.exec(`create temp view scoped_jobs as select j.*, j.rowid as sequence, m.country from jobs j
    join municipalities m using(ags) join plan_countries c on c.country=m.country
    join plan_terms t on t.country=m.country and t.kind=j.kind and t.term=j.term`);
  const taxonomy = JSON.stringify(termsByKind);
  if (readSetting(db, 'taxonomy') !== taxonomy) changes(db, () => {
    const addTerm = db.prepare("insert or ignore into jobs (ags,kind,term) select ags,?,? from municipalities where active=1 and country='DE'");
    for (const [kind, terms] of Object.entries(termsByKind)) for (const term of terms) addTerm.run(kind, term);
    writeSetting(db, 'taxonomy', taxonomy);
  });
  return db;
}

function changes(db, callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = callback();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function readSetting(db, key) {
  const record = db.prepare('select value from settings where key=?').get(key);
  return record ? JSON.parse(record.value) : null;
}

function writeSetting(db, key, value) {
  db.prepare('insert into settings values (?,?) on conflict(key) do update set value=excluded.value').run(key, JSON.stringify(value));
}

export function control(db) {
  return { paused: readSetting(db, 'paused'), kinds: readSetting(db, 'kinds'), registry: readSetting(db, 'registry') };
}

function countryConfig(db, country) {
  const stored = readSetting(db, 'scope_' + country);
  if (stored) return stored;
  const [, , cities, terms] = markets[country];
  return { cities: country === 'DE' ? [] : cities, overture: country === 'DE',
    keywords: country === 'DE' ? termsByKind : Object.fromEntries(kindNames.map((kind, i) => [kind, [terms[i]]])) };
}

export function scopeConfig(db) {
  return { revision: readSetting(db, 'scope_revision') || 0,
    active: db.prepare('select country from plan_countries order by country').all().map(r => r.country),
    markets: Object.fromEntries(Object.entries(markets).map(([country, [,name]]) =>
      [country, { name, ...countryConfig(db, country), catalog: readSetting(db, 'overture_coverage_' + country) }])) };
}

function invalid(message, status = 400) { throw Object.assign(new Error(message), { status }); }

function cleanList(values, max) {
  if (!Array.isArray(values) || values.length > max) invalid('Příliš mnoho položek nebo neplatný seznam.');
  const seen = new Set();
  return values.map(value => {
    if (typeof value !== 'string' || !value.trim() || value.length > 120 || /[\x00-\x1f]/.test(value)) invalid('Každá položka musí mít 1 až 120 znaků.');
    return value.trim().normalize('NFC');
  }).filter(value => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function materialize(db, country, config) {
  if (country !== 'DE') {
    db.prepare('update municipalities set active=0 where country=?').run(country);
    const put = db.prepare(`insert into municipalities(ags,name,search_name,district,land,population,country)
      values(?,?,?,'',?,0,?) on conflict(ags) do update set active=1,name=excluded.name,search_name=excluded.search_name`);
    for (const city of config.cities) {
      const id = country + '-' + createHash('sha256').update(city.toLowerCase()).digest('hex').slice(0,24);
      put.run(id, city, label(city), markets[country][1], country);
    }
  }
  db.prepare('delete from plan_terms where country=?').run(country);
  const insert = db.prepare('insert into plan_terms values (?,?,?)');
  const jobs = db.prepare('insert or ignore into jobs(ags,kind,term) select ags,?,? from municipalities where country=? and active=1');
  for (const [kind, terms] of Object.entries(config.keywords)) for (const term of terms) {
    insert.run(country, kind, term);
    jobs.run(kind, term, country);
  }
  if (config.overture) insert.run(country, 'marketing', overtureJob);
}

export function updateScope(db, data) {
  const { country, keywords } = data;
  if (!Object.hasOwn(markets, country) || !Array.isArray(data.active) || !data.active.length ||
    !data.active.every(code => Object.hasOwn(markets, code))) invalid('Vyber alespoň jednu podporovanou zemi.');
  const active = [...new Set(data.active)];
  const config = { cities: country === 'DE' ? [] : cleanList(data.cities, 5000), overture: data.overture === true,
    keywords: Object.fromEntries(kindNames.map(kind => [kind, cleanList(keywords?.[kind], 50)])) };
  if (country !== 'DE' && !config.cities.length) invalid('Zadej alespoň jednu obec.');
  if (Object.values(config.keywords).flat().some(term => term.toLowerCase() === overtureJob.toLowerCase())) invalid('Overture Places má vlastní přepínač.');
  return changes(db, () => {
    const revision = readSetting(db, 'scope_revision') || 0;
    if (revision !== data.revision) invalid('Plán se mezitím změnil. Obnov stránku a zopakuj úpravu.', 409);
    for (const code of active) {
      const planned = code === country ? config : countryConfig(db, code);
      if (!control(db).kinds.some(kind => planned.keywords[kind].length || (kind === 'marketing' && planned.overture)))
        invalid('Pro aktivní zemi ' + markets[code][1] + ' chybí výraz ve vybraných oborech.');
    }
    if (!readSetting(db, 'scope_' + country) || JSON.stringify(countryConfig(db, country)) !== JSON.stringify(config))
      materialize(db, country, config);
    writeSetting(db, 'scope_' + country, config);
    db.exec('delete from plan_countries');
    for (const code of active) {
      if (code !== 'DE' && code !== country && !readSetting(db, 'scope_' + code)) {
        const defaults = countryConfig(db, code);
        materialize(db, code, defaults);
        writeSetting(db, 'scope_' + code, defaults);
      }
      db.prepare('insert into plan_countries values (?)').run(code);
    }
    writeSetting(db, 'scope_revision', revision + 1);
    return scopeConfig(db);
  });
}

export function currentMunicipality(db, kinds = control(db).kinds, timestamp = now()) {
  const ags = readSetting(db, 'current_municipality');
  if (!ags) return null;
  return db.prepare(`select m.ags, m.name, count(*) as total, sum(j.status='done' and j.due>?) as done,
    sum(j.status='running') as running, sum(j.status<>'running' and j.due<=?) as ready,
    min(case when j.status='retry' then j.due end) as retry_at
    from municipalities m join scoped_jobs j using (ags)
    where m.ags=? and m.active=1 and m.enabled=1 and j.kind in (${kinds.map(() => '?')})
    group by m.ags having total>done`).get(timestamp, timestamp, ags, ...kinds) ?? null;
}

export function updateControl(db, input) {
  if (typeof input.paused === 'boolean') writeSetting(db, 'paused', input.paused);
  if (Array.isArray(input.kinds) && input.kinds.length && input.kinds.every((kind) => kindNames.includes(kind))) {
    writeSetting(db, 'kinds', [...new Set(input.kinds)]);
  }
  return control(db);
}

export function updateMunicipality(db, ags, input) {
  const current = db.prepare('select enabled, priority from municipalities where ags=? and active=1').get(ags);
  if (!current) return false;
  changes(db, () => {
    db.prepare('update municipalities set enabled=?, priority=? where ags=?').run(
      typeof input.enabled === 'boolean' ? Number(input.enabled) : current.enabled,
      typeof input.priority === 'boolean' ? Number(input.priority) : current.priority, ags,
    );
    if (input.rescan === true) {
      db.prepare(`delete from search_progress where ags=? and exists (select 1 from jobs j
        where j.ags=search_progress.ags and j.kind=search_progress.kind and j.term=search_progress.term and j.status<>'running')`).run(ags);
      db.prepare(`update jobs set status='pending', due=0, failures=0, error=null, force=1
        where ags=? and status<>'running'`).run(ags);
    }
  });
  return true;
}

export function saveRegistry(db, data) {
  const { rows, source, date } = data;
  const keys = new Set(rows.map(({ ags }) => ags));
  if (rows.length < 10_000 || keys.size !== rows.length || new Set(rows.map((row) => row.ags.slice(0, 2))).size !== states.length) {
    throw new Error('Registr není úplný nebo obsahuje duplicitní klíče.');
  }
  const municipal = db.prepare(`insert into municipalities (ags,name,search_name,district,land,population,active)
    values (?,?,?,?,?,?,1) on conflict(ags) do update set name=excluded.name, search_name=excluded.search_name,
    district=excluded.district, land=excluded.land, population=excluded.population, active=1`);
  const job = db.prepare('insert or ignore into jobs (ags,kind,term) values (?,?,?)');
  return changes(db, () => {
    const config = countryConfig(db, 'DE');
    db.exec("update municipalities set active=0 where country='DE'");
    for (const { ags, name, district, population } of rows) {
      municipal.run(ags, name, label(`${name} ${district} ${ags}`), district, states[Number(ags.slice(0, 2)) - 1], population);
      for (const [kind, terms] of Object.entries(config.keywords)) for (const term of terms) job.run(ags, kind, term);
    }
    const registry = { count: rows.length, source, date };
    writeSetting(db, 'registry', registry);
    return registry;
  });
}

function catalogJobs(db, current, timestamp, jobLimit, siteLimit) {
  const ranked = db.prepare(`select j.*, m.name, m.land, m.district, p.engine as previous_engine,
    p.cursor as previous_cursor, p.pages as previous_pages, p.seen as previous_hosts
    from scoped_jobs j join municipalities m using (ags) left join search_progress p using (ags,kind,term)
    where j.kind='marketing' and j.term=? and m.active=1 and m.enabled=1 and j.due<=?
    order by (j.ags=?) desc,m.priority desc,j.force desc,(j.status='done'),m.population desc,j.ags limit ?`)
    .all(overtureJob, timestamp, current?.ags || '', jobLimit);
  if (!ranked.length) return [];
  const countPage = db.prepare('select count(*) as n from (select id from overture_sites where ags=? and id>? and eligible=1 order by id limit ?)');
  let remaining = siteLimit;
  const jobs = [];
  for (const job of ranked) {
    // Reserve only rows this city can actually supply. Never advance a cursor for
    // rows that would overflow the shared crawl batch.
    const size = Math.min(20, remaining);
    const cursor = job.previous_engine === 'overture' ? Number(job.previous_cursor) : 0;
    remaining -= countPage.get(job.ags, cursor, size).n;
    jobs.push({ ...job, catalogPageSize: size });
    if (!remaining) break;
  }
  return jobs;
}

export function claimJobs(db, limit, { catalogOnly = false, catalogSiteLimit = 40 } = {}) {
  return changes(db, () => {
    const state = control(db);
    if (state.paused) return [];
    const timestamp = now();
    db.prepare("update jobs set status='retry', due=?, error='Předchozí běh se přerušil' where status='running' and started<?")
      .run(timestamp, timestamp - hour);
    if (db.prepare("select 1 from jobs where status='running' limit 1").get()) return [];
    db.exec(`update jobs set status='pending', due=0
      where status='done' and not exists (select 1 from search_progress p
        where p.ags=jobs.ags and p.kind=jobs.kind and p.term=jobs.term and p.cursor is null)`);
    const eligible = state.kinds.map(() => '?').join(',');
    const current = currentMunicipality(db, state.kinds, timestamp);
    // Catalogue verification has its own per-city job cursor. It can prepare known
    // sites ahead of web searches without changing the active search municipality.
    const mark = db.prepare("update jobs set status='running', started=? where ags=? and kind=? and term=?");
    if (catalogOnly) {
      if (!state.kinds.includes('marketing')) return [];
      const jobs = catalogJobs(db, current, timestamp, limit, catalogSiteLimit);
      for (const job of jobs) mark.run(timestamp, job.ags, job.kind, job.term);
      return jobs;
    }
    const nextCity = current?.ags ?? db.prepare(`select m.ags from municipalities m join scoped_jobs j using (ags)
      where m.active=1 and m.enabled=1 and j.due<=? and j.kind in (${eligible})
      order by m.priority desc, j.force desc, (m.country<=?), m.country, (j.status='done'), (j.started is null), m.population desc, m.ags limit 1`)
      .get(timestamp, ...state.kinds, readSetting(db, 'last_country') || '')?.ags;
    if (!nextCity) return [];
    const pending = db.prepare(`select j.*, m.name, m.district, m.land,
      p.engine as previous_engine, p.cursor as previous_cursor, p.pages as previous_pages, p.seen as previous_hosts,
      exists(select 1 from municipalities d where d.name=m.name and d.country=m.country and d.active=1 and d.ags<>m.ags) as ambiguous
      from scoped_jobs j join municipalities m using (ags) left join search_progress p using (ags, kind, term)
      where j.ags=? and j.due<=? and j.kind in (${eligible})
      order by j.force desc, (j.status='done'), (j.status='retry'), (j.term=?) desc, coalesce(p.pages,0), j.sequence limit ?`)
      .all(nextCity, timestamp, ...state.kinds, overtureJob, limit);
    if (!current && pending.length) {
      writeSetting(db, 'current_municipality', nextCity);
      writeSetting(db, 'last_country', pending[0].country);
    }
    for (const job of pending) mark.run(timestamp, job.ags, job.kind, job.term);
    return pending;
  });
}

export function visitedWebsite(db, job, host) {
  return !job.force && Boolean(db.prepare('select 1 from visited where kind in (?,?) and host=? and until>?')
    .get(job.kind, `${job.kind}:${job.ags}`, host, now()));
}

export function finishJobs(db, jobs, visits) {
  const finish = db.prepare(`update jobs set status=?, due=?, finished=?, failures=?, matches=?, fetched=?, contacts=?, error=?, force=?
    where ags=? and kind=? and term=?`);
  const visit = db.prepare('insert into visited values (?,?,?) on conflict(kind,host) do update set until=excluded.until');
  const progress = db.prepare(`insert into search_progress values (?,?,?,?,?,?,?) on conflict(ags,kind,term) do update
    set engine=excluded.engine, cursor=excluded.cursor, pages=excluded.pages, seen=excluded.seen`);
  changes(db, () => {
    const timestamp = now();
    for (const entry of jobs) {
      const page = entry.paging;
      const error = entry.error || (!page ? 'Chybí výsledek vyhledávání. Dotaz se zkusí znovu.' : null);
      const fails = error ? entry.failures + 1 : 0;
      const retry = Math.min(24, 2 ** Math.min(fails, 5)) * hour / 2;
      if (page) {
        const hosts = page.cursor ? [...entry.matches] : [];
        const seen = page.cursor && entry.signatures ? { hosts, signatures: [...entry.signatures] } : hosts;
        progress.run(entry.ags, entry.kind, entry.term, page.engine, page.cursor, page.number, JSON.stringify(seen));
      }
      const status = error ? 'retry' : page.cursor ? 'pending' : 'done';
      const due = status === 'pending' ? 0 : timestamp + (error ? retry : 30 * 24 * hour);
      db.prepare('insert into run_history(ags,kind,term,finished,status,pages,fetched,contacts,error) values (?,?,?,?,?,?,?,?,?)')
        .run(entry.ags, entry.kind, entry.term, timestamp, status,
          page ? Math.max(0, page.number - (entry.previous_engine === page.engine && entry.previous_cursor ? entry.previous_pages : 0)) : 0,
          entry.batchFetched || 0, entry.batchContacts || 0, error);
      finish.run(status, due, timestamp, fails, entry.matches?.size ?? entry.matches, entry.fetched, entry.contacts,
        error, status === 'done' ? 0 : entry.force, entry.ags, entry.kind, entry.term);
    }
    for (const [kind, host, contact] of visits) visit.run(kind, host, timestamp + (contact ? 14 : 2) * 24 * hour);
    db.prepare('delete from visited where until < ?').run(timestamp);
    if (!currentMunicipality(db, control(db).kinds, timestamp)) {
      db.prepare("delete from settings where key='current_municipality'").run();
    }
  });
}

export function history(db, before) {
  const cursor = Number(before) || Number.MAX_SAFE_INTEGER;
  const rows = db.prepare(`select h.*,m.name,m.country from run_history h join municipalities m using(ags)
    where h.id<? order by h.id desc limit 26`).all(cursor);
  return { rows: rows.slice(0,25), next: rows.length > 25 ? rows[24].id : null };
}

export function recordImport(db, batch, inserted, confirmed = now()) {
  db.prepare(`insert into import_receipts values (?,?,?) on conflict(batch) do update set
    inserted=excluded.inserted, confirmed=excluded.confirmed where excluded.inserted>import_receipts.inserted`)
    .run(batch, confirmed, inserted);
}

export function recentImports(db, at = now()) {
  const { inserted } = db.prepare('select coalesce(sum(inserted),0) as inserted from import_receipts where confirmed>? and confirmed<=?')
    .get(at-hour, at);
  return { inserted, since: Math.max(at-hour,readSetting(db,'import_metrics_since')) };
}

export function snapshot(db, options = {}, { includeRows = true } = {}) {
  const state = control(db);
  const kinds = state.kinds.map(() => '?').join(',');
  const grouped = `select ags, count(*) as total, sum(status='done') as done, sum(status='running') as running,
    sum(status='retry') as retry, sum(contacts) as contacts, max(finished) as last
    from scoped_jobs where kind in (${kinds}) group by ags`;
  const counts = db.prepare(`select count(*) as municipalities, sum(m.enabled=0) as disabled,
    sum(s.total=s.done) as done, sum(s.running>0) as running, sum(s.retry>0) as retry,
    sum(s.total) as queries, sum(s.done) as searches_done, sum(s.contacts) as contacts
    from municipalities m join (${grouped}) s using (ags) where m.active=1`).get(...state.kinds);
  const activity = db.prepare(`select j.ags, m.name, m.land, j.kind, j.term, j.status, j.started, j.finished, j.matches, j.fetched, j.contacts, j.error,
    coalesce(p.pages, 0) as pages, p.cursor is not null as more_pages
    from jobs j join municipalities m using (ags) left join search_progress p using (ags, kind, term) where j.started is not null
    order by (j.status='running') desc, j.started desc limit 15`).all();
  const catalogSettings = Object.fromEntries(db.prepare("select key,value from settings where key glob 'overture_coverage_??' or key glob 'overture_refresh_??'").all().map(r => [r.key,JSON.parse(r.value)]));
  const overview = { ...state, current: currentMunicipality(db, state.kinds), counts, activity, recentImports: recentImports(db), catalogSettings };
  if (!includeRows) return overview;
  const filter = String(options.query ?? '').slice(0, 100);
  const land = states.includes(options.land) ? options.land : '';
  const filters = {
    pending: 'm.enabled=1 and s.total>s.done and s.running=0 and s.retry=0', running: 's.running>0',
    done: 's.total=s.done', retry: 's.retry>0', disabled: 'm.enabled=0',
  };
  const where = Object.hasOwn(filters, options.status) ? filters[options.status] : '1=1';
  const page = Math.max(0, Math.min(500, Number.parseInt(options.page, 10) || 0));
  const rows = db.prepare(`select m.*, s.*, count(*) over () as matched from municipalities m join (${grouped}) s using (ags)
    where m.active=1 and instr(m.search_name,?) > 0 and (?='' or m.land=?) and ${where}
    order by m.priority desc, (s.running>0) desc, m.population desc, m.name limit 25 offset ?`)
    .all(...state.kinds, label(filter), land, land, page * 25);
  return { ...overview, rows, page };
}

// GV100AD fixed-width records. Record 40 is a district, 60 is a municipality.
// GV100AD stores the eight-position municipal key before the four association digits.
export function parseRegistry(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const districts = new Map();
  const rows = [];
  let date = '';
  for (const line of lines) {
    const record = line.slice(0, 2);
    const district = line.slice(10, 15);
    const name = line.slice(22, 72).trim();
    if (record === '40') districts.set(district, name.split(',')[0]);
    if (record !== '60' || line.slice(122, 124) === '66') continue;
    const ags = line.slice(10, 18);
    if (!/^\d{8}$/.test(ags) || !name) throw new Error('Neplatná položka registru Destatis.');
    date ||= `${line.slice(2, 6)}-${line.slice(6, 8)}-${line.slice(8, 10)}`;
    rows.push({ ags, name: name.split(',')[0].trim(), district: districts.get(district) || '', population: Number(line.slice(139, 150)) || 0 });
  }
  return { rows, date, source: 'https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GV100ADQ/GV100AD3QAktuell.html' };
}

if (import.meta.main) {
  try {
    if (process.argv[2] !== '--load-registry' || !process.argv[3]) throw new Error('Použijte --load-registry <GV100AD_*.txt>.');
    const data = parseRegistry(await readFile(process.argv[3], 'utf8'));
    console.log(JSON.stringify(saveRegistry(openPlan(), data)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
