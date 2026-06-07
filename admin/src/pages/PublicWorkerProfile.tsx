import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { safeGoBack } from "@/utils/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star, Clock, MessageCircle, Sparkles, Award, Building2,
  Share2, Heart, MapPin, ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, Zap
} from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import zrobeeLogo from "@/assets/zrobee-logo.svg";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/seo/RelatedLinks";
import { Helmet } from "react-helmet-async";
import { cityToSlug } from "@/lib/city-regions";

const SITE_URL = "https://zrobee.cz";

const AuthDialog = lazy(() => import("@/components/AuthDialog"));
const CustomerNewJobWithWorkerDialog = lazy(() =>
  import("@/components/CustomerNewJobWithWorkerDialog").then(m => ({ default: m.CustomerNewJobWithWorkerDialog }))
);

// ── Types ──────────────────────────────────────────────────────────────
interface QualityAverages {
  punctuality: number | null;
  communication: number | null;
  cleanliness: number | null;
  professionalism: number | null;
}

const qualityConfig = [
  { key: "punctuality", label: "Dochvilnost", icon: Clock },
  { key: "communication", label: "Komunikace", icon: MessageCircle },
  { key: "cleanliness", label: "Čistota práce", icon: Sparkles },
  { key: "professionalism", label: "Profesionalita", icon: Award },
];

// ── Component ──────────────────────────────────────────────────────────
const PublicWorkerProfile = () => {
  const { slug, workerId: rawWorkerId } = useParams<{ slug?: string; workerId?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [workerServices, setWorkerServices] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [qualityAverages, setQualityAverages] = useState<QualityAverages>({
    punctuality: null, communication: null, cleanliness: null, professionalism: null,
  });

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [ctaSticky, setCtaSticky] = useState(false);
  const [portfolioIndex, setPortfolioIndex] = useState(0);
  const [hasFastResponseBadge, setHasFastResponseBadge] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Force light mode
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    if (wasDark) document.documentElement.classList.remove("dark");
    return () => { if (wasDark) document.documentElement.classList.add("dark"); };
  }, []);

  // ── Data Loading ─────────────────────────────────────────────────────
  useEffect(() => { loadWorkerProfile(); }, [slug, rawWorkerId]);

  const loadWorkerProfile = async () => {
    const ident = slug || rawWorkerId;
    if (!ident) return;
    setLoading(true);

    try {
      let query = supabase.from("unified_public_profiles" as any).select("*");
      if (slug) query = query.eq("slug", slug);
      else query = query.eq("id", ident);

      const { data: profileData, error: profileError } = await query.maybeSingle();
      if (profileError || !profileData) { setLoading(false); return; }

      const workerId = (profileData as any).id;
      setProfile(profileData as any);

      const { data: { user } } = await supabase.auth.getUser();

      const [verRes, servRes, revRes, offersRes] = await Promise.all([
        supabase.from("worker_verifications").select("status").eq("worker_id", workerId).maybeSingle(),
        supabase.from("unified_worker_services" as any).select("*, service_subcategories:subcategory_id(*, service_categories(*))").eq("worker_id", workerId),
        supabase.from("reviews").select("*, jobs(title, completion_photos, final_price)").eq("reviewee_id", workerId).order("created_at", { ascending: false }),
        supabase.from("offers").select("created_at, updated_at").eq("worker_id", workerId).eq("status", "accepted")
      ]);

      setVerification(verRes.data);
      if (servRes.data) setWorkerServices(servRes.data);

      if (offersRes.data && offersRes.data.length >= 2) {
        const totalMs = offersRes.data.reduce((acc, offer) => {
          if (!offer.created_at || !offer.updated_at) return acc;
          return acc + (new Date(offer.updated_at).getTime() - new Date(offer.created_at).getTime());
        }, 0);
        const avgMs = totalMs / offersRes.data.length;
        if (avgMs > 0 && avgMs < 3600000) {
          setHasFastResponseBadge(true);
        }
      }

      if (user) {
        const { data: fav } = await supabase.from("favorite_workers").select("id").eq("user_id", user.id).eq("worker_id", workerId).maybeSingle();
        setIsFavorite(!!fav);
      }

      if (revRes.data) {
        setCompletedJobs(revRes.data);
        const qualityKeys = ["punctuality", "communication", "cleanliness", "professionalism"] as const;
        const newAverages: QualityAverages = { punctuality: null, communication: null, cleanliness: null, professionalism: null };
        qualityKeys.forEach(key => {
          const values = revRes.data.map((r: any) => r[`quality_${key}`]).filter((v: any): v is number => v != null);
          if (values.length > 0) newAverages[key] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        });
        setQualityAverages(newAverages);
      }
    } catch (err) {
      console.error("Critical error in loadWorkerProfile:", err);
    } finally {
      setLoading(false);
    }
  };

  const workerServiceNames = workerServices
    .map((service) => service.service_subcategories?.name || service.service_subcategories?.service_categories?.name)
    .filter(Boolean);
  const firstName = profile?.full_name?.split?.(" ")?.[0] || "Pracovník";

  const publicProfilePath = slug ? `/remeslnik/${slug}` : `/remeslnik/${profile?.slug || rawWorkerId || ""}`;
  const publicProfileUrl = `${SITE_URL}${publicProfilePath}`;
  const publicProfileName = profile?.display_as_company && profile?.business_name ? profile.business_name : firstName;
  const seoTitle = `${publicProfileName} | Ověřený řemeslník na Zrobee`;
  const seoDescription = profile
    ? `${publicProfileName}${profile.city ? ` z lokality ${profile.city}` : ""}. Prohlédněte si služby, recenze a ukázky práce. Poptávka zdarma přes Zrobee.`.slice(0, 158)
    : "Profil ověřeného řemeslníka na Zrobee.";
  const seoImage = profile?.avatar_url || `${SITE_URL}/zrobee-logo.svg`;

  const breadcrumbLd = profile ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Řemeslníci", item: `${SITE_URL}/remeslnici-v-okoli` },
      { "@type": "ListItem", position: 3, name: publicProfileName, item: publicProfileUrl },
    ],
  } : null;

  const jsonLdData = profile ? {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "ProfessionalService",
      "@id": `${publicProfileUrl}#service`,
      mainEntityOfPage: publicProfileUrl,
      name: publicProfileName,
      description: profile.bio || "Profesionální řemeslník na Zrobee.cz",
      image: seoImage,
      url: publicProfileUrl,
      telephone: profile.phone,
      publisher: { "@id": `${SITE_URL}/#organization` },
      address: { 
        "@type": "PostalAddress", 
        addressLocality: profile.city || "Česká republika", 
        addressRegion: profile.region || "Česká republika",
        addressCountry: "CZ" 
      },
      areaServed: { 
        "@type": "City", 
        name: profile.city || "Česká republika" 
      },
      ...(workerServices.length > 0 && {
        knowsAbout: Array.from(new Set(workerServiceNames)).slice(0, 15),
        makesOffer: workerServices.slice(0, 10).map((ws) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: ws.service_subcategories?.name || ws.service_subcategories?.service_categories?.name,
            description: ws.service_subcategories?.description
          }
        })),
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `Služby ${publicProfileName}`,
          itemListElement: Array.from(new Set(workerServiceNames)).slice(0, 12).map((name) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name },
          })),
        },
      }),
      ...(profile.website && { sameAs: [profile.website] }),
      ...((completedJobs.length > 0 || profile.google_rating) && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: completedJobs.length > 0 
            ? (completedJobs.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / completedJobs.length).toFixed(1)
            : profile.google_rating,
          reviewCount: completedJobs.length > 0 ? completedJobs.length : profile.google_reviews_count || 1,
          bestRating: "5", 
          worstRating: "1",
        },
      }),
      review: completedJobs.filter(r => r.comment).slice(0, 5).map(r => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.customer_name || "Zákazník Zrobee" },
        datePublished: r.created_at,
        reviewBody: r.comment,
        reviewRating: { "@type": "Rating", ratingValue: Number(r.rating) || 5, bestRating: "5", worstRating: "1" },
      })),
    }],
  } : null;

  // ── Sticky CTA observer ──────────────────────────────────────────────
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCtaSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [profile]);

  // ── Derived data ─────────────────────────────────────────────────────
  const getIconComponent = (iconName: string) => getCategoryIcon(iconName);

  const categoriesMap = new Map();
  workerServices?.forEach(service => {
    const category = service.service_subcategories?.service_categories;
    if (category) {
      if (!categoriesMap.has(category.id)) categoriesMap.set(category.id, { ...category, subcategories: [] });
      categoriesMap.get(category.id)?.subcategories?.push(service.service_subcategories);
    }
  });
  const categories = Array.from(categoriesMap.values());

  const avgRating = completedJobs.length > 0
    ? (completedJobs.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / completedJobs.length).toFixed(1)
    : (profile?.google_rating ? Number(profile.google_rating).toFixed(1) : null);
  const reviewCount = completedJobs.length > 0 ? completedJobs.length : (profile?.google_reviews_count || 0);
  const isGoogleRating = completedJobs.length === 0 && profile?.google_rating != null;
  const isVerified = verification?.status === "verified";
  const hasQualityRatings = Object.values(qualityAverages).some(v => v !== null);
  const isThinProfile = workerServiceNames.length === 0 && !(profile.bio || "").trim();

  // ── CTA Handler ──────────────────────────────────────────────────────
  const handleCTA = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setJobDialogOpen(true);
    else setAuthDialogOpen(true);
  };

  const handleAuthChange = (open: boolean) => {
    setAuthDialogOpen(open);
    if (!open) {
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setJobDialogOpen(true);
      }, 500);
    }
  };

  const handleToggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Pro uložení řemeslníka se nejprve přihlaste."); return; }
    if (isFavorite) {
      const { error } = await supabase.from("favorite_workers").delete().eq("user_id", user.id).eq("worker_id", profile.id);
      if (!error) { setIsFavorite(false); toast.success("Řemeslník odebrán z oblíbených"); }
    } else {
      const { error } = await supabase.from("favorite_workers").insert({ user_id: user.id, worker_id: profile.id });
      if (!error) { setIsFavorite(true); toast.success("Řemeslník uložen do oblíbených"); }
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${profile.business_name || profile.full_name} | Zrobee.cz`,
      text: profile.bio || "Podívejte se na profil řemeslníka na Zrobee.cz",
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Odkaz zkopírován do schránky"); }
    } catch {}
  };

  // ── Loading / 404 ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="h-10 w-10 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground animate-pulse">Načítání profilu...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Profil pracovníka nebyl nalezen.</h1>
          <Button onClick={() => navigate("/")} className="rounded-full">Zpět na hlavní stránku</Button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={publicProfileUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={publicProfileUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={seoImage} />
        <meta property="og:site_name" content="Zrobee" />
        <meta property="og:locale" content="cs_CZ" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={seoImage} />
        {isThinProfile && <meta name="robots" content="noindex, follow" />}
      </Helmet>
      {breadcrumbLd && <JsonLd data={breadcrumbLd} id="worker-breadcrumb-ld" />}
      {jsonLdData && <JsonLd data={jsonLdData} id="worker-jsonld" />}
      {/* ── Minimal top bar: back + logo ──────────────────────── */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => safeGoBack(navigate, "/")}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground px-3 py-1.5 -ml-3 rounded-full transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Zpět</span>
          </button>
          <a href="/" className="flex items-center">
            <img
              src={zrobeeLogo}
              alt="Zrobee"
              className="h-6"
              style={{ filter: "brightness(0) saturate(100%) invert(15%) sepia(20%) saturate(800%) hue-rotate(70deg) brightness(95%) contrast(90%)" }}
            />
          </a>
        </div>
      </div>

      {/* ── Desktop sticky CTA bar (appears on scroll) ────────── */}
      <div className={cn(
        "hidden md:block fixed top-[57px] left-0 right-0 z-40 transition-all duration-300",
        ctaSticky ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      )}>
        <div className="bg-white/80 backdrop-blur-lg border-b border-border/30">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-8 w-8 border border-border/50">
                <AvatarImage src={profile.avatar_url} alt={`Avatar - ${firstName}`} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-sm text-foreground truncate">{firstName}</span>
              {avgRating && (
                <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  {isGoogleRating && (
                    <img src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" alt="Google" className="w-3 h-3" />
                  )}
                  <Star className={cn("h-3.5 w-3.5", isGoogleRating ? "fill-amber-400 text-amber-400" : "fill-primary text-primary")} /> {avgRating}
                </span>
              )}
            </div>
            <Button
              onClick={handleCTA}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-sm px-6 h-9"
            >
              Poptat řemeslníka
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Page content ──────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-28 md:pb-16">

        {/* ── SHADOW PROFILE NOTICE ──────────────────────────────── */}
        {profile.contact_source === 'scraped' && (
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-2xl">👤</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-tight text-amber-900">Tento profil čeká na své ověření</h4>
                <p className="text-sm text-amber-800/80 leading-relaxed max-w-xl">
                  Profil byl vytvořen na základě veřejně dostupných informací. Jste-li majitelem tohoto profilu, můžete jej zdarma převzít a začít přijímat poptávky.
                </p>
              </div>
            </div>
            <Button asChild variant="default" className="rounded-full px-8 bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0">
              <Link to="/registrace-remeslnika">Převzít tento profil</Link>
            </Button>
          </div>
        )}

        {/* ── HERO SECTION ──────────────────────────────────────── */}
        <div ref={heroRef} className="pb-10 border-b border-border/30">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-white shadow-xl ring-1 ring-border/20">
                <AvatarImage src={profile.avatar_url} alt={`Profil řemeslníka ${profile.full_name || firstName}`} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  {firstName}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {isVerified && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-widest text-[9px] px-2 py-0.5 shadow-sm">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Ověřená firma
                    </Badge>
                  )}
                  {Number(avgRating) >= 4.8 && completedJobs.length >= 5 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-widest text-[9px] px-2 py-0.5 shadow-sm">
                      <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" /> Zlatý profík
                    </Badge>
                  )}
                  {hasFastResponseBadge && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 uppercase tracking-widest text-[9px] px-2 py-0.5 shadow-sm">
                      <Zap className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" /> Do 1 hod
                    </Badge>
                  )}
                </div>
              </div>

              {/* Rating + Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-sm text-muted-foreground mb-4">
                {avgRating ? (
                  <div className="flex items-center gap-1.5">
                    {isGoogleRating && (
                      <div className="flex items-center justify-center w-5 h-5 bg-white rounded-full shadow-sm mr-0.5 border border-border/50">
                        <img src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" alt="Google Maps" className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={cn("h-4 w-4", star <= Math.round(Number(avgRating)) ? (isGoogleRating ? "fill-amber-400 text-amber-400" : "fill-primary text-primary") : "text-muted-foreground/20")} />
                      ))}
                    </div>
                    <span className="font-bold text-foreground">{avgRating}</span>
                    <span className="text-muted-foreground">({reviewCount})</span>
                  </div>
                ) : (
                  <span className="font-medium text-muted-foreground">Nový na platformě</span>
                )}
                {profile.city && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="h-3.5 w-3.5" /> {profile.city}
                    </span>
                  </>
                )}
              </div>

              {profile.display_as_company && profile.business_name && (
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">{profile.business_name}</span>
                    {profile.ico && <span className="text-[10px] text-muted-foreground opacity-70">IČO: {profile.ico}</span>}
                  </div>
                </div>
              )}

              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-6">{profile.bio}</p>
              )}

              {/* CTA + actions */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Button
                  onClick={handleCTA}
                  size="lg"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-base px-8 h-12 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Poptat řemeslníka
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleToggleFavorite}
                  className={cn(
                    "rounded-full h-12 w-12 transition-all border-border/50",
                    isFavorite ? "text-red-500 border-red-200 bg-red-50 hover:bg-red-100" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  className="rounded-full h-12 w-12 text-muted-foreground hover:text-foreground border-border/50"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── SPECIALIZATIONS ──────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="pt-10">
            <h2 className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
              Specializace
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category: any) => {
                const Icon = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 transition-all hover:border-border group cursor-default"
                    style={{ backgroundColor: 'hsl(105 35% 15% / 0.04)' }}
                  >
                    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: 'hsl(105, 35%, 15%)' }} />
                    <span className="text-sm font-bold" style={{ color: 'hsl(105, 35%, 15%)' }}>{category.name}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── PSEO INTERNAL LINKS ───────────────────────────────── */}
        {categories.length > 0 && profile?.city && (
          <section className="pt-10">
            <h2 className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
              Související služby v okolí
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category: any) => (
                <Link
                  key={`link-${category.id}`}
                  to={`/sluzby/${category.slug}/${cityToSlug(profile.city)}`}
                  className="px-4 py-2 rounded-full border border-border/40 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all bg-muted/10"
                >
                  Zobrazit další <strong className="text-foreground">{category.name}</strong> v okolí {profile.city}
                </Link>
              ))}
              <Link
                to={`/mesta/${cityToSlug(profile.city)}`}
                className="px-4 py-2 rounded-full border border-border/40 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-all bg-muted/10"
              >
                Všechny služby v lokalitě <strong className="text-foreground">{profile.city}</strong>
              </Link>
            </div>
          </section>
        )}

        {/* ── PORTFOLIO CAROUSEL ────────────────────────────────── */}
        {profile.portfolio_photos && profile.portfolio_photos.length > 0 && (
          <section className="pt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                Ukázky práce
              </h2>
              {profile.portfolio_photos.length > 2 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPortfolioIndex(i => Math.max(0, i - 1))}
                    disabled={portfolioIndex === 0}
                    className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Předchozí"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPortfolioIndex(i => Math.min(profile.portfolio_photos.length - 2, i + 1))}
                    disabled={portfolioIndex >= profile.portfolio_photos.length - 2}
                    className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Další"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl">
              <div
                className="flex gap-3 transition-transform duration-500 ease-out"
                style={{ transform: `translateX(calc(-${portfolioIndex} * (calc(50% - 6px) + 12px)))` }}
              >
                {profile.portfolio_photos.map((photo: string, index: number) => (
                  <div
                    key={index}
                    className="flex-shrink-0 aspect-[4/3] rounded-2xl overflow-hidden bg-muted group"
                    style={{ width: 'calc(50% - 6px)' }}
                  >
                    <img
                      src={photo}
                      alt={`Ukázka práce - ${categories.length > 0 ? categories[0].name : "Řemeslník"} od ${firstName}${profile?.city ? ` v lokalitě ${profile.city}` : ''} - ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── QUALITY RATINGS ───────────────────────────────────── */}
        {hasQualityRatings && (
          <section className="pt-10">
            <h2 className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
              Detailní hodnocení
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {qualityConfig.map(({ key, label, icon: Icon }) => {
                const value = qualityAverages[key as keyof QualityAverages];
                if (value === null) return null;
                return (
                  <div key={key} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/40 text-center">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsl(105 35% 15% / 0.06)' }}>
                      <Icon className="h-4 w-4" style={{ color: 'hsl(105, 35%, 15%)' }} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-black text-foreground">{value.toFixed(1)}</span>
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── REVIEWS ──────────────────────────────────────────── */}
        {completedJobs.length > 0 && (
          <section className="pt-10 mt-10 border-t border-border/20">
            <h2 className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-6">
              Co říkají zákazníci ({completedJobs.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedJobs.map((review: any) => (
                <div key={review.id} className="p-5 rounded-2xl border border-border/40 hover:border-border transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                        {review.jobs?.title || "Zakázka"}
                      </h3>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={cn("h-3.5 w-3.5", star <= (Number(review.rating) || 0) ? "fill-primary text-primary" : "text-muted-foreground/20")} />
                        ))}
                      </div>
                    </div>
                    {review.jobs?.final_price && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Cena</p>
                        <p className="text-base font-black text-foreground">
                          {review.jobs.final_price.toLocaleString("cs-CZ")} Kč
                        </p>
                      </div>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed italic mb-3">„{review.comment}"</p>
                  )}
                  {review.jobs?.completion_photos && review.jobs.completion_photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {review.jobs.completion_photos.slice(0, 4).map((photo: string, index: number) => (
                        <div key={index} className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={photo} alt={`Result ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom CTA banner (desktop) ──────────────────────── */}
        <div className="hidden md:block mt-12">
          <div className="rounded-3xl p-8 flex items-center justify-between" style={{ backgroundColor: 'hsl(105, 35%, 15%)' }}>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Zaujal vás {firstName}?</h3>
              <p className="text-sm text-white/60 mt-1">Poptejte ho přímo — zdarma a nezávazně.</p>
            </div>
            <Button
              onClick={handleCTA}
              size="lg"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-base px-8 h-12"
            >
              Poptat řemeslníka
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* ── Related links (kills orphan / no-outlink Ahrefs warnings) ─── */}
        {profile && (() => {
          const citySlug = profile.city ? cityToSlug(profile.city) : "";
          const cats = Array.from(new Map(
            workerServices
              .map((ws) => ws.service_subcategories?.service_categories)
              .filter(Boolean)
              .map((c: any) => [c.id, c])
          ).values()) as Array<{ id: string; name: string; slug: string }>;
          const links = [
            ...(profile.city
              ? [{ to: `/mesta/${citySlug}`, label: `Všechny služby v ${profile.city}`, description: "Ostatní řemeslníci a kategorie ve vašem městě" }]
              : []),
            ...cats.slice(0, 4).map((c) => ({
              to: profile.city ? `/sluzby/${c.slug}/${citySlug}` : `/sluzby/${c.slug}`,
              label: `${c.name}${profile.city ? ` ${profile.city}` : ""}`,
              description: `Další profíci v kategorii ${c.name.toLowerCase()}`,
            })),
            ...cats.slice(0, 3).map((c) => ({
              to: `/cenik/${c.slug}`,
              label: `Ceník ${c.name.toLowerCase()}`,
              description: "Skutečné ceny z reálných nabídek",
            })),
            { to: "/remeslnici-v-okoli", label: "Řemeslníci v okolí", description: "Procházet další ověřené profíky" },
          ];
          return <RelatedLinks links={links} className="px-4 md:px-0 mb-12" />;
        })()}
      </div>

      {/* ── Mobile sticky CTA bar ──────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <Button
          onClick={handleCTA}
          className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-base h-14 transition-all active:scale-[0.98]"
        >
          Poptat řemeslníka
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      {authDialogOpen && (
        <Suspense fallback={null}>
          <AuthDialog open={authDialogOpen} onOpenChange={handleAuthChange} initialStep="email" />
        </Suspense>
      )}
      {jobDialogOpen && profile && (
        <Suspense fallback={null}>
          <CustomerNewJobWithWorkerDialog
            open={jobDialogOpen}
            onOpenChange={setJobDialogOpen}
            workerId={profile.id}
            workerName={firstName}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PublicWorkerProfile;
