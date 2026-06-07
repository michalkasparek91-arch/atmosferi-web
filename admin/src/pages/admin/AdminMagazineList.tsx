import { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, ExternalLink, BookOpen, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import ArticleReviewBoard from "@/components/admin/ArticleReviewBoard";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: 'draft' | 'published';
  created_at: string;
}

export default function AdminMagazineList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const activeTab = searchParams.get("tab") || "catalog";

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true });
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, category, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data as Article[] || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Nepodařilo se načíst články');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete tento článek smazat?')) return;

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Článek byl smazán');
      setArticles(articles.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Nepodařilo se smazat článek');
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    drafts: articles.filter(a => a.status === 'draft').length,
    categories: [...new Set(articles.map(a => a.category))].length
  };

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        icon={BookOpen}
        title="Magazín"
        subtitle="Správa Anti-DIY obsahu a vzdělávací sekce"
        actions={
          <Button onClick={() => navigate('/admin/magazin/novy')} className="gap-2 rounded-full h-11 px-6 font-bold">
            <Plus className="h-4 w-4" />
            Vytvořit článek
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 w-full md:inline-flex md:w-auto md:flex-none gap-1 bg-zinc-100/80 dark:bg-zinc-800/60 p-1.5 rounded-full mb-8 border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm overflow-hidden">
          <TabsTrigger 
            value="catalog" 
            className="rounded-full px-4 sm:px-8 py-2.5 text-[11px] sm:text-xs font-bold transition-all duration-200 text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-md truncate"
          >
            Katalog článků
          </TabsTrigger>
          <TabsTrigger 
            value="ai-autopilot" 
            className="rounded-full px-4 sm:px-8 py-2.5 text-[11px] sm:text-xs font-bold transition-all duration-200 text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-md truncate"
          >
            AI Autopilot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-8 mt-0">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Celkem článků', value: stats.total, color: 'primary' },
          { label: 'Publikováno', value: stats.published, color: 'emerald' },
          { label: 'Rozpracováno', value: stats.drafts, color: 'orange' },
          { label: 'Kategorií', value: stats.categories, color: 'blue' }
        ].map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            <div className="text-3xl font-black">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              placeholder="Hledat podle názvu nebo kategorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 text-sm rounded-2xl bg-muted/30 border-none shadow-inner"
            />
          </div>
        </div>

        <div className="border border-border/50 rounded-[2rem] bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                <TableHead className="text-[10px] uppercase font-bold tracking-wider px-8 h-12">Název a URL</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider h-12">Kategorie</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider h-12">Stav</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider h-12">Datum</TableHead>
                <TableHead className="w-10 pr-8 h-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-none">
                    <TableCell colSpan={5} className="py-4 px-8"><div className="h-6 w-full bg-muted animate-pulse rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredArticles.length === 0 ? (
                <TableRow className="border-none">
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-20 font-medium italic">
                    Žádné články neodpovídají vašemu hledání.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles.map((article) => (
                  <TableRow key={article.id} className="group hover:bg-muted/20 transition-colors border-none">
                    <TableCell className="py-5 px-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{article.title}</span>
                        <code className="text-[10px] text-muted-foreground mt-1 opacity-60">/radce/{article.slug}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider rounded-lg px-2 h-5 border-border/50 bg-muted/20">
                        {article.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {article.status === 'published' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Publikováno
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          Koncept
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-muted-foreground">
                      {format(new Date(article.created_at), 'd. MM. yyyy', { locale: cs })}
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl shadow-xl border-border/50 p-1">
                          <DropdownMenuItem className="rounded-xl h-10 px-4 gap-2" onClick={() => navigate(`/admin/magazin/upravit/${article.id}`)}>
                            <Edit className="h-4 w-4" /> Upravit článek
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl h-10 px-4 gap-2" onClick={() => window.open(`/radce/${article.slug}`, '_blank')}>
                            <ExternalLink className="h-4 w-4" /> Otevřít na webu
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="mx-1" />
                          <DropdownMenuItem className="rounded-xl h-10 px-4 gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(article.id)}>
                            <Trash2 className="h-4 w-4" /> Smazat článek
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      </TabsContent>
      
      <TabsContent value="ai-autopilot" className="mt-0">
        <ArticleReviewBoard />
      </TabsContent>
      </Tabs>
    </div>
  );
}
