import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Globe, Loader2, Sparkles, Trash2, Eye, RefreshCw, Search, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { SLUG_TO_CITY } from "@/lib/city-regions";
import { pingIndexNow } from "@/lib/seo";
import GeneratePseoButton from "@/components/admin/GeneratePseoButton";
import ArticleReviewBoard from "@/components/admin/ArticleReviewBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Settings, Activity, Clock, Play } from "lucide-react";
import AdminAutomationDashboard from "@/components/admin/AdminAutomationDashboard";
import AdminIndexingHealth from "@/components/admin/AdminIndexingHealth";
import PrerenderHealthWidget from "@/components/admin/PrerenderHealthWidget";
import CwvDashboard from "@/components/admin/CwvDashboard";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PseoEntry {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  city_slug: string;
  content: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_CITIES = [
  { slug: "praha", name: "Praha" },
  { slug: "brno", name: "Brno" },
  { slug: "ostrava", name: "Ostrava" },
  { slug: "plzen", name: "Plzeň" },
  { slug: "liberec", name: "Liberec" },
  { slug: "olomouc", name: "Olomouc" },
  { slug: "ceske-budejovice", name: "České Budějovice" },
  { slug: "hradec-kralove", name: "Hradec Králové" },
  { slug: "pardubice", name: "Pardubice" },
  { slug: "zlin", name: "Zlín" },
  { slug: "usti-nad-labem", name: "Ústí nad Labem" },
  { slug: "havirov", name: "Havířov" },
  { slug: "kladno", name: "Kladno" },
  { slug: "most", name: "Most" },
  { slug: "opava", name: "Opava" },
  { slug: "frydek-mistek", name: "Frýdek-Místek" },
  { slug: "karvina", name: "Karviná" },
  { slug: "jihlava", name: "Jihlava" },
  { slug: "teplice", name: "Teplice" },
  { slug: "decin", name: "Děčín" },
  { slug: "chomutov", name: "Chomutov" },
  { slug: "karlovy-vary", name: "Karlovy Vary" },
  { slug: "jablonec-nad-nisou", name: "Jablonec nad Nisou" },
  { slug: "mlada-boleslav", name: "Mladá Boleslav" },
  { slug: "prostejov", name: "Prostějov" },
  { slug: "prerov", name: "Přerov" },
  { slug: "trebic", name: "Třebíč" },
  { slug: "trutnov", name: "Trutnov" },
  { slug: "tabor", name: "Tábor" },
  { slug: "znojmo", name: "Znojmo" },
  { slug: "pribram", name: "Příbram" },
  { slug: "kolin", name: "Kolín" },
  { slug: "pisek", name: "Písek" },
  { slug: "uherske-hradiste", name: "Uherské Hradiště" },
  { slug: "trinec", name: "Třinec" },
  { slug: "praha-1", name: "Praha 1" },
  { slug: "praha-2", name: "Praha 2" },
  { slug: "praha-3", name: "Praha 3" },
  { slug: "praha-4", name: "Praha 4" },
  { slug: "praha-5", name: "Praha 5" },
  { slug: "praha-6", name: "Praha 6" },
  { slug: "praha-7", name: "Praha 7" },
  { slug: "praha-8", name: "Praha 8" },
  { slug: "praha-9", name: "Praha 9" },
  { slug: "praha-10", name: "Praha 10" },
  { slug: "brno-stred", name: "Brno-střed" },
  { slug: "brno-kralovo-pole", name: "Brno-Královo Pole" },
  { slug: "brno-bystrc", name: "Brno-Bystrc" },
  { slug: "brno-sever", name: "Brno-sever" },
  { slug: "ostrava-poruba", name: "Ostrava-Poruba" },
  { slug: "ostrava-jih", name: "Ostrava-Jih" },
];

export default function AdminSeoContent() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [customCitySearch, setCustomCitySearch] = useState("");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  
  // Batch state
  const [batchRunning, setBatchRunning] = useState(false);
  const [stopBatchRequested, setStopBatchRequested] = useState(false);
  const [batchLimit, setBatchLimit] = useState(10);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [batchLogs, setBatchLogs] = useState<string[]>([]);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-seo-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_categories")
        .select("id, name, slug")
        .order("name");
      return (data || []) as Category[];
    },
  });

  // Fetch total count for stats
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["admin-pseo-total-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("pseo_contents")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Fetch existing PSEO content
  const { data: existingContent = [], isLoading: loadingContent } = useQuery<PseoEntry[]>({
    queryKey: ["admin-pseo-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pseo_contents")
        .select("id, category_id, subcategory_id, city_slug, content, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(2000); // Increased limit for better visibility
      return (data || []) as PseoEntry[];
    },
  });

  // Helper to check if content already exists
  const hasContent = (catId: string, citySlug: string) => {
    return existingContent.some(e => e.category_id === catId && e.city_slug === citySlug && !e.subcategory_id);
  };

  // Filter content in the list
  const [filterQuery, setFilterQuery] = useState("");
  const filteredContent = useMemo(() => {
    if (!filterQuery) return existingContent;
    const q = filterQuery.toLowerCase();
    return existingContent.filter(
      (e) =>
        e.city_slug.includes(q) ||
        e.title?.toLowerCase().includes(q) ||
        categories.find((c) => c.id === e.category_id)?.name.toLowerCase().includes(q)
    );
  }, [existingContent, filterQuery, categories]);

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async ({ categoryId, citySlug }: { categoryId: string; citySlug: string }) => {
      const cat = categories.find((c) => c.id === categoryId);
      const cityName = SLUG_TO_CITY[citySlug] || PRIORITY_CITIES.find(c => c.slug === citySlug)?.name || citySlug;

      const { data, error } = await supabase.functions.invoke("generate-pseo-content", {
        body: {
          categoryName: cat?.name || "Služba",
          subcategoryName: null,
          cityName,
          citySlug,
          categoryId,
          subcategoryId: null,
        },
      });

      if (error) {
        console.error("Supabase Invoke Error:", error);
        throw new Error(error.message || "Chyba komunikace s AI funkcí");
      }
      
      if (data?.error) {
        console.error("AI Generation Error:", data);
        throw new Error(data.details || data.error);
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data?.cached ? "Obsah již existoval (z cache)" : "AI obsah úspěšně vygenerován a uložen!");
      queryClient.invalidateQueries({ queryKey: ["admin-pseo-content"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pseo-total-count"] });
      
      // IndexNow Automation: notify search engines about the new/updated page
      const cat = categories.find((c) => c.id === variables.categoryId);
      if (cat && variables.citySlug) {
        const path = `/sluzby/${cat.slug}/${variables.citySlug}`;
        pingIndexNow(path);
      }
    },
    onError: (error: Error) => {
      toast.error(`Chyba generování: ${error.message}`);
    },
  });

  // Batch generate
  const addLog = (msg: string) => {
    setBatchLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const runBatchGenerate = async () => {
    if (!selectedCategory) {
      toast.error("Vyberte kategorii pro dávkové generování");
      return;
    }

    const allAvailableCities = PRIORITY_CITIES.filter(c => !hasContent(selectedCategory, c.slug));
    const citiesToProcess = allAvailableCities.slice(0, batchLimit);
    
    if (citiesToProcess.length === 0) {
      toast.info("Všechna prioritní města již mají pro tuto kategorii vygenerovaný obsah.");
      return;
    }

    const confirmMessage = `Spustit hromadné generování pro ${citiesToProcess.length} měst?\n\n` +
      `⚠️ Limit Free Tieru: 15 požadavků/min a 1,500/den.\n` +
      `Bude nastaven interval 5 sekund mezi požadavky.`;

    if (!confirm(confirmMessage)) return;

    setBatchRunning(true);
    setStopBatchRequested(false);
    setBatchProgress({ done: 0, total: citiesToProcess.length });
    setBatchLogs(["--- Zahájení dávky ---"]);

    for (let i = 0; i < citiesToProcess.length; i++) {
      if (stopBatchRequested) {
        addLog("⛔ Dávka zastavena uživatelem.");
        break;
      }

      addLog(`⚙️ Generuji ${citiesToProcess[i].name}...`);
      
      try {
        addLog(`📡 Odesílám požadavek pro ${citiesToProcess[i].name}...`);
        await generateMutation.mutateAsync({
          categoryId: selectedCategory,
          citySlug: citiesToProcess[i].slug,
        });
        addLog(`✅ ${citiesToProcess[i].name} dokončeno.`);
      } catch (e: any) {
        addLog(`❌ Chyba pro ${citiesToProcess[i].name}: ${e.message}`);
        console.warn(`Batch error for ${citiesToProcess[i].name}:`, e);
      }
      
      setBatchProgress({ done: i + 1, total: citiesToProcess.length });
      
      // Rate limit — wait 5s between requests to stay safely under 15 RPM
      if (i < citiesToProcess.length - 1 && !stopBatchRequested) {
        addLog("⏳ Čekám 5 sekund (Free Tier safety)...");
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    setBatchRunning(false);
    setStopBatchRequested(false);
    addLog("--- Dávka dokončena ---");
    toast.success(`Dávkové generování dokončeno! ${batchProgress.done} stránek zpracováno.`);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pseo_contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obsah smazán");
      queryClient.invalidateQueries({ queryKey: ["admin-pseo-content"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pseo-total-count"] });
    },
  });

  const getCategoryName = (id: string | null) => {
    if (!id) return "—";
    return categories.find((c) => c.id === id)?.name || "—";
  };

  const getCityName = (slug: string) => {
    return SLUG_TO_CITY[slug] || PRIORITY_CITIES.find(c => c.slug === slug)?.name || slug;
  };

  const isRichContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return !!parsed.intro && !!parsed.faqs;
    } catch {
      return false;
    }
  };

  const allCities = useMemo(() => Object.entries(SLUG_TO_CITY)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs")), []);

  // Filtered priority cities (only those without content)
  const availablePriorityCities = useMemo(() => {
    if (!selectedCategory) return PRIORITY_CITIES;
    return PRIORITY_CITIES.filter(city => !hasContent(selectedCategory, city.slug));
  }, [selectedCategory, existingContent]);

  // Filtered city list for custom search (only those without content)
  const filteredCities = useMemo(() => {
    if (!customCitySearch) return [];
    const q = customCitySearch.toLowerCase();
    return allCities
      .filter((c) => c.name.toLowerCase().includes(q))
      .filter((c) => !selectedCategory || !hasContent(selectedCategory, c.slug));
  }, [customCitySearch, selectedCategory, existingContent, allCities]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Globe}
        title="SEO Content Engine"
        subtitle="Správa automatizovaného obsahu a landing pages"
      />

      <Tabs defaultValue={searchParams.get("tab") || "pseo"} className="w-full space-y-6">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-muted/40 p-1 rounded-full h-9">
            <TabsTrigger 
              value="pseo" 
              className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
            >
              PSEO
            </TabsTrigger>
            <TabsTrigger 
              value="indexing" 
              className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
            >
              Stav indexace
            </TabsTrigger>
            <TabsTrigger 
              value="automation" 
              className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
            >
              Automatizace
            </TabsTrigger>
            <TabsTrigger 
              value="cwv" 
              className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
            >
              Web Vitals
            </TabsTrigger>
            <TabsTrigger 
              value="prerender" 
              className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
            >
              Prerender
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pseo" className="space-y-8 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <GeneratePseoButton />
            </div>
            <div>
              <Card className="border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 shadow-none h-full rounded-xl">
                <CardContent className="p-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">Systémový status</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Hromadný generátor automaticky doplňuje chybějící landing pages pro top kombinace měst a kategorií.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Generator Controls */}
          <Card className="border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
            <CardContent className="p-6 space-y-8">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Manuální konfigurace</h2>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                {/* Category Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Kategorie</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-11 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/50 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">— Vyberte —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Město</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full h-11 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/50 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">— Vyberte —</option>
                    {availablePriorityCities.length > 0 ? (
                      <optgroup label="Top města">
                        {availablePriorityCities.map((city) => (
                          <option key={city.slug} value={city.slug}>
                            {city.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : selectedCategory && (
                      <option disabled>Všechna top města hotová ✅</option>
                    )}
                  </select>
                  {/* Custom city search */}
                  <div className="mt-2 relative">
                    <Input
                      placeholder="Vyhledat jiné město..."
                      value={customCitySearch}
                      onChange={(e) => setCustomCitySearch(e.target.value)}
                      className="h-9 text-xs bg-zinc-50/30 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500"
                    />
                    {filteredCities.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {filteredCities.slice(0, 10).map((city) => (
                          <button
                            key={city.slug}
                            onClick={() => {
                              setSelectedCity(city.slug);
                              setCustomCitySearch("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b last:border-0 border-zinc-100 dark:border-zinc-800"
                          >
                            {city.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 justify-end">
                  <Button
                    onClick={() => {
                      if (!selectedCategory || !selectedCity) {
                        toast.error("Vyberte kategorii i město");
                        return;
                      }
                      generateMutation.mutate({ categoryId: selectedCategory, citySlug: selectedCity });
                    }}
                    disabled={generateMutation.isPending || !selectedCategory || !selectedCity || batchRunning}
                    className="rounded-lg h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all font-medium"
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    )}
                    Generovat
                  </Button>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input 
                        type="number" 
                        value={batchLimit} 
                        onChange={(e) => setBatchLimit(parseInt(e.target.value) || 1)}
                        className="h-10 rounded-lg pl-14 text-xs w-full bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                        min="1"
                        max="100"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">Limit:</div>
                    </div>
                    {batchRunning ? (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setStopBatchRequested(true);
                          addLog("🛑 Zastavuji...");
                        }}
                        className="rounded-lg h-10 px-4 flex-1 text-xs"
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={runBatchGenerate}
                        disabled={!selectedCategory}
                        className="rounded-lg h-10 text-xs flex-1 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        Dávkově
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {(batchRunning || batchLogs.length > 0) && (
                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in">
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-700 rounded-full"
                      style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 h-32 overflow-y-auto font-mono text-[10px] space-y-1 border border-zinc-200/50 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    {batchLogs.map((log, idx) => (
                      <div key={idx} className={log.includes("❌") ? "text-red-500" : log.includes("✅") ? "text-emerald-600 font-bold" : ""}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { label: "Celkem stránek", value: totalCount, icon: Globe },
              { label: "Rich JSON obsah", value: existingContent.filter((e) => isRichContent(e.content)).length, icon: Sparkles, color: "text-primary font-black" },
              { label: "Unikátní města", value: new Set(existingContent.map((e) => e.city_slug)).size, icon: CheckCircle },
            ].map((stat, i) => (
              <Card key={i} className="border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-xl bg-white dark:bg-zinc-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">{stat.label}</span>
                    <stat.icon className="h-4 w-4 text-zinc-200 dark:text-zinc-700" />
                  </div>
                  <div className={`mt-2 text-4xl font-black ${stat.color || "text-zinc-900 dark:text-zinc-100"}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content List */}
          <Card className="border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                  Vygenerovaný obsah
                </h2>
                <div className="relative w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    placeholder="Filtr..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="pl-9 h-9 rounded-lg text-xs bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {loadingContent ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-200 dark:text-zinc-700" />
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="py-20 text-center text-zinc-400 dark:text-zinc-600 text-xs italic">
                  Zatím žádný vygenerovaný obsah.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border-t border-zinc-100 dark:border-zinc-800/80">
                  {filteredContent.map((entry) => {
                    const isRich = isRichContent(entry.content);
                    const isExpanded = expandedEntryId === entry.id;
                    return (
                      <div key={entry.id} className="group">
                        <div className="flex items-center gap-4 py-4 px-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                {getCategoryName(entry.category_id)}
                              </span>
                              <span className="text-zinc-300 dark:text-zinc-700">/</span>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{getCityName(entry.city_slug)}</span>
                              {isRich ? (
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" title="Rich Content" />
                              ) : null}
                            </div>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-tighter">
                              {entry.title || "—"} · {new Date(entry.updated_at).toLocaleDateString("cs-CZ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg text-zinc-400 dark:text-zinc-500"
                              onClick={() => {
                                const catSlug = categories.find(c => c.id === entry.category_id)?.slug;
                                if (catSlug) window.open(`/sluzby/${catSlug}/${entry.city_slug}`, "_blank");
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg text-zinc-400 dark:text-zinc-500"
                              onClick={() => {
                                generateMutation.mutate({ categoryId: entry.category_id!, citySlug: entry.city_slug });
                              }}
                              disabled={generateMutation.isPending}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg"
                              onClick={() => {
                                if (confirm("Smazat tento obsah?")) deleteMutation.mutate(entry.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg text-zinc-400 dark:text-zinc-500"
                              onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-900 dark:text-zinc-100" /> : <ChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />}
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="bg-zinc-50/80 dark:bg-zinc-950 p-6 rounded-b-xl border-t border-zinc-100 dark:border-zinc-800/80 overflow-x-auto">
                            <pre className="text-[11px] leading-relaxed font-mono text-zinc-500 dark:text-zinc-400 max-w-full">
                              {isRich ? JSON.stringify(JSON.parse(entry.content), null, 2) : entry.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="automation" className="mt-0">
          <AdminAutomationDashboard />
        </TabsContent>

        <TabsContent value="indexing" className="mt-0">
          <AdminIndexingHealth />
        </TabsContent>

        <TabsContent value="cwv" className="mt-0">
          <CwvDashboard />
        </TabsContent>

        <TabsContent value="prerender" className="mt-0">
          <PrerenderHealthWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}
