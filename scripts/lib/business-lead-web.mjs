import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { classifyLeadTerm } from './business-lead-taxonomy.mjs';

const agent = 'AtmosferiLeadFinder';
const blocked = new BlockList();
for (const [address, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
]) blocked.addSubnet(address, bits);
const ignoredDomains = new Set([
  'bing.com', 'microsoft.com', 'seznam.cz', 'facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com',
  'wikipedia.org', 'firmy.cz', 'mapy.cz', 'mapy.com', 'clutch.co', 'goodfirms.co', 'designrush.com',
  'archdaily.com', 'archiweb.cz', 'zivefirmy.cz', 'najisto.centrum.cz', 'idatabaze.cz', 'azet.sk',
  'developerske-projekty.cz', 'developerske-projekty-praha.cz', 'rightmove.co.uk',
  'agenturtipp.de', 'omr.com', 'influencermarketinghub.com', 'werkenntdenbesten.de', '11880.com', 'gelbeseiten.de',
  'dastelefonbuch.de', 'agenturmatching.de', 'agentur.de', 'agentur-matching.de',
  'fiabci.de', 'fiabci.org',
]);

export function websiteUrl(value, base) {
  try {
    const url = new URL(value, base);
    const hostname = url.hostname.replace(/\.$/, '');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
        !hostname.includes('.') || isIP(hostname) || /(?:^|\.)(?:google|sortlist|yelp)\.[a-z.]+$/.test(hostname)) return null;
    const labels = hostname.split('.');
    if (labels.some((_, index) => ignoredDomains.has(labels.slice(index).join('.')))) return null;
    url.hostname = hostname;
    url.hash = '';
    return url;
  } catch { return null; }
}

export function hostKey(url) {
  return url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', commat: '@', period: '.', ndash: '–', mdash: '—', hellip: '…' };
function decode(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? match;
    const code = /^#x/i.test(entity) ? Number.parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}
const plain = (html) => decode(html.replace(/<\/?(?:b|strong|em|span)\b[^>]*>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(([, name, double, single, bare]) => [name.toLowerCase(), decode(double ?? single ?? bare)]));

export function bingResults(xml) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(([, item]) => ({
    url: decode(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? ''),
    title: plain(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    snippet: plain(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? ''),
  }));
}

export function seznamResults(html) {
  const results = [];
  for (const [, attributes, label] of html.matchAll(/<a\b([^>]*\bdata-e-a\s*=\s*["']heading["'][^>]*)>([\s\S]*?)<\/a>/gi)) {
    const link = attrs(attributes);
    // Organic results show the full destination URL in the heading tooltip.
    if (!/^Přejít na: https?:\/\//i.test(link.title ?? '') || !link.href) continue;
    results.push({ url: link.href, title: plain(label) });
  }
  return results;
}

export function seznamNextPage(html, currentUrl) {
  const current = new URL(currentUrl);
  const start = Number(current.searchParams.get('from') ?? 0);
  for (const [tag] of html.matchAll(/<a\b[^>]*\bdata-e-a\s*=\s*["']next["'][^>]*>/gi)) {
    const href = attrs(tag).href;
    if (!href) continue;
    let next;
    try { next = new URL(href, current); } catch { continue; }
    const offset = Number(next.searchParams.get('from'));
    if (next.origin === 'https://search.seznam.cz' && next.pathname === '/' && !next.username && !next.password &&
        next.searchParams.get('q') === current.searchParams.get('q') && Number.isInteger(offset) && offset > start && offset <= 1000) {
      return next.href;
    }
  }
  return null;
}

// Resolve and pin the address for each request, including redirects from unknown sites.
async function requestWebsite(url) {
  const signal = AbortSignal.timeout(6500);
  const records = await lookup(url.hostname, { family: 4, all: true });
  const address = records.find((record) => !blocked.check(record.address))?.address;
  if (!address) return null;
  return new Promise((resolve, reject) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = request(url, {
      family: 4, agent: false, signal,
      lookup: (_host, _options, callback) => callback(null, address, 4),
      headers: { 'User-Agent': `${agent}/1.0 (+https://www.atmosferi.com/)`, Accept: 'text/html, text/plain', 'Accept-Encoding': 'identity' },
    }, (res) => {
      const { statusCode: status, headers } = res;
      if (status !== 200 || !/^(?:text\/|application\/xhtml)/i.test(headers['content-type'] ?? '')) {
        res.destroy();
        resolve({ status, location: headers.location, body: '' });
        return;
      }
      const chunks = [];
      let size = 0;
      res.on('error', reject);
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > 1_500_000) {
          resolve(null);
          res.destroy();
        } else chunks.push(chunk);
      });
      res.on('end', () => {
        const charset = (headers['content-type'] ?? '').match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] ?? 'utf-8';
        let decoder;
        try { decoder = new TextDecoder(charset); } catch { decoder = new TextDecoder(); }
        resolve({ status, body: decoder.decode(Buffer.concat(chunks)) });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function matchesRobotsRule(path, pattern) {
  if (!pattern) return false;
  const exact = pattern.endsWith('$');
  const [prefix, ...segments] = (exact ? pattern.slice(0, -1) : pattern).split('*');
  if (!path.startsWith(prefix)) return false;
  if (!segments.length) return !exact || prefix.length === path.length;
  if (exact) {
    const suffix = segments.pop();
    if (!path.endsWith(suffix)) return false;
    path = path.slice(0, path.length - suffix.length);
  }
  let offset = prefix.length;
  if (offset > path.length) return false;
  for (const segment of segments) {
    const index = path.indexOf(segment, offset);
    if (index === -1) return false;
    offset = index + segment.length;
  }
  return true;
}

export function robotsAllows(text, path) {
  const groups = [];
  let group;
  for (const line of text.split(/\r?\n/)) {
    const [, field, value] = line.match(/^\s*(user-agent|allow|disallow)\s*:\s*([^#]*)/i) ?? [];
    if (!field) continue;
    if (field.toLowerCase() === 'user-agent') {
      if (!group || group.rules.length) groups.push(group = { agents: [], rules: [] });
      group.agents.push(value.trim().toLowerCase());
    } else if (group) group.rules.push({ allow: field.toLowerCase() === 'allow', pattern: value.trim() });
  }
  const specific = groups.filter(({ agents }) => agents.includes(agent.toLowerCase()));
  const rules = (specific.length ? specific : groups.filter(({ agents }) => agents.includes('*'))).flatMap(({ rules }) => rules);
  const matches = rules.filter(({ pattern }) => matchesRobotsRule(path, pattern));
  matches.sort((a, b) => b.pattern.length - a.pattern.length || Number(b.allow) - Number(a.allow));
  return matches[0]?.allow ?? true;
}

async function readPage(url, robots) {
  for (let redirects = 0; url && redirects <= 4; redirects++) {
    try {
      if (robots) {
        if (!robots.has(url.origin)) robots.set(url.origin, readPage(new URL('/robots.txt', url)));
        const rules = await robots.get(url.origin);
        if (!rules || (rules.status >= 400 && ![404, 410].includes(rules.status)) ||
            !robotsAllows(rules.body, url.pathname + url.search)) return null;
        await sleep(300);
      }
      const response = await requestWebsite(url);
      if (response?.status >= 300 && response.status < 400 && response.location) {
        url = websiteUrl(response.location, url);
      } else return response && { ...response, url };
    } catch { return null; }
  }
  return null;
}

const emailPattern = /[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}(?![a-z\d-])/gi;
const roleEmail = /^(?:info|kontakt|contact|office|hello|ahoj|studio|team|recepce|reception|mail|enquiry|enquiries|sales|obchod|poptavky)(?:[.\d+_-]|@)/;
const emailServices = /^(?:gmail\.com|seznam\.cz|email\.cz|outlook\.com|gmx\.(?:at|de|ch|net)|web\.de|icloud\.com|centrum\.(?:cz|sk)|post\.cz|azet\.sk|wp\.pl|onet\.pl)$/;
const contactPage = /(?:kontakt|contact|impressum|about|o-nas|o_nas|kapcsolat|contatti|over-ons|nous-joindre)/i;
const companyPage = /(?:^|\/)(?:leistungen|services|uber-uns|ueber-uns|unternehmen|profil|about(?:-us)?|agentur|studio)(?:\/|$)/i;
const nonCompanyIdentity = /(?:internationaler|deutscher|europaischer) verband der|(?:international|european|german) (?:federation|association) of|\bbranchen(?:buch|verzeichnis)\b|\b(?:directory|Verzeichnis) (?:of|fur|der)\b/i;
const phoneLabel = /(?:telefon|phone|téléphone|tel(?:\.|\s*:)|mobil(?:e|ní)?)[\s:]*((?:\+|00)?\d[\d().\-\s]{6,24}\d)/giu;
const cityAliases = {
  Praha: ['Praze', 'Prague'], Plzeň: ['Plzni', 'Pilsen'], Bratislava: ['Bratislave'], Košice: ['Košiciach'],
  Wien: ['Vienna', 'Vídeň'], München: ['Munich'], Zürich: ['Zurich'], Warszawa: ['Warsaw'],
};
const folded = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function cleanPhone(raw) {
  const candidate = raw.trim().replace(/^00/, '+').replace(/^(\+\d{1,3}[ .-]*)\(0\)/, '$1');
  if (!/^\+?[\d().\s-]+$/.test(candidate)) return '';
  const digits = candidate.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15 || /^(\d)\1+$/.test(digits)) return '';
  return candidate.startsWith('+') ? `+${digits}` : candidate.replace(/\s+/g, ' ');
}

export function readContact(html, url) {
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attrs(tag));
  const name = meta.find((entry) => entry.property === 'og:site_name')?.content?.trim() || '';
  const textHtml = html.replace(/<!--[\s\S]*?-->|<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const links = [...textHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(([, attributes, label]) => ({ href: attrs(attributes).href ?? '', label: plain(label) }));
  const emails = new Map();
  const site = hostKey(url);
  function collectEmails(value, explicit) {
    for (const match of value.matchAll(emailPattern)) {
      const email = match[0].toLowerCase();
      const domain = email.split('@')[1];
      const ownDomain = site === domain || site.endsWith(`.${domain}`) || domain.endsWith(`.${site}`);
      if ((!ownDomain && !(explicit && emailServices.test(domain))) ||
          /^(?:noreply|no-reply|test|example|privacy|dpo|gdpr|abuse|webmaster)(?:[+._-]|@)/.test(email)) continue;
      const score = (ownDomain ? 4 : 0) + (roleEmail.test(email) ? 8 : 0) + (explicit ? 2 : 0);
      emails.set(email, Math.max(score, emails.get(email) ?? 0));
    }
  }
  const text = plain(textHtml);
  const headings = [...textHtml.matchAll(/<(title|h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(([, , heading]) => plain(heading));
  const descriptions = meta.filter((entry) => ['description', 'og:description', 'og:title', 'og:site_name'].includes(entry.name || entry.property))
    .map((entry) => entry.content);
  collectEmails(text, false);
  const phones = [];
  for (const { href } of links) {
    if (/^mailto:/i.test(href)) {
      const value = href.slice(7).split('?')[0];
      try { collectEmails(decodeURIComponent(value), true); } catch { /* Invalid percent encoding. */ }
    }
    if (/^tel:/i.test(href)) phones.push(href.slice(4).split(/[;?]/)[0]);
  }
  for (const [, raw] of html.matchAll(/"telephone"\s*:\s*"([^"\\]+)"/gi)) phones.push(raw);
  for (const [, raw] of text.matchAll(phoneLabel)) phones.push(raw);
  const contactLinks = links.filter(({ href, label }) => contactPage.test(href) || /^(?:kontakt(?:y|ujte nás)?|contact(?: us)?|impressum|kapcsolat|contatti)$/i.test(label))
    .map(({ href }) => websiteUrl(href, url)).filter((link) => link && hostKey(link) === site && link.href !== url.href);
  return {
    name: plain(name).slice(0, 160),
    evidence: `${url.hostname} ${text.slice(0, 45_000)}`,
    identity: [name, ...descriptions, ...headings.slice(0, 3)].filter(Boolean).join('\n'),
    services: [...descriptions, ...headings, ...text.matchAll(/\b(?:wir sind|wir entwickeln|we are|we develop|jsme|entwickeln wir)\b[^.!?]{0,160}/gi)].map(String).join('\n'),
    email: [...emails].sort((a, b) => b[1] - a[1])[0] ?? ['', 0],
    phone: phones.map(cleanPhone).find(Boolean) ?? '',
    contactLinks,
  };
}

export async function findSiteContact(candidate) {
  const aliases = Object.hasOwn(cityAliases, candidate.targetCity)
    ? [candidate.targetCity, ...cityAliases[candidate.targetCity]] : [candidate.targetCity];
  const locality = aliases.map((alias) => folded(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const cityMatch = new RegExp(`\\b(?:${locality})(?![a-z])`);
  const robots = new Map();
  const start = await readPage(candidate.url, robots);
  const home = new URL('/', start?.url ?? candidate.url);
  const homepage = start?.url.href === home.href ? start : await readPage(home, robots);
  const pages = new Map();
  if (homepage?.body) pages.set(homepage.url.href, homepage);
  if (start?.body) pages.set(start.url.href, start);
  const targets = new Map();
  let name = '';
  let email, phone;
  let evidence = '';
  let services = '';
  let identity = '';
  function inspect(page) {
    const details = readContact(page.body, page.url);
    evidence += ` ${folded(details.evidence)}`;
    if (page.url.href === homepage?.url.href || page.url.pathname === '/') identity = details.identity;
    if (page.url.href === homepage?.url.href || page.url.pathname === '/' ||
        contactPage.test(page.url.pathname) || companyPage.test(folded(page.url.pathname))) services += `\n${details.services}`;
    name ||= details.name;
    if (details.email[0] && (!email || details.email[1] > email.score)) {
      email = { value: details.email[0], score: details.email[1], source: page.url.href };
    }
    if (details.phone && (!phone || contactPage.test(page.url.pathname))) {
      phone = { value: details.phone, source: page.url.href };
    }
    return details.contactLinks;
  }
  for (const page of pages.values()) for (const link of inspect(page)) targets.set(link.href, link);
  for (const path of candidate.contactPaths) {
    const url = new URL(path, home);
    targets.set(url.href, url);
  }
  for (const url of [...targets.values()].filter((link) => !pages.has(link.href)).slice(0, 4)) {
    if (email?.score >= 12 && phone && (!candidate.job || cityMatch.test(evidence)) &&
        classifyLeadTerm(candidate.type, candidate.searchTerm, services)) break;
    const page = await readPage(url, robots);
    if (page?.body) inspect(page);
  }
  if (!email && !phone) return null;
  if (nonCompanyIdentity.test(folded(identity))) return null;
  const official = [...pages.values()][0]?.url ?? home;
  const germanAgency = candidate.country === 'DE' && candidate.type === 'marketing';
  const category = classifyLeadTerm(candidate.type, candidate.searchTerm, services);
  if (!category) return null;
  const city = cityMatch.test(evidence) ? candidate.targetCity : '';
  const localDomain = hostKey(official).endsWith(`.${candidate.country.toLowerCase()}`);
  if (!city && (candidate.job || !localDomain)) return null;
  if (germanAgency && !localDomain && !phone?.value.startsWith('+49') &&
      !new RegExp(`\\b\\d{5}\\s+(?:${locality})(?![a-z])`).test(evidence)) return null;
  if (germanAgency && phone?.value.startsWith('0')) phone.value = `+49${phone.value.replace(/\D/g, '').slice(1)}`;
  return { ...candidate, city, category, website: official.origin, company: name || candidate.title.slice(0, 160) || hostKey(official), email, phone };
}
