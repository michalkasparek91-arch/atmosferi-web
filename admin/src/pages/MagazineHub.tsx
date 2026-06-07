import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, BookOpen, Clock, ChevronRight, Search, Zap, TrendingUp, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import JsonLd from "@/components/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const CATEGORIES = ['Vše', 'Návody', 'Ceníky', 'Katastrofy', 'Inspirace'];

const TOP_TOPICS = [
  { name: "Malování", slug: "malovani-a-tapetovani", icon: Zap },
  { name: "Instalatéři", slug: "instalaterske-prace", icon: TrendingUp },
  { name: "Elektrikáři", slug: "elektrikarske-prace", icon: Zap },
  { name: "Rekonstrukce", slug: "rekonstrukce-bytoveho-jadra", icon: TrendingUp },
  { name: "Hodinový manžel", slug: "hodinovy-manzel", icon: HelpCircle },
];

export default function MagazineHub() {
  const [activeCategory, setActiveCategory] = useState('Vše');

  const { data: articles, isLoading } = useQuery({
    queryKey: ['magazine-articles', activeCategory],
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (activeCategory !== 'Vše') {
        query = query.eq('category', activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Rádce a Magazín | Zrobee</title>
        <meta name="description" content="Čtěte, jak na to. A pak zjistěte, že je lepší to nechat na profících. Praktické návody, ceníky a inspirace pro vaše bydlení." />
      </Helmet>

      <JsonLd 
        id="magazine-hub-ld"
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Zrobee Rádce",
          "description": "Magazín o tom, proč je lepší nechat řemeslo na profících.",
          "publisher": {
            "@type": "Organization",
            "name": "Zrobee",
            "logo": {
              "@type": "ImageObject",
              "url": "https://zrobee.cz/zrobee-logo.svg"
            }
          },
          "blogPost": articles?.map(a => ({
            "@type": "BlogPosting",
            "headline": a.title,
            "description": a.excerpt,
            "image": a.image_url,
            "datePublished": a.created_at,
            "url": `https://zrobee.cz/radce/${a.slug}`
          }))
        }}
      />

      <JsonLd
        id="magazine-breadcrumbs-ld"
        data={buildBreadcrumbJsonLd([
          { name: "Domů", path: "/" },
          { name: "Rádce" },
        ])}
      />



      <Header />

      <main className="pt-32 pb-20 px-4 md:px-8 lg:px-[150px]">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-24 space-y-8">
          <Badge className="bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">
            Anti-DIY Magazín
          </Badge>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-foreground leading-[0.9]">
            Rádce & <span className="text-primary italic">Magazín</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed opacity-80">
            Čtěte, jak na to. A pak zjistěte, že je lepší to nechat na profících.
          </p>
        </div>

        {/* Directory/Topics Section */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">Populární témata</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {TOP_TOPICS.map((topic) => (
              <Link 
                key={topic.slug}
                to={`/sluzby/${topic.slug}`}
                className="group p-8 rounded-[2.5rem] bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all text-center space-y-4"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto text-primary group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                  <topic.icon className="h-6 w-6" />
                </div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{topic.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "ghost"}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full h-11 px-8 text-[11px] font-bold uppercase tracking-widest transition-all",
                activeCategory === cat 
                  ? "bg-foreground text-background hover:bg-foreground/90 shadow-lg" 
                  : "hover:bg-muted/50 hover:text-primary border border-transparent hover:border-border/50 text-muted-foreground"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-video bg-muted rounded-[2.5rem]" />
                <div className="h-4 w-1/4 bg-muted rounded" />
                <div className="h-6 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : articles?.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-[3rem] border border-dashed border-border">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Zatím tu nic není</h3>
            <p className="text-muted-foreground">Ale nebojte, naše redakce už (ne)pracuje na dalších článcích.</p>
          </div>
        ) : (
          <div className="space-y-24">
            {/* Featured Article */}
            {articles && articles.length > 0 && activeCategory === 'Vše' && (
              <Link 
                to={`/radce/${articles[0].slug}`}
                className="group relative block w-full aspect-[21/9] md:aspect-[16/6] rounded-[4rem] overflow-hidden shadow-2xl border border-border/30"
              >
                {articles[0].image_url ? (
                  <img 
                    src={articles[0].image_url} 
                    alt={articles[0].title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.classList.add('bg-muted/30');
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                    <BookOpen className="h-20 w-20 text-muted-foreground/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10 md:p-20 space-y-6">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-primary-foreground border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Doporučujeme
                    </Badge>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{articles[0].category}</span>
                  </div>
                  <h2 className="text-3xl md:text-7xl font-black tracking-tight text-white leading-[0.9] max-w-4xl">
                    {articles[0].title}
                  </h2>
                  <p className="text-white/70 text-sm md:text-xl font-medium max-w-2xl line-clamp-2 leading-relaxed">
                    {articles[0].excerpt}
                  </p>
                  <div className="pt-4">
                    <span className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-primary group-hover:gap-4 transition-all bg-background/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                      Číst celý příběh <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {(activeCategory === 'Vše' ? articles?.slice(1) : articles)?.map((article) => (
                <Link 
                key={article.id} 
                to={`/radce/${article.slug}`}
                className="group flex flex-col h-full hover:-translate-y-2 transition-all duration-500"
              >
                <div className="relative aspect-[16/11] overflow-hidden rounded-[2.5rem] bg-muted mb-8 shadow-sm group-hover:shadow-xl transition-all duration-700">
                  {article.image_url ? (
                    <img 
                      src={article.image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.classList.add('bg-muted/30');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <BookOpen className="h-12 w-12 text-muted-foreground/10" />
                    </div>
                  )}
                  <div className="absolute top-6 left-6">
                    <Badge className="bg-white/90 backdrop-blur-md text-foreground hover:bg-white border-none px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-lg">
                      {article.category}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4 flex-1 flex flex-col px-1">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                    <Clock className="h-3 w-3" />
                    {format(new Date(article.created_at), 'd. MMMM yyyy', { locale: cs })}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight leading-[0.95] group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-medium line-clamp-3 leading-relaxed opacity-80">
                    {article.excerpt}
                  </p>
                  <div className="pt-4 mt-auto">
                    <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-all">
                      Číst příběh <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

        {/* Newsletter / CTA */}
        <section className="mt-32 p-12 md:p-20 rounded-[4rem] bg-dark-green text-background text-center overflow-hidden relative shadow-2xl">
          <div className="absolute -right-20 -top-20 h-80 w-80 bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 bg-primary/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tight max-w-3xl mx-auto leading-[0.85]">
              Chcete dostávat <span className="text-primary italic">dobré rady</span> do mailu?
            </h2>
            <p className="text-xl text-background/60 font-medium max-w-lg mx-auto leading-relaxed">
              Žádný spam, jen sem tam článek, co vám ušetří nervy a peníze.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Input 
                placeholder="Váš e-mail" 
                className="max-w-xs h-14 rounded-full border-none bg-background/10 placeholder:text-background/30 text-background text-center sm:text-left sm:pl-8 text-lg" 
              />
              <Button className="h-14 px-10 rounded-full font-bold tracking-tight bg-primary hover:bg-primary/90 text-primary-foreground text-lg">
                Odebírat
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
