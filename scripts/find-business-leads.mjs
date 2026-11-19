import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { bingResults, findSiteContact, hostKey, seznamResults, websiteUrl } from './lib/business-lead-web.mjs';

const types = { marketing: 'Marketingová agentura', architect: 'Architektonické studio', developer: 'Realitní developer' };
const markets = {
  CZ: ['cs', 'Česko', ['Praha', 'Brno', 'Ostrava', 'Plzeň'], ['marketingová agentura', 'architektonické studio', 'realitní developer'], ['/kontakt', '/kontakty']],
  SK: ['sk', 'Slovensko', ['Bratislava', 'Košice', 'Žilina'], ['marketingová agentúra', 'architektonické štúdio', 'realitný developer'], ['/kontakt', '/kontakty']],
  DE: ['de', 'Německo', ['Berlin', 'Hamburg', 'München', 'Frankfurt am Main'], ['Marketingagentur', 'Architekturbüro', 'Immobilien Projektentwickler'], ['/kontakt', '/impressum']],
  AT: ['de', 'Rakousko', ['Wien', 'Graz', 'Linz', 'Salzburg'], ['Marketingagentur', 'Architekturbüro', 'Immobilien Projektentwickler'], ['/kontakt', '/impressum']],
  CH: ['de', 'Švýcarsko', ['Zürich', 'Bern', 'Basel'], ['Marketingagentur', 'Architekturbüro', 'Immobilien Projektentwickler'], ['/kontakt', '/impressum']],
  PL: ['pl', 'Polsko', ['Warszawa', 'Kraków', 'Wrocław'], ['agencja marketingowa', 'pracownia architektoniczna', 'deweloper nieruchomości'], ['/kontakt']],
  HU: ['hu', 'Maďarsko', ['Budapest', 'Debrecen', 'Szeged'], ['marketing ügynökség', 'építész iroda', 'ingatlanfejlesztő'], ['/kapcsolat']],
  GB: ['en', 'Spojené království', ['London', 'Manchester', 'Birmingham'], ['marketing agency', 'architecture practice', 'property developer'], ['/contact', '/contact-us']],
  US: ['en', 'USA', ['New York', 'Chicago', 'Los Angeles'], ['marketing agency', 'architecture firm', 'real estate developer'], ['/contact', '/contact-us']],
  FR: ['fr', 'Francie', ['Paris', 'Lyon', 'Marseille'], ['agence marketing', 'agence architecture', 'promoteur immobilier'], ['/contact', '/nous-joindre']],
};

const help = `Atmosferi | Vyhledávání firemních kontaktů

node scripts/find-business-leads.mjs [volby]

  --countries CZ,SK        Země (výchozí CZ). Dostupné: ${Object.keys(markets).join(', ')}
  --cities Praha,Brno       Vlastní města, vždy pro jednu zemi
  --types marketing,architect,developer
  --pages 1                 Stránky na dotaz (1–5)
  --limit 50                Nejvýše tolik různých webů za běh (1–1000)
  --engine auto             Seznam bez klíče, případně seznam, bing nebo serper
  --write-admin             Uložit do Agentury · akvizice → K prověření
  --help                    Zobrazit nápovědu

CSV se ukládá do artifacts/private/lead-finder/.
Přímý zápis vyžaduje LEAD_ADMIN_EMAIL + LEAD_ADMIN_PASSWORD nebo LEAD_ADMIN_ACCESS_TOKEN.
`;

function list(value, normalize = (value) => value) {
  return [...new Set(value.split(',').map((item) => normalize(item.trim())).filter(Boolean))];
}

function integer(value, name, max) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new Error(`${name} musí být číslo od 1 do ${max}.`);
  return Number(value);
}

async function search(query, country, language, page, engine) {
  if (engine === 'seznam') {
    const url = new URL('https://search.seznam.cz/');
    url.search = new URLSearchParams({ q: query, count: '20', from: String((page - 1) * 20 + 1) });
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Seznam HTTP ${response.status}`);
    return seznamResults(await response.text());
  }
  if (engine === 'serper') {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
      headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: country.toLowerCase(), hl: language, page, num: 10 }),
    });
    if (!response.ok) throw new Error(`Serper HTTP ${response.status}`);
    const { organic = [] } = await response.json();
    return organic.map(({ title, link, snippet }) => ({ title, url: link, snippet }));
  }
  const url = new URL('https://www.bing.com/search');
  url.search = new URLSearchParams({ q: query, cc: country.toLowerCase(), setlang: language, format: 'rss' });
  if (page > 1) url.searchParams.set('first', String((page - 1) * 10 + 1));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Bing HTTP ${response.status}`);
  const xml = await response.text();
  if (!/<rss\b/i.test(xml)) throw new Error('Bing místo RSS vrátil jinou stránku.');
  return bingResults(xml);
}

function sourceId(lead) {
  const host = hostKey(new URL(lead.website));
  return `pc-lead:${createHash('sha256').update(host).digest('hex').slice(0, 32)}`;
}

function notes(lead) {
  return [lead.phone && `Telefon: ${lead.phone.value}`, `Obor: ${types[lead.type]}`,
    `Cílová země: ${lead.countryName} (${lead.country})`,
    !lead.city && `Hledáno pro město: ${lead.targetCity}`,
    lead.email && `Zdroj e-mailu: ${lead.email.source}`,
    lead.phone && `Zdroj telefonu: ${lead.phone.source}`,
  ].filter(Boolean).join('\n');
}

function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[\s\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

async function saveCsv(leads, engine) {
  const folder = fileURLToPath(new URL('../artifacts/private/lead-finder/', import.meta.url));
  await mkdir(folder, { recursive: true });
  const output = join(folder, `leads-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}.csv`);
  const rows = [
    ['id', 'firma', 'email', 'telefon', 'web', 'mesto', 'zeme', 'obor', 'zdroj', 'zdroj_emailu', 'zdroj_telefonu', 'kontaktovat_poznamka'],
    ...leads.map((lead) => [sourceId(lead), lead.company, lead.email?.value, lead.phone?.value, lead.website,
      lead.city, lead.country, types[lead.type], `pc-lead-finder:${engine}`, lead.email?.source, lead.phone?.source, notes(lead)]),
  ];
  await writeFile(output, '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n', { flag: 'wx' });
  return output;
}

export async function saveToAdmin(leads, engine) {
  const client = await readFile(new URL('../admin/src/integrations/supabase/client.ts', import.meta.url), 'utf8');
  const url = client.match(/const SUPABASE_URL\s*=\s*["'](https:\/\/[^"']+)["']/)?.[1];
  const apiKey = client.match(/const SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  if (!url || !apiKey) throw new Error('V konfiguraci adminu chybí URL nebo veřejný klíč Supabase.');

  let token = process.env.LEAD_ADMIN_ACCESS_TOKEN;
  async function call(path, options = {}) {
    const response = await fetch(new URL(path, url), {
      method: options.body === undefined ? 'GET' : 'POST',
      redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { apikey: apiKey, ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }), ...options.headers },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status} při volání ${path.split('?')[0]}.`);
    return response.json();
  }
  if (!token) {
    if (!process.env.LEAD_ADMIN_EMAIL || !process.env.LEAD_ADMIN_PASSWORD) {
      throw new Error('Pro přímý zápis nastavte LEAD_ADMIN_EMAIL a LEAD_ADMIN_PASSWORD nebo LEAD_ADMIN_ACCESS_TOKEN.');
    }
    ({ access_token: token } = await call('/auth/v1/token?grant_type=password', {
      body: { email: process.env.LEAD_ADMIN_EMAIL, password: process.env.LEAD_ADMIN_PASSWORD },
    }));
  }
  const user = await call('/auth/v1/user');
  if (!(await call('/rest/v1/rpc/is_admin', { body: { _user_id: user.id } }))) throw new Error('Je vyžadován účet administrátora Atmosferi.');

  const table = '/rest/v1/agency_outreach_leads';
  const existingEmails = new Set();
  const existingSites = new Set();
  const batchSize = 250;
  for (let offset = 0; ; offset += batchSize) {
    const existing = await call(`${table}?select=email,website&order=id&limit=${batchSize}&offset=${offset}`);
    for (const row of existing) {
      existingEmails.add(row.email?.trim().toLowerCase());
      const site = websiteUrl(row.website) || (row.website && websiteUrl(`https://${row.website}`));
      if (site) existingSites.add(hostKey(site));
    }
    if (existing.length < batchSize) break;
  }
  let inserted = 0;
  const rows = [];
  for (const lead of leads) {
    if (!lead.email) continue;
    const email = lead.email.value;
    const host = hostKey(new URL(lead.website));
    if (existingEmails.has(email) || existingSites.has(host)) continue;
    existingEmails.add(email);
    existingSites.add(host);
    rows.push({
      source_id: sourceId(lead), company_name: lead.company, email, website: lead.website, city: lead.city,
      review_state: 'review', priority: 'REVIEW', outreach_status: 'new',
      source_name: `pc-lead-finder:${engine}`, notes: notes(lead),
    });
  }
  for (let index = 0; index < rows.length; index += 50) {
    const saved = await call(`${table}?on_conflict=source_id&select=id`, {
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: rows.slice(index, index + 50),
    });
    inserted += saved.length;
  }
  return inserted;
}

async function main() {
  const { values } = parseArgs({ options: {
    countries: { type: 'string', default: 'CZ' }, cities: { type: 'string' },
    types: { type: 'string', default: Object.keys(types).join(',') },
    pages: { type: 'string', default: '1' }, limit: { type: 'string', default: '50' },
    engine: { type: 'string', default: 'auto' }, 'write-admin': { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help) { console.log(help); return; }
  const countries = list(values.countries, (value) => value.toUpperCase());
  const selectedTypes = list(values.types, (value) => value.toLowerCase());
  const cities = values.cities === undefined ? null : list(values.cities);
  const engine = values.engine === 'auto' ? (process.env.SERPER_API_KEY ? 'serper' : 'seznam') : values.engine;
  const pages = integer(values.pages, '--pages', 5);
  const limit = integer(values.limit, '--limit', 1000);
  if (!countries.length || countries.some((country) => !Object.hasOwn(markets, country))) throw new Error('Neznámá země. Použijte --help.');
  if (!selectedTypes.length || selectedTypes.some((type) => !Object.hasOwn(types, type))) throw new Error('Neznámý obor. Použijte --help.');
  if (cities && (!cities.length || countries.length !== 1)) throw new Error('--cities vyžaduje jedno nebo více měst v jediné zemi.');
  if (!['seznam', 'bing', 'serper'].includes(engine)) throw new Error('--engine musí být auto, seznam, bing nebo serper.');
  if (engine === 'serper' && !process.env.SERPER_API_KEY) throw new Error('Pro Serper nastavte SERPER_API_KEY.');

  const queries = countries.flatMap((country) => {
    const [language, countryName, defaultCities, terms, contactPaths] = markets[country];
    return (cities || defaultCities).flatMap((city) => selectedTypes.map((type) => ({
      country, countryName, language, targetCity: city, type, contactPaths,
      query: `${terms[Object.keys(types).indexOf(type)]} ${city}`,
    })));
  });
  const searchResults = queries.map(() => []);
  console.log(`Vyhledávač: ${engine}.`);
  let failures = 0;
  for (let page = 1; page <= pages; page++) {
    for (const [index, query] of queries.entries()) {
      try {
        const results = await search(query.query, query.country, query.language, page, engine);
        searchResults[index].push(...results);
        console.log(`[${query.country}] ${query.query} · ${page}: ${results.length} výsledků`);
      } catch (error) {
        failures++;
        console.warn(`[${query.country}] ${query.query} · ${page}: ${error.message}`);
      }
      await sleep(400);
    }
  }
  const candidates = new Map();
  const resultCount = Math.max(...searchResults.map((results) => results.length));
  for (let index = 0; index < resultCount && candidates.size < limit; index++) {
    for (const [queryIndex, results] of searchResults.entries()) {
      const result = results[index];
      const url = result && websiteUrl(result.url);
      if (!url || /\.(?:pdf|docx?|xlsx?|jpe?g|png|zip)$/i.test(url.pathname)) continue;
      const host = hostKey(url);
      if (!candidates.has(host)) candidates.set(host, {
        ...queries[queryIndex], url, title: result.title || '', snippet: result.snippet || '',
      });
      if (candidates.size >= limit) break;
    }
  }
  if (!candidates.size) throw new Error('Vyhledávání nevrátilo použitelné weby. Zkuste jinou lokalitu nebo zdroj.');
  console.log(`Kontroluji ${candidates.size} nalezených webů.`);
  const leads = new Map();
  const emails = new Set();
  const sites = [...candidates.values()];
  for (let index = 0; index < sites.length; index += 4) {
    const batch = await Promise.all(sites.slice(index, index + 4).map(findSiteContact));
    for (const lead of batch.filter(Boolean)) {
      const id = sourceId(lead);
      if (lead.email && emails.has(lead.email.value)) continue;
      if (leads.has(id) && leads.get(id).email) continue;
      if (lead.email) emails.add(lead.email.value);
      leads.set(id, lead);
    }
  }
  const contacts = [...leads.values()];
  const output = await saveCsv(contacts, engine);
  const withEmail = contacts.filter((lead) => lead.email).length;
  const withPhone = contacts.filter((lead) => lead.phone).length;
  console.log(`CSV: ${output}\nKontaktů: ${contacts.length}, s e-mailem: ${withEmail}, s telefonem: ${withPhone}.`);
  if (failures) console.warn(`Částečný výsledek. Selhalo ${failures} z ${queries.length * pages} vyhledávání.`);
  if (values['write-admin'] && withEmail) {
    const inserted = await saveToAdmin(contacts, engine);
    console.log(`Agentury · akvizice → K prověření: ${inserted} nových kontaktů, ${withEmail - inserted} duplicit.`);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
