import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { termsByKind } from './business-lead-taxonomy.mjs';

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
    INSERT OR IGNORE INTO settings VALUES ('paused', 'false'), ('kinds', '["marketing"]');
  `);
  const taxonomy = JSON.stringify(termsByKind);
  if (readSetting(db, 'taxonomy') !== taxonomy) changes(db, () => {
    const addTerm = db.prepare('insert or ignore into jobs (ags,kind,term) select ags,?,? from municipalities where active=1');
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

export function currentMunicipality(db, kinds = control(db).kinds, timestamp = now()) {
  const ags = readSetting(db, 'current_municipality');
  if (!ags) return null;
  return db.prepare(`select m.ags, m.name, count(*) as total, sum(j.status='done' and j.due>?) as done,
    sum(j.status='running') as running, sum(j.status<>'running' and j.due<=?) as ready,
    min(case when j.status='retry' then j.due end) as retry_at
    from municipalities m join jobs j using (ags)
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
    db.exec('update municipalities set active=0');
    for (const { ags, name, district, population } of rows) {
      municipal.run(ags, name, label(`${name} ${district} ${ags}`), district, states[Number(ags.slice(0, 2)) - 1], population);
      for (const [kind, terms] of Object.entries(termsByKind)) for (const term of terms) job.run(ags, kind, term);
    }
    const registry = { count: rows.length, source, date };
    writeSetting(db, 'registry', registry);
    return registry;
  });
}

export function claimJobs(db, limit) {
  return changes(db, () => {
    const state = control(db);
    if (!state.registry || state.paused) return [];
    const timestamp = now();
    db.prepare("update jobs set status='retry', due=?, error='Předchozí běh se přerušil' where status='running' and started<?")
      .run(timestamp, timestamp - hour);
    if (db.prepare("select 1 from jobs where status='running' limit 1").get()) return [];
    db.exec(`update jobs set status='pending', due=0
      where status='done' and not exists (select 1 from search_progress p
        where p.ags=jobs.ags and p.kind=jobs.kind and p.term=jobs.term and p.cursor is null)`);
    const eligible = state.kinds.map(() => '?').join(',');
    const current = currentMunicipality(db, state.kinds, timestamp);
    const nextCity = current?.ags ?? db.prepare(`select m.ags from municipalities m join jobs j using (ags)
      where m.active=1 and m.enabled=1 and j.due<=? and j.kind in (${eligible})
      order by m.priority desc, j.force desc, (j.status='done'), m.population desc, m.ags limit 1`)
      .get(timestamp, ...state.kinds)?.ags;
    if (!nextCity) return [];
    if (!current) writeSetting(db, 'current_municipality', nextCity);
    const pending = db.prepare(`select j.*, m.name, m.district, m.land,
      p.engine as previous_engine, p.cursor as previous_cursor, p.pages as previous_pages, p.seen as previous_hosts,
      exists(select 1 from municipalities d where d.name=m.name and d.active=1 and d.ags<>m.ags) as ambiguous
      from jobs j join municipalities m using (ags) left join search_progress p using (ags, kind, term)
      where j.ags=? and j.due<=? and j.kind in (${eligible})
      order by j.force desc, (j.status='done'), (j.status='retry'), (j.term=?) desc, coalesce(p.pages,0), j.rowid limit ?`)
      .all(nextCity, timestamp, ...state.kinds, overtureJob, limit);
    const mark = db.prepare("update jobs set status='running', started=? where ags=? and kind=? and term=?");
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

export function snapshot(db, options = {}, { includeRows = true } = {}) {
  const state = control(db);
  const kinds = state.kinds.map(() => '?').join(',');
  const grouped = `select ags, count(*) as total, sum(status='done') as done, sum(status='running') as running,
    sum(status='retry') as retry, sum(contacts) as contacts, max(finished) as last
    from jobs where kind in (${kinds}) group by ags`;
  const counts = db.prepare(`select count(*) as municipalities, sum(m.enabled=0) as disabled,
    sum(s.total=s.done) as done, sum(s.running>0) as running, sum(s.retry>0) as retry,
    sum(s.total) as queries, sum(s.done) as searches_done, sum(s.contacts) as contacts
    from municipalities m join (${grouped}) s using (ags) where m.active=1`).get(...state.kinds);
  const activity = db.prepare(`select j.ags, m.name, m.land, j.kind, j.term, j.status, j.started, j.finished, j.matches, j.fetched, j.contacts, j.error,
    coalesce(p.pages, 0) as pages, p.cursor is not null as more_pages
    from jobs j join municipalities m using (ags) left join search_progress p using (ags, kind, term) where j.started is not null
    order by (j.status='running') desc, j.started desc limit 15`).all();
  const overview = { ...state, current: currentMunicipality(db, state.kinds), counts, activity };
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
