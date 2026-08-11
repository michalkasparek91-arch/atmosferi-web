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
  CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Cpu, Play, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Model catalogues per provider (Updated 2026) ──────────────────────────
const MODEL_CATALOGUES: Record<string, { label: string; value: string }[]> = {
  gemini: [
    { label: "gemini-2.5-flash (Nejnovější 2026 - Doporučeno)", value: "gemini-2.5-flash" },
    { label: "gemini-2.0-flash (Rychlý 2026)", value: "gemini-2.0-flash" },
    { label: "gemini-2.5-pro (Vysoká přesnost)", value: "gemini-2.5-pro" },
    { label: "gemini-2.0-flash-lite (Úsporný)", value: "gemini-2.0-flash-lite" },
  ],
  groq: [
    { label: "llama-3.3-70b-versatile (Doporučeno)", value: "llama-3.3-70b-versatile" },
    { label: "deepseek-r1-distill-llama-70b (Reasoning)", value: "deepseek-r1-distill-llama-70b" },
    { label: "llama-3.1-8b-instant (Bleskový)", value: "llama-3.1-8b-instant" },
    { label: "mixtral-8x7b-32768", value: "mixtral-8x7b-32768" },
  ],
  openrouter: [
    { label: "openai/gpt-4o-mini (Doporučeno)", value: "openai/gpt-4o-mini" },
    { label: "google/gemini-2.0-flash-001", value: "google/gemini-2.0-flash-001" },
    { label: "deepseek/deepseek-chat", value: "deepseek/deepseek-chat" },
    { label: "meta-llama/llama-3.3-70b-instruct", value: "meta-llama/llama-3.3-70b-instruct" },
    { label: "anthropic/claude-3.5-haiku", value: "anthropic/claude-3.5-haiku" },
  ],
  deepseek: [
    { label: "deepseek-chat (DeepSeek V3 - Doporučeno)", value: "deepseek-chat" },
    { label: "deepseek-reasoner (DeepSeek R1 Reasoning)", value: "deepseek-reasoner" },
  ],
  siliconflow: [
    { label: "Qwen/Qwen2.5-72B-Instruct (Doporučeno)", value: "Qwen/Qwen2.5-72B-Instruct" },
    { label: "deepseek-ai/DeepSeek-V3", value: "deepseek-ai/DeepSeek-V3" },
    { label: "deepseek-ai/DeepSeek-R1", value: "deepseek-ai/DeepSeek-R1" },
  ],
  cerebras: [
    { label: "llama3.3-70b (Doporučeno)", value: "llama3.3-70b" },
    { label: "gpt-oss-120b (Reasoning)", value: "gpt-oss-120b" },
  ],
  mistral: [
    { label: "mistral-large-latest (Doporučeno)", value: "mistral-large-latest" },
    { label: "pixtral-large-latest", value: "pixtral-large-latest" },
  ],
  nvidia: [
    { label: "meta/llama-3.3-70b-instruct (Doporučeno)", value: "meta/llama-3.3-70b-instruct" },
    { label: "deepseek-ai/deepseek-r1", value: "deepseek-ai/deepseek-r1" },
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

const JobBadge = ({ title, health, job }: { title: string; health?: any; job?: any }) => {
  if (!health && !job) return null;

  const healthTs = health?.updated_at;
  const jobTs = job?.last_run_at || job?.updated_at;
  const lastRunAt = healthTs || jobTs;

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const isSuccess = health?.status === "ok" || (!health && job?.last_run_status === "success");
  const isError = health?.status === "error" || (!health && job?.last_run_status === "failure");
  const isRunning = job?.last_run_status === "running" && !healthTs;

  const perProviderEnriched = health?.last_run_enriched ?? health?.last_run_processed ?? 0;
  const perProviderDiscovered = health?.last_run_discovered ?? 0;
  const count = title === "Enrichment" ? perProviderEnriched : perProviderDiscovered;

  let statusColor = "text-muted-foreground";
  let statusLabel = "Neznámý";
  let StatusIcon = Clock;

  if (isError) {
    statusColor = "text-red-500 dark:text-red-400";
    statusLabel = "Chyba API / Modelu";
    StatusIcon = XCircle;
  } else if (isRunning) {
    statusColor = "text-blue-500";
    statusLabel = "Probíhá…";
    StatusIcon = Loader2;
  } else if (isSuccess) {
    if (count > 0) {
      statusColor = "text-emerald-600 dark:text-emerald-400 font-bold";
      statusLabel = `Úspěch (+${count} ${title === "Enrichment" ? "obohaceno" : "získáno"})`;
      StatusIcon = CheckCircle2;
    } else {
      statusColor = "text-slate-500 dark:text-slate-400 font-normal";
      statusLabel = `V pořádku (0 nových ${title === "Enrichment" ? "dat" : "kontaktů"})`;
      StatusIcon = CheckCircle2;
    }
  }

  const meta = job?.metadata || {};
  let metaLine = null;
  let todayBadge = null;

  const ranToday = isToday(lastRunAt);
  const successfullyRanToday = ranToday && isSuccess && count > 0;
  
  if (title === "Enrichment") {
    metaLine = isSuccess ? (count > 0 ? `+${count} obohaceno v posl. běhu` : `0 obohaceno v posl. běhu`) : `Běh selhal`;
    todayBadge = successfullyRanToday ? `${count} obohaceno dnes` : `0 obohaceno dnes`;
  } else if (title === "Sběr (Hledání)") {
    metaLine = isSuccess ? (count > 0 ? `+${count} získáno v posl. běhu` : `0 získáno v posl. běhu`) : `Běh selhal`;
    todayBadge = successfullyRanToday ? `${count} získáno dnes` : `0 získáno dnes`;
  } else {
    metaLine = meta.message || null;
  }

  const errorMsg = health?.message && health.status === "error" ? health.message : job?.last_run_error;

  const formatFriendlyError = (msg: string) => {
    if (!msg) return "Neznámá chyba";
    if (msg.includes("404") && (msg.includes("no longer available") || msg.includes("not found"))) {
      return "⚠️ Zvolený model již není k dispozici. Přepněte v nastavení na novější model.";
    }
    if (msg.includes("Rate limit") || msg.includes("rate_limit_exceeded") || msg.includes("tokens per day")) {
      return "⏳ Překročen denní API limit tokenů (Rate limit). Vyčkejte cca 20 minut nebo použijte jiného providera.";
    }
    if (msg.includes("API key") || msg.includes("Unauthorized") || msg.includes("401")) {
      return "🔑 Neplatný nebo chybějící API klíč. Zkontrolujte pole pro API klíč v nastavení.";
    }
    return msg;
  };

  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-card/50 border border-border/40">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        {todayBadge && (
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${successfullyRanToday ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
            {todayBadge}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-1.5 text-[10px] ${statusColor}`}>
        <StatusIcon className={`h-3 w-3 shrink-0 ${isRunning ? "animate-spin" : ""}`} />
        <span>{statusLabel}</span>
        {lastRunAt && (
          <span className="text-muted-foreground font-normal ml-auto text-[9px]">
            {new Date(lastRunAt).toLocaleString("cs-CZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {metaLine && (
        <p className="text-[9px] text-muted-foreground leading-tight truncate" title={metaLine}>
          {metaLine}
        </p>
      )}

      {isError && errorMsg && (
        <div className="flex flex-col gap-1 mt-1 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-[10px] font-medium text-red-600 dark:text-red-400 leading-snug">
            {formatFriendlyError(errorMsg)}
          </p>
          {health?.last_success_at && (
            <p className="text-[8px] text-muted-foreground mt-0.5">
              Poslední úspěch: {new Date(health.last_success_at).toLocaleString("cs-CZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
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

  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  const testEngine = async (functionName: string, engine: string) => {
    toast.info(`Spouštím test pro ${engine}...`);
    const { error, data } = await supabase.functions.invoke(functionName, { method: "POST", body: { engine, forceSearch: true } });
    if (error) { toast.error(`Test selhal: ${error.message}`); return; }
    toast.success(`Test dokončen: ${data?.message || data?.debug_output || "OK"}`);
    queryClient.invalidateQueries({ queryKey: ["admin-api-health"] });
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
      modelDefault: "gemini-2.5-flash",
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
      desc: "Agregátor 300+ AI modelů.",
      hasSlider: true,
      sliderKey: "openrouter_rpm_limit",
      sliderDefault: 20,
      modelConfigKey: "openrouter_model",
      modelDefault: "openai/gpt-4o-mini",
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
    {
      id: "cerebras",
      name: "Cerebras",
      keyName: "CEREBRAS_API_KEY",
      fallbackKeyName: "CEREBRAS_FALLBACK_API_KEY",
      searchConfigKey: "cerebras",
      desc: "Zcela zdarma (až 1M tokenů/den), nejrychlejší zpracování na wafer-scale čipech.",
      hasSlider: false,
      modelConfigKey: "cerebras_model",
      modelDefault: "llama3.3-70b",
      relatedJobs: ["Auto Enrich Leads"]
    },
    {
      id: "mistral",
      name: "Mistral",
      keyName: "MISTRAL_API_KEY",
      fallbackKeyName: "MISTRAL_FALLBACK_API_KEY",
      searchConfigKey: "mistral",
      desc: "Záložní API (až 1B tokenů/měsíc v experiment tieru).",
      modelConfigKey: "mistral_model",
      modelDefault: "mistral-large-latest",
      relatedJobs: ["Auto Enrich Leads"],
    },
    {
      id: "nvidia",
      name: "NVIDIA NIM",
      keyName: "NVIDIA_API_KEY",
      fallbackKeyName: "NVIDIA_FALLBACK_API_KEY",
      searchConfigKey: "nvidia",
      desc: "80+ modelů zdarma (build.nvidia.com, klíč nvapi-).",
      modelConfigKey: "nvidia_model",
      modelDefault: "meta/llama-3.3-70b-instruct",
      relatedJobs: ["Auto Enrich Leads", "Continuous Web Discovery"],
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
          const isSearchChecked = config[`use_${p.searchConfigKey}_engine`] ?? true;
          const isLegacyEnrich =
            config.enrich_engine === p.id ||
            config.enrich_engine === "all" ||
            (config.enrich_engine === "both" && (p.id === "gemini" || p.id === "groq"));
          const enrichChecked =
            config[`use_${p.id}_enrich_engine`] !== undefined
              ? config[`use_${p.id}_enrich_engine`]
              : (isLegacyEnrich || true);

          const primaryStatus = (testResults as any)[p.id];
          const currentModel = config[p.modelConfigKey] || p.modelDefault;
          const isExpanded = expandedProviders[p.id] ?? false;

          return (
            <Card
              key={p.id}
              className="border-border/50 shadow-sm overflow-hidden flex flex-col transition-all hover:border-primary/20 bg-card"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      {p.name}
                      <StatusDot
                        status={primaryStatus?.status}
                        message={primaryStatus?.message}
                        updatedAt={primaryStatus?.updated_at}
                      />
                    </h3>
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[140px]" title={currentModel}>
                      {currentModel}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              </div>

              <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                {/* STATISTIKY (BĚHY & VÝSLEDKY - ZÁKLADNÍ POHLED) */}
                <div className="flex flex-col gap-2">
                  {p.relatedJobs?.includes("Continuous Web Discovery") && (
                    <JobBadge
                      title="Sběr (Hledání)"
                      health={(testResults as any)[p.searchConfigKey]}
                      job={jobMap["Continuous Web Discovery"]}
                    />
                  )}
                  {p.relatedJobs?.includes("Auto Enrich Leads") && (
                    <JobBadge 
                      title="Enrichment" 
                      health={primaryStatus} 
                      job={jobMap["Auto Enrich Leads"]} 
                    />
                  )}
                </div>

                {/* EXPANDABLE SECTION: SPÍNAČE, API KEYS & MODEL SELECTOR */}
                {isExpanded && (
                  <div className="space-y-4 border-t border-border/30 pt-3 animate-in fade-in duration-200">
                    {/* AUTONOMNÍ SPÍNAČE */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Aktivní funkce AI
                      </Label>
                      <div className="flex items-center justify-between bg-background border border-border/30 rounded-md p-2">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-blue-500/70" />
                          <Label className="text-xs font-medium cursor-pointer">Autonomní Sběr</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-blue-500" onClick={() => testEngine("autonomous-web-sniper", p.id === 'groq' ? 'groq_places' : p.id)} title={`Otestovat ${p.name} sběr`}>
                            <Play className="h-3 w-3" />
                          </Button>
                          <Switch
                            checked={isSearchChecked}
                            onCheckedChange={c => handleToggleSearch(p.searchConfigKey, c)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-background border border-border/30 rounded-md p-2">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-3.5 w-3.5 text-purple-500/70" />
                          <Label className="text-xs font-medium cursor-pointer">Enrichment</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-purple-500" onClick={() => testEngine("auto-enrich-leads", p.id)} title={`Otestovat ${p.name} enrichment`}>
                            <Play className="h-3 w-3" />
                          </Button>
                          <Switch
                            checked={enrichChecked}
                            onCheckedChange={c => toggleEnrichEngine(p.id, c)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* API KEYS */}
                    <div className="space-y-2 border-t border-border/30 pt-3">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        API Klíče
                      </Label>
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
                  </div>
                )}


                {/* TOGGLE EXPAND BUTTON */}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedProviders(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className="w-full text-[11px] text-muted-foreground hover:text-foreground border-t border-border/30 rounded-none h-8 mt-auto flex items-center justify-center gap-1"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>Skrýt nastavení klíčů a modelů</span>
                    </>
                  ) : (
                    <>
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>Nastavení klíčů a modelů</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                    </>
                  )}
                </Button>
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
