import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ChevronRight, Layers, MapPin } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import JsonLd from "@/components/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";


const CITY_LABEL: Record<string, string> = {
  "praha": "Praha", "brno": "Brno", "ostrava": "Ostrava", "plzen": "Plzeň", "liberec": "Liberec",
  "olomouc": "Olomouc", "ceske-budejovice": "České Budějovice", "hradec-kralove": "Hradec Králové",
  "pardubice": "Pardubice", "zlin": "Zlín", "usti-nad-labem": "Ústí nad Labem", "havirov": "Havířov",
  "kladno": "Kladno", "most": "Most", "opava": "Opava", "frydek-mistek": "Frýdek-Místek",
  "karvina": "Karviná", "jihlava": "Jihlava", "teplice": "Teplice", "decin": "Děčín",
  "chomutov": "Chomutov", "karlovy-vary": "Karlovy Vary", "jablonec-nad-nisou": "Jablonec nad Nisou",
  "mlada-boleslav": "Mladá Boleslav", "prostejov": "Prostějov", "prerov": "Přerov", "trebic": "Třebíč",
  "trutnov": "Trutnov", "tabor": "Tábor", "znojmo": "Znojmo", "pribram": "Příbram", "kolin": "Kolín",
  "pisek": "Písek", "uherske-hradiste": "Uherské Hradiště", "trinec": "Třinec",
};
const cityLabel = (s: string) => CITY_LABEL[s] || s.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");

const CategoryDirectory = () => {
  const { cat: catSlug, city: citySlug } = useParams<{ cat: string; city?: string }>();

  const { data: category } = useQuery({
    enabled: !!catSlug,
    queryKey: ["adresar-cat", catSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("id, name, slug, description")
        .eq("slug", catSlug!)
        .maybeSingle();
      return data;
    },
  });

  const { data: subs = [] } = useQuery({
    enabled: !!category?.id,
    queryKey: ["adresar-subs", category?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_subcategories")
        .select("id, name, slug")
        .eq("category_id", category!.id)
        .order("name");
      return data || [];
    },
  });

  const { data: pseoCities = [] } = useQuery({
    enabled: !!category?.id,
    queryKey: ["adresar-cities", category?.id, citySlug],
    queryFn: async () => {
      const q = supabase
        .from("pseo_contents")
        .select("city_slug, subcategory_id")
        .eq("category_id", category!.id);
      if (citySlug) q.eq("city_slug", citySlug);
      const { data } = await q;
      return data || [];
    },
  });

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="w-full px-4 md:px-8 lg:px-[150px] pt-32 pb-20">
          <p className="text-muted-foreground">Načítání…</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Level 3: /adresar/:cat/:city
  if (citySlug) {
    const activeSubIds = new Set(pseoCities.filter((r) => r.subcategory_id).map((r) => r.subcategory_id as string));
    const activeSubs = subs.filter((s) => activeSubIds.has(s.id));
    const title = `${category.name} ${cityLabel(citySlug)} — specializace | Zrobee`;

    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>{title}</title>
          <meta name="description" content={`Specializace v oboru ${category.name} dostupné v ${cityLabel(citySlug)}.`} />
          <link rel="canonical" href={`https://zrobee.cz/adresar/${catSlug}/${citySlug}`} />
        </Helmet>
        <JsonLd
          id="adresar-cat-city-breadcrumbs-ld"
          data={buildBreadcrumbJsonLd([
            { name: "Domů", path: "/" },
            { name: "Adresář", path: "/adresar" },
            { name: category.name, path: `/adresar/${catSlug}` },
            { name: cityLabel(citySlug) },
          ])}
        />
        <Header />
        <main className="w-full px-4 md:px-8 lg:px-[150px] pt-32 pb-20">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
            <Link to="/adresar" className="hover:text-primary">Adresář</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/adresar/${catSlug}`} className="hover:text-primary">{category.name}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{cityLabel(citySlug)}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-8">
            {category.name} <span className="text-primary">{cityLabel(citySlug)}</span>
          </h1>
          {activeSubs.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeSubs.map((s) => (
                <Link key={s.id} to={`/sluzby/${catSlug}/${s.slug}/${citySlug}`}
                  className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all flex items-center justify-between">
                  <span className="font-medium">{s.name} {cityLabel(citySlug)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Pro tuto kombinaci zatím nemáme detailní obsah. <Link to={`/sluzby/${catSlug}/${citySlug}`} className="text-primary underline">Zobrazit hlavní stránku</Link>.</p>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // Level 2: /adresar/:cat
  const cityUnion = Array.from(new Set(pseoCities.map((r) => r.city_slug))).sort();
  const activeSubIds = new Set(pseoCities.filter((r) => r.subcategory_id).map((r) => r.subcategory_id as string));
  const activeSubs = subs.filter((s) => activeSubIds.has(s.id));
  const title = `${category.name} — adresář měst a specializací | Zrobee`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={`Přehled měst a specializací v oboru ${category.name} na Zrobee.`} />
        <link rel="canonical" href={`https://zrobee.cz/adresar/${catSlug}`} />
      </Helmet>
      <JsonLd
        id="adresar-cat-breadcrumbs-ld"
        data={buildBreadcrumbJsonLd([
          { name: "Domů", path: "/" },
          { name: "Adresář", path: "/adresar" },
          { name: category.name },
        ])}
      />
      <Header />
      <main className="w-full px-4 md:px-8 lg:px-[150px] pt-32 pb-20">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/adresar" className="hover:text-primary">Adresář</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{category.name}</span>
        </nav>

        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">
          {category.name} <span className="text-primary">— adresář</span>
        </h1>
        {category.description && (
          <p className="text-muted-foreground max-w-2xl mb-12 leading-relaxed">{category.description.slice(0, 400)}</p>
        )}

        {cityUnion.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6 border-b border-border/60 pb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-black uppercase tracking-tight">{category.name} podle města</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {cityUnion.map((cs) => (
                <Link key={cs} to={`/sluzby/${catSlug}/${cs}`}
                  className="group p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center justify-between">
                  <span className="font-medium text-sm">{category.name} {cityLabel(cs)}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-all" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {activeSubs.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-border/60 pb-4">
              <Layers className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-black uppercase tracking-tight">Specializace</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeSubs.map((s) => (
                <Link key={s.id} to={`/sluzby/${catSlug}/${s.slug}`}
                  className="group p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center justify-between">
                  <span className="font-medium text-sm">{s.name}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-all" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CategoryDirectory;
