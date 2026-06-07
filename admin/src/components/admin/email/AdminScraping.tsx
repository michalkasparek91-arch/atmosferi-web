import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Zap, Target, MapPin, Search, Database, Trash2, Send, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminScraping = () => {
  const queryClient = useQueryClient();
  const [webSearchingJobId, setWebSearchingJobId] = useState<string | null>(null);
  const [reviewJob, setReviewJob] = useState<any | null>(null);
  const [isPreparingBatch, setIsPreparingBatch] = useState(false);

  // Fetch Open Jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["admin-scraping-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id, 
          title, 
          city, 
          created_at,
          sniper_auto_approve,
          service_subcategories(name)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Reach Counts
  const { data: reachCountsMap } = useQuery({
    queryKey: ["admin-sniper-reach-counts-rpc"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_all_sniper_reach_counts");
      if (error) return {};
      const countsMap: Record<string, number> = {};
      data?.forEach((row: any) => {
        countsMap[row.job_id] = Number(row.reach_count);
      });
      return countsMap;
    },
  });

  // Fetch specific suitable workers when reviewing a job
  const { data: suitableWorkers, isLoading: workersLoading, refetch: refetchWorkers } = useQuery({
    queryKey: ["admin-suitable-workers", reviewJob?.id],
    enabled: !!reviewJob?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_suitable_workers_for_sniper', { p_job_id: reviewJob.id });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch outbox stats to calculate progress
  const { data: outboxStats, refetch: fetchOutboxStats } = useQuery({
    queryKey: ["admin-scraping-outbox-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_outbox")
        .select("job_id");
      if (error) throw error;
      
      const map: Record<string, number> = {};
      data?.forEach((row) => {
        if (!row.job_id) return;
        map[row.job_id] = (map[row.job_id] || 0) + 1;
      });
      return map;
    },
    refetchInterval: 15000,
  });

  const handleToggleAutoApprove = async (jobId: string, currentVal: boolean) => {
    try {
      const newVal = !currentVal;
      const { error } = await supabase
        .from("jobs")
        .update({ sniper_auto_approve: newVal })
        .eq("id", jobId);

      if (error) throw error;
      queryClient.setQueryData(["admin-scraping-jobs"], (old: any) => 
        old.map((j: any) => j.id === jobId ? { ...j, sniper_auto_approve: newVal } : j)
      );
      toast.success(newVal ? "Automatické schvalování zapnuto" : "Automatické schvalování vypnuto");
    } catch (err: any) {
      toast.error("Chyba při ukládání nastavení: " + err.message);
    }
  };

  const handleRunWebSniper = async (job: any) => {
    if (!job || !job.id) return;
    setWebSearchingJobId(job.id);
    toast.loading(`🌐 Prohledávám web (Google Grounding) pro zakázku „${job.title || 'Nespecifikováno'}“...`, { id: "web-sniper" });
    try {
      const res = await supabase.functions.invoke("autonomous-web-sniper", {
        body: { jobId: job.id, forceSearch: true }
      });
      if (res.error) throw new Error(res.error.message || "Chyba při volání AI");
      const data = res.data;
      toast.success(`🎯 AI objevila ${data?.discovered_count || 0} nových firem.`, { id: "web-sniper" });
      await fetchOutboxStats();
    } catch (err: any) {
      toast.error(`❌ Vyhledávání selhalo: ${err.message || err}`, { id: "web-sniper" });
    } finally {
      setWebSearchingJobId(null);
    }
  };

  const handleRemoveSubcategory = async (contactId: string, sourceType: string, subcatToRemove: string) => {
    try {
      const table = sourceType === "registered" ? "profiles" : "marketing_leads";
      const { data: currentRecord, error: fetchErr } = await supabase
        .from(table)
        .select("subcategory")
        .eq("id", contactId)
        .single();
      
      if (fetchErr) throw fetchErr;

      const currentList = currentRecord.subcategory ? currentRecord.subcategory.split(',').map((s: string) => s.trim()) : [];
      const newList = currentList.filter((s: string) => s !== subcatToRemove && s.toLowerCase() !== subcatToRemove.toLowerCase());
      const newSubcategoryStr = newList.join(', ');

      const { error: updateErr } = await supabase
        .from(table)
        .update({ subcategory: newSubcategoryStr })
        .eq("id", contactId);

      if (updateErr) throw updateErr;

      toast.success("Obor byl z kontaktu odstraněn.");
      queryClient.invalidateQueries({ queryKey: ["admin-suitable-workers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sniper-reach-counts-rpc"] });
    } catch (err: any) {
      toast.error("Chyba při odstraňování: " + err.message);
    }
  };

  const handlePrepareInternalBatch = async () => {
    if (!reviewJob || !suitableWorkers || suitableWorkers.length === 0) return;
    setIsPreparingBatch(true);
    let successCount = 0;

    try {
      // Zde použijeme standardní šablonu (nebo jakoukoliv defaultní)
      // pro příklad použijeme 'sniper-a-zvrdavost'
      for (const worker of suitableWorkers) {
        // Zkusíme najít, jestli už nemá outbox
        if (worker.outbox_id) continue;

        if (worker.phone) {
          // Vygenerování textové zprávy pro WhatsApp přímo na frontendu
          const firstName = worker.full_name ? worker.full_name.split(' ')[0] : 'Mistře';
          const subcategory = worker.matched_subcategory || reviewJob.service_subcategories?.name || 'architektura a design';
          
          const aiMessage = `Dobrý den, ${firstName},\n\nomlouvám se, že píšu napřímo. Na Atmosferi jsme před chvílí dostali novou poptávku na ${subcategory} v okolí (${reviewJob.city}) a napadlo mě, jestli by se Vám nehodila?\n\nDetaily projektu si můžete prohlédnout rovnou tady:\nhttps://atmosferi.com/sdilena-zakazka/${reviewJob.id}\n\nDejte mi prosím vědět, kdyby to pro Vás nebylo zajímavé.\n\nMějte fajn den,\nTým Atmosferi`;

          // Kontakt MÁ telefon -> odeslat do WhatsApp Outboxu pro validaci
          const { error } = await supabase.from("whatsapp_outbox").insert({
            lead_id: worker.contact_source === "registered" ? null : worker.id,
            craftsman_id: worker.contact_source === "registered" ? worker.id : null,
            job_id: reviewJob.id,
            phone_number: worker.phone,
            template_slug: "sniper-a-zvrdavost",
            ai_message: aiMessage,
            status: "pending_verification" // Bot si to zpracuje
          });
          
          if (!error) successCount++;
        } else {
          // Kontakt NEMÁ telefon -> přesměrovat rovnou na e-mail
          const { error } = await supabase.from("email_outbox").insert({
            lead_id: worker.contact_source === "registered" ? null : worker.id,
            worker_id: worker.contact_source === "registered" ? worker.id : null,
            job_id: reviewJob.id,
            template_slug: "sniper-a-zvrdavost",
            status: reviewJob.sniper_auto_approve ? "pending" : "draft",
          });

          if (!error) successCount++;
        }
      }

      toast.success(`Úspěšně připraveno ${successCount} zpráv do Outboxu.`);
      setReviewJob(null);
      fetchOutboxStats();
    } catch (err: any) {
      toast.error("Chyba při přípravě: " + err.message);
    } finally {
      setIsPreparingBatch(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!reviewJob) return;
    try {
      const subcategory = reviewJob.service_subcategories?.name || 'architektura a design';
      const aiMessage = `[TEST] Dobrý den,\n\ntoto je zkušební testovací zpráva. Na Atmosferi jsme před chvílí dostali novou poptávku na ${subcategory} v okolí (${reviewJob.city}).\n\nhttps://atmosferi.com/sdilena-zakazka/${reviewJob.id}\n\nMějte fajn den,\nTým Atmosferi`;

      const { error } = await supabase.from("whatsapp_outbox").insert({
        job_id: reviewJob.id,
        phone_number: "+420774217813",
        template_slug: "test-sniper",
        ai_message: aiMessage,
        status: "pending_verification"
      });

      if (error) throw error;
      toast.success("Testovací WhatsApp zpráva odeslána na +420774217813.");
    } catch (err: any) {
      toast.error("Chyba u testu: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans max-w-5xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Sběr kontaktů (AI Sniper)
        </h2>
        <p className="text-sm text-muted-foreground">
          Přehled aktuálních projektů a stavu automatického hledání subjektů na webu. Maximální limit je 30 objevených kontaktů na projekt.
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
        {jobsLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : jobs?.length === 0 ? (
          <div className="p-12 text-center bg-muted/10">
            <p className="text-sm text-muted-foreground font-medium">Momentálně nejsou aktivní žádné otevřené zakázky.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {jobs?.map((job) => {
              const subcatName = job.service_subcategories?.name || "Architektura a design";
              const totalScraped = outboxStats?.[job.id] || 0;
              const maxLimit = 30;
              const percent = Math.min(100, Math.round((totalScraped / maxLimit) * 100));
              const isSearching = webSearchingJobId === job.id;
              const isAutoApprove = job.sniper_auto_approve;

              return (
                <li key={job.id} className="flex flex-col md:flex-row md:items-center p-4 hover:bg-muted/20 transition-colors gap-4">
                  {/* Context Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {new Date(job.created_at).toLocaleDateString('cs-CZ')}
                      </span>
                      {totalScraped >= maxLimit && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                          LIMIT DOSAŽEN
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-[14px] font-semibold text-foreground truncate">
                      {job.title || subcatName}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary/60 shrink-0" /> {job.city}</span>
                      <span className="flex items-center gap-1"><Target className="h-3 w-3 text-primary/60 shrink-0" /> {subcatName}</span>
                    </div>
                  </div>

                  {/* Progress & Toggle */}
                  <div className="flex items-center gap-6 md:w-[45%] shrink-0">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-muted-foreground">Stav akvizice</span>
                        <span className="text-foreground">{totalScraped} / {maxLimit} firem</span>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 border-l border-border/40 pl-6 shrink-0 min-w-[120px]">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleToggleAutoApprove(job.id, isAutoApprove)}>
                        <span className={`text-[10px] font-bold uppercase ${isAutoApprove ? "text-primary" : "text-muted-foreground"}`}>
                          Auto-Approve
                        </span>
                        <Switch checked={isAutoApprove} onCheckedChange={() => handleToggleAutoApprove(job.id, isAutoApprove)} />
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0 flex items-center justify-end w-full md:w-auto mt-2 md:mt-0 gap-2">
                    {reachCountsMap ? (
                      <Button 
                        onClick={() => reachCountsMap[job.id] > 0 && setReviewJob(job)}
                        disabled={!reachCountsMap[job.id]}
                        variant="outline" 
                        size="sm"
                        className="h-9 px-3 rounded-xl font-semibold text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Database className="h-4 w-4 shrink-0" />
                        <span className="ml-1.5 hidden sm:inline">Interní DB ({reachCountsMap[job.id] || 0})</span>
                        <span className="ml-1.5 sm:hidden">{reachCountsMap[job.id] || 0}</span>
                      </Button>
                    ) : (
                      <Button 
                        disabled 
                        variant="outline" 
                        size="sm"
                        className="h-9 px-3 rounded-xl font-semibold text-xs border-primary/30 text-primary/50"
                      >
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      </Button>
                    )}

                    <Button 
                      onClick={() => handleRunWebSniper(job)}
                      disabled={isSearching || totalScraped >= maxLimit}
                      variant={totalScraped >= maxLimit ? "ghost" : "default"} 
                      size="sm"
                      className={`h-9 px-4 rounded-xl font-semibold text-xs shadow-sm ${totalScraped < maxLimit ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Zap className={`h-4 w-4 shrink-0 ${totalScraped < maxLimit ? "fill-white/20" : ""}`} />}
                      <span className="ml-1.5">{isSearching ? "Hledám..." : "Spustit hledání"}</span>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Internal DB Review Fullscreen Dialog */}
      <Dialog open={!!reviewJob} onOpenChange={(open) => !open && setReviewJob(null)}>
        <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none flex flex-col gap-0 border-none bg-background">
          <div className="p-6 md:p-8 border-b border-border/40 bg-card shrink-0 flex items-start justify-between">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                <Database className="h-7 w-7 text-primary" />
                Interní databáze: {reviewJob?.title}
              </DialogTitle>
              <DialogDescription className="text-base mt-2 max-w-3xl">
                Zde jsou zobrazeny všechny vhodné kontakty pro danou zakázku z vaší CRM databáze (v okruhu 50 km). Zkontrolujte popisy – pokud je někdo nevhodný, vyřaďte ho z oboru. Poté zařaďte zbytek k odeslání.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-0 flex-1 overflow-y-auto bg-muted/10">
            {workersLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : suitableWorkers?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-lg">
                Žádné vhodné kontakty v databázi.
              </div>
            ) : (
              <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-4">
                {suitableWorkers?.map((worker: any) => (
                  <div key={worker.id} className="p-5 md:p-6 flex flex-col md:flex-row gap-6 bg-card hover:bg-card/80 transition-colors border border-border/50 rounded-2xl shadow-sm">
                    {/* Left Column: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <Badge variant="outline" className={`text-[10px] font-bold tracking-wider h-5 px-2 uppercase ${worker.contact_source === 'registered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                          {worker.contact_source === 'registered' ? 'REGISTROVANÝ' : 'LEAD'}
                        </Badge>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" /> Shoda: {worker.matched_subcategory}
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-bold text-foreground mb-1">
                        {worker.full_name}
                      </h4>
                      
                      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-4 mb-4">
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary/70" /> {worker.city} ({Math.round(worker.distance_km)} km)</span>
                        <span className="flex items-center gap-1.5 font-medium text-foreground">{worker.email}</span>
                      </div>

                      {/* Description Block */}
                      {worker.description ? (
                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/40">
                          {worker.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic opacity-50">
                          Žádný popis není k dispozici.
                        </p>
                      )}
                    </div>
                    
                    {/* Right Column: Actions */}
                    <div className="shrink-0 flex items-center md:items-start justify-end md:w-48">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSubcategory(worker.id, worker.contact_source, worker.matched_subcategory)}
                        className="w-full h-10 text-sm text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 font-semibold"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Vyřadit z oboru
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 md:p-8 border-t border-border/40 bg-card flex flex-col-reverse md:flex-row md:items-center justify-between shrink-0 gap-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <Button variant="outline" size="lg" onClick={() => setReviewJob(null)} className="rounded-xl px-8 font-semibold w-full md:w-auto">
              Zavřít panel
            </Button>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              <Button 
                variant="secondary"
                size="lg"
                onClick={handleTestWhatsApp} 
                className="rounded-xl px-6 gap-2 font-bold bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-500/20 w-full md:w-auto"
              >
                <MessageSquare className="h-5 w-5" />
                Test (+420774217813)
              </Button>
              <Button 
                size="lg"
                onClick={handlePrepareInternalBatch} 
                disabled={isPreparingBatch || !suitableWorkers || suitableWorkers.length === 0}
                className="rounded-xl px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg text-base font-bold w-full md:w-auto"
              >
                {isPreparingBatch ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Vytvořit koncepty ({suitableWorkers?.length || 0})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
