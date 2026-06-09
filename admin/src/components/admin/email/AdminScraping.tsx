import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Target, MapPin, Search, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScraperConfig {
  is_enabled: boolean;
  keywords: string[];
  cities: string[];
  countries: string[];
}

const DEFAULT_CONFIG: ScraperConfig = {
  is_enabled: false,
  keywords: ["architekt", "interiérový designér", "realitní developer", "stavební inženýr", "stavební firma"],
  cities: ["Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice", "Hradec Králové"],
  countries: ["Česká republika", "Německo", "Rakousko", "Austrálie", "Finsko"]
};

export const AdminScraping = () => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [config, setConfig] = useState<ScraperConfig>(DEFAULT_CONFIG);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");

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
        countries: serverConfig.countries || DEFAULT_CONFIG.countries
      });
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

  const handleRunManualSearch = async () => {
    setIsSearching(true);
    toast.loading("🌐 AI (Gemini) prohledává web podle aktuálního nastavení...", { id: "manual-sniper" });
    try {
      const res = await supabase.functions.invoke("autonomous-web-sniper", {
        body: { forceSearch: true }
      });
      if (res.error) throw new Error(res.error.message || "Neznámá chyba");
      
      const data = res.data;
      if (!data || data.error) throw new Error(data?.error || "Neznámá chyba AI serveru");
      
      if (data.discovered_count > 0) {
        toast.success(`🎯 Úspěch: AI objevila a uložila ${data.discovered_count} nových B2B kontaktů!`, { id: "manual-sniper" });
        queryClient.invalidateQueries({ queryKey: ["admin-leads-count-total"] });
      } else {
        if (data.total_found_by_ai > 0) {
           toast.info(`AI našla ${data.total_found_by_ai} kontaktů, ale všechny už v CRM máte (nebo chyběl e-mail). Zkuste jiná klíčová slova!`, { id: "manual-sniper", duration: 8000 });
        } else if (data.debug_output) {
           console.error("AI Output:", data.debug_output);
           toast.error(`Nenalezeno nic. AI vrátila:\n${data.debug_output.substring(0, 150)}...`, { id: "manual-sniper", duration: 10000 });
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
    <div className="space-y-6 animate-in fade-in duration-500 font-sans max-w-5xl mx-auto mt-2">
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
                  <Badge key={kw} variant="secondary" className="px-3 py-1.5 text-xs gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                    {kw}
                    <button onClick={() => handleRemoveKeyword(kw)} className="text-primary hover:text-red-500 transition-colors">
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

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Preferovaná města
              </CardTitle>
              <CardDescription>Můžete zadat preferovaná města. AI se pokusí vybrat jedno z nich, pokud odpovídá náhodně zvolenému cílovému státu. Pokud ne, najde si samo jiné velké město v daném státě.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {config.cities.length === 0 && <span className="text-sm text-muted-foreground italic">Zatím žádná města</span>}
                {config.cities.map(city => (
                  <Badge key={city} variant="outline" className="px-3 py-1.5 text-xs gap-2 rounded-xl border-border hover:bg-muted transition-colors">
                    {city}
                    <button onClick={() => handleRemoveCity(city)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <form onSubmit={handleAddCity} className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
                <Input 
                  placeholder="Přidat další město (např. Zlín)" 
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
{/* Country selector */}
<Card className="border-border/40 shadow-sm">
  <CardHeader className="pb-4">
    <CardTitle className="text-base flex items-center gap-2">
      <MapPin className="h-4 w-4 text-primary" /> Cílové země
    </CardTitle>
    <CardDescription>V jakých zemích má AI kontakty hledat?</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {config.countries.length === 0 && <span className="text-sm text-muted-foreground italic">Zatím žádné země</span>}
      {config.countries.map(ctry => (
        <Badge key={ctry} variant="outline" className="px-3 py-1.5 text-xs gap-2 rounded-xl border-border hover:bg-muted transition-colors">
          {ctry}
          <button onClick={() => handleRemoveCountry(ctry)} className="text-muted-foreground hover:text-red-500 transition-colors">
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
        </div>

        {/* Pravý sloupec - Spouštění */}
        <div className="space-y-6">
          <Card className={`border-border/40 shadow-sm overflow-hidden transition-colors ${config.is_enabled ? 'border-emerald-500/30 shadow-[0_0_20px_-10px_rgba(16,185,129,0.3)]' : ''}`}>
            <CardHeader className={`pb-4 ${config.is_enabled ? 'bg-emerald-500/5' : 'bg-muted/10'}`}>
              <CardTitle className="text-base flex items-center gap-2">
                Automatický běh
                {config.is_enabled && <span className="relative flex h-2 w-2 ml-auto"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
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
                  className="data-[state=checked]:bg-emerald-500"
                />
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
                  AI si právě teď vybere 1 náhodné klíčové slovo a 1 město z vašeho seznamu a pokusí se najít 5-10 zcela nových firem.
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
        </div>

      </div>
    </div>
  );
};
