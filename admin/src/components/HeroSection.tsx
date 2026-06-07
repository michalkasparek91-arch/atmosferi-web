import { useNavigate } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
const SearchAutocomplete = lazy(() => import("./SearchAutocomplete"));
import workerImage from "@/assets/cutoutguy_3.webp";
const womanImage = "/assets/cutoutwoman.webp";
import { useQuery } from "@tanstack/react-query";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { CATEGORY_ORDER, sortCategoriesByOrder } from "@/config/categoryOrder";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

const getSupabase = () => import("@/integrations/supabase/client").then(m => m.supabase);

const HeroSection = () => {
  const navigate = useNavigate();
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data: categories } = useQuery<ServiceCategory[]>({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase.from("service_categories").select("*");
      if (error) throw error;
      return sortCategoriesByOrder(data as ServiceCategory[]);
    },
    initialData: CATEGORY_ORDER as unknown as ServiceCategory[],
  });

  const handleServiceSelect = (subcategoryId: string, categoryId: string) => {
    navigate(`/nova-poptavka?category=${categoryId}&subcategory=${subcategoryId}`);
  };

  const sortedCategories = categories ?? [];
  // Mobile: 8 categories (4 rows) | Desktop: 12 categories (3 rows x 4 cols)
  const mobileLimit = 6;
  const desktopLimit = 8;
  
  const displayedCategories = showAllCategories 
    ? sortedCategories 
    : sortedCategories.slice(0, typeof window !== 'undefined' && window.innerWidth < 768 ? mobileLimit : desktopLimit);

  return (
    <section className="py-4 md:pt-0 md:pb-16 px-0 md:px-8 lg:px-[150px] bg-background overflow-visible relative">
      <div className="mx-3 md:mx-0 bg-primary rounded-[40px] px-6 py-10 md:px-12 md:pt-10 md:pb-16 relative z-20 min-h-0 flex flex-col justify-center overflow-hidden">
        

        <div className="relative z-20 pointer-events-none">
          <div className="text-center pointer-events-auto">
            {/* Trust Signals above header */}
            <div className="flex items-center justify-center gap-4 mb-5 text-[12px] font-bold uppercase tracking-widest text-primary-foreground/90">
              <div className="flex items-center gap-1.5">
                <span className="text-primary-foreground/80">★</span>
                <span>4.9/5 Hodnocení</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-current opacity-30" />
              <span>Ověření profíci</span>
            </div>

            <h1 className="pt-4 text-3xl md:text-4xl lg:text-5xl font-extrablack uppercase text-primary-foreground mb-4 leading-[1.1] tracking-tight">
              Najdi profíka
              <br />
              na cokoliv.
            </h1>


            <p className="text-sm md:text-base text-primary-foreground/90 mb-8 max-w-xl mx-auto font-semibold px-4 leading-snug">
              Od zedníka přes účetní až po lektora angličtiny. Napiš, co potřebuješ, a my tě propojíme s prověřenými lidmi z okolí.
            </p>




            {/* Keyword-first Search with AI Fallback */}
            <div className="flex flex-col justify-center py-4">
              <div className="w-full max-w-2xl mx-auto relative px-2">
                <Suspense fallback={<div className="h-14 bg-card animate-pulse rounded-full" />}>
                  <SearchAutocomplete onSelect={handleServiceSelect} />
                </Suspense>
                
                <div className="mt-4 flex items-center justify-center gap-x-2 text-[12px] text-primary-foreground/90 font-bold uppercase tracking-wider">
                  <span>Zdarma</span>
                  <span className="opacity-30">•</span>
                  <span>Bez závazků</span>
                  <span className="opacity-30">•</span>
                  <span>Rychlé odpovědi</span>
                </div>
              </div>
            </div>

            {/* Categories integrated inside the hero - Pushed to bottom on mobile */}
            <div className="mt-auto pt-10 max-w-4xl mx-auto w-full px-2 relative z-30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {displayedCategories?.map((category) => {
                  const Icon = getCategoryIcon(category.icon, category.slug);
                  return (
                    <button
                      key={category.id}
                      onClick={() => navigate(`/nova-poptavka?category=${category.id}`)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-full bg-primary hover:bg-primary-hover transition-all shadow-sm h-[42px] border border-dark-green"
                    >
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-dark-green" />
                      </div>
                      <div className="flex-1 text-left min-w-0 overflow-hidden">
                        <div className="font-bold text-dark-green text-[12px] leading-tight line-clamp-1">
                          {category.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>


              {sortedCategories.length > (typeof window !== 'undefined' && window.innerWidth < 768 ? mobileLimit : desktopLimit) && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="w-full mt-4 pb-2 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                >
                  {showAllCategories ? (
                    <>Zobrazit méně <ChevronUp className="h-4 w-4" /></>
                  ) : (
                    <>Zobrazit vše <ChevronDown className="h-4 w-4" /></>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>

  );
};

export default HeroSection;
