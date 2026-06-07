import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, ChevronRight, Wrench, ArrowRight, ShieldCheck, Star } from "lucide-react";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SLUG_TO_CITY, getLocativeForCity, getPreposition, getRegionForCity, REGION_TO_SLUG, CITY_COORDINATES } from "@/lib/city-regions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import JsonLd from "@/components/JsonLd";
import LocalRegionalLinks from "@/components/seo/LocalRegionalLinks";
import { getSuperprominentBackgroundImage } from "@/config/superprominent";
import useEmblaCarousel from "embla-carousel-react";

const SITE_URL = "https://zrobee.cz";

const CATEGORY_TO_PARENT: Record<string, string> = {
  "elektro": "ELEKTRO",
  "stavby-rekonstrukce": "STAVBY",
  "instalater": "STAVBY",
  "zahrada": "ZAHRADA",
  "uklid": "ÚKLID",
  "auto-moto": "AUTO-MOTO",
  "doprava": "DOPRAVA",
  "pc-a-mobile": "IT / TECH",
  "zdravi-krasa": "KRÁSA",
  "truharstvo": "STAVBY",
  "zamecnictvi": "STAVBY",
  "vyuka-jazyky": "VZDĚLÁVÁNÍ",
  "hlidani-a-pece": "PÉČE",
};

const CityHub = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const navigate = useNavigate();

  const cityName = citySlug ? SLUG_TO_CITY[citySlug] : null;
  const locativeCity = cityName ? getLocativeForCity(cityName) : "";
  const prep = cityName ? getPreposition(cityName) : "v";
  const region = cityName ? getRegionForCity(cityName) : "";

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["city-hub-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["all-subcategories-cityhub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_subcategories")
        .select("id, name, category_id")
        .neq("display_level", "HIDDEN");
      if (error) throw error;
      return data || [];
    },
  });

  const getCategoryImage = (cat: any) => {
    if (cat.image_url) return cat.image_url;
    
    const directMatch = getSuperprominentBackgroundImage(cat.name);
    if (directMatch) return directMatch;
    
    const catSubs = subcategories.filter((s: any) => s.category_id === cat.id);
    const subImages = catSubs
      .map((s: any) => getSuperprominentBackgroundImage(s.name))
      .filter(Boolean) as string[];
      
    if (subImages.length > 0) {
      const index = Math.abs(cat.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % subImages.length;
      return subImages[index];
    }
    
    return null;
  };

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const getMobilePairedItems = () => {
    const pairs: [any, any | null][] = [];
    const sliced = categories.slice(0, 12);
    for (let i = 0; i < sliced.length; i += 2) {
      pairs.push([
        sliced[i],
        sliced[i + 1] || null,
      ]);
    }
    return pairs;
  };

  const CategoryCard = ({ cat }: { cat: any }) => {
    const bgImage = getCategoryImage(cat);
    const parentBadge = CATEGORY_TO_PARENT[cat.slug] || cat.name.toUpperCase();
    
    return (
      <Link
        key={cat.id}
        to={`/sluzby/${cat.slug}/${citySlug}`}
        className="group relative aspect-[3/4] w-full rounded-2xl md:rounded-3xl overflow-hidden bg-card border border-border/50 hover:border-foreground/30 transition-all shadow-sm hover:shadow-md"
      >
        {/* Background Image */}
        {bgImage ? (
          <img
            src={bgImage}
            alt={cat.name}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <Wrench className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Content */}
        <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-between">
          <div>
            <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none text-[10px] font-bold tracking-wider">
              {parentBadge}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-bold text-white leading-tight group-hover:translate-x-1 transition-transform">
              {cat.name}
            </h3>
            <div className="flex items-center gap-1.5 text-white/70 text-xs font-semibold uppercase tracking-wider group-hover:text-white transition-colors">
              <span>Zobrazit řemeslníky</span>
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    );
  };

  if (!cityName) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 pt-32 text-center space-y-4">
          <h1 className="text-2xl font-black uppercase">Město nenalezeno</h1>
          <Button asChild>
            <Link to="/vsechny-sluzby">Zpět na služby</Link>
          </Button>
        </div>
      </div>
    );
  }

  const regionSlug = region ? REGION_TO_SLUG[region] : null;

  const breadcrumbItems: any[] = [
    { "@type": "ListItem", position: 1, name: "Domů", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Služby", item: `${SITE_URL}/vsechny-sluzby` },
  ];
  if (region) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: region,
      item: regionSlug ? `${SITE_URL}/sluzby/stavby-rekonstrukce/kraj/${regionSlug}` : `${SITE_URL}/vsechny-sluzby`,
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: cityName,
    item: `${SITE_URL}/mesta/${citySlug}`,
  });

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  const title = `Řemeslníci a služby ${prep} ${locativeCity} | Zrobee`;
  const description = `Hledáte řemeslníka ${prep} ${locativeCity}? Kompletní katalog ověřených profilů pro všechny obory. Malíři, instalatéři, hodinoví manželé a další v lokalitě ${cityName}.`;
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Služby ${prep} ${locativeCity}`,
    itemListElement: categories.map((cat, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${cat.name} ${cityName}`,
      url: `${SITE_URL}/sluzby/${cat.slug}/${citySlug}`,
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `Jak najdu řemeslníka ${prep} ${locativeCity}?`, acceptedAnswer: { "@type": "Answer", text: "Vyberte obor, vytvořte poptávku zdarma a porovnejte nabídky ověřených profíků ve vašem okolí." } },
      { "@type": "Question", name: `Jaké služby jsou dostupné ${prep} ${locativeCity}?`, acceptedAnswer: { "@type": "Answer", text: "Zrobee pokrývá řemesla, opravy, rekonstrukce, úklid, stěhování, zahradu, IT služby a další lokální profese." } },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/mesta/${citySlug}`} />
      </Helmet>

      <Header />
      <JsonLd data={breadcrumbLd} id="city-hub-breadcrumb" />
      {categories.length > 0 && <JsonLd data={itemListLd} id="city-hub-itemlist" />}
      <JsonLd data={faqLd} id="city-hub-faq" />

      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-20">
        <nav className="text-[10px] md:text-xs text-muted-foreground mb-6 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-foreground">Domů</Link>
          <span>/</span>
          <Link to="/vsechny-sluzby" className="hover:text-foreground">Služby</Link>
          {region && (
            <>
              <span>/</span>
              <span className="text-muted-foreground">{region}</span>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium">{cityName}</span>
        </nav>

        <header className="mb-16 md:mb-20 max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            {region ? `${region} · ${cityName}` : cityName}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrablack uppercase tracking-tight leading-[1.02] text-foreground mb-5">
            Služby {prep} {locativeCity}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Plánujete rekonstrukci, opravu nebo úklid {prep} {locativeCity}? Najdete u nás stovky ověřených odborníků z vašeho okolí.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-foreground/60" strokeWidth={1.75} /> Ověřené profily</span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-foreground/60" strokeWidth={1.75} /> Reálné recenze</span>
            <span className="text-border">·</span>
            <span>Lokální servis</span>
          </div>
        </header>

        <section className="mb-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Top kategorie</div>
              <h2 className="text-2xl md:text-3xl font-extrablack uppercase tracking-tight text-foreground leading-none">
                Oblíbené služby {prep} {locativeCity}
              </h2>
            </div>
          </div>

          {catLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Mobile swipable carousel with Embla */}
              <div className="md:hidden -mx-4 overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4 px-4">
                  {getMobilePairedItems().map((pair, colIndex) => (
                    <div
                      key={colIndex}
                      className="flex-shrink-0 flex flex-col gap-4"
                      style={{ width: "calc(45% - 8px)" }}
                    >
                      <CategoryCard cat={pair[0]} />
                      {pair[1] && <CategoryCard cat={pair[1]} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categories.slice(0, 12).map((cat: any) => (
                  <CategoryCard key={cat.id} cat={cat} />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mb-20 pt-16 border-t border-border/60">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Proč lokálně</div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Proč poptávat {prep} {locativeCity}</h2>
              <div className="text-base text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Město {cityName} a jeho okolí {region ? `(${region})` : ""} je domovem mnoha šikovných rukou. Poptávkou na Zrobee získáte přístup k lokálním specialistům, kteří dobře znají specifika místních staveb i terénu.
                </p>
                <p>
                  Ať už hledáte havarijní službu, nebo plánujete dlouhodobý projekt, místní dostupnost {prep} {locativeCity} vám zaručí férovou cenu bez zbytečných příplatků za dojezd.
                </p>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Okolí</div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Okolní lokality</h2>
              <ul className="grid grid-cols-2 gap-y-2 gap-x-6">
                {Object.entries(CITY_COORDINATES)
                  .filter(([name]) => name !== cityName && getRegionForCity(name) === region)
                  .slice(0, 12)
                  .map(([name]) => {
                    const slug = Object.keys(SLUG_TO_CITY).find(s => SLUG_TO_CITY[s] === name);
                    if (!slug) return null;
                    return (
                      <li key={name}>
                        <Link
                          to={`/mesta/${slug}`}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                        >
                          {name}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-20 py-16 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">Nenašli jste, co hledáte?</h2>
          <p className="text-muted-foreground mb-8">
            Vložte obecnou poptávku a my ji rozešleme všem vhodným profesionálům v lokalitě {cityName} a okolí. První nabídky obdržíte do několika hodin.
          </p>
          <Button asChild size="lg" className="rounded-full px-8 h-12 font-bold">
            <Link to="/nova-poptavka">Vložit poptávku zdarma</Link>
          </Button>
        </section>

        <section className="mt-20 pt-16 border-t border-border/60">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">FAQ</div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">Časté dotazy</h2>
          <div className="divide-y divide-border/60">
            {faqLd.mainEntity.map((item, i) => (
              <div key={i} className="py-6">
                <h3 className="font-semibold text-foreground text-base mb-2">{item.name}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {item.acceptedAnswer.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <LocalRegionalLinks cityName={cityName} currentCitySlug={citySlug} />
      </main>
      <Footer />
    </div>
  );
};

export default CityHub;
