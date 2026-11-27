import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { control, openPlan, scopeConfig, workDir } from './lib/de-agency-plan.mjs';
import { germanBoundaries } from './lib/business-lead-boundaries.mjs';
import { loadOverture } from './lib/overture-agencies.mjs';

const run = promisify(execFile);
const day = 86400000;
const root = resolve(workDir,'..');
const exporter = fileURLToPath(new URL('./export-overture-agencies.py',import.meta.url));
// Bump when matching or index metadata changes, even within a Places release.
const matcherVersion = 2;
function read(db,key) {
  const value = db.prepare('select value from settings where key=?').get(key);
  return value ? JSON.parse(value.value) : null;
}
function save(db,key,value) {
  db.prepare('insert or replace into settings values (?,?)').run(key,JSON.stringify(value));
}
function enabled(db) {
  const scope = scopeConfig(db);
  const state = control(db);
  if (state.paused || !state.kinds.includes('marketing')) return [];
  return scope.active.filter(country => scope.markets[country].overture).map(country => {
    const areas = country === 'DE' ? state.registry : scope.markets[country].cities;
    const inputs = [matcherVersion,areas,country === 'DE' ? new Date().getUTCFullYear() : null];
    return {country, fingerprint:createHash('sha256').update(JSON.stringify(inputs)).digest('hex')};
  });
}
async function latestRelease(db) {
  const previous = read(db,'overture_latest');
  if (previous?.checked > Date.now()-day) return previous.release;
  const response = await fetch('https://stac.overturemaps.org/catalog.json',{signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error('Overture STAC HTTP '+response.status);
  const {links} = await response.json();
  const releases = links.filter(link => link.rel==='child').map(link =>
    /^https:\/\/stac\.overturemaps\.org\/(\d{4}-\d{2}-\d{2}\.\d+)\/catalog\.json$/.exec(new URL(link.href,response.url).href)?.[1]
  ).filter(Boolean).sort((a,b) => a.localeCompare(b,'en',{numeric:true}));
  const release = releases.at(-1);
  if (!release) throw new Error('STAC neobsahuje žádné rozpoznané vydání.');
  save(db,'overture_latest',{release,checked:Date.now()});
  return release;
}

async function cachedSnapshot(country,release) {
  const path = join(root,'overture-'+country.toLowerCase()+'-addresses.json');
  let file;
  try {
    file = await open(path,'r');
    const {buffer,bytesRead} = await file.read(Buffer.alloc(150),0,150,0);
    const header = buffer.toString('utf8',0,bytesRead);
    if (header.includes('"release": "'+release+'"') && header.includes('"country": "'+country+'"')) return path;
  } catch (error) { if (error.code!=='ENOENT') throw error; }
  finally { await file?.close(); }
  const bundled = join(homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe');
  const python = process.env.LEAD_FINDER_PYTHON || (existsSync(bundled) ? bundled : 'python');
  await run(python,[exporter,release,path,'--country',country],{
    windowsHide:true, timeout:90*60000,
    env:{...process.env,PYTHONPATH:[join(root,'python-packages'),process.env.PYTHONPATH].filter(Boolean).join(delimiter)},
  });
  return path;
}

export async function refreshCatalogs(db) {
  const targets = enabled(db);
  if (!targets.length) return;
  const token = randomUUID();
  const leaseKey = 'overture_refresh_lease';
  db.exec('BEGIN IMMEDIATE');
  try {
    if (read(db,leaseKey)?.until > Date.now()) { db.exec('COMMIT'); return; }
    save(db,leaseKey,{token,until:Date.now()+2*3600000});
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  try {
    const release = await latestRelease(db);
    for (const {country,fingerprint} of targets) {
      const key = 'overture_refresh_'+country;
      const previous = read(db,key);
      if (previous?.release === release && previous.fingerprint === fingerprint &&
          (previous.status === 'ready' || previous.retryAt > Date.now())) continue;
      if (!enabled(db).some(item => item.country===country && item.fingerprint===fingerprint)) continue;
      save(db,leaseKey,{token,until:Date.now()+2*3600000});
      save(db,key,{release,fingerprint,status:'loading',at:Date.now()});
      try {
        const path = await cachedSnapshot(country,release);
        const boundaries = country==='DE' ? await germanBoundaries() : null;
        const snapshot = JSON.parse(await readFile(path,'utf8'));
        if (snapshot.country!==country || snapshot.release!==release) throw new Error('Nesouhlasí země nebo vydání souboru.');
        if (!enabled(db).some(item => item.country===country && item.fingerprint===fingerprint)) continue;
        const result = loadOverture(db,snapshot,boundaries);
        save(db,key,{release,fingerprint,status:'ready',at:Date.now()});
        console.log(JSON.stringify(result));
      } catch (error) {
        const busy = error.message.includes('právě běží');
        const detail = busy ? 'Čeká na dokončení dávky.' : (error.stderr || error.message).trim().split('\n').at(-1).slice(0,240);
        save(db,key,{release,fingerprint,status:busy?'waiting':'error',detail,at:Date.now(),retryAt:Date.now()+(busy?3:30)*60000});
      }
    }
  } catch (error) {
    for (const {country} of targets) save(db,'overture_refresh_'+country,{status:'error',detail:error.message.slice(0,240),at:Date.now()});
    throw error;
  } finally {
    db.prepare("delete from settings where key=? and json_extract(value,'$.token')=?").run(leaseKey,token);
  }
}

if (import.meta.main) {
  const db = openPlan();
  try { await refreshCatalogs(db); } finally { db.close(); }
}
