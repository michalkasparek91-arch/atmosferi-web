import { useQuery } from "@tanstack/react-query";

const getSupabase = () => import("@/integrations/supabase/client").then(m => m.supabase);
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { useState, lazy, Suspense } from "react";
import { CATEGORY_ORDER, sortCategoriesByOrder } from "@/config/categoryOrder";
import { analytics } from "@/lib/analytics";

const FavoriteServicesGrid = lazy(() => import("@/components/FavoriteServicesGrid"));

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}


const ServiceCategories = () => {
  const navigate = useNavigate();
  const [showAllCategories, setShowAllCategories] = useState(false);

  const handleWorkerBannerClick = () => {
    analytics.trackConversion("registration", { source: "homepage_worker_banner" });
    navigate('/registrace-remeslnika');
  };
  
  const { data: categories, isLoading } = useQuery<ServiceCategory[]>({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("service_categories")
        .select("*");
      
      if (error) throw error;
      return sortCategoriesByOrder(data as ServiceCategory[]);
    },
    initialData: CATEGORY_ORDER as unknown as ServiceCategory[],
  });

  const getIcon = (iconName: string) => {
    return getCategoryIcon(iconName);
  };

  if (isLoading) {
    return (
      <>
        <section className="pt-4 pb-8 px-4 md:px-8 lg:px-[150px] overflow-visible relative z-10 min-h-[340px]">
          <div className="overflow-visible min-h-[268px]">
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-full bg-card shadow-sm h-[42px]">
                    <div className="flex-shrink-0 w-5 h-5">
                      <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-transparent select-none">
                Zobrazit další
              </div>
            </div>
          </div>
        </section>
        <section className="bg-background px-4 md:px-8 lg:px-[150px] pb-8">
          <div className="h-[150px] md:h-[112px] rounded-2xl bg-muted animate-pulse" />
        </section>
        <div className="w-full bg-secondary py-3 md:py-4 px-3 md:px-4">
          <div className="mx-auto max-w-4xl flex items-center justify-center gap-3 sm:gap-6 md:gap-16">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-28 sm:w-36 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
        <section className="bg-background px-4 lg:px-8 py-4">
          <div className="mx-auto max-w-4xl lg:max-w-6xl">
            <div className="space-y-4 pb-6 md:pb-8">
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 grid-rows-2 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const sortedCategories = categories ?? [];

  // Show 12 items (3 rows x 4 cols on desktop) before expanding
  const displayedCategories = showAllCategories ? sortedCategories : sortedCategories.slice(0, 12);

  return (
    <>
      <section className="bg-background relative z-10 px-4 md:px-8 lg:px-[150px] py-8 min-h-[570px] lg:min-h-[600px]">
        <div>
          <Suspense fallback={<div className="h-[500px]" />}>
            <FavoriteServicesGrid />
          </Suspense>
        </div>
      </section>

      <section className="bg-background px-4 md:px-8 lg:px-[150px] pb-8">
        <div className="rounded-2xl bg-dark-green px-5 py-5 md:px-7 md:py-5 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">
                Jste řemeslník nebo profík?
              </p>
              <p className="text-lg md:text-xl font-extrablack leading-tight text-sidebar-foreground">
                Získejte nové zákazníky ve vašem okolí.
              </p>
              <p className="text-sm text-sidebar-foreground/75 mt-1">
                Prvních 20 kreditů zdarma.
              </p>
            </div>
            <Button
              onClick={handleWorkerBannerClick}
              className="w-full md:w-auto h-11 px-5 shrink-0 bg-primary text-primary-foreground hover:bg-primary-hover font-bold"
            >
              Registrovat jako profík
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default ServiceCategories;
