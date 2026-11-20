import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { openPlan, snapshot, states, updateControl, updateMunicipality, workDir } from './lib/de-agency-plan.mjs';

const port = 4317;
const host = `127.0.0.1:${port}`;
const adminOrigin = 'https://www.atmosferi.com';
const db = openPlan();
const csvName = /^leads-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-\d+\.csv$/;
const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/dashboard.css': ['dashboard.css', 'text/css; charset=utf-8'],
  '/dashboard.js': ['dashboard.js', 'text/javascript; charset=utf-8'],
};

async function list(folder, pattern) {
  try { return (await readdir(folder)).filter((file) => pattern.test(file)).sort().reverse(); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function importActivity() {
  const pattern = /^batch-\d{13}-\d+-\d{2}\.json$/;
  const folders = Object.fromEntries(['pending', 'imported'].map((name) => [name, join(workDir, name)]));
  const [pending, imported] = await Promise.all(Object.values(folders).map((folder) => list(folder, pattern)));
  const pairs = [...pending.map((name) => [name, 'pending']), ...imported.map((name) => [name, 'imported'])];
  pairs.sort(([a], [b]) => b.localeCompare(a));
  const recent = await Promise.all(pairs.slice(0, 12).map(async ([name, status]) => {
    try {
      const rows = JSON.parse(await readFile(join(folders[status], name), 'utf8'));
      return { name, status, at: Number(name.split('-')[1]), count: rows.length,
        companies: rows.map(({ company_name, city, website, notes }) => ({ company: company_name, city, website,
          category: notes?.match(/^Obor: ([^\r\n]+)/m)?.[1], specialty: notes?.match(/^Specializace: ([^\r\n]+)/m)?.[1] })) };
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }));
  return { pending: pending.length, imported: imported.length, recent: recent.filter(Boolean) };
}

async function input(req) {
  if (req.headers.origin !== `http://${host}` || !/^application\/json(?:;|$)/.test(req.headers['content-type'] ?? '')) {
    throw Object.assign(new Error('Požadavek musí přijít z místního panelu.'), { status: 403 });
  }
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString('utf8');
    if (text.length > 2_048) throw Object.assign(new Error('Požadavek je příliš velký.'), { status: 413 });
  }
  try {
    const target = JSON.parse(text);
    if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error();
    return target;
  } catch { throw Object.assign(new Error('Neplatná změna plánu.'), { status: 400 }); }
}

const server = createServer(async (req, res) => {
  const json = (data, status = 200) => res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(data));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  if (req.headers.host !== host) return json({ error: 'Panel je dostupný jen na tomto PC.' }, 403);
  const url = new URL(req.url, `http://${host}`);
  try {
    if (req.method === 'GET') {
      if (url.pathname === '/api/summary') {
        if (req.headers.origin && ![adminOrigin, `http://${host}`].includes(req.headers.origin)) {
          return json({ error: 'Tento web nemá přístup ke stavu sběru.' }, 403);
        }
        res.setHeader('Vary', 'Origin');
        if (req.headers.origin === adminOrigin) res.setHeader('Access-Control-Allow-Origin', adminOrigin);
        const { paused, current, counts, activity } = snapshot(db);
        const batches = await list(join(workDir, 'pending'), /^batch-\d{13}-\d+-\d{2}\.json$/);
        const last = activity.find((job) => !current || job.name === current.name);
        return json({ paused, current, counts, pending: batches.length, last: last ? {
          name: last.name, term: last.term, pages: last.pages, status: last.status, at: last.finished ?? last.started,
        } : null });
      }
      if (Object.hasOwn(assets, url.pathname)) {
        const [file, contentType] = assets[url.pathname];
        const content = await readFile(new URL(`./local-agency-dashboard/${file}`, import.meta.url));
        return res.writeHead(200, { 'Content-Type': contentType }).end(content);
      }
      if (url.pathname === '/api/plan') return json({ ...snapshot(db, Object.fromEntries(url.searchParams)), states });
      if (url.pathname === '/api/imports') return json(await importActivity());
      if (url.pathname === '/api/exports') return json((await list(join(workDir, '..'), csvName)).slice(0, 12));
      const name = url.pathname.slice('/download/'.length);
      if (url.pathname.startsWith('/download/') && csvName.test(name)) {
        const content = await readFile(join(workDir, '..', name));
        return res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"` }).end(content);
      }
    }
    if (req.method === 'PATCH' && url.pathname === '/api/control') return json(updateControl(db, await input(req)));
    const municipality = url.pathname.match(/^\/api\/municipalities\/(\d{8})$/);
    if (req.method === 'PATCH' && municipality) {
      const updated = updateMunicipality(db, municipality[1], await input(req));
      return json(updated ? { updated } : { error: 'Obec nebyla nalezena.' }, updated ? 200 : 404);
    }
    return json({ error: 'Stránka nebyla nalezena.' }, 404);
  } catch (error) {
    const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
    if (status === 500) console.error(error);
    return json({ error: status === 500 ? 'Místní panel nemůže načíst data.' : error.message }, status);
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Atmosferi · sběr kontaktů http://${host}/`));
