import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Play, Clock, CheckCircle2, AlertCircle, Loader2, Settings2, 
  History, Activity, Calendar, ExternalLink, Sparkles, Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface AutomationJob {
  id: string;
  job_name: string;
  function_name: string;
  schedule: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_error: string | null;
  metadata: any;
}

const cronToHuman = (cron: string) => {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, month, dow] = parts;
  if (min === '0' && dom === '*' && month === '*' && dow === '*') return `Každý den v ${hour}:00`;
  if (dow === '1') return `Každé pondělí v ${hour}:00`;
  if (dow === '5') return `Každý pátek v ${hour}:00`;
  return cron;
};

const parseCron = (cron: string) => {
  const parts = cron.split(' ');
  if (parts.length !== 5) return { hour: "2", freq: "daily" };
  const [, hour, , , dow] = parts;
  let freq = "daily";
  if (dow === "1") freq = "weekly_mon";
  if (dow === "5") freq = "weekly_fri";
  return { hour, freq };
};

const buildCron = (hour: string, freq: string) => {
  if (freq === "daily") return `0 ${hour} * * *`;
  if (freq === "weekly_mon") return `0 ${hour} * * 1`;
  if (freq === "weekly_fri") return `0 ${hour} * * 5`;
  return `0 ${hour} * * *`;
};

const getJobConfig = (fnName: string) => {
  switch (fnName) {
    case "generate-nightly-pseo":
      return { ai: "Gemini 2.5 Flash", badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20", link: "/admin/seo-obsah", linkLabel: "Zkontrolovat PSEO", desc: "Noční generování lokálních PSEO stránek a IndexNow ping." };
    case "generate-nightly-article":
      return { ai: "Gemini 2.5 Flash + Grounding", badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20", link: "/admin/magazin", linkLabel: "Magazín", desc: "Tvorba odborných článků ověřená Google vyhledáváním." };
    case "generate-newsletter-draft":
      return { ai: "Gemini 2.5 Flash (Premium Layout)", badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", link: "/admin/emaily", linkLabel: "Outbox", desc: "Příprava měsíčních magazínových newsletterů pro řemeslníky i zákazníky." };
    case "optimize-seo-titles":
      return { ai: "Gemini 2.5 Flash (A/B Engine)", badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20", link: "/admin/seo-obsah", linkLabel: "Výsledky", desc: "Autonomní rotace a vyhodnocování výkonu SEO meta titulků." };
    case "generate-sniper-outbox":
      return { ai: "Gemini 2.5 Flash (Outreach)", badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20", link: "/admin/emaily", linkLabel: "Outbox", desc: "Generování vysoce personalizovaných oslovovacích zpráv pro řemeslníky." };
    case "brainstorm-magazine-ideas":
      return { ai: "Gemini 2.5 Flash (Topic Discovery)", badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", link: "/admin/magazin?tab=ai-autopilot", linkLabel: "Magazín", desc: "Autonomní objevování virálních a vyhledávaných témat." };
    default:
      return { ai: "System", badgeColor: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", link: "/admin/prehled", linkLabel: "Přehled", desc: "Automatizovaná úloha na pozadí." };
  }
};

function usePauseFlag(key: "automation_paused" | "drip_paused") {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["app-settings", key],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
      const v: any = data?.value;
      return v === true || v?.paused === true;
    },
  });
  const mutation = useMutation({
    mutationFn: async (paused: boolean) => {
      const { error } = await supabase.from("app_settings").upsert({ key, value: paused as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings", key] });
      toast.success("Nastavení uloženo");
    },
    onError: (e: any) => toast.error(`Nepodařilo se uložit: ${e.message ?? e}`),
  });
  return { paused: !!data, isLoading, setPaused: mutation.mutate, isSaving: mutation.isPending };
}

const MasterPausePill = () => {
  const { paused, isLoading, setPaused, isSaving } = usePauseFlag("automation_paused");
  return (
    <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-colors ${paused ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
       <Activity className="h-3.5 w-3.5" />
       <span>AI Master Switch:</span>
       {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Switch checked={!paused} disabled={isSaving} onCheckedChange={(v) => setPaused(!v)} className="scale-[0.8] data-[state=checked]:bg-primary" />}
    </div>
  )
}

const DripPausePill = () => {
  const { paused, isLoading, setPaused, isSaving } = usePauseFlag("drip_paused");
  return (
    <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-colors ${paused ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
       <Sparkles className="h-3.5 w-3.5" />
       <span>Lifecycle Drip:</span>
       {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Switch checked={!paused} disabled={isSaving} onCheckedChange={(v) => setPaused(!v)} className="scale-[0.8] data-[state=checked]:bg-primary" />}
    </div>
  )
}

const AdminAutomationDashboard = () => {
  const queryClient = useQueryClient();
  const [editStateMap, setEditStateMap] = useState<Record<string, { hour: string; freq: string }>>({});

  const { data: jobs = [], isLoading } = useQuery<AutomationJob[]>({
    queryKey: ["automation-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("automation_jobs").select("*").order("job_name");
      if (error) throw error;
      return data as AutomationJob[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["all-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (job: Partial<AutomationJob>) => {
      const { error } = await supabase.from("automation_jobs").update(job).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-jobs"] });
      toast.success("Změny byly uloženy");
    },
    onError: (error: any) => {
      toast.error(`Chyba při aktualizaci: ${error.message || String(error)}`);
    }
  });

  const runNowMutation = useMutation({
    mutationFn: async (functionName: string) => {
      const { data, error } = await supabase.functions.invoke(functionName);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-jobs"] });
      toast.success("Úloha byla úspěšně spuštěna");
    },
    onError: (err: any) => {
      toast.error(`Spuštění selhalo: ${err.message || String(err)}`);
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Řízení automatizací</h2>
          <p className="text-xs text-zinc-500">Správa cron úloh, edge functions a e-mailových kampaní.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
           <MasterPausePill />
           <DripPausePill />
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Mail className="h-4 w-4" /> E-mailové & Poptávkové Automaty</h3>
          <Accordion type="single" collapsible className="space-y-3 w-full">
            {jobs.filter(j => ["generate-sniper-outbox", "process-sniper-outbox", "process-drip-campaigns", "process-scheduled-campaigns", "generate-newsletter-draft"].includes(j.function_name)).map((job) => {
              const cfg = getJobConfig(job.function_name);
              const isEmailJob = true;
              const isRunning = runNowMutation.isPending && runNowMutation.variables === job.function_name;
              const editState = editStateMap[job.id] || parseCron(job.schedule);

              return (
                <AccordionItem key={job.id} value={job.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm transition-all overflow-hidden">
                   <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                 {/* Row summary */}
                 <div className="flex items-center gap-4 flex-1 min-w-0">
                   <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      job.last_run_status === "success" ? "bg-emerald-500/10 text-emerald-500" :
                      job.last_run_status === "failure" ? "bg-red-500/10 text-red-500" :
                      job.last_run_status === "running" ? "bg-primary/10 text-primary" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                   }`}>
                     {job.last_run_status === "success" ? <CheckCircle2 className="h-5 w-5" /> : 
                      job.last_run_status === "failure" ? <AlertCircle className="h-5 w-5" /> : 
                      job.last_run_status === "running" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{job.job_name}</h3>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${cfg.badgeColor}`}>
                           {cfg.ai}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{cfg.desc}</p>
                   </div>
                 </div>

                 {/* Row actions & trigger */}
                 <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-0 border-zinc-100 dark:border-zinc-800 pt-3 md:pt-0">
                    <div className="flex flex-col items-start md:items-end">
                       <span className="text-[10px] font-bold text-zinc-500 uppercase">{cronToHuman(job.schedule)}</span>
                       <span className="text-[10px] text-zinc-400">{job.last_run_at ? new Date(job.last_run_at).toLocaleString('cs-CZ') : "Nespuštěno"}</span>
                    </div>

                    <div className="flex items-center gap-3">
                       <div onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                          <Switch 
                            checked={job.is_active} 
                            onCheckedChange={(v) => updateMutation.mutate({ id: job.id, is_active: v })} 
                            className="data-[state=checked]:bg-primary"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => runNowMutation.mutate(job.function_name)} 
                            disabled={isRunning} 
                            variant="secondary" 
                            className="h-8 text-xs font-bold gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg"
                          >
                            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Spustit
                          </Button>
                       </div>
                       <AccordionTrigger className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg no-underline [&[data-state=open]>svg]:rotate-180" />
                    </div>
                 </div>
               </div>

               <AccordionContent className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 pb-0">
                 <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Schedule Edit & Logs */}
                    <div className="space-y-5">
                       <div className="space-y-3">
                         <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Harmonogram spouštění</h4>
                         <div className="flex gap-2">
                           <Select 
                             value={editState.freq} 
                             onValueChange={(val) => setEditStateMap(p => ({ ...p, [job.id]: { ...editState, freq: val } }))}
                           >
                             <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900"><SelectValue placeholder="Frekvence" /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="daily">Každý den</SelectItem>
                               <SelectItem value="weekly_mon">Každé pondělí</SelectItem>
                               <SelectItem value="weekly_fri">Každý pátek</SelectItem>
                             </SelectContent>
                           </Select>
                           <Select 
                             value={editState.hour} 
                             onValueChange={(val) => setEditStateMap(p => ({ ...p, [job.id]: { ...editState, hour: val } }))}
                           >
                             <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900"><SelectValue placeholder="Čas" /></SelectTrigger>
                             <SelectContent>
                               {Array.from({ length: 24 }).map((_, i) => (
                                 <SelectItem key={i} value={i.toString()}>{i}:00</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           <Button 
                             size="sm" 
                             className="h-9 text-xs font-bold px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                             onClick={() => updateMutation.mutate({ id: job.id, schedule: buildCron(editState.hour, editState.freq) })}
                           >
                             Uložit čas
                           </Button>
                         </div>
                       </div>
                       
                       {job.last_run_error && (
                         <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-mono overflow-x-auto">
                           {job.last_run_error}
                         </div>
                       )}
                    </div>

                    {/* Email Settings */}
                    {isEmailJob && (
                       <div className="space-y-4">
                         <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Nastavení e-mailů</h4>
                         
                         <div className="flex items-center justify-between p-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
                            <div>
                               <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">Test Mód {job.metadata?.is_test_mode && <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0 px-1.5 py-0 text-[9px]">AKTIVNÍ</Badge>}</p>
                               <p className="text-[10px] text-zinc-500 mt-0.5">Odesílá emaily pouze na administrátorský e-mail a ignoruje produkční adresy.</p>
                            </div>
                            <Switch 
                              checked={job.metadata?.is_test_mode || false} 
                              onCheckedChange={(v) => updateMutation.mutate({ id: job.id, metadata: { ...job.metadata, is_test_mode: v } })}
                              className="data-[state=checked]:bg-amber-500"
                            />
                         </div>

                         <div className="space-y-2">
                           <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Aktivní šablona</label>
                           <Select 
                             value={job.metadata?.template_slug || "default"} 
                             onValueChange={(val) => updateMutation.mutate({ id: job.id, metadata: { ...job.metadata, template_slug: val === "default" ? null : val } })}
                           >
                             <SelectTrigger className="h-10 text-xs bg-white dark:bg-zinc-900 rounded-xl border-zinc-200 dark:border-zinc-800">
                               <SelectValue placeholder="Výchozí systémová" />
                             </SelectTrigger>
                             <SelectContent className="rounded-xl">
                               <SelectItem value="default">Výchozí systémová</SelectItem>
                               {templates.map(t => (
                                 <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
                    )}
                 </div>
               </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Sparkles className="h-4 w-4" /> SEO & Obsahové Automaty</h3>
          <Accordion type="single" collapsible className="space-y-3 w-full">
            {jobs.filter(j => !["generate-sniper-outbox", "process-sniper-outbox", "process-drip-campaigns", "process-scheduled-campaigns", "generate-newsletter-draft"].includes(j.function_name)).map((job) => {
              const cfg = getJobConfig(job.function_name);
              const isEmailJob = false;
              const isRunning = runNowMutation.isPending && runNowMutation.variables === job.function_name;
              const editState = editStateMap[job.id] || parseCron(job.schedule);

              return (
                <AccordionItem key={job.id} value={job.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm transition-all overflow-hidden">
                   <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                     {/* Row summary */}
                     <div className="flex items-center gap-4 flex-1 min-w-0">
                       <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          job.last_run_status === "success" ? "bg-emerald-500/10 text-emerald-500" :
                          job.last_run_status === "failure" ? "bg-red-500/10 text-red-500" :
                          job.last_run_status === "running" ? "bg-primary/10 text-primary" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                       }`}>
                         {job.last_run_status === "success" ? <CheckCircle2 className="h-5 w-5" /> : 
                          job.last_run_status === "failure" ? <AlertCircle className="h-5 w-5" /> : 
                          job.last_run_status === "running" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{job.job_name}</h3>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${cfg.badgeColor}`}>
                               {cfg.ai}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{cfg.desc}</p>
                       </div>
                     </div>

                     {/* Row actions & trigger */}
                     <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-0 border-zinc-100 dark:border-zinc-800 pt-3 md:pt-0">
                        <div className="flex flex-col items-start md:items-end">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase">{cronToHuman(job.schedule)}</span>
                           <span className="text-[10px] text-zinc-400">{job.last_run_at ? new Date(job.last_run_at).toLocaleString('cs-CZ') : "Nespuštěno"}</span>
                        </div>

                        <div className="flex items-center gap-3">
                           <div onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                              <Switch 
                                checked={job.is_active} 
                                onCheckedChange={(v) => updateMutation.mutate({ id: job.id, is_active: v })} 
                                className="data-[state=checked]:bg-primary"
                              />
                              <Button 
                                size="sm" 
                                onClick={() => runNowMutation.mutate(job.function_name)} 
                                disabled={isRunning} 
                                variant="secondary" 
                                className="h-8 text-xs font-bold gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg"
                              >
                                {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                Spustit
                              </Button>
                           </div>
                           <AccordionTrigger className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg no-underline [&[data-state=open]>svg]:rotate-180" />
                        </div>
                     </div>
                   </div>

                   <AccordionContent className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 pb-0">
                     <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Schedule Edit & Logs */}
                        <div className="space-y-5">
                           <div className="space-y-3">
                             <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Harmonogram spouštění</h4>
                             <div className="flex gap-2">
                               <Select 
                                 value={editState.freq} 
                                 onValueChange={(val) => setEditStateMap(p => ({ ...p, [job.id]: { ...editState, freq: val } }))}
                               >
                                 <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900"><SelectValue placeholder="Frekvence" /></SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="daily">Každý den</SelectItem>
                                   <SelectItem value="weekly_mon">Každé pondělí</SelectItem>
                                   <SelectItem value="weekly_fri">Každý pátek</SelectItem>
                                 </SelectContent>
                               </Select>
                               <Select 
                                 value={editState.hour} 
                                 onValueChange={(val) => setEditStateMap(p => ({ ...p, [job.id]: { ...editState, hour: val } }))}
                               >
                                 <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-900"><SelectValue placeholder="Čas" /></SelectTrigger>
                                 <SelectContent>
                                   {Array.from({ length: 24 }).map((_, i) => (
                                     <SelectItem key={i} value={i.toString()}>{i}:00</SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <Button 
                                 size="sm" 
                                 className="h-9 text-xs font-bold px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                 onClick={() => updateMutation.mutate({ id: job.id, schedule: buildCron(editState.hour, editState.freq) })}
                               >
                                 Uložit čas
                               </Button>
                             </div>
                           </div>
                           
                           {job.last_run_error && (
                             <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-mono overflow-x-auto">
                               {job.last_run_error}
                             </div>
                           )}
                        </div>
                     </div>
                   </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default AdminAutomationDashboard;
