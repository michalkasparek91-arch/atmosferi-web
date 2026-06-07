import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, FileText, Send, Eye, Code } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Article {
  id: string;
  title: string;
  target_keyword: string;
  content_html: string;
  slug: string;
  status: "idea" | "draft" | "published";
  social_snippet: string | null;
  visual_prompt: string | null;
  image_url: string | null;
  category_id: string | null;
  created_at: string;
}

const ArticleReviewBoard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"drafts" | "ideas">("drafts");

  // Fetch Ideas
  const { data: ideas = [], isLoading: loadingIdeas } = useQuery({
    queryKey: ["magazine-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radce_articles")
        .select("id, title, target_keyword, created_at")
        .eq("status", "idea")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("radce_articles")
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
      if (data && data.length > 0 && !selectedArticle) {
        handleSelectArticle(data[0]);
      }
    } catch (err) {
      console.error("Error fetching drafts:", err);
      toast.error("Nepodařilo se načíst koncepty");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    setEditingContent(article.content_html);
  };

  const handlePublish = async () => {
    if (!selectedArticle) return;
    setIsSaving(true);
    try {
      // 1. Přesunout do hlavní tabulky articles
      const { error: insertError } = await supabase.from("articles").insert({
        title: selectedArticle.title,
        slug: selectedArticle.slug,
        category: "Návody", // Většina AI článků jsou návody
        excerpt: selectedArticle.social_snippet?.substring(0, 160) || "Přečtěte si náš nový článek plný užitečných rad a tipů.",
        content: editingContent,
        image_url: selectedArticle.image_url,
        status: "published"
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Nepodařilo se přesunout článek do hlavní tabulky.");
      }

      // 2. Smazat z čekárny radce_articles
      const { error: deleteError } = await supabase
        .from("radce_articles")
        .delete()
        .eq("id", selectedArticle.id);

      if (deleteError) {
        console.error("Delete error:", deleteError);
      }

      // 2. Ping IndexNow
      const url = `https://zrobee.cz/radce/${selectedArticle.slug}`;
      await supabase.functions.invoke("indexnow-ping", {
        body: { urls: [url] }
      });

      toast.success("Článek byl publikován a odeslán k indexaci!");
      
      // Refresh list
      setSelectedArticle(null);
      await fetchDrafts();
    } catch (err) {
      console.error("Error publishing:", err);
      toast.error("Chyba při publikaci článku");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: List of drafts & ideas */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Fronta obsahu
            </h2>
          </div>
          
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-100/50 dark:bg-zinc-800/50 p-1 mb-4">
              <TabsTrigger value="drafts" className="text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
                K revizi ({articles.length})
              </TabsTrigger>
              <TabsTrigger value="ideas" className="text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
                Nápady ({ideas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drafts" className="m-0 space-y-3">
              {articles.length === 0 ? (
                <div className="py-12 px-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30">
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs">Žádné nové koncepty.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleSelectArticle(article)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedArticle?.id === article.id
                          ? "bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-700 shadow-sm ring-1 ring-zinc-900/5 dark:ring-0"
                          : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                      }`}
                    >
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">{article.title}</h3>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                          {article.target_keyword || "Magazín"}
                        </span>
                        <span className="text-[9px] text-zinc-300 dark:text-zinc-600 font-medium">
                          {new Date(article.created_at).toLocaleDateString("cs-CZ")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ideas" className="m-0 space-y-3">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
                <p className="text-[11px] text-primary/80 font-medium leading-relaxed">
                  Tato témata vymyslela AI. Každou noc se zpracuje právě 1 článek, který se pak přesune do sekce "K revizi".
                </p>
              </div>
              
              {loadingIdeas ? (
                <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-300" /></div>
              ) : ideas.length === 0 ? (
                <div className="py-12 px-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30">
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs">Žádné nápady ve frontě.</p>
                </div>
              ) : (
                <div className="space-y-3 opacity-80">
                  {ideas.map((idea) => (
                    <div
                      key={idea.id}
                      className="w-full text-left p-4 rounded-xl border bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800"
                    >
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">{idea.title}</h3>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                          {idea.target_keyword}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content: Editor */}
        <div className="lg:col-span-8">
          {selectedArticle ? (
            <Card className="border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="bg-zinc-50/30 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                      {selectedArticle.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-bold">
                      Focus: <span className="text-zinc-600 dark:text-zinc-300">{selectedArticle.target_keyword}</span>
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handlePublish} 
                    disabled={isSaving}
                    className="rounded-full px-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-none border-none h-10 font-bold text-xs uppercase tracking-widest transition-colors"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3 w-3 mr-2 text-primary" />
                        Publikovat
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="preview" className="w-full">
                  <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-800/10 flex justify-between items-center">
                    <TabsList className="bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-lg h-9">
                      <TabsTrigger value="preview" className="text-[10px] uppercase font-bold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm rounded-md data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400">
                        Náhled
                      </TabsTrigger>
                      <TabsTrigger value="code" className="text-[10px] uppercase font-bold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm rounded-md data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400">
                        Zdroj
                      </TabsTrigger>
                      <TabsTrigger value="marketing" className="text-[10px] uppercase font-bold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm rounded-md data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400">
                        Promoce
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-tighter">
                        {editingContent.length} chars
                      </span>
                    </div>
                  </div>
                  
                  <TabsContent value="preview" className="p-0 m-0">
                    <div className="p-10 prose prose-zinc max-w-none min-h-[600px] bg-white dark:bg-zinc-900">
                      <div 
                        dangerouslySetInnerHTML={{ __html: editingContent }} 
                        className="magazine-preview text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="code" className="p-0 m-0">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full min-h-[600px] p-8 font-mono text-xs border-none focus:ring-0 resize-none bg-zinc-950 text-zinc-400 dark:text-zinc-300 leading-relaxed outline-none"
                      spellCheck={false}
                    />
                  </TabsContent>
                  <TabsContent value="marketing" className="p-0 m-0">
                    <div className="p-8 space-y-8 bg-zinc-50/30 dark:bg-zinc-900/50">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Sociální sítě (FB/LI)</h4>
                        <div className="p-5 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed shadow-sm italic">
                          {selectedArticle.social_snippet || "Snippet nebyl vygenerován."}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-full text-[10px] uppercase font-bold h-8 border-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedArticle.social_snippet || "");
                            toast.success("Zkopírováno!");
                          }}
                        >
                          Kopírovat text
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Vizuální zadání (AI Image)</h4>
                        <div className="p-5 bg-zinc-950 border border-zinc-800 dark:border-zinc-800/80 rounded-xl text-xs text-zinc-400 dark:text-zinc-400 font-mono leading-relaxed">
                          {selectedArticle.visual_prompt || "Zadání nebylo vygenerováno."}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-full text-[10px] uppercase font-bold h-8 border-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedArticle.visual_prompt || "");
                            toast.success("Zkopírováno!");
                          }}
                        >
                          Kopírovat prompt
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Vyberte článek</h3>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-2">Seznam konceptů čekajících na revizi.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .magazine-preview h2 {
          font-size: 1.75rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          margin-top: 3rem;
          margin-bottom: 1.25rem;
          color: inherit;
        }
        .magazine-preview h3 {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: inherit;
        }
        .magazine-preview p {
          margin-bottom: 1.5rem;
          line-height: 1.8;
          font-size: 1.05rem;
          color: inherit;
          opacity: 0.9;
        }
        .magazine-preview ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .magazine-preview li {
          margin-bottom: 0.75rem;
          color: inherit;
          line-height: 1.8;
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default ArticleReviewBoard;
