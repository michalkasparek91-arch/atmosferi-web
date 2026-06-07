import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, ChevronRight, Wrench, Zap, Map, Building2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  SLUG_TO_REGION,
  REGION_TO_SLUG,
  getCitiesInRegion,
  cityToSlug,
  getPreposition,
  getLocativeForCity,
} from "@/lib/city-regions";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import JsonLd from "@/components/JsonLd";

const SITE_URL = "https://zrobee.cz";

const RegionHub = () => {
  const { categorySlug, regionSlug } = useParams<{ categorySlug: string; regionSlug: string }>();
  const navigate = useNavigate();

  const regionName = regionSlug ? SLUG_TO_REGION[regionSlug] : null;

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ["region-hub-category", categorySlug],
    queryFn: async () => {
      if (!categorySlug) return null;
      const { data } = await supabase
        .from("service_categories")
        .select("id, name, slug, icon")
        .eq("slug", categorySlug)
        .maybeSingle();
      return data;
    },
    enabled: !!categorySlug,
  });

  const cities = regionName ? getCitiesInRegion(regionName) : [];
  const isMSK = regionSlug === "moravskoslezsky-kraj";

  // Specialized MSK grouping
  const ostravaCities = isMSK ? cities.filter(c => c.toLowerCase().includes("ostrava")) : [];
  const otherMskCities = isMSK ? cities.filter(c => !c.toLowerCase().includes("ostrava")) : [];

  if (!regionName || (!catLoading && !category)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 pt-32 text-center space-y-4">
          <h1 className="text-2xl font-black uppercase">Stránka nenalezena</h1>
          <Button onClick={() => navigate("/vsechny-sluzby")}>Zpět na služby</Button>
        </div>
      </div>
    );
  }

  const categoryName = category?.name || "Služby";
  const title = `${categoryName} v ${regionName} | Zrobee`;
  const description = `Hledáte ${categoryName.toLowerCase()} v regionu ${regionName}? Vyberte si město a najděte ověřené řemeslníky ve svém okolí.`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Služby", item: `${SITE_URL}/vsechny-sluzby` },
      { "@type": "ListItem", position: 3, name: categoryName, item: `${SITE_URL}/sluzby/${categorySlug}` },
      { "@type": "ListItem", position: 4, name: regionName, item: `${SITE_URL}/sluzby/${categorySlug}/kraj/${regionSlug}` },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: cities.map((city, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: `${categoryName} ${getPreposition(city)} ${getLocativeForCity(city)}`,
      url: `${SITE_URL}/sluzby/${categorySlug}/${cityToSlug(city)}`,
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `Kde najdu službu ${categoryName.toLowerCase()} v regionu ${regionName}?`, acceptedAnswer: { "@type": "Answer", text: "Vyberte konkrétní město v regionu a Zrobee vám zobrazí dostupné profíky i možnost zadat poptávku zdarma." } },
      { "@type": "Question", name: "Co když moje město v seznamu není?", acceptedAnswer: { "@type": "Answer", text: "Můžete zadat obecnou poptávku a Zrobee ji rozešle vhodným profesionálům v širším okolí." } },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/sluzby/${categorySlug}/kraj/${regionSlug}`} />
      </Helmet>

      <Header />
      <JsonLd data={breadcrumbLd} id="region-hub-breadcrumb" />
      <JsonLd data={itemListLd} id="region-hub-itemlist" />
      <JsonLd data={faqLd} id="region-hub-faq" />

      <main className="w-full px-4 md:px-8 lg:px-[150px] pt-6 md:pt-10 pb-20">
        <nav className="text-[10px] md:text-xs text-muted-foreground mb-4 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-foreground">Domů</Link>
          <span>/</span>
          <Link to="/vsechny-sluzby" className="hover:text-foreground">Služby</Link>
          <span>/</span>
          <Link to={`/sluzby/${categorySlug}`} className="hover:text-foreground">{categoryName}</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{regionName}</span>
        </nav>

        <header className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
                {categoryName} v {regionName}
              </h1>
              <p className="text-muted-foreground text-lg">
                Vyberte si město v regionu a najděte místní profesionály.
              </p>
            </div>
          </div>
        </header>

        {catLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isMSK ? (
          <div className="space-y-16">
            {/* Ostrava Spiderweb Section */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-full bg-[hsl(var(--dark-green))] flex items-center justify-center text-primary shadow-sm">
                  <Zap className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Ostrava a obvody</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ostravaCities.map((city) => (
                  <Link
                    key={city}
                    to={`/sluzby/${categorySlug}/${cityToSlug(city)}`}
                    className="p-6 rounded-2xl border border-border bg-card hover:border-[hsl(var(--dark-green))]/50 hover:shadow-xl transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Map className="h-12 w-12" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-[hsl(var(--dark-green))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--dark-green))]/20 transition-colors">
                        <Wrench className="h-5 w-5 text-[hsl(var(--dark-green))]" />
                      </div>
                      <h3 className="font-bold text-foreground group-hover:text-[hsl(var(--dark-green))] transition-colors">
                        {city}
                      </h3>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>{categoryName} {getPreposition(city)} {getLocativeForCity(city)}</span>
                      <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Other MSK Cities */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Další velká města v kraji</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {otherMskCities.map((city) => (
                  <Link
                    key={city}
                    to={`/sluzby/${categorySlug}/${cityToSlug(city)}`}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex items-center justify-between group"
                  >
                    <span className="font-medium group-hover:text-primary transition-colors">{city}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <Link
                key={city}
                to={`/sluzby/${categorySlug}/${cityToSlug(city)}`}
                className="p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                    {city}
                  </h3>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>{categoryName} {getPreposition(city)} {getLocativeForCity(city)}</span>
                  <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <section className="mt-20 p-10 bg-muted/30 rounded-3xl border border-border/40 text-center">
          <h2 className="text-2xl font-black uppercase mb-4">Nenašli jste své město?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Vložte poptávku a my ji rozešleme všem vhodným profesionálům v {regionName} a okolí.
          </p>
          <Button size="lg" className="rounded-full px-8" onClick={() => navigate("/nova-poptavka")}>
            Vložit poptávku zdarma
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RegionHub;
