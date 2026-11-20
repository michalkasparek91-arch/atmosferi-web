import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { bingResults, findSiteContact, hostKey, seznamNextPage, seznamResults, websiteUrl } from './lib/business-lead-web.mjs';
import { openBackgroundRun } from './lib/de-agency-background.mjs';
import { openAdminImporter } from './lib/business-lead-admin.mjs';
import { leadKinds as types, termsByKind } from './lib/business-lead-taxonomy.mjs';

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
  --term Innenarchitektur   Konkrétní německý výraz pro jeden obor
  --pages 1                 Stránky na dotaz (1–5)
  --limit 50                Nejvýše tolik různých webů za běh (1–1000)
  --engine auto             Seznam bez klíče, případně seznam, bing nebo serper
  --write-admin             Uložit do Agentury · akvizice → K prověření
  --background-de-agencies  Další dávka německých marketingových agentur pro plánovač
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

export async function search(query, country, language, engine, cursor, { pageable, widen = false }) {
  if (engine === 'seznam') {
    const url = new URL(cursor ?? 'https://search.seznam.cz/');
    if (!cursor) url.search = new URLSearchParams(pageable ? { q: query } : { q: query, count: '20' });
    if (url.origin !== 'https://search.seznam.cz' || url.pathname !== '/' || url.username || url.password || url.searchParams.get('q') !== query) {
      throw new Error('Neplatný odkaz na stránku Seznamu.');
    }
    const offset = Number(url.searchParams.get('from'));
    // At an odd ten-result offset Seznam rounds the next twenty-result link up, skipping ten positions.
    if (widen && offset > 0 && offset % 20 === 0 && url.searchParams.get('count') === '10') {
      url.searchParams.set('count', '20');
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Seznam HTTP ${response.status}`);
    const current = new URL(response.url);
    if (current.origin !== url.origin || (cursor && current.searchParams.get('from') !== url.searchParams.get('from'))) {
      throw new Error('Seznam přesměroval odkaz na další stránku.');
    }
    const html = await response.text();
    const results = seznamResults(html);
    if (!results.length && /<title[^>]*>[^<]*(?:ochrana vyhledávání|ověření|captcha)/i.test(html)) {
      throw new Error('Seznam HTTP 429 (ověření přístupu)');
    }
    return { results, nextCursor: seznamNextPage(html, current) };
  }
  const page = Number(cursor ?? 1);
  if (engine === 'serper') {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
      headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: country.toLowerCase(), hl: language, page, num: 10 }),
    });
    if (!response.ok) throw new Error(`Serper HTTP ${response.status}`);
    const { organic = [] } = await response.json();
    return { results: organic.map(({ title, link, snippet }) => ({ title, url: link, snippet })),
      nextCursor: organic.length ? String(page + 1) : null };
  }
  const url = new URL('https://www.bing.com/search');
  url.search = new URLSearchParams({ q: query, cc: country.toLowerCase(), setlang: language, format: 'rss' });
  if (page > 1) url.searchParams.set('first', String((page - 1) * 10 + 1));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Bing HTTP ${response.status}`);
  const xml = await response.text();
  if (!/<rss\b/i.test(xml)) throw new Error('Bing místo RSS vrátil jinou stránku.');
  const results = bingResults(xml);
  return { results, nextCursor: results.length ? String(page + 1) : null };
}

function sourceId(lead) {
  const host = hostKey(new URL(lead.website));
  return `pc-lead:${createHash('sha256').update(host).digest('hex').slice(0, 32)}`;
}

function notes(lead) {
  return [lead.phone && `Telefon: ${lead.phone.value}`, `Obor: ${types[lead.type]}`,
    lead.category?.specialties.length && `Specializace: ${lead.category.specialties.join(', ')}`,
    lead.category?.term && `Hledaný výraz: ${lead.category.term}`,
    lead.category?.needsReview && 'Zařazení: Specializace k ověření',
    `Cílová země: ${lead.countryName} (${lead.country})`,
    !lead.city && `Hledáno pro město: ${lead.targetCity}`,
    lead.email && `Zdroj e-mailu: ${lead.email.source}`,
    lead.phone && `Zdroj telefonu: ${lead.phone.source}`,
  ].filter(Boolean).join('\n');
}

function adminRow(lead, engine) {
  return {
    source_id: sourceId(lead), company_name: lead.company, email: lead.email.value, website: lead.website,
    city: lead.city || null, source_name: `pc-lead-finder:${engine}`, notes: notes(lead),
  };
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
    ['id', 'firma', 'email', 'telefon', 'web', 'mesto', 'zeme', 'obor', 'specializace', 'hledany_vyraz', 'zdroj', 'zdroj_emailu', 'zdroj_telefonu', 'kontaktovat_poznamka'],
    ...leads.map((lead) => [sourceId(lead), lead.company, lead.email?.value, lead.phone?.value, lead.website,
      lead.city, lead.country, types[lead.type], lead.category?.specialties.join(', '), lead.category?.term,
      `pc-lead-finder:${engine}`, lead.email?.source, lead.phone?.source, notes(lead)]),
  ];
  await writeFile(output, '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n', { flag: 'wx' });
  return output;
}

export async function saveToAdmin(leads, engine) {
  const insert = await openAdminImporter();
  return insert(leads.filter((lead) => lead.email).map((lead) => adminRow(lead, engine)));
}

async function main() {
  const { values } = parseArgs({ options: {
    countries: { type: 'string', default: 'CZ' }, cities: { type: 'string' },
    types: { type: 'string', default: Object.keys(types).join(',') },
    pages: { type: 'string', default: '1' }, limit: { type: 'string', default: '50' },
    engine: { type: 'string', default: 'auto' }, 'write-admin': { type: 'boolean' }, help: { type: 'boolean' },
    'background-de-agencies': { type: 'boolean' },
    term: { type: 'string' },
  } });
  if (values.help) { console.log(help); return; }
  const background = values['background-de-agencies'] ? await openBackgroundRun() : null;
  if (background?.waiting) return;
  if (background) {
    Object.assign(values, { countries: 'DE', cities: undefined, pages: '1', limit: '120' });
  }
  const countries = list(values.countries, (value) => value.toUpperCase());
  const selectedTypes = list(values.types, (value) => value.toLowerCase());
  const cities = values.cities === undefined ? null : list(values.cities);
  const engine = values.engine === 'auto' ? (process.env.SERPER_API_KEY ? 'serper' : 'seznam') : values.engine;
  const pages = integer(values.pages, '--pages', 5);
  const limit = integer(values.limit, '--limit', 1000);
  if (!countries.length || countries.some((country) => !Object.hasOwn(markets, country))) throw new Error('Neznámá země. Použijte --help.');
  if (!selectedTypes.length || selectedTypes.some((type) => !Object.hasOwn(types, type))) throw new Error('Neznámý obor. Použijte --help.');
  if (values.term && (background || countries.join() !== 'DE' || selectedTypes.length !== 1 ||
      !termsByKind[selectedTypes[0]].includes(values.term))) throw new Error('--term vyžaduje Německo a výraz z vybraného oboru.');
  if (cities && (!cities.length || countries.length !== 1)) throw new Error('--cities vyžaduje jedno nebo více měst v jediné zemi.');
  if (!['seznam', 'bing', 'serper'].includes(engine)) throw new Error('--engine musí být auto, seznam, bing nebo serper.');
  if (engine === 'serper' && !process.env.SERPER_API_KEY) throw new Error('Pro Serper nastavte SERPER_API_KEY.');

  const queries = background ? background.jobs.map((job) => {
    const locality = job.ambiguous && job.district && job.district !== job.name ? [job.name, job.district] : [job.name];
    const searchLocation = locality.map((name) => `"${name.replaceAll('"', '')}"`).join(' ');
    return {
      country: 'DE', countryName: 'Německo', language: 'de', targetCity: job.name, type: job.kind,
      contactPaths: markets.DE[4], job, searchTerm: job.term, query: `${job.term} ${searchLocation}`,
    };
  }) : countries.flatMap((country) => {
    const [language, countryName, defaultCities, terms, contactPaths] = markets[country];
    return (cities || defaultCities).flatMap((city) => selectedTypes.map((type) => ({
      country, countryName, language, targetCity: city, type, contactPaths,
      searchTerm: values.term || terms[Object.keys(types).indexOf(type)],
      query: `${values.term || terms[Object.keys(types).indexOf(type)]} ${city}`,
    })));
  });
  const searchResults = queries.map(() => []);
  const positions = queries.map(({ job, query }) => {
    let cursor = job?.previous_engine === engine ? job.previous_cursor : null;
    if (cursor && engine === 'seznam' && new URL(cursor).searchParams.get('q') !== query) cursor = null;
    return { cursor, number: cursor ? job.previous_pages + 1 : 1,
      hosts: new Set(cursor ? JSON.parse(job.previous_hosts) : []) };
  });
  const exhausted = new Set();
  console.log(`Vyhledávač: ${engine}.`);
  let failures = 0;
  searches: for (let page = 1; page <= pages; page++) {
    for (const [index, query] of queries.entries()) {
      if (exhausted.has(index)) continue;
      const position = positions[index];
      try {
        const { results, nextCursor } = await search(query.query, query.country, query.language, engine, position.cursor, {
          pageable: Boolean(background) || pages > 1, widen: Boolean(background),
        });
        if (query.job && !position.cursor) {
          query.job.fetched = 0;
          query.job.contacts = 0;
        }
        const previous = position.hosts.size;
        for (const result of results) {
          const url = websiteUrl(result.url);
          if (!url || /\.(?:pdf|docx?|xlsx?|jpe?g|png|zip)$/i.test(url.pathname)) continue;
          const host = hostKey(url);
          if (position.hosts.has(host)) continue;
          position.hosts.add(host);
          searchResults[index].push({ ...result, url });
        }
        const count = position.hosts.size - previous;
        const continuation = engine === 'seznam' || (count && position.number < 100) ? nextCursor : null;
        if (query.job) {
          query.job.matches = position.hosts;
          query.job.paging = { engine, cursor: continuation, number: position.number };
          query.job.error = null;
        }
        console.log(`[${query.country}] ${query.query} · strana ${position.number}: ${count} nových webů${continuation ? ' · další strana' : ' · konec výsledků'}`);
        if (!continuation) exhausted.add(index);
        position.cursor = continuation;
        position.number++;
      } catch (error) {
        failures++;
        if (query.job) query.job.error = error.message;
        exhausted.add(index);
        console.warn(`[${query.country}] ${query.query} · strana ${position.number}: ${error.message}`);
        if (/HTTP (403|429)\b/.test(error.message)) {
          for (const remaining of background?.jobs ?? []) {
            if (!remaining.paging) remaining.error ||= 'Vyhledávač omezil požadavky.';
          }
          break searches;
        }
      }
      await sleep(400);
    }
  }
  const candidates = new Map();
  const resultCount = Math.max(...searchResults.map((results) => results.length));
  for (let index = 0; index < resultCount && candidates.size < limit; index++) {
    for (const [queryIndex, results] of searchResults.entries()) {
      const result = results[index];
      const url = result?.url;
      if (!url) continue;
      const host = hostKey(url);
      const query = queries[queryIndex];
      if (background?.visited(query.job, host)) continue;
      const key = background ? `${query.job.ags}:${query.type}:${host}` : host;
      if (!candidates.has(key)) candidates.set(key, {
        ...query, url, title: result.title || '', snippet: result.snippet || '',
      });
      if (candidates.size >= limit) break;
    }
  }
  if (!background && !candidates.size) throw new Error('Vyhledávání nevrátilo použitelné weby.');
  console.log(`Kontroluji ${candidates.size} nalezených webů.`);
  const leads = new Map();
  const emails = new Set();
  const sites = [...candidates.values()];
  const inFlight = new Map();
  let next = 0;
  async function crawl() {
    while (next < sites.length) {
      const site = sites[next++];
      const host = hostKey(site.url);
      const pending = (inFlight.get(host) ?? Promise.resolve()).then(() => findSiteContact(site));
      inFlight.set(host, pending);
      const lead = await pending;
      if (inFlight.get(host) === pending) inFlight.delete(host);
      background?.visit(site.job, host, lead);
      if (!lead) continue;
      const id = sourceId(lead);
      if (lead.email && emails.has(lead.email.value)) continue;
      if (leads.has(id) && leads.get(id).email) continue;
      if (lead.email) emails.add(lead.email.value);
      leads.set(id, lead);
    }
  }
  await Promise.all(Array.from({ length: Math.min(background ? 8 : 4, sites.length) }, crawl));
  const contacts = [...leads.values()];
  const output = (!background || contacts.length) ? await saveCsv(contacts, engine) : null;
  const withEmail = contacts.filter((lead) => lead.email).length;
  const withPhone = contacts.filter((lead) => lead.phone).length;
  if (output) console.log(`CSV: ${output}`);
  console.log(`Kontaktů: ${contacts.length}, s e-mailem: ${withEmail}, s telefonem: ${withPhone}.`);
  if (failures) console.warn(`Částečný výsledek. Selhalo ${failures} z ${queries.length * pages} vyhledávání.`);
  if (background) {
    await background.save(contacts.filter((lead) => lead.email).map((lead) => adminRow(lead, engine)));
  }
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
