import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LocalRelatedServicesProps {
  currentCategorySlug: string;
  cityName: string;
  citySlug: string;
}

const LocalRelatedServices = ({ currentCategorySlug, cityName, citySlug }: LocalRelatedServicesProps) => {
  const RELATED_MAP: Record<string, string[]> = {
    "stavby-rekonstrukce": ["instalater", "elektro", "zahrada", "montaz-a-oprava"],
    "instalater": ["stavby-rekonstrukce", "montaz-a-oprava", "elektro"],
    "elektro": ["instalater", "stavby-rekonstrukce", "montaz-a-oprava"],
    "zahrada": ["stavby-rekonstrukce", "uklid-bytovych-prostor"],
    "uklid-bytovych-prostor": ["zahrada", "stavby-rekonstrukce"],
    "zdravi-a-sport": ["gastro-a-akce", "finance-a-dane"],
    "finance-a-dane": ["zdravi-a-sport", "doprava-a-logistika"],
  };

  const { data: categories, isLoading } = useQuery({
    queryKey: ["related-categories-local", currentCategorySlug],
    queryFn: async () => {
      let query = supabase
        .from("service_categories")
        .select("name, slug, icon")
        .neq("slug", currentCategorySlug);

      const preferred = RELATED_MAP[currentCategorySlug];
      if (preferred && preferred.length > 0) {
        query = query.in("slug", preferred);
      } else {
        query = query.limit(12);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="mt-20 pb-10">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0 || !cityName) return null;

  return (
    <section className="mt-20 border-t border-border/40 pt-16 pb-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-foreground">
          <Layers className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
            Hledáte v lokalitě {cityName} také:
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Další ověřené služby, které poptávají zákazníci přímo ve vašem sousedství.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            to={`/sluzby/${cat.slug}/${citySlug}`}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-muted/30"
          >
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {cat.name}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all" strokeWidth={1.75} />
          </Link>
        ))}
      </div>
    </section>
  );
};

export default LocalRelatedServices;
