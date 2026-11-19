export const leadKinds = {
  marketing: 'Marketingová agentura', architect: 'Architektonické studio', developer: 'Realitní developer',
};

const specialties = {
  marketing: [
    ['Online-Marketing-Agentur', 'Online marketing', /online[ -]?marketing|digital marketing/],
    ['Werbeagentur', 'Reklama', /werbeagentur|advertising agency|reklamn[ií] agentur/],
    ['Digitalagentur', 'Digitální agentura', /digital[ -]?agentur|digital agency|digitalni agentur/],
    ['SEO Agentur', 'SEO', /\bseo\b|suchmaschinenoptimierung/],
    ['Social Media Agentur', 'Sociální sítě', /social[ -]media|socialni sit/],
    ['Kommunikationsagentur', 'PR a komunikace', /kommunikationsagentur|\bpr[ -]agentur|public relations|komunikacni agentur/],
  ],
  architect: [
    ['Innenarchitektur', 'Interiérová architektura', /innenarchitekt|interior architecture|interierov[aey] architekt|architektura interier/],
    ['Landschaftsarchitekturbüro', 'Krajinářská architektura', /landschaftsarchitekt|landscape architect|krajinarsk[aey] architekt/],
    ['Stadtplanungsbüro', 'Urbanismus a územní plánování', /stadtplanung|stadtebau|urban planning|urbanismus|uzemni planovan/],
    ['Architekturbüro Denkmalpflege', 'Památky a rekonstrukce', /denkmalpflege|denkmalarchitekt|heritage conservation|pamatkova pec/],
    ['Selbstständiger Architekt', 'Samostatný architekt', /selbststandige[rn]? architekt|einzelburo|samostatn[yáa] architekt|independent architect/],
  ],
  developer: [
    ['Wohnimmobilien Projektentwickler', 'Rezidenční development', /wohnimmobilien|wohnungsbau|residential development|rezidencni development/],
    ['Gewerbeimmobilien Projektentwickler', 'Komerční development', /gewerbeimmobilien|commercial development|komercni development/],
    ['Logistikimmobilien Projektentwickler', 'Logistický a průmyslový development', /logistikimmobilien|industrieimmobilien|logistics development|industrial development|prumyslovy development/],
    ['Mixed-Use Projektentwickler', 'Smíšené projekty', /mixed[ -]use|gemischt genutzte|smisene projekty/],
  ],
};

const generalTerms = {
  marketing: ['Marketingagentur'],
  architect: ['Architekturbüro', 'Architekten', 'Architektur Studio'],
  developer: ['Immobilien Projektentwickler', 'Bauträger', 'Immobilienentwickler'],
};

export const termsByKind = Object.fromEntries(Object.entries(generalTerms).map(([kind, terms]) =>
  [kind, [...terms, ...specialties[kind].map(([term]) => term)]]));

const field = {
  marketing: /(?:marketing(?:ov[aey])?|werbe|digital(?:ni)?|performance|seo|webdesign|kreativ|reklamni|komunikacni|kommunikations|branding|social.media|advertising|creative|pr)[ -]*(?:agentur|agency)|agence.{0,20}(?:marketing|publicite|digitale)|(?:marketing ugynokseg|agencja marketingowa)/,
  architect: /architekt|\barchitect(?:s|e|es|ural studio|ure (?:studio|practice|firm|agency))?\b|arkitekt|epitesz|urbanism|pracownia architektoniczna|stadtplanungsburo/,
  developer: /immobilienentwickl|immobilien.projektentwickl|projektentwickl.{0,44}(?:immobilien|wohnungsbau)|bautrager|realitn[iy] develop|property develop|real estate develop|residential develop|promoteur immobilier|ingatlanfejleszt|deweloper nieruchomosci/,
};

export function classifyLeadTerm(kind, term, siteEvidence) {
  const requested = specialties[kind].find(([searchTerm]) => term === searchTerm);
  const evidence = siteEvidence.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/\b(?:fur|for|pro)\s+(?:immobilien)?projektentwickl\w*/g, '');
  const matches = specialties[kind].filter(([, , pattern]) => pattern.test(evidence));
  const supported = field[kind].test(evidence) || (kind === 'architect' && matches.length > 0);
  if (!supported) return null;
  return {
    term,
    specialties: requested ? (matches.includes(requested) ? [requested[1]] : []) : matches.map(([, label]) => label),
    needsReview: Boolean(requested && !matches.includes(requested)),
  };
}
