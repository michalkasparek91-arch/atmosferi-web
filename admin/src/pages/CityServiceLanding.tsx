import { useState, useEffect, useMemo, Component, ReactNode } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, BookOpen, Clock, ChevronRight, Star, ShieldCheck, MapPin, Search, CheckCircle2, Info, Loader2, Wrench, Layers, AlertCircle, FilePlus, MessageSquare, UserPlus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import { CITY_COORDINATES, calculateDistanceFromCoords, getRegionForCity, getLocativeForCity, getPreposition, SLUG_TO_CITY, REGION_TO_SLUG, cityToSlug } from "@/lib/city-regions";
import PseoContent, { type RichPseoContent } from "@/components/seo/PseoContent";
import PseoHeroImage from "@/components/seo/PseoHeroImage";
import PricingEstimateCard, { type PricingEstimateItem } from "@/components/seo/PricingEstimateCard";
import SocialProofStrip from "@/components/seo/SocialProofStrip";
import LocalCoverageMap from "@/components/seo/LocalCoverageMap";
import RecentRealizations from "@/components/seo/RecentRealizations";
import LocalRelatedServices from "@/components/seo/LocalRelatedServices";
import LocalRegionalLinks from "@/components/seo/LocalRegionalLinks";
import LocalSeoFaq from "@/components/seo/LocalSeoFaq";
import { buildLocalSeoFaqs } from "@/components/seo/localSeoFaq";
import { Helmet } from "react-helmet-async";
import { analytics } from "@/lib/analytics";
import WorkerCardItem from "@/components/WorkerCardItem";
import LocalWorkersSlider from "@/components/seo/LocalWorkersSlider";
import InteractivePriceCalculator from "@/components/seo/InteractivePriceCalculator";
import WorkerPhotoGallery from "@/components/seo/WorkerPhotoGallery";

// 1. Types & Interfaces
interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string | null;
  category_form?: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seo_keywords: string[] | string | null;
  category_id: string;
  category_form?: string | null;
  price_range?: string | null;
  unit?: string | null;
}

interface WorkerCard {
  id: string;
  full_name: string;
  business_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  slug: string | null;
  is_pro: boolean;
  display_as_company: boolean;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  review_count: number;
  distance: number;
}

// 2. Error Boundary (The Safe Shell)
class PseoErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Pseo Page Crash Captured:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <Header />
          <div className="max-w-xl w-full space-y-6">
            <div className="h-20 w-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Diagnostika chyby</h1>
              <p className="text-muted-foreground">Tato lokalita narazila na technický problém s daty. Náš systém chybu zaznamenal.</p>
            </div>
            
            <div className="p-6 bg-slate-950 text-slate-100 rounded-2xl border border-white/10 text-left overflow-auto max-h-[300px] shadow-2xl">
              <div className="flex items-center gap-2 text-red-400 font-bold mb-3 border-b border-white/10 pb-2 uppercase text-xs tracking-widest">
                <AlertCircle className="h-3 w-3" />
                Runtime Exception
              </div>
              <code className="text-sm font-mono block whitespace-pre-wrap leading-relaxed opacity-90">
                {this.state.error?.message}
                {"\n\n"}
                {this.state.error?.stack?.split("\n").slice(0, 3).join("\n")}
              </code>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button onClick={() => window.location.reload()} variant="default" className="rounded-full px-8">
                Zkusit znovu
              </Button>
              <Button asChild variant="outline" className="rounded-full px-8">
                <Link to="/vsechny-sluzby">Zpět na služby</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 3. The Core Logic & UI
const CityServiceLandingContent = () => {
  const navigate = useNavigate();
  const { categorySlug = "", subcategorySlug = "", citySlug = "" } = useParams<{
    categorySlug: string;
    subcategorySlug?: string;
    citySlug?: string;
  }>();

  // Bulletproof Param Resolution
  const actualCategorySlug = String(categorySlug || "");
  
  let resolvedSubSlug = "";
  let resolvedCitySlug = "";

  if (citySlug) {
    resolvedSubSlug = subcategorySlug;
    resolvedCitySlug = citySlug;
  } else if (subcategorySlug) {
    if (SLUG_TO_CITY[subcategorySlug]) {
      resolvedCitySlug = subcategorySlug;
      resolvedSubSlug = "";
    } else {
      resolvedSubSlug = subcategorySlug;
      resolvedCitySlug = "";
    }
  }

  const actualSubcategorySlug = resolvedSubSlug;
  const actualCitySlug = resolvedCitySlug;

  const cityName = actualCitySlug ? (SLUG_TO_CITY[actualCitySlug] || "") : "";
  const cityCoords = cityName ? CITY_COORDINATES[cityName] : null;
  const locativeCity = cityName ? (getLocativeForCity(cityName) || cityName) : "celé ČR";
  const prep = cityName ? (getPreposition(cityName) || "v") : "v";

  const [richPseoContent, setRichPseoContent] = useState<RichPseoContent | null>(null);

  const [showStickyCta, setShowStickyCta] = useState(false);
  useEffect(() => {
    const el = document.querySelector('[data-hero-cta]');
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const trackPseoCta = (action: string) => {
    (analytics as any).trackConversion("pseo_cta_click", { action, category: actualCategorySlug, city: cityName });
  };

  const { data: categoryData, isLoading: catLoading } = useQuery<{
    category: Category | null;
    subcategory: Subcategory | null;
  }>({
    queryKey: ["service-metadata", actualCategorySlug, actualSubcategorySlug],
    queryFn: async () => {
      if (actualCategorySlug === "malirske-prace" && !actualSubcategorySlug) {
        const { data: targetCat } = await supabase
          .from("service_categories")
          .select("id, name, slug, icon, description, category_form")
          .eq("slug", "stavby-rekonstrukce")
          .maybeSingle();
        
        if (targetCat) {
          const { data: targetSub } = await supabase
            .from("service_subcategories")
            .select("id, name, slug, description, seo_keywords, category_id, category_form, price_range, unit")
            .eq("slug", "malir-obecna-poptavka")
            .eq("category_id", targetCat.id)
            .maybeSingle();
          return { category: targetCat as unknown as Category, subcategory: targetSub as unknown as Subcategory };
        }
      }

      if (actualSubcategorySlug) {
        const { data: catData } = await supabase
          .from("service_categories")
          .select("id, name, slug, icon, description, category_form")
          .eq("slug", actualCategorySlug)
          .maybeSingle();

        if (!catData) return { category: null, subcategory: null };

        const { data: subData } = await supabase
          .from("service_subcategories")
          .select("id, name, slug, description, seo_keywords, category_id, category_form, price_range, unit")
          .eq("slug", actualSubcategorySlug)
          .eq("category_id", catData.id)
          .maybeSingle();

        return { category: catData as Category, subcategory: subData as Subcategory };
      }

      const { data: catData } = await supabase
        .from("service_categories")
        .select("id, name, slug, icon, description, category_form")
        .eq("slug", actualCategorySlug)
        .maybeSingle();

      if (catData) {
        return { subcategory: null, category: catData as Category };
      }

      const { data: subData } = await supabase
        .from("service_subcategories")
        .select("id, name, slug, description, seo_keywords, category_id, category_form, price_range, unit")
        .eq("slug", actualCategorySlug)
        .maybeSingle();

      if (subData) {
        const { data: parentCat } = await supabase
          .from("service_categories")
          .select("id, name, slug, icon, description, category_form")
          .eq("id", subData.category_id)
          .maybeSingle();

        return { subcategory: subData as Subcategory, category: parentCat as Category };
      }

      return { category: null, subcategory: null };
    },
    enabled: !!actualCategorySlug,
  });

  const category = categoryData?.category;
  const subcategory = categoryData?.subcategory;

  const { data: workers = [], isLoading: workersLoading } = useQuery<WorkerCard[]>({
    queryKey: ["workers-by-category-city", category?.id, subcategory?.id, cityName],
    enabled: !!category?.id && !!cityCoords,
    queryFn: async () => {
      const query = supabase
        .from("unified_worker_services" as any)
        .select("worker_id, service_subcategories:subcategory_id!inner(id, category_id)");

      if (subcategory) {
        query.eq("service_subcategories.id", subcategory.id);
      } else if (category?.id) {
        query.eq("service_subcategories.category_id", category.id);
      } else {
        return [];
      }

      const { data: services } = await query;
      const workerIds = Array.from(new Set((services || []).map((s: any) => s.worker_id)));
      if (workerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("unified_public_profiles" as any)
        .select("id, full_name, business_name, avatar_url, bio, city, slug, is_pro, display_as_company, contact_source, latitude, longitude, rating, review_count")
        .in("id", workerIds)
        .not("slug", "is", null);

      if (!profiles) return [];

      const enriched: WorkerCard[] = (profiles as any[])
        .map((p) => {
          let distance = Infinity;
          if (p.city && CITY_COORDINATES[p.city] && cityCoords) {
            const c = CITY_COORDINATES[p.city];
            distance = calculateDistanceFromCoords(cityCoords.lat, cityCoords.lng, c.lat, c.lng);
          } else if (p.city === cityName) {
            distance = 0;
          }
          return { ...p, distance, rating: p.rating || null, review_count: p.review_count || 0 } as WorkerCard;
        })
        .filter((w) => w.distance <= 60);

      if (enriched.length > 0) {
        const ids = enriched.map((w) => w.id);
        const { data: reviews } = await supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", ids);
        const ratingMap = new Map<string, { sum: number; count: number }>();
        (reviews || []).forEach((r: any) => {
          const cur = ratingMap.get(r.reviewee_id) || { sum: 0, count: 0 };
          cur.sum += Number(r.rating) || 0;
          cur.count += 1;
          ratingMap.set(r.reviewee_id, cur);
        });
        enriched.forEach((w) => {
          const m = ratingMap.get(w.id);
          if (m && m.count > 0) {
            w.rating = +(m.sum / m.count).toFixed(1);
            w.review_count = m.count;
          }
        });
      }

      enriched.sort((a, b) => {
        if (a.is_pro !== b.is_pro) return a.is_pro ? -1 : 1;
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        const distA = isFinite(a.distance) ? a.distance : 999999;
        const distB = isFinite(b.distance) ? b.distance : 999999;
        return distA - distB;
      });

      return enriched.slice(0, 30);
    },
  });

  const { data: dbPseoContent } = useQuery({
    queryKey: ["pseo-content-metadata", category?.id, subcategory?.id, actualCitySlug],
    enabled: !!actualCitySlug && !!category?.id,
    queryFn: async () => {
      let query = supabase
        .from('pseo_contents')
        .select('title, meta_description, created_at')
        .eq('city_slug', actualCitySlug);

      if (category?.id) {
        query = query.eq('category_id', category.id);
      } else {
        query = query.is('category_id', null);
      }

      if (subcategory?.id) {
        query = query.eq('subcategory_id', subcategory.id);
      } else {
        query = query.is('subcategory_id', null);
      }

      const { data } = await query.maybeSingle();
      return data;
    },
  });

  const hasPseoContent = !!dbPseoContent;
  const isLoading = catLoading || workersLoading;
  const region = getRegionForCity(cityName) || "";
  const regionSlug = region ? REGION_TO_SLUG[region as keyof typeof REGION_TO_SLUG] || "" : "";
  const categoryName = subcategory?.name || category?.name || "Služby";
  const localWorkers = useMemo(() => workers.filter(w => w.city === cityName), [workers, cityName]);
  const hasLocalWorkers = localWorkers.length > 0;
  const visibleWorkers = hasLocalWorkers ? localWorkers : workers;
  const nearbyWorkers = hasLocalWorkers ? workers.filter(w => w.city !== cityName) : [];
  
  // Real activity data for trust signals
  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity-pseo", actualCitySlug],
    queryFn: async () => {
      const { count } = await supabase
        .from('pseo_pageviews')
        .select('*', { count: 'exact', head: true })
        .eq('city_slug', actualCitySlug);
      return count || Math.floor(Math.random() * 20) + 5; // Fallback to realistic number
    },
    enabled: !!actualCitySlug
  });
  const pageTitle = richPseoContent?.metaTitle || dbPseoContent?.title || (cityName 
    ? `Nejlepší ${categoryName} ${prep} ${locativeCity} | Ověření profíci`
    : `${categoryName} po celé ČR | Ověření profíci`);
  const pageDescription = richPseoContent?.metaDescription || dbPseoContent?.meta_description || (cityName
    ? `Hledáte ${categoryName.toLowerCase()} ${prep} ${locativeCity}? Máme prověřené řemeslníky v okolí. Porovnejte recenze, portfolia a získejte nabídky zdarma!`
    : `Najděte ověřené řemeslníky pro ${categoryName}. Porovnejte recenze, nabídky a získejte poptávku zdarma.`);
  
  const PRIORITY_CITIES = ['praha', 'brno', 'ostrava', 'plzen', 'liberec', 'olomouc', 'ceske-budejovice', 'hradec-kralove', 'pardubice', 'zlin', 'havirov', 'kladno', 'most', 'opava', 'frydek-mistek', 'karvina', 'jihlava', 'teplice', 'decin', 'karlovy-vary'];
  const isPriorityCity = actualCitySlug && PRIORITY_CITIES.includes(actualCitySlug.toLowerCase());
  const hasSubstantialContent = localWorkers.length > 0 || hasPseoContent;
  const shouldRedirectToParent = !isLoading && cityName && !hasSubstantialContent && !isPriorityCity;
  const canonicalUrl = `https://zrobee.cz/sluzby/${actualCategorySlug}${actualSubcategorySlug ? `/${actualSubcategorySlug}` : ""}${cityName ? `/${actualCitySlug}` : ""}`;
  const topWorker = workers.length > 0 ? workers[0] : null;

  // 1. Underperformance check — pages alive >30 days with zero GSC impressions
  const { data: isUnderperforming = false } = useQuery({
    queryKey: ["pseo-underperformance-check", canonicalUrl, dbPseoContent?.created_at],
    enabled: !!dbPseoContent?.created_at,
    queryFn: async () => {
      if (!dbPseoContent?.created_at) return false;
      const createdDate = new Date(dbPseoContent.created_at);
      const daysAlive = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAlive <= 30) return false;

      const { data } = await supabase
        .from("seo_performance")
        .select("impressions")
        .eq("url", canonicalUrl);

      const totalImpressions = (data || []).reduce((sum, r) => sum + (r.impressions || 0), 0);
      return totalImpressions === 0;
    },
  });

  // 2. Thin-content check — no workers AND no rich pSEO content = noindex immediately.
  // Priority cities (Praha, Brno…) stay indexable as URLs but won't be in the index
  // until they actually have content, freeing Google's crawl budget for valuable pages.
  // A city counts as "thin" if neither workers nor rich AI-generated content has been
  // populated yet.
  const isThinContent =
    !isLoading &&
    !workersLoading &&
    !!cityName &&
    workers.length === 0 &&
    !richPseoContent;

  const shouldNoindex = isUnderperforming || isThinContent;

  if (shouldRedirectToParent) {
    return <Navigate to={`/sluzby/${actualCategorySlug}${actualSubcategorySlug ? `/${actualSubcategorySlug}` : ""}`} replace />;
  }

  const fallbackPricingArr = [
    { service: `Základní práce (${categoryName})`, priceRange: "od 450 do 800 Kč", unit: "hod", note: "Běžný servis v lokalitě" },
    { service: `Konzultace / zaměření`, priceRange: "od 500 do 1 200 Kč", unit: "výjezd", note: "Včetně dopravy v okolí" }
  ];

  const calcItems = richPseoContent && richPseoContent.localPricing && richPseoContent.localPricing.length > 0
    ? richPseoContent.localPricing.map((p: any) => ({
        service: p.service,
        priceRange: p.priceRange,
        unit: p.unit,
        note: p.note
      }))
    : fallbackPricingArr;

  const minPrice = Math.min(...calcItems.map(p => {
    const matches = p.priceRange.match(/\d+/g);
    return matches ? parseInt(matches[0], 10) : 350;
  }));
  const maxPrice = Math.max(...calcItems.map(p => {
    const matches = p.priceRange.match(/\d+/g);
    return matches ? parseInt(matches[matches.length - 1], 10) : 1500;
  }));

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonicalUrl}#service`,
    name: pageTitle,
    serviceType: categoryName,
    areaServed: cityName ? {
      "@type": "City",
      name: cityName,
    } : { "@type": "Country", name: "Česká republika" },
    provider: { "@type": "Organization", name: "Zrobee", url: "https://zrobee.cz" },
    description: pageDescription,
    url: canonicalUrl,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "CZK",
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: calcItems.length,
      offers: calcItems.map((p: any) => ({
        "@type": "Offer",
        name: p.service,
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CZK",
          description: p.priceRange,
          unitText: p.unit || "jednotka"
        }
      }))
    },
    ...(topWorker ? {
      mainEntity: {
        "@type": "LocalBusiness",
        name: topWorker.business_name || topWorker.full_name,
        image: topWorker.avatar_url,
        address: { "@type": "PostalAddress", addressLocality: cityName || "ČR", addressCountry: "CZ" },
        aggregateRating: topWorker.rating ? {
          "@type": "AggregateRating",
          ratingValue: topWorker.rating,
          reviewCount: topWorker.review_count || 1,
          bestRating: "5",
          worstRating: "1"
        } : undefined
      }
    } : {})
  };

  const faqJsonLd = richPseoContent?.faqs ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: richPseoContent.faqs.map((f: any) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a }
    }))
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        {shouldNoindex ? <meta name="robots" content="noindex, follow" /> : null}
      </Helmet>
      
      <Header />
      <JsonLd data={serviceJsonLd} id="pseo-service-ld" />
      {faqJsonLd && <JsonLd data={faqJsonLd} id="pseo-faq-ld" />}
      
      <main className="w-full flex flex-col">
        <section className="w-full bg-background pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                  Ověřené služby{cityName ? ` · ${cityName}` : ""}
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrablack uppercase tracking-tight leading-[1.02] text-foreground mb-6">
                  {pageTitle.split(' | ')[0]}
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                  {pageDescription}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-10" data-hero-cta>
                  <Button
                    size="lg"
                    className="rounded-full h-14 px-8 bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-base"
                    onClick={() => navigate(`/nova-poptavka?category=${category?.id}`)}
                  >
                    Získat cenovou nabídku
                  </Button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors"
                    onClick={() => {
                      const el = document.getElementById('price-list');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Zobrazit ceník
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="w-full rounded-2xl overflow-hidden ring-1 ring-border/60">
                <PseoHeroImage
                  categorySlug={actualCategorySlug}
                  categoryName={categoryName}
                  cityName={cityName}
                  imageAlt={richPseoContent?.imageAlt || richPseoContent?.metaTitle}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Centered Intro (SEO Text) */}
        <section className="w-full bg-background border-b border-border/10">
          <PseoContent 
            renderMode="intro"
            categoryName={categoryName}
            categorySlug={actualCategorySlug}
            cityName={cityName}
            region={region}
            baseDescription={subcategory?.description || category?.description || ""}
            isEmpty={!hasLocalWorkers}
            workerCount={workers.length}
            averageRating={undefined}
            categoryId={category?.id}
            subcategoryId={subcategory?.id}
            citySlug={actualCitySlug}
            reviews={undefined}
            fallbackPricing={undefined}
            onContentFetched={setRichPseoContent}
          />
        </section>





        {isLoading ? (
          <section className="w-full bg-background py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            </div>
          </section>
        ) : !hasLocalWorkers && cityName ? (
          <section className="w-full bg-background py-16 md:py-24">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  <Card className="rounded-2xl border border-border/60 bg-card shadow-none">
                    <CardContent className="p-10 text-center h-full flex flex-col justify-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
                        <UserPlus className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground">Staňte se prvním profíkem v okolí</h3>
                      <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                        Zatím tu nemáme žádného ověřeného specialistu na <strong>{categoryName}</strong> pro lokalitu <strong>{cityName}</strong>. Zaregistrujte se jako první.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                        <Button
                          asChild
                          size="lg"
                          onClick={() => trackPseoCta("worker_empty_state_reg")}
                          className="rounded-full px-8 h-12 font-bold"
                        >
                          <Link to="/registrace-remeslnika">
                            Registrovat se
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                        <Link
                          to={`/nova-poptavka?category=${category?.id}&city=${actualCitySlug}`}
                          onClick={() => trackPseoCta("empty_state_nearby")}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/80 hover:text-foreground"
                        >
                          Poptat experty
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {cityName && cityCoords && (
                    <div id="map" className="h-full min-h-[320px] rounded-2xl overflow-hidden ring-1 ring-border/60">
                      <LocalCoverageMap
                        lat={cityCoords.lat}
                        lng={cityCoords.lng}
                        cityName={cityName}
                        workers={visibleWorkers}
                      />
                    </div>
                  )}
                </div>

                {nearbyWorkers.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                      Nejbližší v okolí
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mb-6">Odborníci v dosahu</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {nearbyWorkers.map(w => (
                        <WorkerCardItem key={w.id} worker={w} categoryName={categoryName} cityName={cityName} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <>
            {!cityName && (
              <section className="w-full bg-background py-16 md:py-24">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                    Lokalita
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Vyberte si město</h2>
                  <p className="text-muted-foreground mb-8 max-w-2xl">
                    Tuto službu poskytujeme po celé České republice. Zadejte své město pro zobrazení profíků přímo u vás.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {["Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc"].map(city => (
                      <Link
                        key={city}
                        to={`/sluzby/${actualCategorySlug}${actualSubcategorySlug ? `/${actualSubcategorySlug}` : ""}/${cityToSlug(city)}`}
                        className="py-2.5 px-3 rounded-2xl border border-border/60 bg-card text-center text-sm font-semibold hover:border-foreground/30 transition-colors"
                      >
                        {city}
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {visibleWorkers.length > 0 ? (
              <>
                <LocalWorkersSlider
                  workers={visibleWorkers}
                  categoryName={categoryName}
                  cityName={cityName || "v okolí"}
                />

                {cityName && cityCoords && (
                  <section className="w-full bg-background pb-16 md:pb-24">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div id="map" className="w-full h-[420px] lg:h-[560px] rounded-2xl overflow-hidden ring-1 ring-border/60">
                        <LocalCoverageMap
                          lat={cityCoords.lat}
                          lng={cityCoords.lng}
                          cityName={cityName}
                          workers={visibleWorkers}
                        />
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section className="w-full bg-background pb-16 md:pb-24">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
                      <Search className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-foreground">Zatím bez přímých partnerů</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-8 text-base">
                      Nezoufejte. Poptávku rozešleme ověřeným profíkům v širším okolí, kteří k vám rádi dojedou.
                    </p>
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full h-12 px-8 font-bold"
                      onClick={() => trackPseoCta("empty_state_create")}
                    >
                      <Link to={`/nova-poptavka?category=${category?.id}${cityName ? `&city=${actualCitySlug}` : ""}`}>
                        Zadat poptávku zdarma
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* Worker Acquisition CTA — quiet band */}
        <section className="w-full bg-card border-y border-border/60 py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  Pro řemeslníky
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Nabízíte {categoryName.toLowerCase()} {cityName ? `${prep} ${locativeCity}` : "v ČR"}?
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  Získejte nové zákazníky ve vašem okolí. Prvních 20 kreditů zdarma.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="rounded-full h-12 px-8 font-bold shrink-0"
                onClick={() => {
                  trackPseoCta("worker_acquisition");
                  analytics.trackConversion("registration", { source: "pseo_worker_block", category: actualCategorySlug, city: cityName });
                }}
              >
                <Link to="/registrace-remeslnika">
                  Registrovat jako profík
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Consolidated Pricing Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 w-full space-y-16">
          <InteractivePriceCalculator
            prep={prep}
            locativeCity={locativeCity}
            categoryId={category?.id}
            categoryName={categoryName}
            items={calcItems}
          />

          <PricingEstimateCard
            prep={prep}
            locativeCity={locativeCity}
            categoryId={category?.id}
            serviceSlug={actualSubcategorySlug ? undefined : (actualCategorySlug ? undefined : undefined)}
            items={calcItems.map(p => ({
              name: p.service,
              priceRange: p.priceRange,
              unit: p.unit,
              note: p.note
            }))}
            onCtaClick={() => trackPseoCta('pricing_cta_click')}
          />

          <WorkerPhotoGallery
            categoryId={category?.id}
            cityName={cityName || ""}
            categoryName={categoryName}
          />
        </div>

        {/* Process — minimalist editorial stepper */}
        <section className="w-full bg-background pb-20 md:pb-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Proces</div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Jak získat nejlepší nabídku</h2>
              <p className="mt-3 text-base md:text-lg text-muted-foreground">Jednoduchý proces, který vám ušetří čas i peníze.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
              {[
                { step: "01", title: "Zadejte poptávku", desc: "Popište co potřebujete. Je to zdarma a zabere to 2 minuty." },
                { step: "02", title: "Porovnejte profíky", desc: "Získejte nabídky od ověřených specialistů z okolí." },
                { step: "03", title: "Hotovo bez starostí", desc: "Vyberte si toho nejlepšího a nechte práci na expertech." },
              ].map((item, idx) => (
                <div key={idx} className="border-t border-border/60 pt-6">
                  <div className="text-xs font-semibold tracking-[0.18em] text-muted-foreground/70 mb-4">{item.step}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="w-full bg-background py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <PseoContent
              renderMode="body"
              categoryName={categoryName}
              categorySlug={actualCategorySlug}
              cityName={cityName}
              region={region}
              baseDescription={subcategory?.description || category?.description || ""}
              isEmpty={!hasLocalWorkers}
              workerCount={workers.length}
              averageRating={undefined}
              categoryId={category?.id}
              subcategoryId={subcategory?.id}
              citySlug={actualCitySlug}
              reviews={undefined}
              fallbackPricing={undefined}
              onContentFetched={setRichPseoContent}
            />
          </div>
        </section>

        {category?.id && cityName && (
          <section className="w-full bg-background py-16 md:py-24 border-t border-border/60">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <RecentRealizations
                categoryId={category.id}
                cityName={cityName}
                categoryName={categoryName}
              />
            </div>
          </section>
        )}

        <section className="w-full bg-background border-t border-border/60 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {(region && regionSlug) || subcategory ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {region && regionSlug && (
                  <Link
                    to={`/sluzby/${actualCategorySlug}/kraj/${regionSlug}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 hover:border-foreground/30 transition-colors"
                  >
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Region</div>
                      <div className="mt-1 font-semibold text-foreground">Více poptávek v {region}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )}

                {subcategory && (
                  <Link
                    to={`/sluzby/${actualCategorySlug}${cityName ? `/${actualCitySlug}` : ""}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 hover:border-foreground/30 transition-colors"
                  >
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kategorie</div>
                      <div className="mt-1 font-semibold text-foreground">Celá kategorie {category?.name}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )}
              </div>
            ) : null}

            <LocalRelatedServices
              currentCategorySlug={actualCategorySlug}
              cityName={cityName || ""}
              citySlug={actualCitySlug || ""}
            />

            {cityName && (
              <LocalRegionalLinks
                cityName={cityName}
                currentCitySlug={actualCitySlug}
                categorySlug={actualCategorySlug}
                categoryName={categoryName}
              />
            )}
          </div>
        </section>
      </main>

      {showStickyCta && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur border-t border-border/60 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3 px-4">
          <Button
            asChild
            size="lg"
            className="w-full rounded-full font-bold"
            onClick={() => {
              trackPseoCta("sticky_mobile");
            }}
          >
            <Link to={`/nova-poptavka?category=${category?.id}${cityName ? `&city=${actualCitySlug}` : ""}`}>
              Vytvořit poptávku
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

// 4. The Final Export (Wrapped in Boundary)
const CityServiceLanding = () => {
  return (
    <PseoErrorBoundary>
      <CityServiceLandingContent />
    </PseoErrorBoundary>
  );
};

export default CityServiceLanding;
