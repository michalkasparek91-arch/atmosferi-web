import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openPlan, claimJobs, finishJobs } from './lib/de-agency-plan.mjs';
import { loadOverture, overtureJob, overturePage } from './lib/overture-agencies.mjs';
import { collect, search } from './find-business-leads.mjs';

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
