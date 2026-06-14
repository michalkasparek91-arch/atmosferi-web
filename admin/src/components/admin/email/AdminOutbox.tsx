import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Send, Trash2, Edit3, User, Sparkles, Layout, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ModularEmailEditorDialogInner } from "./ModularEmailEditor";
import CampaignReview from "@/components/admin/CampaignReview";

export const AdminOutbox = () => {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingBatch, setSendingBatch] = useState(false);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [editedIcebreaker, setEditedIcebreaker] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);
  const [isOpeningEditor, setIsOpeningEditor] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "job" | "general" | "campaigns">("all");

  const { data: virtualBatches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["admin-outbox-batches"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("campaign-batcher", {
        body: { action: "get_batches" }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data || [];
    },
  });

  const sendBatchMutation = useMutation({
    mutationFn: async ({ template_id, batch_size }: { template_id: string, batch_size: number }) => {
      const { data, error } = await supabase.functions.invoke("campaign-batcher", {
        body: { action: "process_batch", template_id, batch_size }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Dávka úspěšně zpracována a odeslána (${data?.processed || 0} e-mailů).`);
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-drafts"] });
    },
    onError: (err: any) => {
      toast.error("Chyba při odesílání dávky: " + err.message);
    }
  });
  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["admin-outbox-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_outbox")
        .select(`
          *,
          lead:marketing_leads(id, full_name, email, company_name),
          worker:profiles(id, full_name, email),
          job:jobs(title, city, description, budget_min, budget_max, price_note, service_subcategories(name, category_form))
        `)
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === drafts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(drafts.map((d: any) => d.id)));
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;
    setSendingBatch(true);
    try {
      const idsArray = Array.from(selectedIds);
      const { error } = await supabase
        .from('email_outbox')
        .update({ status: 'pending' })
        .in('id', idsArray);

      if (error) throw error;
      
      toast.success(`Schváleno do fronty k odeslání (${idsArray.length}). Odešle se automaticky.`);
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-drafts"] });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error("Chyba při přesunu: " + err.message);
    } finally {
      setSendingBatch(false);
    }
  };

  const handleRecoverPending = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("campaign-batcher", {
        body: { action: "recover_pending" }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`Skryté maily (${data?.recovered || 0}) byly vráceny do konceptů.`);
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-batches"] });
    } catch (err: any) {
      toast.error("Chyba při obnově: " + err.message);
    }
  };

  const handleSendImmediately = async (customIds?: string[]) => {
    const idsToSend = customIds || Array.from(selectedIds);
    if (idsToSend.length === 0) return;
    setSendingBatch(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-sniper-outbox", {
        body: { action: "send_selected_drafts", draftIds: idsToSend }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`Úspěšně odesláno ihned! (Odesláno: ${data?.sent_count || 0}, Chyb: ${data?.failed_count || 0})`);
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-drafts"] });
      setSelectedIds(new Set());
      setEditingDraft(null);
    } catch (err: any) {
      toast.error("Chyba při odesílání: " + err.message);
    } finally {
      setSendingBatch(false);
    }
  };

  const handleSendTest = async (customIds?: string[]) => {
    const idsToSend = customIds || Array.from(selectedIds);
    if (idsToSend.length === 0) return;
    setSendingBatch(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-sniper-outbox", {
        body: { action: "send_selected_drafts", draftIds: idsToSend, targetEmail: "michal.kasparek91@gmail.com" }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success(`Testovací e-mail odeslán na michal.kasparek91@gmail.com (Odesláno: ${data?.sent_count || 0})`);
    } catch (err: any) {
      toast.error("Chyba při odesílání testu: " + err.message);
    } finally {
      setSendingBatch(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const idsArray = Array.from(selectedIds);
      const { error } = await supabase
        .from("email_outbox")
        .delete()
        .in("id", idsArray);

      if (error) throw error;
      toast.success(`Smazáno ${idsArray.length} konceptů`);
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-drafts"] });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error("Chyba při mazání: " + err.message);
    }
  };

  const handleSaveIcebreaker = async () => {
    if (!editingDraft) return;
    try {
      const { error } = await supabase
        .from("email_outbox")
        .update({ icebreaker: editedIcebreaker })
        .eq("id", editingDraft.id);

      if (error) throw error;
      toast.success("Text upraven");
      queryClient.setQueryData(["admin-outbox-drafts"], (old: any) => 
        old.map((d: any) => d.id === editingDraft.id ? { ...d, icebreaker: editedIcebreaker } : d)
      );
      setEditingDraft(null);
    } catch (err: any) {
      toast.error("Chyba: " + err.message);
    }
  };

  const handleQuickApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_outbox')
        .update({ status: 'pending' })
        .eq('id', id);

      if (error) throw error;
      toast.success("Schváleno k odeslání");
      queryClient.invalidateQueries({ queryKey: ["admin-outbox-drafts"] });
      setEditingDraft(null);
    } catch (err: any) {
      toast.error("Chyba: " + err.message);
    }
  };

  const handleRegenerateIcebreaker = async () => {
    if (!editingDraft) return;
    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-icebreaker", {
        body: { outboxId: editingDraft.id }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.icebreaker) {
        setEditedIcebreaker(data.icebreaker);
        toast.success("Nové oslovení vygenerováno (zatím neuloženo)");
      }
    } catch (err: any) {
      toast.error("Chyba při generování: " + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOpenEditor = async (draft: any) => {
    setIsOpeningEditor(draft.id);
    try {
      let templateData: any = {};
      if (draft.template_id) {
        const { data: template } = await supabase.from("email_templates").select("*").eq("id", draft.template_id).single();
        if (template) templateData = template;
      } else if (draft.template_slug) {
        const { data: template } = await supabase.from("email_templates").select("*").eq("slug", draft.template_slug).single();
        if (template) templateData = template;
      }
      const mergedDraft: any = { ...draft };
      
      Object.keys(templateData).forEach(key => {
        if (["id", "created_at", "status", "lead_id", "job_id", "worker_id", "icebreaker", "sent_at"].includes(key)) return;
        
        if (templateData[key] !== null && templateData[key] !== undefined) {
          mergedDraft[key] = templateData[key];
        }
      });
      
      // Map 'body' from template to both 'body' and 'full_body' for compatibility
      if (templateData.body) {
        mergedDraft.body = templateData.body;
        mergedDraft.full_body = templateData.body;
      }
      
      mergedDraft.id = draft.id;
      setPreviewDraft(mergedDraft);
    } catch (e: any) {
      toast.error("Nelze načíst šablonu: " + e.message);
    } finally {
      setIsOpeningEditor(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans w-full pb-24">
      {/* Filters (Sablony style) */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button 
          onClick={() => setFilterType("all")}
          className={`flex-1 min-w-[100px] p-2.5 rounded-md border transition-all text-left ${filterType === "all" ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20" : "bg-card text-card-foreground border-border hover:border-primary/30 shadow-sm"}`}
        >
          <div className="flex items-center justify-between mb-0.5">
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filterType === "all" ? "font-black" : "text-muted-foreground"}`}>Vše</p>
          </div>
          <p className={`text-xl font-black ${filterType === "all" ? "" : "text-foreground/80"}`}>{drafts.length}</p>
        </button>

        <button 
          onClick={() => setFilterType("job")}
          className={`flex-1 min-w-[100px] p-2.5 rounded-md border transition-all text-left ${filterType === "job" ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20" : "bg-card text-card-foreground border-border hover:border-primary/30 shadow-sm"}`}
        >
          <div className="flex items-center justify-between mb-0.5">
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filterType === "job" ? "font-black" : "text-muted-foreground"}`}>Pro zakázku</p>
          </div>
          <p className={`text-xl font-black ${filterType === "job" ? "" : "text-foreground/80"}`}>{drafts.filter((d: any) => d.job_id).length}</p>
        </button>

        <button 
          onClick={() => setFilterType("general")}
          className={`flex-1 min-w-[100px] p-2.5 rounded-md border transition-all text-left ${filterType === "general" ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20" : "bg-card text-card-foreground border-border hover:border-primary/30 shadow-sm"}`}
        >
          <div className="flex items-center justify-between mb-0.5">
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filterType === "general" ? "font-black" : "text-muted-foreground"}`}>Volný nábor</p>
          </div>
          <p className={`text-xl font-black ${filterType === "general" ? "" : "text-foreground/80"}`}>{drafts.filter((d: any) => !d.job_id).length}</p>
        </button>

        <button 
          onClick={() => setFilterType("campaigns")}
          className={`flex-1 min-w-[100px] p-2.5 rounded-md border transition-all text-left ${filterType === "campaigns" ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20" : "bg-card text-card-foreground border-border hover:border-primary/30 shadow-sm"}`}
        >
          <div className="flex items-center justify-between mb-0.5">
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filterType === "campaigns" ? "font-black" : "text-muted-foreground"}`}>Kampaně</p>
          </div>
          <p className={`text-xl font-black ${filterType === "campaigns" ? "" : "text-foreground/80"}`}>—</p>
        </button>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRecoverPending} className="text-xs text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50">
          <RefreshCw className="w-3 h-3 mr-2" /> Opravit skryté (odeslané) dávky zpět do konceptů
        </Button>
      </div>

      {filterType === "campaigns" ? (
        <div className="bg-card/50 rounded-2xl border border-border/40 p-4">
          <CampaignReview />
        </div>
      ) : filterType === "general" ? (
        <div className="space-y-4">
          {isLoadingBatches ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : virtualBatches.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center bg-card rounded-2xl border border-border/40">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Žádné nové publikum</p>
              <p className="text-xs text-muted-foreground mt-1">Nebyly nalezeny žádné nové kontakty čekající na oslovení.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {virtualBatches.map((v: any, index: number) => (
                <div key={index} className="flex flex-col space-y-3 border border-border/40 bg-card rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">{v.template.name}</h3>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-700">{v.template.language?.toUpperCase()}</Badge>
                        <Badge variant="outline" className="text-[9px]">{v.template.category}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Celkové dostupné publikum: <strong className="text-foreground">{v.total_audience}</strong>
                  </div>

                  <div className="space-y-2 mt-2">
                    {v.batches.map((batch: any, bIdx: number) => (
                      <div key={bIdx} className={`flex items-center justify-between p-2.5 rounded-xl border ${batch.status === 'ready' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                        <div>
                          <p className="text-xs font-bold">Dávka #{batch.batch_index}</p>
                          <p className={`text-[10px] ${batch.status === 'ready' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {batch.status === 'ready' ? 'Připraveno (300/300)' : `Čeká se na naplnění (${batch.size}/300)`}
                          </p>
                        </div>
                        {batch.status === 'ready' && (
                          <Button 
                            size="sm" 
                            className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-3 gap-1 shadow-sm"
                            disabled={sendBatchMutation.isPending}
                            onClick={() => sendBatchMutation.mutate({ template_id: v.template.id, batch_size: batch.size })}
                          >
                            {sendBatchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Odeslat
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
        {drafts.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b border-border/30">
            <input 
              type="checkbox" 
              checked={selectedIds.size > 0 && selectedIds.size === drafts.length} 
              onChange={toggleAll}
              className="w-4 h-4 rounded border-border/60 bg-background accent-primary cursor-pointer" 
            />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Vybrat vše ({drafts.length})
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">Žádné koncepty ke schválení</p>
            <p className="text-xs text-muted-foreground mt-1">Všechny e-maily byly zpracovány.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {drafts.filter((d: any) => filterType === "all" ? true : filterType === "job" ? !!d.job_id : !d.job_id).length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <p className="text-sm font-semibold text-foreground">Žádné koncepty v této kategorii</p>
              </div>
            ) : drafts.filter((d: any) => filterType === "all" ? true : filterType === "job" ? !!d.job_id : !d.job_id).map((draft: any) => {
              const isSel = selectedIds.has(draft.id);
              const name = draft.worker?.full_name || draft.lead?.company_name || draft.lead?.full_name || "Neznámý";
              const email = draft.worker?.email || draft.lead?.email;
              const subcatName = draft.job?.service_subcategories?.name || "Neznámý obor";

              return (
                <li 
                  key={draft.id}
                  className={`group flex items-start gap-4 p-4 transition-colors cursor-pointer ${isSel ? "bg-primary/5" : "hover:bg-muted/20"}`}
                  onClick={() => {
                    setEditingDraft(draft);
                    setEditedIcebreaker(draft.icebreaker || "");
                  }}
                >
                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={isSel} 
                      onChange={() => toggleSelection(draft.id)}
                      className="w-4 h-4 rounded border-border/60 bg-background accent-primary cursor-pointer" 
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col md:flex-row gap-4">
                    {/* Recipient Info */}
                    <div className="md:w-1/3 shrink-0">
                      <div className="flex items-center gap-2 mb-1">
                        {draft.worker ? (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">REGISTROVANÝ</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">WEB AKVIZICE</Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground truncate">{name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>

                    {/* Context & Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {draft.job_id ? (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded-full">
                            Zakázka: {draft.job?.title || subcatName} ({draft.job?.city})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Volný nábor: {subcatName}
                          </span>
                        )}
                        
                        {/* Template Pill */}
                        <Badge 
                          variant="secondary" 
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 gap-1 cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors border border-border/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditor(draft);
                          }}
                        >
                          {isOpeningEditor === draft.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Layout className="h-3 w-3" />
                          )}
                          {draft.template?.name || draft.template_slug || "Bez šablony"}
                        </Badge>
                      </div>
                      <p className="text-[13px] text-foreground/90 leading-relaxed line-clamp-2">
                        <Sparkles className="h-3.5 w-3.5 inline-block text-primary/70 mr-1.5 -mt-0.5" />
                        {draft.icebreaker || "(Žádný AI text)"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}

        {/* FLOATING ACTION BAR */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300 w-[95vw] md:w-auto max-w-full">
            <div className="bg-background/95 backdrop-blur-md border border-border/60 shadow-2xl rounded-full px-3 md:px-6 py-2 md:py-3 flex flex-row items-center gap-2 md:gap-6 overflow-x-auto no-scrollbar justify-between md:justify-center">
              <span className="text-xs md:text-sm font-bold text-foreground shrink-0 pl-1 md:pl-0">
                Vybráno {selectedIds.size}
              </span>
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0 pr-1 md:pr-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 md:h-9 md:w-9 rounded-full text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={handleDeleteSelected}
                  title="Smazat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 md:h-9 px-3 md:px-4 rounded-full text-[10px] md:text-xs font-bold gap-1.5 md:gap-2 shadow-sm border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 shrink-0 hover:bg-zinc-900 hover:text-zinc-50 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
                  onClick={handleApproveSelected}
                  disabled={sendingBatch}
                >
                  {sendingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layout className="h-3.5 w-3.5" />}
                  Do fronty
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  className="h-8 md:h-9 px-3 md:px-4 rounded-full text-[10px] md:text-xs font-bold gap-1.5 md:gap-2 shadow-sm border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 shrink-0 hover:bg-zinc-900 hover:text-zinc-50 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
                  onClick={() => handleSendTest()}
                  disabled={sendingBatch}
                >
                  {sendingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  Test
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 md:h-9 px-3 md:px-4 rounded-full bg-primary text-primary-foreground text-[10px] md:text-xs font-bold gap-1.5 md:gap-2 shadow-md hover:bg-primary/90 shrink-0"
                  onClick={() => handleSendImmediately()}
                  disabled={sendingBatch}
                >
                  {sendingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Odeslat ihned
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* SLIDE-OVER EDIT PANEL */}
      <Sheet open={!!editingDraft} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <SheetContent className="w-screen max-w-full sm:max-w-md border-border/40 p-0 flex flex-col">
          <div className="p-6 border-b border-border/40 bg-muted/10">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Edit3 className="h-5 w-5 text-primary" />
                Úprava oslovení
              </SheetTitle>
              <SheetDescription>
                Rychlá revize AI textu před odesláním. Zbytek e-mailu je generován ze šablony.
              </SheetDescription>
            </SheetHeader>
          </div>
          
          {editingDraft && (
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-1 bg-primary/5 p-4 rounded-xl border border-primary/10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Příjemce</p>
                <p className="font-semibold text-sm">
                  {editingDraft.worker?.full_name || editingDraft.lead?.company_name || editingDraft.lead?.full_name}
                </p>
                <p className="text-xs text-muted-foreground">{editingDraft.worker?.email || editingDraft.lead?.email}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    AI Icebreaker (1-2 věty)
                  </label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRegenerateIcebreaker}
                    disabled={isRegenerating}
                    className="h-7 text-[10px] px-2.5 font-bold gap-1.5 rounded-full"
                  >
                    {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Přegenerovat
                  </Button>
                </div>
                <Textarea 
                  value={editedIcebreaker}
                  onChange={(e) => setEditedIcebreaker(e.target.value)}
                  className="min-h-[150px] resize-none text-sm leading-relaxed border-border/50 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          )}

          <div className="p-6 border-t border-border/40 bg-background flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
            <Button variant="outline" onClick={() => setEditingDraft(null)} className="rounded-full w-full sm:w-auto">
              Zrušit
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={handleSaveIcebreaker} className="rounded-full gap-2">
                Uložit text
              </Button>
              <Button onClick={() => { handleSaveIcebreaker(); handleQuickApprove(editingDraft?.id); }} className="rounded-full gap-2" variant="outline">
                <Layout className="h-4 w-4" /> Uložit do fronty
              </Button>
              <Button onClick={() => { 
                const currentId = editingDraft?.id;
                handleSaveIcebreaker().then(() => {
                  if (currentId) handleSendTest([currentId]);
                });
              }} className="rounded-full gap-2 border-blue-500/30 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20" variant="outline">
                <Mail className="h-4 w-4" /> Odeslat test
              </Button>
              <Button onClick={() => { 
                const currentId = editingDraft?.id;
                handleSaveIcebreaker().then(() => {
                  if (currentId) handleSendImmediately([currentId]);
                });
              }} className="rounded-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Send className="h-4 w-4" /> Odeslat ihned
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* MODULAR EMAIL EDITOR PREVIEW */}
      {previewDraft && (
        <ModularEmailEditorDialogInner
          mode="outbox"
          isOpen={!!previewDraft}
          initialData={previewDraft}
          onClose={() => setPreviewDraft(null)}
          onSave={async (data) => {
            try {
              const { error } = await supabase.from("email_outbox").update({
                icebreaker: data.icebreaker,
              }).eq("id", previewDraft.id);
              if (error) throw error;
              toast.success("Změny uloženy");
              queryClient.invalidateQueries({ queryKey: ["admin-outbox-drafts"] });
              setPreviewDraft(null);
            } catch (err: any) {
              toast.error("Chyba při ukládání: " + err.message);
            }
          }}
        />
      )}
    </div>
  );
};
