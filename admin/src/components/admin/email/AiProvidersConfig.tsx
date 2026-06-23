import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, KeyRound, Globe, BrainCircuit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AiProvidersConfig = ({ config, setConfig, saveConfigMutation }: any) => {
  const queryClient = useQueryClient();
  const [keys, setKeys] = useState<Record<string, string>>({});

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

  const isEnrichEnabled = (engine: string) => {
    if (config.enrich_engine === "all") return true;
    if (config.enrich_engine === "both" && (engine === "gemini" || engine === "groq")) return true;
    return config.enrich_engine === engine;
  };

  const toggleEnrichEngine = (engine: string, checked: boolean) => {
    // If turning on, and something else is on, we might switch to "all" or "both"
    // Since the original was a radio button, let's keep it simple: if checked, set to this engine.
    // If they want multiple, they can use 'all' or 'both' logic, but let's just make it a radio behavior for now:
    let newEngine = engine;
    if (checked) {
       // Just set this as the primary enrich engine, or 'all' if they check multiple (for simplicity, we just set it)
       newEngine = engine;
    } else {
       // if they turn it off, fallback to gemini
       newEngine = "gemini";
    }
    const updated = { ...config, enrich_engine: newEngine };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const providers = [
    {
      id: "gemini",
      name: "Gemini (Google)",
      keyName: "GEMINI_API_KEY",
      searchConfigKey: "gemini",
      desc: "Nejchytřejší model s Google Grounding (přístup k internetu). Doporučeno pro všechny úkoly.",
      hasSlider: true,
      sliderKey: "gemini_rpm_limit",
      sliderDefault: 15
    },
    {
      id: "groq",
      name: "Groq (Llama 3)",
      keyName: "GROQ_API_KEY",
      searchConfigKey: "groq_places",
      desc: "Bleskově rychlý Llama 3 model. Pro vyhledávání používá integraci na Google Places API.",
      hasSlider: true,
      sliderKey: "groq_rpm_limit",
      sliderDefault: 30
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      keyName: "OPENROUTER_API_KEY",
      searchConfigKey: "openrouter",
      desc: "Záložní agregátor desítek modelů (včetně free verzí). Nemá nativní přístup na internet.",
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      keyName: "DEEPSEEK_API_KEY",
      searchConfigKey: "deepseek",
      desc: "Levný a velmi inteligentní čínský model přímo od deepseek.com.",
    },
    {
      id: "siliconflow",
      name: "SiliconFlow",
      keyName: "SILICONFLOW_API_KEY",
      searchConfigKey: "siliconflow",
      desc: "Asijský agregátor s free tierem pro Qwen a DeepSeek modely.",
    }
  ];

  if (keysLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {providers.map(p => {
        const isSearchChecked = config[`use_${p.searchConfigKey}_engine`] ?? false;
        const enrichChecked = isEnrichEnabled(p.id);

        return (
          <Card key={p.id} className="border-border/40 shadow-sm overflow-hidden">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
              </div>
            </div>
            
            <CardContent className="p-6 space-y-6">
              {/* API KEY */}
              <div className="flex items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><KeyRound className="h-3 w-3" /> API Klíč</Label>
                  <Input 
                    type="password" 
                    placeholder="Vložte API klíč..." 
                    value={keys[p.keyName] || ""} 
                    onChange={e => handleKeyChange(p.keyName, e.target.value)}
                    className="font-mono text-sm h-9"
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={() => saveKeysMutation.mutate()} disabled={saveKeysMutation.isPending} className="h-9">
                  {saveKeysMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>

              {/* TOGGLES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 font-bold"><Globe className="h-4 w-4 text-blue-500" /> Vyhledávání firem</Label>
                    <p className="text-[10px] text-muted-foreground">Použít pro autonomní sběr z internetu</p>
                  </div>
                  <Switch checked={isSearchChecked} onCheckedChange={(c) => handleToggleSearch(p.searchConfigKey, c)} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 font-bold"><BrainCircuit className="h-4 w-4 text-purple-500" /> Obohacování (Enrichment)</Label>
                    <p className="text-[10px] text-muted-foreground">Použít pro analýzu textu a psaní e-mailů</p>
                  </div>
                  <Switch checked={enrichChecked} onCheckedChange={(c) => toggleEnrichEngine(p.id, c)} />
                </div>
              </div>

              {/* RPM SLIDER */}
              {p.hasSlider && (
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold flex items-center gap-1.5">Rychlostní limit (RPM)</Label>
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{config[p.sliderKey!] || p.sliderDefault}</span>
                  </div>
                  <Slider 
                    value={[config[p.sliderKey!] || p.sliderDefault]} 
                    min={1} max={60} step={1} 
                    onValueChange={(vals) => setConfig({ ...config, [p.sliderKey!]: vals[0] })} 
                    onValueCommit={(vals) => saveConfigMutation.mutate({ ...config, [p.sliderKey!]: vals[0] })} 
                  />
                  <p className="text-[10px] text-muted-foreground">Omezte počet požadavků za minutu, abyste předešli chybám Rate Limit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-border/40 shadow-sm mt-6">
        <CardContent className="p-6">
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <Label className="text-sm font-bold">Velikost AI dávky (Batch Size)</Label>
               <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{config.ai_batch_size || 50}</span>
             </div>
             <Slider 
               value={[config.ai_batch_size || 50]} min={10} max={100} step={5} 
               onValueChange={(vals) => setConfig({ ...config, ai_batch_size: vals[0] })} 
               onValueCommit={(vals) => saveConfigMutation.mutate({ ...config, ai_batch_size: vals[0] })} 
             />
             <p className="text-[10px] text-muted-foreground">Kolik leadů se zpracuje v 1 požadavku (šetří tokeny, ale při velkém čísle hrozí useknutí odpovědi).</p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};
