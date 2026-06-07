import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SLUG_TO_CITY } from "@/lib/city-regions";
import { Sparkles, TrendingUp } from "lucide-react";

export interface TopPseoLinkItem {
  path: string;
  label: string;
  impressions: number;
}

interface TopPseoLinksProps {
  limit?: number;
  className?: string;
  variant?: "grid" | "pills" | "footer";
}

export function useTopPseoLinks(limit = 50) {
  return useQuery({
    queryKey: ["top-pseo-links", limit],
    queryFn: async () => {
      // 1. Fetch top performing URLs from seo_performance
      const { data: perfData } = await supabase
        .from("seo_performance")
        .select("url, impressions")
        .like("url", "%/sluzby/%")
        .order("impressions", { ascending: false })
        .limit(limit * 2);

      const items: TopPseoLinkItem[] = [];
      const seenPaths = new Set<string>();

      if (perfData && perfData.length > 0) {
        for (const row of perfData) {
          try {
            const urlObj = new URL(row.url);
            const path = urlObj.pathname;
            if (seenPaths.has(path)) continue;

            const parts = path.split("/").filter(Boolean);
            if (parts.length >= 3 && parts[0] === "sluzby") {
              const citySlug = parts[parts.length - 1];
              const catSlug = parts[1];
              const cityName = SLUG_TO_CITY[citySlug] || citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
              const catName = catSlug.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
              
              seenPaths.add(path);
              items.push({
                path,
                label: `${catName} ${cityName}`,
                impressions: row.impressions || 0,
              });

              if (items.length >= limit) break;
            }
          } catch {
            // Ignore malformed URLs
          }
        }
      }

      // 2. If we need more items, fallback to existing pseo_contents
      if (items.length < limit) {
        const needed = limit - items.length;
        const { data: pseoData } = await supabase
          .from("pseo_contents")
          .select("city_slug, title, service_categories(slug, name)")
          .limit(needed * 2);

        if (pseoData) {
          for (const row of pseoData as any[]) {
            if (!row.service_categories) continue;
            const cat = row.service_categories;
            const path = `/sluzby/${cat.slug}/${row.city_slug}`;
            if (seenPaths.has(path)) continue;

            const cityName = SLUG_TO_CITY[row.city_slug] || row.city_slug.charAt(0).toUpperCase() + row.city_slug.slice(1);
            seenPaths.add(path);
            items.push({
              path,
              label: row.title || `${cat.name} ${cityName}`,
              impressions: 10, // Simulated baseline
            });

            if (items.length >= limit) break;
          }
        }
      }

      return items.slice(0, limit);
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
  });
}

export default function TopPseoLinks({ limit = 50, className = "", variant = "grid" }: TopPseoLinksProps) {
  const { data: links = [], isLoading } = useTopPseoLinks(limit);

  if (isLoading || links.length === 0) return null;

  if (variant === "footer") {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-100">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>Nejhledanější lokality</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.slice(0, 24).map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="text-xs text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 px-3 py-1.5 rounded-md border border-zinc-800 transition-all duration-200 flex items-center gap-1.5"
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "pills") {
    return (
      <section className={`py-8 ${className}`}>
        <div className="flex flex-wrap gap-2 justify-center items-center">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/80 hover:bg-primary hover:text-white text-zinc-700 dark:text-zinc-300 transition-all duration-300 shadow-sm flex items-center gap-2 group border border-zinc-200/80 dark:border-zinc-700/80"
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={`py-16 bg-zinc-50 dark:bg-zinc-900/40 border-y border-zinc-200/80 dark:border-zinc-800/80 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Zrobee v lokalitách</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              Nejhledanější řemesla a služby v ČR
            </h2>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm">
            Aktualizováno podle vyhledávání
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="group p-3 rounded-xl bg-white dark:bg-zinc-800/60 hover:bg-primary dark:hover:bg-primary border border-zinc-200 dark:border-zinc-700/80 hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-between gap-2"
            >
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-white transition-colors truncate">
                {link.label}
              </span>
              <TrendingUp className="h-3 w-3 text-zinc-400 group-hover:text-white/80 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
