import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MapPin, Wrench, ArrowRight, Layers, LayoutGrid, Globe } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CITY_COORDINATES, cityToSlug, PRIORITY_PSEO_CITIES } from "@/lib/city-regions";
import { Helmet } from "react-helmet-async";
import JsonLd from "@/components/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const SeoDirectory = () => {
  const { data: categories = [] } = useQuery({
    queryKey: ["directory-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("*")
        .order("name", { ascending: true });
      return data || [];
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Adresář služeb a míst | Zrobee</title>
        <meta name="description" content="Kompletní přehled služeb a měst, kde působí naši ověření řemeslníci. Najděte specialistu ve vašem okolí." />
      </Helmet>

      <JsonLd
        id="adresar-breadcrumbs-ld"
        data={buildBreadcrumbJsonLd([
          { name: "Domů", path: "/" },
          { name: "Adresář" },
        ])}
      />

      <Header />

      <main className="w-full px-4 md:px-8 lg:px-[150px] pt-32 pb-20">
        <header className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-foreground" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-tight">
              Adresář služeb <br /><span className="text-primary">& míst</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Najděte ověřené profesionály kdekoli v České republice. Procházejte služby podle oboru nebo lokality a získejte nabídky zdarma.
          </p>
        </header>

        <div className="grid gap-16">
          {/* 1. Primary Categories */}
          <section>
            <div className="flex items-center gap-3 mb-8 border-b border-border/60 pb-4">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight">Hlavní kategorie služeb</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/sluzby/${cat.slug}`}
                  className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{cat.name}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Ověření specialisté pro obor {cat.name.toLowerCase()} po celé ČR.
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* 2. Priority Cities */}
          <section>
            <div className="flex items-center gap-3 mb-8 border-b border-border/60 pb-4">
              <MapPin className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight">Nejhledanější města</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {PRIORITY_PSEO_CITIES.map((city) => (
                <Link
                  key={city}
                  to={`/mesta/${cityToSlug(city)}`}
                  className="px-4 py-3 rounded-xl border border-border bg-card text-center text-sm font-medium hover:border-primary/40 hover:text-primary transition-all whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {city}
                </Link>
              ))}
            </div>
          </section>

          {/* 3. All Cities Spiderweb */}
          <section className="bg-muted/30 rounded-[2.5rem] p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <Layers className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight">Kompletní pokrytí ČR</h2>
            </div>
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-6 space-y-2">
              {Object.keys(CITY_COORDINATES).sort().map((city) => (
                <Link
                  key={city}
                  to={`/mesta/${cityToSlug(city)}`}
                  className="block text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                >
                  Služby {city}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SeoDirectory;
