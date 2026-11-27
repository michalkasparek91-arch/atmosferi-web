import assert from 'node:assert/strict';
import { test } from 'node:test';
import { claimJobs, finishJobs, history, openPlan, scopeConfig, snapshot, updateScope } from './lib/de-agency-plan.mjs';
import { collect } from './find-business-leads.mjs';

test('changing countries and terms preserves the city, local search market, cursor and history', async t => {
  const db = openPlan(':memory:');
  t.after(() => db.close());
  const save = (country, active, config) => updateScope(db, { country, active, ...config, revision: scopeConfig(db).revision });
  const cz = { cities: ['Olomouc'], keywords: { marketing: ['reklamní agentura'], architect: [], developer: [] } };
  save('CZ', ['CZ'], cz);
  const [job] = claimJobs(db, 1);
  assert.deepEqual([job.country, job.name, job.kind, job.term], ['CZ', 'Olomouc', 'marketing', 'reklamní agentura']);
  let queried;
  t.mock.method(globalThis, 'fetch', async url => {
    queried = new URL(url);
    return new Response('<rss><channel></channel></rss>');
  });
  await collect({ countries: 'CZ', types: 'marketing', engine: 'bing', limit: '1' },
    { jobs: [job], searchBudget: 1, visited: () => true, save() {} });
  assert.equal(queried.searchParams.get('cc'), 'cz');
  assert.equal(queried.searchParams.get('setlang'), 'cs');
  assert.equal(queried.searchParams.get('q'), 'reklamní agentura "Olomouc"');
  Object.assign(job, { paging: { engine: 'bing', cursor: '2', number: 1 }, matches: new Set(), batchFetched: 4, batchContacts: 1, error: null });
  finishJobs(db, [job], []);
  save('CZ', ['AT'], { ...cz, keywords: { ...cz.keywords, marketing: ['marketingové studio'] } });
  const [other] = claimJobs(db, 1);
  assert.equal(other.country, 'AT');
  finishJobs(db, [{ ...other, paging: { engine: 'bing', cursor: null, number: 1 }, matches: new Set() }], []);
  save('CZ', ['CZ'], cz);
  const [resumed] = claimJobs(db, 5);
  assert.deepEqual([resumed.term, resumed.previous_cursor], [job.term, '2']);
  assert.equal(snapshot(db).counts.queries, 1);
  const past = history(db).rows;
  assert.deepEqual(past.map(r => r.country), ['AT','CZ']);
  assert.deepEqual([past[1].pages, past[1].fetched, past[1].contacts], [1,4,1]);
  assert.throws(() => updateScope(db, { country: 'CZ', active: ['CZ'], ...cz, revision: 0 }), /mezitím/);
});
