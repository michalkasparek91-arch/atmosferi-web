// Shared helper to build BreadcrumbList JSON-LD entries.
// Use with <JsonLd data={buildBreadcrumbJsonLd([...])} id="breadcrumbs-jsonld" />.

const ORIGIN = "https://zrobee.cz";

export interface BreadcrumbCrumb {
  name: string;
  /** Absolute or root-relative path (e.g. "/poptavky"). Final crumb may omit URL. */
  path?: string;
}

export function buildBreadcrumbJsonLd(crumbs: BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: c.path.startsWith("http") ? c.path : `${ORIGIN}${c.path}` } : {}),
    })),
  };
}
