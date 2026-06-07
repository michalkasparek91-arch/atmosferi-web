import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { WittyRescueBanner } from "@/components/seo/WittyRescueBanner";
import ArticleServicePatcher from "@/components/seo/ArticleServicePatcher";
import TopPseoLinks from "@/components/seo/TopPseoLinks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Share2, Facebook, Twitter, Link as LinkIcon, Loader2, BookOpen, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import JsonLd from "@/components/JsonLd";
import { usePageSEO } from "@/hooks/use-page-seo";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderInlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="rounded-2xl shadow-lg my-8" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2" class="text-primary font-bold underline underline-offset-4">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

const markdownToHtml = (text: string) => {
  const blocks = (text || "").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return blocks.map((block) => {
    if (block === '<!-- RESCUE_BANNER -->') return block;
    if (block.startsWith('### ')) return `<h3>${renderInlineMarkdown(block.slice(4))}</h3>`;
    if (block.startsWith('## ')) return `<h2>${renderInlineMarkdown(block.slice(3))}</h2>`;

    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length > 0 && lines.every((line) => line.startsWith('- '))) {
      return `<ul>${lines.map((line) => `<li>${renderInlineMarkdown(line.slice(2))}</li>`).join('')}</ul>`;
    }

    if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
      return `<ol>${lines.map((line) => `<li>${renderInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    }

    return `<p>${renderInlineMarkdown(block).replace(/\n/g, '<br />')}</p>`;
  }).join('');
};

export default function ArticleDetail() {
  const { slug } = useParams();

  const { data: article, isLoading } = useQuery({
    queryKey: ['magazine-article', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedArticles = [] } = useQuery({
    queryKey: ['related-articles', article?.category, article?.id],
    enabled: !!article?.id,
    queryFn: async () => {
      const { data: sameCategory } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .eq('category', article?.category)
        .neq('id', article?.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (sameCategory && sameCategory.length >= 3) return sameCategory;

      const existingIds = sameCategory?.map(a => a.id) || [];
      const { data: newest } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .neq('id', article?.id)
        .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: false })
        .limit(3 - existingIds.length);
      
      return [...(sameCategory || []), ...(newest || [])];
    }
  });

  usePageSEO({
    title: article?.title,
    description: article?.excerpt || "",
    image: article?.image_url || undefined,
    ogType: "article",
    canonicalPath: article ? `/radce/${article.slug}` : undefined
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Odkaz zkopírován');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-4">Článek nenalezen</h1>
        <Button asChild rounded-full>
          <Link to="/radce">Zpět na magazín</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {article && (
        <>
          <JsonLd
            id="article-breadcrumb"
            data={{
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Domů", "item": "https://zrobee.cz/" },
                { "@type": "ListItem", "position": 2, "name": "Rádce", "item": "https://zrobee.cz/radce" },
                { "@type": "ListItem", "position": 3, "name": article.title, "item": `https://zrobee.cz/radce/${article.slug}` }
              ]
            }}
          />
          <JsonLd
            id="article-schema"
            data={{
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": article.title,
              "description": article.excerpt,
              "image": article.image_url,
              "datePublished": article.created_at,
              "dateModified": article.updated_at || article.created_at,
              "author": {
                "@type": "Person",
                "name": "Redakce Zrobee",
                "url": "https://zrobee.cz/o-zrobee",
                "jobTitle": "Editorial team",
                "worksFor": { "@type": "Organization", "name": "Zrobee", "url": "https://zrobee.cz" },
                "sameAs": ["https://zrobee.cz/o-zrobee"]
              },

              "publisher": {
                "@type": "Organization",
                "name": "Zrobee",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://zrobee.cz/zrobee-logo.svg"
                }
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://zrobee.cz/radce/${article.slug}`
              }
            }}
          />
        </>
      )}

      <Header />

      <main className="pt-12 pb-20">
        <div className="px-8 lg:px-[150px]">
          <Link 
            to="/radce" 
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-12"
          >
            <ArrowLeft className="h-4 w-4" /> Zpět na magazín
          </Link>
        </div>

        <article className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="space-y-8 mb-16">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                {article.category}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-[1.05] text-foreground">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" />
                Ověřeno odborníkem
              </Badge>
              <div className="h-1.5 w-1.5 rounded-full bg-border/60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Kontrolováno redakcí</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-border/40">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Autor</span>
                    <span className="text-sm font-bold">Zrobee Redakce</span>
                  </div>
                </div>
                
                <div className="h-10 w-px bg-border/40 hidden sm:block" />
                
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Vydáno</span>
                  <span className="text-sm font-bold">{format(new Date(article.created_at), 'd. MMMM yyyy', { locale: cs })}</span>
                </div>
                
                <div className="h-10 w-px bg-border/40 hidden sm:block" />
                
                <div className="hidden sm:flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Čtení</span>
                  <span className="text-sm font-bold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> 5 min</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border/40 hover:bg-primary/5 hover:text-primary transition-all" onClick={copyLink}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border/40 hover:bg-blue-600/5 hover:text-blue-600 transition-all">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border/40 hover:bg-slate-900/5 hover:text-slate-900 transition-all">
                  <Twitter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          {article.image_url && (
            <div className="aspect-[21/9] rounded-[3.5rem] overflow-hidden bg-muted mb-20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-border/30">
              <img 
                src={article.image_url} 
                alt={article.title} 
                className="w-full h-full object-cover"
                fetchPriority="high"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.classList.add('bg-muted/30');
                }}
              />
            </div>
          )}

          {/* AI-Overviews-friendly TL;DR — explicit "Stručně" summary block */}
          {article.excerpt && (
            <section
              aria-label="Stručně k článku"
              className="max-w-3xl mx-auto mb-16 rounded-[2.5rem] border border-primary/15 bg-primary/[0.04] p-8 md:p-10"
            >
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-primary mb-3">
                Stručně — TL;DR
              </p>
              <p className="text-lg md:text-xl leading-relaxed text-foreground/85 m-0">
                {article.excerpt}
              </p>
            </section>
          )}

          {/* Content Grid */}
          <div className="flex flex-col lg:flex-row gap-16 relative">
            {/* Table of Contents - Desktop Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-32 self-start">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-1 w-6 bg-primary rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Obsah článku</span>
                </div>
                <nav className="space-y-4">
                  {(article.content || '').split('\n').filter(line => line.startsWith('## ')).map((header, idx) => {
                    const text = header.replace('## ', '');
                    return (
                      <a 
                        key={idx}
                        href={`#section-${idx}`}
                        className="block text-sm font-bold text-muted-foreground hover:text-primary transition-colors leading-relaxed"
                      >
                        {text}
                      </a>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Article Content */}
            <div className="flex-1 max-w-3xl">
              <div className="prose prose-slate dark:prose-invert max-w-none prose-lg md:prose-xl 
                prose-h2:text-2xl md:prose-h2:text-4xl prose-h2:font-bold prose-h2:tracking-tight prose-h2:leading-tight prose-h2:mt-16 prose-h2:mb-6
                prose-h3:text-lg md:prose-h3:text-2xl prose-h3:font-bold prose-h3:mt-10
                prose-p:leading-relaxed prose-p:text-foreground/80 prose-p:mb-8
                prose-strong:text-foreground prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2
                prose-img:rounded-[2.5rem] prose-img:shadow-2xl prose-img:my-16
                [&>h2]:scroll-mt-32">
                {(() => {
                  const addSectionIds = (html: string) => {
                    return html.replace(/<h2/g, (match, offset, string) => {
                      const idx = string.slice(0, offset).split('<h2').length - 1;
                      return `<h2 id="section-${idx}"`;
                    });
                  };

                  if ((article.content || '').includes('<!-- RESCUE_BANNER -->')) {
                    const [before, after] = (article.content || '').split('<!-- RESCUE_BANNER -->');
                    return (
                      <>
                        <div dangerouslySetInnerHTML={{ __html: addSectionIds(markdownToHtml(before)) }} />
                        <WittyRescueBanner />
                        <div dangerouslySetInnerHTML={{ __html: addSectionIds(markdownToHtml(after)) }} />
                      </>
                    );
                  }

                  return (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: addSectionIds(markdownToHtml(article.content || '')) }} />
                      <WittyRescueBanner />
                    </>
                  );
                })()}
              </div>

              <ArticleServicePatcher 
                serviceName={article.category}
                articleContent={article.content}
                className="mt-20" 
              />
            </div>
          </div>
          
          <div className="mt-24 p-10 rounded-[2.5rem] bg-muted/30 border border-border/50 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 rotate-3">
                <BookOpen className="h-8 w-8" />
              </div>
              <div>
                <h4 className="font-black tracking-tight text-lg">Zrobee Redakce</h4>
                <p className="text-sm text-muted-foreground font-medium italic opacity-70">Expert na Anti-DIY příběhy</p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <Link to="/radce" className="h-12 px-8 rounded-full bg-foreground text-background flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-primary transition-all">
                Všechny články <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          </div>
        </article>

        {relatedArticles.length > 0 && (
          <section className="max-w-screen-xl mx-auto px-4 md:px-8 mt-24">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Související čtení</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedArticles.map((rel) => (
                <Link 
                  key={rel.id} 
                  to={`/radce/${rel.slug}`}
                  className="group flex flex-col h-full bg-card rounded-[3rem] border border-border/40 overflow-hidden hover:border-primary/20 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    {rel.image_url && (
                      <img 
                        src={rel.image_url} 
                        alt={rel.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.classList.add('bg-muted/30');
                        }}
                      />
                    )}
                  </div>
                  <div className="p-8 space-y-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">{rel.category}</span>
                      <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">{format(new Date(rel.created_at), 'd. M. yyyy', { locale: cs })}</span>
                    </div>
                    <h3 className="font-black text-xl leading-[1.1] group-hover:text-primary transition-colors line-clamp-2 tracking-tight">{rel.title}</h3>
                    <p className="text-[13px] text-muted-foreground/70 font-medium line-clamp-2 flex-1 leading-relaxed">{rel.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <TopPseoLinks limit={20} variant="pills" className="max-w-4xl mx-auto px-4 pt-16 pb-8" />
      </main>

      <Footer />
    </div>
  );
}
