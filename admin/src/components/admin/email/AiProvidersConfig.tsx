import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, KeyRound, Globe, BrainCircuit, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AiProvidersConfig = ({ config, setConfig, saveConfigMutation }: any) => {
  const queryClient = useQueryClient();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { status: 'ok' | 'error' | 'testing', msg?: string }>>({});

  const { isLoading: keysLoading } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "api_keys")
        .maybeSingle();
      if (error) return null;
      if (data?.value) setKeys(data.value as any);
      return data;
    }
  });

  const saveKeysMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("app_settings").upsert({ key: "api_keys", value: keys as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Klíče uloženy"),
    onError: (err: any) => toast.error("Chyba při ukládání klíčů: " + err.message)
  });

  const handleKeyChange = (providerKey: string, val: string) => {
    setKeys(prev => ({ ...prev, [providerKey]: val }));
  };

  const handleToggleSearch = (engine: string, checked: boolean) => {
    const updated = { ...config, [`use_${engine}_engine`]: checked };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const toggleEnrichEngine = (engine: string, checked: boolean) => {
    const updated = { ...config, [`use_${engine}_enrich_engine`]: checked };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const testApiKeys = async () => {
    toast.info("Testování API klíčů...");
    setTestResults({});
    const { data, error } = await supabase.functions.invoke('test-api-keys', {
      method: "POST"
    });
    
    if (error) {
       toast.error("Nepodařilo se spojit s testovací funkcí");
       return;
    }
    setTestResults(data || {});
    toast.success("Testování dokončeno");
  };

  const providers = [
    {
      id: "gemini",
      name: "Gemini (Google)",
      keyName: "GEMINI_API_KEY",
      fallbackKeyName: "GEMINI_FALLBACK_API_KEY",
      searchConfigKey: "gemini",
      desc: "Grounding (přístup k internetu).",
      hasSlider: true,
      sliderKey: "gemini_rpm_limit",
      sliderDefault: 15
    },
    {
      id: "groq",
      name: "Groq (Llama 3)",
      keyName: "GROQ_API_KEY",
      fallbackKeyName: "GROQ_FALLBACK_API_KEY",
      searchConfigKey: "groq_places",
      desc: "Bleskový Llama 3 model (Places API).",
      hasSlider: true,
      sliderKey: "groq_rpm_limit",
      sliderDefault: 30
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      keyName: "OPENROUTER_API_KEY",
      fallbackKeyName: "OPENROUTER_FALLBACK_API_KEY",
      searchConfigKey: "openrouter",
      desc: "Záložní agregátor desítek modelů.",
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      keyName: "DEEPSEEK_API_KEY",
      fallbackKeyName: "DEEPSEEK_FALLBACK_API_KEY",
      searchConfigKey: "deepseek",
      desc: "Levný a inteligentní model (deepseek.com).",
    },
    {
      id: "siliconflow",
      name: "SiliconFlow",
      keyName: "SILICONFLOW_API_KEY",
      fallbackKeyName: "SILICONFLOW_FALLBACK_API_KEY",
      searchConfigKey: "siliconflow",
      desc: "Asijský agregátor (Qwen, DeepSeek).",
    }
  ];

  if (keysLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>;

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={testApiKeys} className="gap-2">
           <Activity className="h-4 w-4 text-blue-500" />
           Otestovat připojení všech API
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {providers.map(p => {
          const isSearchChecked = config[`use_${p.searchConfigKey}_engine`] ?? false;
          // By default, map legacy "enrich_engine" string if present, otherwise use boolean flag
          const isLegacyEnrich = config.enrich_engine === p.id || config.enrich_engine === "all" || (config.enrich_engine === "both" && (p.id === "gemini" || p.id === "groq"));
          const enrichChecked = config[`use_${p.id}_enrich_engine`] !== undefined ? config[`use_${p.id}_enrich_engine`] : isLegacyEnrich;
          
          const primaryStatus = testResults[p.id]?.status;
          const fallbackStatus = testResults[`${p.id}_fallback`]?.status;

          return (
            <Card key={p.id} className="border-border/50 shadow-sm overflow-hidden flex flex-col transition-all hover:border-primary/20">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/10">
                <div>
                  <h3 className="font-medium text-sm flex items-center gap-2">{p.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              </div>
              
              <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                {/* API KEYS */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input 
                      type="password" 
                      placeholder="Primární klíč..." 
                      value={keys[p.keyName] || ""} 
                      onChange={e => handleKeyChange(p.keyName, e.target.value)}
                      className="font-mono text-xs h-8 flex-1"
                    />
                    {primaryStatus && (
                      <div 
                        className={`w-3 h-3 rounded-full flex-shrink-0 cursor-help ${primaryStatus === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} 
                        title={testResults[p.id]?.msg || (primaryStatus === 'ok' ? 'Online' : 'Error')}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground/30" />
                    <Input 
                      type="password" 
                      placeholder="Záložní klíč (při selhání)..." 
                      value={keys[p.fallbackKeyName] || ""} 
                      onChange={e => handleKeyChange(p.fallbackKeyName, e.target.value)}
                      className="font-mono text-xs h-8 flex-1"
                    />
                    {fallbackStatus && (
                      <div 
                        className={`w-3 h-3 rounded-full flex-shrink-0 cursor-help ${fallbackStatus === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} 
                        title={testResults[`${p.id}_fallback`]?.msg || (fallbackStatus === 'ok' ? 'Online' : 'Error')}
                      />
                    )}
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => saveKeysMutation.mutate()} disabled={saveKeysMutation.isPending} className="h-7 px-3 text-xs">
                      {saveKeysMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Uložit
                    </Button>
                  </div>
                </div>

                {/* TOGGLES */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-background border border-border/30 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-blue-500/70" />
                      <Label className="text-xs font-medium cursor-pointer">Autonomní Sběr</Label>
                    </div>
                    <Switch checked={isSearchChecked} onCheckedChange={(c) => handleToggleSearch(p.searchConfigKey, c)} />
                  </div>

                  <div className="flex items-center justify-between bg-background border border-border/30 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-3.5 w-3.5 text-purple-500/70" />
                      <Label className="text-xs font-medium cursor-pointer">Enrichment</Label>
                    </div>
                    <Switch checked={enrichChecked} onCheckedChange={(c) => toggleEnrichEngine(p.id, c)} />
                  </div>
                </div>

                {/* RPM SLIDER */}
                {p.hasSlider && (
                  <div className="pt-3 border-t border-border/30 space-y-2 mt-auto">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground">Max RPM</Label>
                      <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded text-foreground">{config[p.sliderKey!] || p.sliderDefault}</span>
                    </div>
                    <Slider 
                      value={[config[p.sliderKey!] || p.sliderDefault]} 
                      min={1} max={60} step={1} 
                      onValueChange={(vals) => setConfig({ ...config, [p.sliderKey!]: vals[0] })} 
                      onValueCommit={(vals) => saveConfigMutation.mutate({ ...config, [p.sliderKey!]: vals[0] })} 
                      className="py-1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50 shadow-sm bg-muted/10">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
           <div className="space-y-1 flex-1">
             <Label className="text-sm font-medium">Velikost AI dávky (Batch Size)</Label>
             <p className="text-[11px] text-muted-foreground">Počet leadů zpracovaných v 1 požadavku (vysoké číslo šetří tokeny, ale může chybovat).</p>
           </div>
           <div className="flex items-center gap-4 w-full sm:w-64">
             <Slider 
               value={[config.ai_batch_size || 50]} min={10} max={100} step={5} 
               onValueChange={(vals) => setConfig({ ...config, ai_batch_size: vals[0] })} 
               onValueCommit={(vals) => saveConfigMutation.mutate({ ...config, ai_batch_size: vals[0] })} 
               className="flex-1"
             />
             <span className="text-xs font-medium bg-muted border border-border/30 px-2 py-1 rounded w-10 text-center">{config.ai_batch_size || 50}</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};
