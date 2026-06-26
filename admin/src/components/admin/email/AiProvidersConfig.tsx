import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2, Save, KeyRound, Globe, BrainCircuit, Activity,
  CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, Cpu
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Model catalogues per provider ─────────────────────────────────────────
const MODEL_CATALOGUES: Record<string, { label: string; value: string }[]> = {
  groq: [
    { label: "llama-3.3-70b-versatile (doporučeno)", value: "llama-3.3-70b-versatile" },
    { label: "llama-3.1-8b-instant (rychlý)", value: "llama-3.1-8b-instant" },
    { label: "llama-3.1-70b-versatile", value: "llama-3.1-70b-versatile" },
    { label: "mixtral-8x7b-32768", value: "mixtral-8x7b-32768" },
    { label: "gemma-7b-it", value: "gemma-7b-it" },
    { label: "llama-4-scout-17b-16e-instruct", value: "llama-4-scout-17b-16e-instruct" },
    { label: "llama-4-maverick-17b-128e-instruct", value: "llama-4-maverick-17b-128e-instruct" },
  ],
  gemini: [
    { label: "gemini-2.0-flash (doporučeno)", value: "gemini-2.0-flash" },
    { label: "gemini-2.0-flash-lite", value: "gemini-2.0-flash-lite" },
    { label: "gemini-1.5-flash", value: "gemini-1.5-flash" },
    { label: "gemini-1.5-pro", value: "gemini-1.5-pro" },
    { label: "gemini-2.5-flash-preview", value: "gemini-2.5-flash-preview-05-20" },
  ],
  openrouter: [
    { label: "llama-3.3-70b-instruct:free (doporučeno)", value: "meta-llama/llama-3.3-70b-instruct:free" },
    { label: "google/gemma-4-31b-it:free", value: "google/gemma-4-31b-it:free" },
    { label: "nvidia/nemotron-super-120b:free", value: "nvidia/nemotron-3-super-120b-a12b:free" },
    { label: "deepseek/deepseek-chat:free", value: "deepseek/deepseek-chat:free" },
    { label: "anthropic/claude-3.5-haiku", value: "anthropic/claude-3.5-haiku" },
    { label: "openai/gpt-4o-mini", value: "openai/gpt-4o-mini" },
  ],
  deepseek: [
    { label: "deepseek-chat (doporučeno)", value: "deepseek-chat" },
    { label: "deepseek-reasoner", value: "deepseek-reasoner" },
    { label: "deepseek-coder", value: "deepseek-coder" },
  ],
  siliconflow: [
    { label: "Qwen/Qwen2.5-72B-Instruct (doporučeno)", value: "Qwen/Qwen2.5-72B-Instruct" },
    { label: "Qwen/Qwen2.5-7B-Instruct", value: "Qwen/Qwen2.5-7B-Instruct" },
    { label: "deepseek-ai/DeepSeek-V3", value: "deepseek-ai/DeepSeek-V3" },
    { label: "THUDM/glm-4-9b-chat", value: "THUDM/glm-4-9b-chat" },
  ],
};

// ─── Status dot with error popup ────────────────────────────────────────────
const StatusDot = ({ status, message, updatedAt }: { status: string | undefined; message?: string; updatedAt?: string }) => {
  const color =
    status === "ok" ? "bg-green-500" :
    status === "error" ? "bg-red-500" :
    "bg-muted-foreground/30";

  if (!status || status === "ok") {
    return (
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`}
        title={status === "ok" ? `Online${updatedAt ? ` – ověřeno ${new Date(updatedAt).toLocaleTimeString("cs-CZ")}` : ""}` : "Neotestováno"}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-pointer ${color} hover:ring-2 hover:ring-red-400/50 transition-all`} />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-80 text-xs space-y-2 p-3">
        <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          Chyba API klíče / modelu
        </div>
        <pre className="text-[10px] font-mono bg-muted p-2 rounded-md whitespace-pre-wrap break-all text-foreground/80 max-h-48 overflow-y-auto">
          {message || "Neznámá chyba"}
        </pre>
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground">Zjištěno: {new Date(updatedAt).toLocaleString("cs-CZ")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

// ─── Last run display ────────────────────────────────────────────────────────
const LastRunBadge = ({ job }: { job: any }) => {
  if (!job) return <span className="text-[10px] text-muted-foreground/40 italic">Žádný záznam</span>;

  const statusColor =
    job.last_run_status === "success" ? "text-emerald-600" :
    job.last_run_status === "failure" ? "text-red-500" :
    job.last_run_status === "running" ? "text-blue-500" :
    "text-muted-foreground";

  const StatusIcon =
    job.last_run_status === "success" ? CheckCircle2 :
    job.last_run_status === "failure" ? XCircle :
    job.last_run_status === "running" ? Loader2 :
    Clock;

  const meta = job.metadata || {};
  const metaLine = meta.message
    ? meta.message
    : meta.count !== undefined
    ? `${meta.count} zpracováno`
    : meta.processed !== undefined
    ? `${meta.processed} zpracováno, ${meta.updated ?? 0} aktualizováno`
    : null;

  const lastRunAt = job.last_run_at || job.updated_at;

  return (
    <div className="flex flex-col gap-0.5">
      <div className={`flex items-center gap-1 text-[10px] font-semibold ${statusColor}`}>
        <StatusIcon className={`h-2.5 w-2.5 ${job.last_run_status === "running" ? "animate-spin" : ""}`} />
        {job.last_run_status === "success" ? "Úspěch" :
         job.last_run_status === "failure" ? "Chyba" :
         job.last_run_status === "running" ? "Probíhá…" : job.last_run_status}
        {lastRunAt && (
          <span className="text-muted-foreground font-normal ml-1">
            {new Date(lastRunAt).toLocaleString("cs-CZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      {metaLine && (
        <p className="text-[9px] text-muted-foreground leading-tight truncate max-w-[200px]" title={metaLine}>
          {metaLine}
        </p>
      )}
      {job.last_run_status === "failure" && job.last_run_error && (
        <p className="text-[9px] text-red-400 leading-tight truncate max-w-[200px]" title={job.last_run_error}>
          {job.last_run_error}
        </p>
      )}
    </div>
  );
};

// ─── Model selector ──────────────────────────────────────────────────────────
const ModelSelector = ({
  providerId,
  value,
  onChange,
}: {
  providerId: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const [isCustom, setIsCustom] = useState(false);
  const catalogue = MODEL_CATALOGUES[providerId] || [];
  const knownValues = catalogue.map(m => m.value);
  const isKnown = knownValues.includes(value);

  // If current value isn't in catalogue, start in custom mode
  React.useEffect(() => {
    if (value && !knownValues.includes(value)) setIsCustom(true);
  }, []);

  if (isCustom || !catalogue.length) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Název modelu..."
          className="font-mono text-[11px] h-7 flex-1"
        />
        {catalogue.length > 0 && (
          <button
            onClick={() => setIsCustom(false)}
            className="text-[10px] text-muted-foreground hover:text-primary shrink-0"
            title="Vybrat ze seznamu"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <Select
      value={value || catalogue[0]?.value || ""}
      onValueChange={v => {
        if (v === "__custom__") { setIsCustom(true); return; }
        onChange(v);
      }}
    >
      <SelectTrigger className="h-7 text-[11px] font-mono [&>svg:last-child]:h-3 [&>svg:last-child]:w-3">
        <SelectValue placeholder="Vyberte model…" />
      </SelectTrigger>
      <SelectContent className="text-[11px]">
        {catalogue.map(m => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}
        <SelectItem value="__custom__" className="text-muted-foreground italic">
          + Zadat vlastní…
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
export const AiProvidersConfig = ({ config, setConfig, saveConfigMutation }: any) => {
  const queryClient = useQueryClient();
  const [keys, setKeys] = useState<Record<string, string>>({});

  const { data: testResults = {} } = useQuery({
    queryKey: ["admin-api-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "api_health")
        .maybeSingle();
      if (error || !data?.value) return {};
      return data.value;
    },
    refetchInterval: 30000,
  });

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
    },
  });

  // Last run info for automation jobs
  const { data: automationJobs = [] } = useQuery({
    queryKey: ["admin-automation-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_jobs")
        .select("job_name, last_run_at, last_run_status, last_run_error, metadata, updated_at")
        .order("last_run_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const jobMap = React.useMemo(() => {
    const m: Record<string, any> = {};
    for (const j of automationJobs as any[]) m[j.job_name] = j;
    return m;
  }, [automationJobs]);

  const saveKeysMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "api_keys", value: keys as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Klíče uloženy"),
    onError: (err: any) => toast.error("Chyba při ukládání klíčů: " + err.message),
  });

  const handleKeyChange = (providerKey: string, val: string) =>
    setKeys(prev => ({ ...prev, [providerKey]: val }));

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

  const handleModelChange = (providerId: string, modelKey: string, value: string) => {
    const updated = { ...config, [modelKey]: value };
    setConfig(updated);
    saveConfigMutation.mutate(updated);
  };

  const testApiKeys = async () => {
    toast.info("Testování API klíčů…");
    const { error } = await supabase.functions.invoke("test-api-keys", { method: "POST" });
    if (error) { toast.error("Nepodařilo se spojit s testovací funkcí"); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-api-health"] });
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
      sliderDefault: 15,
      modelConfigKey: "gemini_model",
      modelDefault: "gemini-2.0-flash",
      relatedJobs: ["Auto Enrich Leads", "Continuous Web Discovery"],
    },
    {
      id: "groq",
      name: "Groq (Llama)",
      keyName: "GROQ_API_KEY",
      fallbackKeyName: "GROQ_FALLBACK_API_KEY",
      searchConfigKey: "groq_places",
      desc: "Bleskový Llama model (Places API + enrichment).",
      hasSlider: true,
      sliderKey: "groq_rpm_limit",
      sliderDefault: 30,
      modelConfigKey: "groq_model",
      modelDefault: "llama-3.3-70b-versatile",
      relatedJobs: ["Auto Enrich Leads", "Continuous Web Discovery"],
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      keyName: "OPENROUTER_API_KEY",
      fallbackKeyName: "OPENROUTER_FALLBACK_API_KEY",
      searchConfigKey: "openrouter",
      desc: "Záložní agregátor desítek modelů.",
      modelConfigKey: "openrouter_model",
      modelDefault: "meta-llama/llama-3.3-70b-instruct:free",
      relatedJobs: ["Auto Enrich Leads"],
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      keyName: "DEEPSEEK_API_KEY",
      fallbackKeyName: "DEEPSEEK_FALLBACK_API_KEY",
      searchConfigKey: "deepseek",
      desc: "Levný a inteligentní model (deepseek.com).",
      modelConfigKey: "deepseek_model",
      modelDefault: "deepseek-chat",
      relatedJobs: ["Auto Enrich Leads"],
    },
    {
      id: "siliconflow",
      name: "SiliconFlow",
      keyName: "SILICONFLOW_API_KEY",
      fallbackKeyName: "SILICONFLOW_FALLBACK_API_KEY",
      searchConfigKey: "siliconflow",
      desc: "Asijský agregátor (Qwen, DeepSeek).",
      modelConfigKey: "siliconflow_model",
      modelDefault: "Qwen/Qwen2.5-72B-Instruct",
      relatedJobs: ["Auto Enrich Leads"],
    },
  ];

  if (keysLoading)
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>;

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
          const isLegacyEnrich =
            config.enrich_engine === p.id ||
            config.enrich_engine === "all" ||
            (config.enrich_engine === "both" && (p.id === "gemini" || p.id === "groq"));
          const enrichChecked =
            config[`use_${p.id}_enrich_engine`] !== undefined
              ? config[`use_${p.id}_enrich_engine`]
              : isLegacyEnrich;

          const primaryStatus = (testResults as any)[p.id];
          const currentModel = config[p.modelConfigKey] || p.modelDefault;

          // Collect last runs for this provider's related jobs
          const relatedJobEntries = (p.relatedJobs || [])
            .map(jn => jobMap[jn])
            .filter(Boolean);
          const mostRecentJob = relatedJobEntries.sort((a: any, b: any) =>
            new Date(b.last_run_at || b.updated_at || 0).getTime() -
            new Date(a.last_run_at || a.updated_at || 0).getTime()
          )[0];

          return (
            <Card
              key={p.id}
              className="border-border/50 shadow-sm overflow-hidden flex flex-col transition-all hover:border-primary/20"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/10">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    {p.name}
                    <StatusDot
                      status={primaryStatus?.status}
                      message={primaryStatus?.message}
                      updatedAt={primaryStatus?.updated_at}
                    />
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              </div>

              <CardContent className="p-4 space-y-4 flex-1 flex flex-col">
                {/* API KEYS */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    <Input
                      type="password"
                      placeholder="Primární klíč..."
                      value={keys[p.keyName] || ""}
                      onChange={e => handleKeyChange(p.keyName, e.target.value)}
                      className="font-mono text-xs h-8 flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    <Input
                      type="password"
                      placeholder="Záložní klíč (při selhání)..."
                      value={keys[p.fallbackKeyName] || ""}
                      onChange={e => handleKeyChange(p.fallbackKeyName, e.target.value)}
                      className="font-mono text-xs h-8 flex-1"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveKeysMutation.mutate()}
                      disabled={saveKeysMutation.isPending}
                      className="h-7 px-3 text-xs"
                    >
                      {saveKeysMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Uložit klíče
                    </Button>
                  </div>
                </div>

                {/* MODEL SELECTOR */}
                <div className="space-y-1.5 border-t border-border/30 pt-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="h-3 w-3 text-muted-foreground/60" />
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Aktivní model
                    </Label>
                  </div>
                  <ModelSelector
                    providerId={p.id}
                    value={currentModel}
                    onChange={v => handleModelChange(p.id, p.modelConfigKey, v)}
                  />
                </div>

                {/* TOGGLES */}
                <div className="space-y-2 border-t border-border/30 pt-3">
                  <div className="flex items-center justify-between bg-background border border-border/30 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-blue-500/70" />
                      <Label className="text-xs font-medium cursor-pointer">Autonomní Sběr</Label>
                    </div>
                    <Switch
                      checked={isSearchChecked}
                      onCheckedChange={c => handleToggleSearch(p.searchConfigKey, c)}
                    />
                  </div>
                  <div className="flex items-center justify-between bg-background border border-border/30 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-3.5 w-3.5 text-purple-500/70" />
                      <Label className="text-xs font-medium cursor-pointer">Enrichment</Label>
                    </div>
                    <Switch
                      checked={enrichChecked}
                      onCheckedChange={c => toggleEnrichEngine(p.id, c)}
                    />
                  </div>
                </div>

                {/* RPM SLIDER */}
                {p.hasSlider && (
                  <div className="border-t border-border/30 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground">Max RPM</Label>
                      <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded text-foreground">
                        {config[(p as any).sliderKey] || p.sliderDefault}
                      </span>
                    </div>
                    <Slider
                      value={[config[(p as any).sliderKey] || p.sliderDefault]}
                      min={1} max={60} step={1}
                      onValueChange={vals => setConfig({ ...config, [(p as any).sliderKey]: vals[0] })}
                      onValueCommit={vals => saveConfigMutation.mutate({ ...config, [(p as any).sliderKey]: vals[0] })}
                      className="py-1"
                    />
                  </div>
                )}

                {/* LAST RUN */}
                <div className="border-t border-border/30 pt-3 mt-auto">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Poslední run</p>
                  <LastRunBadge job={mostRecentJob} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* BATCH SIZE */}
      <Card className="border-border/50 shadow-sm bg-muted/10">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="space-y-1 flex-1">
            <Label className="text-sm font-medium">Velikost AI dávky (Batch Size)</Label>
            <p className="text-[11px] text-muted-foreground">
              Počet leadů zpracovaných v 1 požadavku (vysoké číslo šetří tokeny, ale může chybovat).
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-64">
            <Slider
              value={[config.ai_batch_size || 50]}
              min={10} max={100} step={5}
              onValueChange={vals => setConfig({ ...config, ai_batch_size: vals[0] })}
              onValueCommit={vals => saveConfigMutation.mutate({ ...config, ai_batch_size: vals[0] })}
              className="flex-1"
            />
            <span className="text-xs font-medium bg-muted border border-border/30 px-2 py-1 rounded w-10 text-center">
              {config.ai_batch_size || 50}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
