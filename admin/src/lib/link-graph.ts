// Internal-linking helper for PSEO templates.
// Every programmatic landing page should render a consistent density of
// contextual links: parent hubs, sibling cities, related subcategories and
// a couple of magazine articles. Centralising this here guarantees every
// template ships the same internal link graph — the single biggest lever
// for getting deep PSEO pages crawled and ranked.

import { supabase } from "@/integrations/supabase/client";

export interface LinkRef {
  label: string;
  href: string;
}

export interface PageLinkGraph {
  parents: LinkRef[];     // Up: category hub, city hub, region hub
  siblings: LinkRef[];    // Lateral: other cities for same category
  related: LinkRef[];     // Subcategories within same category
  editorial: LinkRef[];   // Magazine articles on the topic
}

interface BuildArgs {
  categorySlug?: string;
  categoryName?: string;
  subcategorySlug?: string | null;
  subcategoryName?: string | null;
  citySlug?: string;
  cityName?: string;
  regionSlug?: string;
  regionName?: string;
  /** Cap per bucket. Default 6. */
  perBucket?: number;
}

/** Build a consistent internal-link graph for a programmatic page. */
export async function buildLinkGraph(args: BuildArgs): Promise<PageLinkGraph> {
  const cap = args.perBucket ?? 6;

  const parents: LinkRef[] = [];
  if (args.categorySlug && args.categoryName) {
    parents.push({ label: args.categoryName, href: `/sluzby/${args.categorySlug}` });
  }
  if (args.citySlug && args.cityName) {
    parents.push({ label: args.cityName, href: `/mesto/${args.citySlug}` });
  }
  if (args.regionSlug && args.regionName) {
    parents.push({ label: args.regionName, href: `/region/${args.regionSlug}` });
  }

  const [siblings, related, editorial] = await Promise.all([
    fetchSiblingCities(args, cap),
    fetchRelatedSubcategories(args, cap),
    fetchEditorial(args, Math.min(3, cap)),
  ]);

  return { parents, siblings, related, editorial };
}

async function fetchSiblingCities(args: BuildArgs, cap: number): Promise<LinkRef[]> {
  if (!args.categorySlug) return [];
  try {
    const { data } = await (supabase as any)
      .from("pseo_contents")
      .select("city_slug")
      .eq("category_id", args.categorySlug) // resolved upstream when category_id is known
      .limit(50);
    const seen = new Set<string>();
    const out: LinkRef[] = [];
    for (const row of (data || []) as Array<{ city_slug: string }>) {
      if (!row.city_slug || row.city_slug === args.citySlug) continue;
      if (seen.has(row.city_slug)) continue;
      seen.add(row.city_slug);
      out.push({
        label: humanizeSlug(row.city_slug),
        href: `/sluzby/${args.categorySlug}/${row.city_slug}`,
      });
      if (out.length >= cap) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchRelatedSubcategories(args: BuildArgs, cap: number): Promise<LinkRef[]> {
  if (!args.categorySlug) return [];
  try {
    const { data } = await (supabase as any)
      .from("service_subcategories")
      .select("slug, name, category:service_categories!inner(slug)")
      .neq("slug", args.subcategorySlug ?? "")
      .limit(cap + 3);
    const out: LinkRef[] = [];
    for (const row of (data || []) as Array<{ slug: string; name: string; category: { slug: string } }>) {
      if (row.category?.slug !== args.categorySlug) continue;
      const base = args.citySlug
        ? `/sluzby/${args.categorySlug}/${row.slug}/${args.citySlug}`
        : `/sluzby/${args.categorySlug}/${row.slug}`;
      out.push({ label: row.name, href: base });
      if (out.length >= cap) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchEditorial(args: BuildArgs, cap: number): Promise<LinkRef[]> {
  if (!args.categoryName && !args.subcategoryName) return [];
  const needle = (args.subcategoryName || args.categoryName || "").toLowerCase();
  try {
    const { data } = await (supabase as any)
      .from("radce_articles")
      .select("slug, title")
      .eq("status", "published")
      .ilike("title", `%${needle}%`)
      .limit(cap);
    return ((data || []) as Array<{ slug: string; title: string }>).map((a) => ({
      label: a.title,
      href: `/radce/${a.slug}`,
    }));
  } catch {
    return [];
  }
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
