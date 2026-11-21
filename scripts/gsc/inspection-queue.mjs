// Pure, deterministic URL selection for the private six-hour Search Console audit.
// A contiguous group rotation visits the entire eligible archive, with
// explicit non-overlapping batches that can be proven complete in tests.
const ORIGIN = 'https://www.atmosferi.com';
const WINDOW_MS = 6 * 60 * 60 * 1000;
const LIMIT = 32;

function normalizeToKnownCanonical(value, known) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol) ||
        !['atmosferi.com','www.atmosferi.com'].includes(parsed.hostname) ||
        parsed.username || parsed.password || parsed.port) return null;
    let pathname = parsed.pathname;
    if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    // HTML aliases should resolve to the same published canonical, not take
    // separate inspection slots when Google reports historic URLs.
    const legacy = {'/index.html':'/', '/guides.html':'/guides',
      '/for-agencies.html':'/for-agencies'};
    pathname = legacy[pathname] || pathname;
    const candidate = ORIGIN + pathname;
    return known.has(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function rotateInContiguousGroups(items, slot, count) {
  if (!items.length || count <= 0) return [];
  const groups = Math.ceil(items.length / count);
  // The slot increments by exactly one at each scheduled six-hour run.
  // Every item occurs once during a complete groups-long cycle.
  const group = ((slot % groups) + groups) % groups;
  return items.slice(group * count, (group + 1) * count);
}

export function inspectionQueue(now, articles, services, canonicalUrls, topPages = []) {
  const slot = Math.floor(now.getTime() / WINDOW_MS);
  const known = new Set(canonicalUrls);
  const canonicalHome = ORIGIN + '/';
  const canonicalGuides = ORIGIN + '/guides';
  const mainService = ORIGIN + '/interactive-floor-plan-design-real-estate.html';
  const selected = [];
  const add = url => {
    if (url && known.has(url) && !selected.includes(url) && selected.length < LIMIT) selected.push(url);
  };

  add(canonicalHome);
  add(canonicalGuides);
  add(mainService);

  // Analytics can report apex-domain, HTTP and query-string variants of a
  // canonical page. Only inspect locally published canonical URLs.
  const popularity = new Map();
  for (const row of topPages) {
    const url = normalizeToKnownCanonical(row.keys?.[0], known);
    const impressions = Number(row.impressions);
    if (url && Number.isFinite(impressions) && impressions > 0) {
      popularity.set(url, (popularity.get(url) || 0) + impressions);
    }
  }
  [...popularity].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))
    .slice(0,4).forEach(([url])=>add(url));

  // Recent article slots stay visible across several runs; older pages are
  // selected from non-overlapping contiguous groups until all are covered.
  articles.slice(0,5).forEach(article=>add(article.url));

  const rotatingServices = services.filter(url=>known.has(url) && !selected.includes(url));
  rotateInContiguousGroups(rotatingServices, slot, 4).forEach(add);

  const rotatingArticles = articles.map(article=>article.url)
    .filter(url=>known.has(url) && !selected.includes(url));
  rotateInContiguousGroups(rotatingArticles, slot, 16).forEach(add);

  return selected;
}

export { normalizeToKnownCanonical, rotateInContiguousGroups };
