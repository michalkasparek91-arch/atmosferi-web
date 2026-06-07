import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import * as React from "react";
const getSupabase = () => import("@/integrations/supabase/client").then(m => m.supabase);
import { SUPERPROMINENT_SUBCATEGORIES, SuperprominentItem } from "@/config/superprominent";
import { Button } from "@/components/ui/button";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

// Items per slide based on columns to ensure full rows
const XL_DESKTOP_ITEMS = 12; // 6 columns * 2 rows
const LG_DESKTOP_ITEMS = 10; // 5 columns * 2 rows

// Mobile: 2 rows x 2 visible cards = 4 items per "page"
const MOBILE_ROWS = 2;
const MOBILE_VISIBLE_COLS = 2;

interface FavoriteServicesGridProps {
  className?: string;
}

const FavoriteServicesGrid = ({ className = "" }: FavoriteServicesGridProps) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerSlide, setItemsPerSlide] = useState(LG_DESKTOP_ITEMS);

  // Handle dynamic items per slide based on screen width
  React.useEffect(() => {
    const checkBreakpoint = () => {
      if (window.innerWidth >= 1280) { // xl breakpoint
        setItemsPerSlide(XL_DESKTOP_ITEMS);
      } else {
        setItemsPerSlide(LG_DESKTOP_ITEMS);
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  // Embla carousel for mobile two-row swipe
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["subcategories-favorites"],
    queryFn: async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("service_subcategories")
        .select("*")
        .order("name", { ascending: true })
        .limit(5000); // Higher limit to ensure we load all (including late alphabet letters)
      if (error) throw error;
      return data as Subcategory[];
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name, slug")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const totalSlides = Math.ceil(SUPERPROMINENT_SUBCATEGORIES.length / itemsPerSlide);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const handleServiceClick = (serviceName: string) => {
    const subcategory = subcategories.find((s) => 
      s.name.toLowerCase().trim() === serviceName.toLowerCase().trim()
    );
    if (subcategory) {
      navigate(`/nova-poptavka?category=${subcategory.category_id}&subcategory=${subcategory.id}`);
    } else {
      console.warn(`[FavoriteServicesGrid] Subcategory not found: "${serviceName}"`);
    }
  };

  // Get actual category name for a subcategory
  const getCategoryBadge = (serviceName: string): string => {
    const subcategory = subcategories.find((s) => s.name === serviceName);
    if (subcategory) {
      const category = categories.find((c) => c.id === subcategory.category_id);
      if (category) {
        return category.name;
      }
    }
    return "Služby";
  };

  // Get items for current desktop slide
  const getSlideItems = (slideIndex: number) => {
    const start = slideIndex * itemsPerSlide;
    return SUPERPROMINENT_SUBCATEGORIES.slice(start, start + itemsPerSlide);
  };

  // For mobile: pair items into columns (2 items per column for 2 rows)
  const getMobilePairedItems = () => {
    const pairs: [SuperprominentItem, SuperprominentItem | null][] = [];
    for (let i = 0; i < SUPERPROMINENT_SUBCATEGORIES.length; i += MOBILE_ROWS) {
      pairs.push([
        SUPERPROMINENT_SUBCATEGORIES[i],
        SUPERPROMINENT_SUBCATEGORIES[i + 1] || null,
      ]);
    }
    return pairs;
  };

  // Render a single service card
  const ServiceCard = ({ featured, size = "normal" }: { featured: SuperprominentItem; size?: "normal" | "small"; key?: string }) => (
    <button
      onClick={() => handleServiceClick(featured.name)}
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden group bg-card flex-shrink-0"
    >
      <img
        src={featured.image}
        alt={featured.name}
        loading="lazy"
        decoding="async"
        width={300}
        height={400}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.classList.add('bg-muted');
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      
      {/* Category badge - top left */}
      <div className="absolute top-2 left-2">
        <span className="inline-block px-2 py-0.5 font-bold bg-primary text-primary-foreground rounded-full text-[12px]">
          {getCategoryBadge(featured.name)}
        </span>
      </div>

      {/* Service name - bottom left */}
      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
        <span className={`text-white font-medium leading-tight block text-left ${
          size === "small" ? "text-xs" : "text-sm"
        }`}>
          {featured.name}
        </span>
      </div>
    </button>
  );

  const mobilePairs = getMobilePairedItems();

  return (
    <div className={`space-y-4 overflow-visible pb-6 md:pb-8 ${className}`}>
      {/* Header with title and navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl uppercase tracking-tight text-foreground font-extrablack">Oblíbené služby</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop navigation arrows - solid green */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={handlePrevSlide}
              aria-label="Předchozí"
              className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextSlide}
              aria-label="Další"
              className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="ghost"
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 h-8"
            onClick={() => navigate("/vsechny-sluzby")}
          >
            Všechny kategorie
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Mobile & Tablet: Two-row swipeable carousel */}
      <div className="block lg:hidden -mx-4">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-2.5 px-4">
            {mobilePairs.map((pair, colIndex) => (
              <div
                key={colIndex}
                className="flex-shrink-0 flex flex-col gap-2.5"
                style={{ width: "calc(45% - 5px)" }}
              >
                {/* Top row */}
                <ServiceCard featured={pair[0]} size="small" />
                {/* Bottom row */}
                {pair[1] && <ServiceCard featured={pair[1]} size="small" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop & Widescreen: Grid Carousel */}
      <div className="hidden lg:block overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {Array.from({ length: totalSlides }).map((_, slideIndex) => (
            <div
              key={slideIndex}
              className="w-full flex-shrink-0"
            >
              <div className="grid grid-cols-5 xl:grid-cols-6 auto-rows-auto gap-3">
                {getSlideItems(slideIndex).map((featured, index) => (
                  <ServiceCard
                    key={`${slideIndex}-${index}`}
                    featured={featured}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop slide indicators */}
      <div className="hidden lg:flex justify-center gap-1.5">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Stránka ${index + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              index === currentSlide
                ? "w-4 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FavoriteServicesGrid;
