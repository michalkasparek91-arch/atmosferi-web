import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Target, MapPin, Search, Plus, X, CheckSquare, Square, Globe, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TOP_CITIES_BY_COUNTRY } from "@/lib/city-regions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ScraperConfig {
  is_enabled: boolean;
  keywords: string[];
  cities: string[];
  countries: string[];
  active_keywords?: string[];
  active_cities?: string[];
  active_countries?: string[];
  prompt_template?: string;
}

const DEFAULT_PROMPT = `Jsi autonomní vyhledávací agent pro B2B akvizici. Cílový stát: {{targetCountry}}. Obor: "{{targetKeyword}}". 
TVŮJ ÚKOL: 
1. Zaměř se PŘESNĚ na toto město: {{targetCity}} (pokud chybí, vymysli si náhodně jiné než hlavní město).
2. Pomocí nástroje Google Search najdi reálné firmy v tomto městě pro zadaný obor.
3. Extrahuj z jejich webů nebo z Googlu kontakty. Najdi MAXIMÁLNĚ 30-40 firem, které mají uvedenou E-MAILOVOU ADRESU (toto je naprosto kritické, firmy bez e-mailu musíš ignorovat!). Vzhledem k vyššímu limitu tokenů se neboj vypsat až 40 firem najednou!

Vrať JSON pole. Povinná pole pro každý objekt: company_name, email, phone, website, city, country, language (např. cs, en, de), full_address, description, ai_icebreaker (osobní otevírací odstavec do e-mailu v jazyce dané země chválící jejich práci), decision_maker_name (pokud nelze dohledat tak ""), premium_score (číslo 1-100 podle kvality prezentace).
Odpověz POUZE validním polem objektů v JSON formátu. VAROVÁNÍ: Uvnitř textových hodnot nesmíš používat neescapované uvozovky!`;

const DEFAULT_CONFIG: ScraperConfig = {
  is_enabled: false,
  keywords: ["architekt", "interiérový designér", "realitní developer", "stavební inženýr", "stavební firma"],
  cities: ["Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice", "Hradec Králové"],
  countries: ["Česká republika", "Německo", "Rakousko", "Austrálie", "Finsko"],
  active_keywords: [],
  active_cities: [],
  active_countries: [],
  prompt_template: DEFAULT_PROMPT
};

export const AdminScraping = () => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [config, setConfig] = useState<ScraperConfig>(DEFAULT_CONFIG);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");

  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT);

  const { data: serverConfig, isLoading: configLoading } = useQuery({
    queryKey: ["admin-scraper-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "scraper_config")
        .maybeSingle();
      
      if (error) throw error;
      if (data && data.value) {
        return data.value as unknown as ScraperConfig;
      }
      return DEFAULT_CONFIG;
    },
  });

  useEffect(() => {
    if (serverConfig) {
      setConfig({
        is_enabled: serverConfig.is_enabled ?? false,
        keywords: serverConfig.keywords || DEFAULT_CONFIG.keywords,
        cities: serverConfig.cities || DEFAULT_CONFIG.cities,
        countries: serverConfig.countries || DEFAULT_CONFIG.countries,
        active_keywords: serverConfig.active_keywords || [],
        active_cities: serverConfig.active_cities || [],
        active_countries: serverConfig.active_countries || [],
        prompt_template: serverConfig.prompt_template || DEFAULT_PROMPT
      });
      setSelectedKeywords(serverConfig.active_keywords || []);
      setSelectedCities(serverConfig.active_cities || []);
      setSelectedCountries(serverConfig.active_countries || []);
      setPromptTemplate(serverConfig.prompt_template || DEFAULT_PROMPT);
    }
  }, [serverConfig]);

  const { data: leadsCount = 0 } = useQuery({
    queryKey: ["admin-leads-count-total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("marketing_leads")
        .select("*", { count: "exact", head: true })
        .eq("source", "ai_web_sniper");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 15000
  });

  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["admin-recent-sniper-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_leads")
        .select("*")
        .eq("source", "ai_web_sniper")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15000
  });

  const { data: jobSchedule, isLoading: jobLoading } = useQuery({
    queryKey: ["admin-sniper-job"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_jobs")
        .select("schedule")
        .eq("job_name", "Continuous Web Discovery")
        .maybeSingle();
      if (error) throw error;
      return data?.schedule || "0 * * * *";
    }
  });

  const saveJobScheduleMutation = useMutation({
    mutationFn: async (newSchedule: string) => {
      const { error } = await supabase.rpc("update_automation_job_schedule", {
        p_job_name: "Continuous Web Discovery",
        p_schedule: newSchedule
      });
      if (error) throw error;
      return newSchedule;
    },
    onSuccess: (newSched) => {
      queryClient.setQueryData(["admin-sniper-job"], newSched);
      toast.success("Interval sběru byl aktualizován.");
    },
    onError: (err: any) => {
      toast.error("Chyba při změně intervalu: " + err.message);
    }
  });

  const savePromptTemplate = () => {
    const updated = { ...config, prompt_template: promptTemplate };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const saveConfigMutation = useMutation({
    mutationFn: async (newCfg: ScraperConfig) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "scraper_config", value: newCfg as any }, { onConflict: "key" });
      if (error) throw error;
      return newCfg;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["admin-scraper-config"], saved);
      toast.success("Nastavení scraperu bylo úspěšně uloženo.");
    },
    onError: (err: any) => {
      toast.error("Chyba při ukládání nastavení: " + (err.message || String(err)));
    }
  });

  const handleToggleEnabled = (checked: boolean) => {
    const updated = { ...config, is_enabled: checked };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    const updated = { ...config, keywords: [...config.keywords, newKeyword.trim()] };
    setConfig(updated);
    setNewKeyword("");
    saveConfigMutation.mutate(updated);
  };

  const handleRemoveKeyword = (kw: string) => {
    const updated = { ...config, keywords: config.keywords.filter(k => k !== kw) };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.trim()) return;
    const updated = { ...config, cities: [...config.cities, newCity.trim()] };
    setConfig(updated);
    setNewCity("");
    saveConfigMutation.mutate(updated);
  };

  const handleRemoveCity = (city: string) => {
    const updated = { ...config, cities: config.cities.filter(c => c !== city) };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCountry.trim()) return;
    const updated = { ...config, countries: [...config.countries, newCountry.trim()] };
    setConfig(updated);
    setNewCountry("");
    saveConfigMutation.mutate(updated);
  };

  const handleRemoveCountry = (ctry: string) => {
    const updated = { ...config, countries: config.countries.filter(c => c !== ctry) };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleToggleKeywordSelection = (kw: string) => {
    const next = selectedKeywords.includes(kw) ? selectedKeywords.filter(k => k !== kw) : [...selectedKeywords, kw];
    setSelectedKeywords(next);
    const updated = { ...config, active_keywords: next };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleToggleCitySelection = (city: string) => {
    const next = selectedCities.includes(city) ? selectedCities.filter(c => c !== city) : [...selectedCities, city];
    setSelectedCities(next);
    const updated = { ...config, active_cities: next };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleToggleCountrySelection = (ctry: string) => {
    const next = selectedCountries.includes(ctry) ? selectedCountries.filter(c => c !== ctry) : [...selectedCountries, ctry];
    setSelectedCountries(next);
    const updated = { ...config, active_countries: next };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleToggleAllCitiesForCountry = (country: string, isSelectAll: boolean) => {
    const countryCities = TOP_CITIES_BY_COUNTRY[country] || [];
    let next = [...selectedCities];
    
    if (isSelectAll) {
      // Add all missing cities from this country
      const toAdd = countryCities.filter(c => !next.includes(c));
      next = [...next, ...toAdd];
    } else {
      // Remove all cities from this country
      next = next.filter(c => !countryCities.includes(c));
    }
    
    setSelectedCities(next);
    const updated = { ...config, active_cities: next };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleRunManualSearch = async () => {
    setIsSearching(true);
    toast.loading("🌐 AI (Gemini) prohledává web ve 3 paralelních vláknech...", { id: "manual-sniper" });
    try {
      // Create 3 independent parallel requests for up to 3x speed
      const promises = Array(3).fill(0).map(() => 
        supabase.functions.invoke("autonomous-web-sniper", {
          body: { 
            forceSearch: true,
            targetKeywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
            targetCities: selectedCities.length > 0 ? selectedCities : undefined,
            targetCountries: selectedCountries.length > 0 ? selectedCountries : undefined
          }
        })
      );

      const results = await Promise.all(promises);
      
      let totalSaved = 0;
      let totalFound = 0;
      let errorMsgs: string[] = [];

      results.forEach(res => {
        if (res.error) {
          errorMsgs.push(res.error.message || "Neznámá chyba z funkce");
        } else if (res.data) {
          if (res.data.error) errorMsgs.push(res.data.error);
          if (res.data.discovered_count) totalSaved += res.data.discovered_count;
          if (res.data.total_found_by_ai) totalFound += res.data.total_found_by_ai;
          if (res.data.debug_output) console.error("AI Output:", res.data.debug_output);
        }
      });
      
      if (totalSaved > 0) {
        toast.success(`🎯 Úspěch: AI objevila a uložila ${totalSaved} nových B2B kontaktů (ve 3 dávkách)!`, { id: "manual-sniper", duration: 8000 });
        queryClient.invalidateQueries({ queryKey: ["admin-leads-count-total"] });
      } else {
        if (totalFound > 0) {
           toast.info(`AI našla ${totalFound} kontaktů, ale všechny už v CRM máte (nebo chyběl e-mail). Zkuste jiná klíčová slova/města!`, { id: "manual-sniper", duration: 8000 });
        } else if (errorMsgs.length > 0) {
           toast.error(`Nenalezeno nic. Chyby: ${errorMsgs[0]}...`, { id: "manual-sniper", duration: 10000 });
        } else {
           toast.info("AI tentokrát nenalezla žádné nové kontakty (nebo už je všechny v databázi máte).", { id: "manual-sniper" });
        }
      }
    } catch (err: any) {
      toast.error(`❌ Vyhledávání selhalo: ${err.message || err}`, { id: "manual-sniper" });
    } finally {
      setIsSearching(false);
    }
  };

  if (configLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans w-full mt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Kontinuální Sběr B2B Kontaktů (AI Sniper)
          </h2>
          <p className="text-sm text-muted-foreground">
            Automaticky obohacuje vaše CRM o nové firmy na základě klíčových slov a lokalit.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-muted/30 px-5 py-3 rounded-2xl border border-border/50 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Celkem nalezeno AI</span>
            <span className="text-xl font-bold text-foreground">{leadsCount} kontaktů</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Levý sloupec - Nastavení */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Cílové skupiny (Klíčová slova)
              </CardTitle>
              <CardDescription>Koho má AI na internetu hledat? (např. profese, typy firem)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {config.keywords.length === 0 && <span className="text-sm text-muted-foreground italic">Zatím žádná klíčová slova</span>}
                {config.keywords.map(kw => (
                  <Badge 
                    key={kw} 
                    variant={selectedKeywords.includes(kw) ? "default" : "secondary"} 
                    className={`px-3 py-1.5 text-xs gap-2 rounded-xl cursor-pointer transition-colors ${selectedKeywords.includes(kw) ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}
                    onClick={() => handleToggleKeywordSelection(kw)}
                  >
                    {kw}
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveKeyword(kw); }} className={`transition-colors ${selectedKeywords.includes(kw) ? "text-current opacity-70 hover:opacity-100" : "text-current hover:text-red-500"}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <form onSubmit={handleAddKeyword} className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
                <Input 
                  placeholder="Přidat další slovo (např. interiérové studio)" 
                  value={newKeyword} 
                  onChange={e => setNewKeyword(e.target.value)}
                  className="h-9 rounded-xl text-sm"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-9 rounded-xl font-semibold gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Přidat
                </Button>
              </form>
            </CardContent>
          </Card>

{/* Country selector */}
<Card className="border-border/40 shadow-sm">
  <CardHeader className="pb-4">
    <CardTitle className="text-base flex items-center gap-2">
      <Globe className="h-4 w-4 text-primary" /> Cílové země
    </CardTitle>
    <CardDescription>V jakých zemích má AI kontakty hledat?</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {config.countries.length === 0 && <span className="text-sm text-muted-foreground italic">Zatím žádné země</span>}
      {config.countries.map(ctry => (
        <Badge 
          key={ctry} 
          variant={selectedCountries.includes(ctry) ? "default" : "outline"} 
          className={`px-3 py-1.5 text-xs gap-2 rounded-xl cursor-pointer transition-colors ${selectedCountries.includes(ctry) ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm" : "border-border hover:bg-muted text-muted-foreground"}`}
          onClick={() => handleToggleCountrySelection(ctry)}
        >
          {ctry}
          <button onClick={(e) => { e.stopPropagation(); handleRemoveCountry(ctry); }} className={`transition-colors ${selectedCountries.includes(ctry) ? "text-current opacity-70 hover:opacity-100" : "text-muted-foreground hover:text-red-500"}`}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
    <form onSubmit={handleAddCountry} className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
      <Input
        placeholder="Přidat další zemi (např. Německo)"
        value={newCountry}
        onChange={e => setNewCountry(e.target.value)}
        className="h-9 rounded-xl text-sm"
      />
      <Button type="submit" size="sm" variant="secondary" className="h-9 rounded-xl font-semibold gap-1 shrink-0">
        <Plus className="h-4 w-4" /> Přidat
      </Button>
    </form>
  </CardContent>
</Card>

{/* Cities selector grouped by country */}
<Card className="border-border/40 shadow-sm">
  <CardHeader className="pb-4">
    <CardTitle className="text-base flex items-center gap-2">
      <MapPin className="h-4 w-4 text-primary" /> Preferovaná města
    </CardTitle>
    <CardDescription>
      Vyberte konkrétní města pro vybrané země. Pokud nevyberete žádné, AI si najde náhodné velké město sama.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {selectedCountries.length === 0 ? (
      <span className="text-sm text-muted-foreground italic">Nejprve vyberte alespoň jednu cílovou zemi výše.</span>
    ) : (
      selectedCountries.map(country => {
        const predefinedCities = TOP_CITIES_BY_COUNTRY[country] || [];
        if (predefinedCities.length === 0) return null;

        const allSelected = predefinedCities.every(c => selectedCities.includes(c));
        
        return (
          <div key={country} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{country}</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => handleToggleAllCitiesForCountry(country, !allSelected)}
              >
                {allSelected ? (
                  <><Square className="h-3 w-3 mr-1" /> Zrušit vše</>
                ) : (
                  <><CheckSquare className="h-3 w-3 mr-1" /> Vybrat vše</>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {predefinedCities.map(city => (
                <Badge 
                  key={city} 
                  variant={selectedCities.includes(city) ? "default" : "outline"} 
                  className={`px-3 py-1.5 text-xs gap-2 rounded-xl cursor-pointer transition-colors ${selectedCities.includes(city) ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm" : "border-border hover:bg-muted text-muted-foreground"}`}
                  onClick={() => handleToggleCitySelection(city)}
                >
                  {city}
                </Badge>
              ))}
            </div>
          </div>
        );
      })
    )}
    
    {/* Ostatní ručně přidaná města, která nejsou v predefined seznamech */}
    {(() => {
      const allPredefined = Object.values(TOP_CITIES_BY_COUNTRY).flat();
      const customCities = config.cities.filter(c => !allPredefined.includes(c));
      if (customCities.length === 0) return null;
      
      return (
        <div className="space-y-3 pt-4 border-t border-border/40">
          <h4 className="text-sm font-semibold text-foreground">Vlastní přidaná města</h4>
          <div className="flex flex-wrap gap-2">
            {customCities.map(city => (
              <Badge 
                key={city} 
                variant={selectedCities.includes(city) ? "default" : "outline"} 
                className={`px-3 py-1.5 text-xs gap-2 rounded-xl cursor-pointer transition-colors ${selectedCities.includes(city) ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm" : "border-border hover:bg-muted text-muted-foreground"}`}
                onClick={() => handleToggleCitySelection(city)}
              >
                {city}
                <button onClick={(e) => { e.stopPropagation(); handleRemoveCity(city); }} className={`transition-colors ${selectedCities.includes(city) ? "text-current opacity-70 hover:opacity-100" : "text-muted-foreground hover:text-red-500"}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      );
    })()}

    <form onSubmit={handleAddCity} className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
      <Input 
        placeholder="Přidat další město ručně..." 
        value={newCity} 
        onChange={e => setNewCity(e.target.value)}
        className="h-9 rounded-xl text-sm"
      />
      <Button type="submit" size="sm" variant="secondary" className="h-9 rounded-xl font-semibold gap-1 shrink-0">
        <Plus className="h-4 w-4" /> Přidat
      </Button>
    </form>
  </CardContent>
</Card>
        </div>

        {/* Pravý sloupec - Spouštění */}
        <div className="space-y-6">
          <Card className={`border-border/40 shadow-sm overflow-hidden transition-colors ${config.is_enabled ? 'border-zinc-500/30 shadow-[0_0_20px_-10px_rgba(24,24,27,0.15)]' : ''}`}>
            <CardHeader className={`pb-4 ${config.is_enabled ? 'bg-zinc-100/50 dark:bg-zinc-800/20' : 'bg-muted/10'}`}>
              <CardTitle className="text-base flex items-center gap-2">
                Automatický běh
                {config.is_enabled && <span className="relative flex h-2 w-2 ml-auto"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-600 dark:bg-zinc-300"></span></span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-bold text-sm">Autonomní režim</Label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed w-4/5">
                    Je-li zapnuto, systém (pokud je nakonfigurován Supabase Cron) automaticky prohledává web na pozadí několikrát denně.
                  </p>
                </div>
                <Switch 
                  checked={config.is_enabled} 
                  onCheckedChange={handleToggleEnabled}
                  className="data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-100"
                />
              </div>

              <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                <Label className="font-bold text-sm">Frekvence prohledávání</Label>
                <Select 
                  value={jobSchedule || "0 * * * *"} 
                  onValueChange={(val) => saveJobScheduleMutation.mutate(val)}
                  disabled={jobLoading || saveJobScheduleMutation.isPending}
                >
                  <SelectTrigger className="w-full bg-background border-border/60">
                    <SelectValue placeholder="Vyberte interval..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="*/15 * * * *">Každých 15 minut</SelectItem>
                    <SelectItem value="*/30 * * * *">Každých 30 minut</SelectItem>
                    <SelectItem value="0 * * * *">Každou hodinu</SelectItem>
                    <SelectItem value="0 */2 * * *">Každé 2 hodiny</SelectItem>
                    <SelectItem value="0 */6 * * *">4x denně</SelectItem>
                    <SelectItem value="0 0 * * *">1x denně (o půlnoci)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Tímto nastavíte, jak často se má na pozadí spustit AI sběr.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-foreground">Manuální hledání</h3>
                <p className="text-[11px] text-muted-foreground">
                  AI prohledá web. Pokud kliknutím vyberete konkrétní zemi, město nebo klíčové slovo ze seznamů vlevo, vyhledá se PŘESNĚ tato kombinace. Jinak si vybere sama náhodně.
                </p>
              </div>
              <Button 
                className="w-full h-11 rounded-xl font-bold shadow-md mt-4" 
                onClick={handleRunManualSearch}
                disabled={isSearching || config.keywords.length === 0 || config.cities.length === 0}
              >
                {isSearching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Hledám nové kontakty...</>
                ) : (
                  <>Prohledat web nyní</>
                )}
              </Button>
              {(config.keywords.length === 0 || config.cities.length === 0) && (
                <p className="text-[10px] text-red-500 mt-2">Nejprve přidejte alespoň 1 klíčové slovo a město.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Prompt pro AI
              </CardTitle>
              <CardDescription>Základní instrukce, které dostane AI při hledání a extrakci kontaktů.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                value={promptTemplate}
                onChange={e => setPromptTemplate(e.target.value)}
                className="min-h-[250px] text-[11px] font-mono"
              />
              <Button 
                onClick={savePromptTemplate}
                size="sm" 
                variant="secondary" 
                className="w-full"
                disabled={promptTemplate === config.prompt_template}
              >
                Uložit Prompt
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          Nedávno nalezené kontakty AI Sniperem
        </h3>
        
        {leadsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentLeads.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">
            Zatím nebyly nalezeny žádné kontakty. Zapněte Autonomní režim nebo spusťte hledání manuálně.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentLeads.map((lead: any) => (
              <Card key={lead.id} className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="font-bold text-sm truncate" title={lead.company_name}>{lead.company_name}</h4>
                    <p className="text-xs text-primary truncate" title={lead.email}>{lead.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[9px] bg-slate-100">{lead.country}</Badge>
                    <Badge variant="outline" className="text-[9px]">{lead.category}</Badge>
                  </div>
                  {lead.ai_icebreaker && (
                    <div className="bg-muted/30 p-2 rounded-lg text-[10px] text-muted-foreground border border-border/50">
                      <p className="line-clamp-3 italic">"{lead.ai_icebreaker}"</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1">
                    <span>{lead.city}</span>
                    <span>{new Date(lead.created_at).toLocaleDateString('cs-CZ')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
