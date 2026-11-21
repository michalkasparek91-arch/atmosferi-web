import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { claimJobs, control, currentMunicipality, finishJobs, openPlan, visitedWebsite, workDir } from './de-agency-plan.mjs';
import { openAdminImporter } from './business-lead-admin.mjs';
import { overturePage } from './overture-agencies.mjs';

const pending = join(workDir, 'pending');
const imported = join(workDir, 'imported');
const importSize = 20;
export const backgroundSearchBudget = 6;
const batchPattern = /^batch-\d{13}-\d+-\d{2}\.json$/;

async function writeJson(path, data) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(data), 'utf8');
  await rename(temporary, path);
}

export async function openBackgroundRun(searchBudget = backgroundSearchBudget) {
  await mkdir(pending, { recursive: true });
  const db = openPlan();
  const settings = control(db);
  const jobs = claimJobs(db, searchBudget);
  if (!jobs.length) {
    const current = currentMunicipality(db, settings.kinds);
    db.close();
    if (!settings.registry) console.log('Čekám na načtení registru Destatis.');
    else if (settings.paused) console.log('Sběr je pozastavený.');
    else if (current?.running) console.log(`${current.name} · předchozí dávka stále běží.`);
    else if (current?.retry_at && !current.ready) console.log(`${current.name} · čekám na opakování dotazu od ${new Date(current.retry_at).toISOString()}.`);
    else console.log('Žádné splatné dotazy.');
    return { waiting: true };
  }
  console.log(`Obec: ${jobs[0].name} (${jobs[0].ags}) · dotazů v dávce: ${jobs.length}.`);
  const visits = [];
  return {
    jobs,
    searchBudget,
    overturePage: (job, cursor, size) => overturePage(db, job.ags, cursor, size),
    visited: (job, host) => visitedWebsite(db, job, host),
    visit(job, host, lead) {
      job.fetched = (job.fetched ?? 0) + 1;
      if (lead) job.contacts = (job.contacts ?? 0) + 1;
      const scope = lead?.email ? job.kind : `${job.kind}:${job.ags}`;
      visits.push([scope, host, Boolean(lead?.email)]);
      if (lead) visits.push([scope, new URL(lead.website).hostname.replace(/^www\./, ''), Boolean(lead.email)]);
    },
    async save(rows) {
      const runId = `${Date.now()}-${process.pid}`;
      for (let index = 0; index < rows.length; index += importSize) {
        const number = String(index / importSize + 1).padStart(2, '0');
        const batch = `batch-${runId}-${number}.json`;
        const batchRows = rows.slice(index, index + importSize);
        await writeJson(join(pending, batch), batchRows);
        console.log(`Fronta do adminu: ${batchRows.length} (${batch}).`);
      }
      finishJobs(db, jobs, visits);
      db.close();
    },
  };
}

async function readNextBatch() {
  await mkdir(pending, { recursive: true });
  const batch = (await readdir(pending)).filter((name) => batchPattern.test(name)).sort()[0];
  if (!batch) return null;
  const rows = JSON.parse(await readFile(join(pending, batch), 'utf8'));
  if (!Array.isArray(rows) || !rows.length || rows.length > importSize ||
      rows.some((row) => !/^pc-lead:[a-f0-9]{32}$/.test(row.source_id) || !row.email || !row.website || !row.company_name)) {
    throw new Error(`Neplatná dávka ${batch}.`);
  }
  return { batch, rows };
}

async function acknowledgeBatch(batch) {
  await mkdir(imported, { recursive: true });
  await rename(join(pending, batch), join(imported, batch));
}

async function nextBatch() {
  const next = await readNextBatch();
  if (!next) return null;
  const { batch, rows } = next;
  const encoded = Buffer.from(JSON.stringify(rows), 'utf8').toString('base64');
  const query = `
with incoming as (
  select * from jsonb_to_recordset(convert_from(decode('${encoded}', 'base64'), 'UTF8')::jsonb)
    as r(source_id text, company_name text, email text, website text, city text, source_name text, notes text)
), normalized as (
  select *, lower(btrim(email)) as email_key,
    substring(regexp_replace(lower(btrim(website)), '^(https?://)?(www\\.)?', '') from '^[^/?#]+') as host_key
  from incoming
), existing as (
  select source_id, lower(btrim(email)) as email_key,
    substring(regexp_replace(lower(btrim(website)), '^(https?://)?(www\\.)?', '') from '^[^/?#]+') as host_key
  from public.agency_outreach_leads
), inserted as (
  insert into public.agency_outreach_leads (source_id, company_name, email, website, city, source_name, notes, review_state, priority, outreach_status)
  select n.source_id, n.company_name, n.email_key, n.website, n.city, n.source_name, n.notes, 'review', 'REVIEW', 'new'
  from normalized n
  where not exists (select 1 from existing e where e.source_id = n.source_id or e.email_key = n.email_key or e.host_key = n.host_key)
  on conflict (source_id) do nothing
  returning id
)
select (select count(*) from incoming)::int as received, count(*)::int as inserted from inserted;`;
  return { batch, expected: rows.length, query };
}

export async function drainDirectQueue(maxBatches = 12, { next = readNextBatch, acknowledge = acknowledgeBatch, connect = openAdminImporter } = {}) {
  let insert;
  let batches = 0;
  let received = 0;
  let inserted = 0;
  while (batches < maxBatches) {
    const item = await next();
    if (!item) break;
    insert ??= await connect();
    inserted += await insert(item.rows);
    await acknowledge(item.batch);
    received += item.rows.length;
    batches++;
  }
  return { batches, received, inserted };
}

if (import.meta.main) {
  try {
    const [command, name] = process.argv.slice(2);
    if (command === '--next') console.log(JSON.stringify(await nextBatch()));
    else if (command === '--ack' && batchPattern.test(name ?? '')) await acknowledgeBatch(name);
    else if (command === '--direct') console.log(JSON.stringify(await drainDirectQueue()));
    else if (command === '--check-direct') {
      await openAdminImporter();
      console.log('Přihlášení správce a přístup k evidenci jsou v pořádku.');
    } else throw new Error('Použijte --direct, --check-direct, --next nebo --ack s ID dávky.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
