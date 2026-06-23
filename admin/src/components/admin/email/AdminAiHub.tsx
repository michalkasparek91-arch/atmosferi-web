import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Target, MapPin, Search, Plus, X, CheckSquare, Square, Globe, MessageSquare, LayoutDashboard, Settings2, Sparkles, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TOP_CITIES_BY_COUNTRY } from "@/lib/city-regions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AiJobsMonitor } from "./AiJobsMonitor";
import { AiProvidersConfig } from "./AiProvidersConfig";
import { ApiUsageStats } from "./ApiUsageStats";

interface ScraperConfig {
  is_enabled: boolean;
  keywords: string[];
  cities: string[];
  countries: string[];
  active_keywords?: string[];
  active_cities?: string[];
  active_countries?: string[];
  prompt_template?: string;
  gemini_rpm_limit?: number;
  groq_rpm_limit?: number;
  openrouter_rpm_limit?: number;
  ai_batch_size?: number;
  use_gemini_engine?: boolean;
  use_groq_places_engine?: boolean;
  use_openrouter_engine?: boolean;
  use_deepseek_engine?: boolean;
  use_siliconflow_engine?: boolean;
  enrich_engine?: "gemini" | "groq" | "openrouter" | "deepseek" | "siliconflow" | "both" | "all";
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
  prompt_template: DEFAULT_PROMPT,
  gemini_rpm_limit: 15,
  groq_rpm_limit: 30,
  openrouter_rpm_limit: 20,
  ai_batch_size: 50,
  use_openrouter_engine: false,
  use_gemini_engine: true,
  use_groq_places_engine: false,
  use_deepseek_engine: false,
  use_siliconflow_engine: false,
  enrich_engine: "gemini"
};

export const AdminAiHub = () => {
  const queryClient = useQueryClient();
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
        ...DEFAULT_CONFIG,
        ...serverConfig,
        is_enabled: serverConfig.is_enabled ?? false,
        use_gemini_engine: serverConfig.use_gemini_engine !== false,
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
      toast.success("Nastavení bylo úspěšně uloženo.");
    },
    onError: (err: any) => {
      toast.error("Chyba při ukládání nastavení: " + (err.message || String(err)));
    }
  });

  const savePromptTemplate = () => {
    const updated = { ...config, prompt_template: promptTemplate };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleToggleEnabled = (checked: boolean) => {
    const updated = { ...config, is_enabled: checked };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleToggleEngine = (engine: string, checked: boolean) => {
    const updated = { ...config };
    if (engine === "gemini") updated.use_gemini_engine = checked;
    if (engine === "groq") updated.use_groq_places_engine = checked;
    if (engine === "openrouter") updated.use_openrouter_engine = checked;
    if (engine === "deepseek") updated.use_deepseek_engine = checked;
    if (engine === "siliconflow") updated.use_siliconflow_engine = checked;
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleEnrichEngineChange = (val: string) => {
    const updated = { ...config, enrich_engine: val as any };
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
      const toAdd = countryCities.filter(c => !next.includes(c));
      next = [...next, ...toAdd];
    } else {
      next = next.filter(c => !countryCities.includes(c));
    }
    
    setSelectedCities(next);
    const updated = { ...config, active_cities: next };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const handleRunManualSearch = async () => {
    setIsSearching(true);
    toast.loading("🌐 AI prohledává web...", { id: "manual-sniper" });
    try {
      const promises = [];
      const rpm = config.gemini_rpm_limit || 15;
      const delayMs = 60000 / rpm;
      
      const activeEngines = [];
      if (config.use_gemini_engine !== false) activeEngines.push("gemini");
      if (config.use_groq_places_engine === true) activeEngines.push("groq_places");
      if (config.use_openrouter_engine === true) activeEngines.push("openrouter");
      if (config.use_deepseek_engine === true) activeEngines.push("deepseek");
      if (config.use_siliconflow_engine === true) activeEngines.push("siliconflow");

      if (activeEngines.length === 0) {
        toast.error("Není zapnutý žádný vyhledávací engine (Gemini, Groq...).");
        setIsSearching(false);
        return;
      }

      for (let i = 0; i < 3; i++) {
        const engineToUse = activeEngines[i % activeEngines.length];
        promises.push(
          supabase.functions.invoke("autonomous-web-sniper", {
            body: { 
              forceSearch: true,
              engine: engineToUse,
              targetKeywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
              targetCities: selectedCities.length > 0 ? selectedCities : undefined,
              targetCountries: selectedCountries.length > 0 ? selectedCountries : undefined
            }
          })
        );
        if (i < 2) await new Promise(r => setTimeout(r, delayMs));
      }

      const results = await Promise.all(promises);
      
      let totalSaved = 0;
      let totalFound = 0;
      let errorMsgs: string[] = [];

      results.forEach(res => {
        if (res.error) {
          errorMsgs.push(res.error.message || "Neznámá chyba");
        } else if (res.data) {
          if (res.data.error) errorMsgs.push(res.data.error);
          if (res.data.discovered_count) totalSaved += res.data.discovered_count;
          if (res.data.total_found_by_ai) totalFound += res.data.total_found_by_ai;
        }
      });
      
      if (totalSaved > 0) {
        toast.success(`🎯 Úspěch: AI objevila a uložila ${totalSaved} nových B2B kontaktů!`, { id: "manual-sniper", duration: 8000 });
        queryClient.invalidateQueries({ queryKey: ["admin-leads-count-total"] });
      } else {
        if (totalFound > 0) {
           toast.info(`AI našla ${totalFound} kontaktů, ale všechny už v CRM máte.`, { id: "manual-sniper", duration: 8000 });
        } else if (errorMsgs.length > 0) {
           toast.error(`Chyby: ${errorMsgs[0]}...`, { id: "manual-sniper", duration: 10000 });
        } else {
           toast.info("AI nenalezla žádné nové kontakty.", { id: "manual-sniper" });
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
            <Sparkles className="h-6 w-6 text-primary" />
            AI Centrum
          </h2>
          <p className="text-sm text-muted-foreground">
            Jednotné centrum pro veškerá nastavení, API klíče a konfiguraci umělé inteligence.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-muted/30 px-5 py-3 rounded-2xl border border-border/50 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nasbíráno celkem</span>
            <span className="text-xl font-bold text-foreground">{leadsCount} kontaktů</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><LayoutDashboard className="w-4 h-4 mr-2"/> Přehled</TabsTrigger>
          <TabsTrigger value="models" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Settings2 className="w-4 h-4 mr-2"/> Modely & Klíče</TabsTrigger>
          <TabsTrigger value="targeting" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Target className="w-4 h-4 mr-2"/> Cílení Sběru</TabsTrigger>
          <TabsTrigger value="results" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><ListChecks className="w-4 h-4 mr-2"/> Poslední Úlovky</TabsTrigger>
        </TabsList>

        {/* 1. PŘEHLED */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="w-full">
              <AiJobsMonitor />
            </div>
            <div className="w-full">
              <ApiUsageStats />
            </div>
          </div>
        </TabsContent>

        {/* 2. MODELY & KLÍČE */}
        <TabsContent value="models" className="pt-4">
          <div className="w-full">
            <AiProvidersConfig config={config} setConfig={setConfig} saveConfigMutation={saveConfigMutation} />
          </div>
        </TabsContent>

        {/* 3. CÍLENÍ SBĚRU */}
        <TabsContent value="targeting" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Cílové skupiny (Klíčová slova)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {config.keywords.length === 0 && <span className="text-sm text-muted-foreground">Zatím žádná slova</span>}
                    {config.keywords.map(kw => (
                      <Badge 
                        key={kw} 
                        variant={selectedKeywords.includes(kw) ? "default" : "secondary"} 
                        className={`px-3 py-1.5 cursor-pointer ${selectedKeywords.includes(kw) ? "bg-zinc-900 text-white" : ""}`}
                        onClick={() => handleToggleKeywordSelection(kw)}
                      >
                        {kw}
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveKeyword(kw); }} className="ml-2 hover:text-red-500"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <form onSubmit={handleAddKeyword} className="flex gap-2">
                    <Input placeholder="Přidat slovo..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)} />
                    <Button type="submit" variant="secondary"><Plus className="h-4 w-4" /> Přidat</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Cílové země
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {config.countries.map(ctry => (
                      <Badge 
                        key={ctry} 
                        variant={selectedCountries.includes(ctry) ? "default" : "outline"} 
                        className="px-3 py-1.5 cursor-pointer"
                        onClick={() => handleToggleCountrySelection(ctry)}
                      >
                        {ctry}
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveCountry(ctry); }} className="ml-2 hover:text-red-500"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <form onSubmit={handleAddCountry} className="flex gap-2">
                    <Input placeholder="Přidat zemi..." value={newCountry} onChange={e => setNewCountry(e.target.value)} />
                    <Button type="submit" variant="secondary"><Plus className="h-4 w-4" /> Přidat</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Preferovaná města
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedCountries.map(country => {
                    const cities = TOP_CITIES_BY_COUNTRY[country] || [];
                    if (cities.length === 0) return null;
                    const allSelected = cities.every(c => selectedCities.includes(c));
                    return (
                      <div key={country} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold">{country}</h4>
                          <Button variant="ghost" size="sm" className="h-6" onClick={() => handleToggleAllCitiesForCountry(country, !allSelected)}>
                            {allSelected ? "Zrušit vše" : "Vybrat vše"}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {cities.map(city => (
                            <Badge 
                              key={city} 
                              variant={selectedCities.includes(city) ? "default" : "outline"} 
                              className="cursor-pointer"
                              onClick={() => handleToggleCitySelection(city)}
                            >
                              {city}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Custom cities */}
                  {(() => {
                    const allPredefined = Object.values(TOP_CITIES_BY_COUNTRY).flat();
                    const customCities = config.cities.filter(c => !allPredefined.includes(c));
                    if (customCities.length === 0) return null;
                    return (
                      <div className="space-y-3 pt-4 border-t">
                        <h4 className="text-sm font-bold">Vlastní přidaná města</h4>
                        <div className="flex flex-wrap gap-2">
                          {customCities.map(city => (
                            <Badge key={city} variant={selectedCities.includes(city) ? "default" : "outline"} className="cursor-pointer" onClick={() => handleToggleCitySelection(city)}>
                              {city}
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveCity(city); }} className="ml-2 hover:text-red-500"><X className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <form onSubmit={handleAddCity} className="flex gap-2 border-t pt-4">
                    <Input placeholder="Přidat další město ručně..." value={newCity} onChange={e => setNewCity(e.target.value)} />
                    <Button type="submit" variant="secondary"><Plus className="h-4 w-4" /> Přidat</Button>
                  </form>
                </CardContent>
              </Card>

            </div>

            {/* Prava strana pro rizeni */}
            <div className="space-y-6">
              <Card className={`border-border/40 shadow-sm transition-colors ${config.is_enabled ? 'border-primary/30 bg-primary/5' : ''}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    Automatický běh
                    {config.is_enabled && <span className="relative flex h-2 w-2 ml-auto"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Autonomní režim</Label>
                    <Switch checked={config.is_enabled} onCheckedChange={handleToggleEnabled} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Frekvence prohledávání (Cron)</Label>
                    <Select value={jobSchedule || "0 * * * *"} onValueChange={(val) => saveJobScheduleMutation.mutate(val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*/15 * * * *">Každých 15 minut</SelectItem>
                        <SelectItem value="*/30 * * * *">Každých 30 minut</SelectItem>
                        <SelectItem value="0 * * * *">Každou hodinu</SelectItem>
                        <SelectItem value="0 */2 * * *">Každé 2 hodiny</SelectItem>
                        <SelectItem value="0 0 * * *">1x denně</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm bg-primary/10 border-primary/30">
                <CardContent className="p-6 text-center space-y-4">
                  <Zap className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-bold">Manuální hledání</h3>
                  <p className="text-xs text-muted-foreground">AI prohledá web pomocí zapnutých enginů. Zacílí na vybraná slova a lokality.</p>
                  <Button className="w-full font-bold" onClick={handleRunManualSearch} disabled={isSearching || config.keywords.length === 0 || config.cities.length === 0}>
                    {isSearching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Hledám...</> : "Spustit sběr nyní"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> Prompt pro AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea value={promptTemplate} onChange={e => setPromptTemplate(e.target.value)} className="min-h-[250px] text-[11px] font-mono" />
                  <Button onClick={savePromptTemplate} size="sm" variant="secondary" className="w-full" disabled={promptTemplate === config.prompt_template}>
                    Uložit Prompt
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 4. VÝSLEDKY */}
        <TabsContent value="results" className="pt-4">
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle>Nejnovější objevené firmy ({recentLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : recentLeads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Zatím nebyly nalezeny žádné firmy.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2">Firma</th>
                        <th className="pb-2">E-mail</th>
                        <th className="pb-2">Město</th>
                        <th className="pb-2">Premium Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.map((lead: any) => (
                        <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 font-medium">{lead.company_name}</td>
                          <td className="py-3 text-muted-foreground">{lead.email}</td>
                          <td className="py-3">{lead.city}</td>
                          <td className="py-3">
                            <Badge variant={lead.premium_score > 70 ? "default" : "secondary"}>{lead.premium_score}/100</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};
