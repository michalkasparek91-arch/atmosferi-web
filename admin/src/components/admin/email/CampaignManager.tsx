import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Users, Zap, Settings2, Info, Search, X, Loader2, 
  Tag, ArrowUpRight, Monitor, Smartphone, Send, Save, Edit3, Mail,
  ArrowRight, Trash2, Repeat, FileText, Sparkles, HelpCircle, Target
} from "lucide-react";
import { CITY_COORDINATES } from "@/lib/city-regions";

// NOTE: This component receives its state and handlers from the parent to avoid breaking existing logic
// but presents them in a much cleaner, more organized way.

interface CampaignManagerProps {
  campaignMode: "broadcast" | "sniper";
  setCampaignMode: (mode: "broadcast" | "sniper") => void;
  // ... other props from AdminEmails ...
  [key: string]: any; 
}

export const CampaignManager = (props: any) => {
  const {
    campaignMode, setCampaignMode,
    target, setTarget,
    estimatedCount,
    campaignFilterCategory, setCampaignFilterCategory,
    campaignFilterSubcategory, setCampaignFilterSubcategory,
    categories,
    subcategories,
    city, setCity,
    radius, setRadius,
    activity, setActivity,
    credits, setCredits,
    availableTags,
    selectedTags, setSelectedTags,
    // Sniper props
    sniperJobId, setSniperJobId, applyJobToCampaign,
    openJobs, jobsLoading,
    editingCategoryForm, setEditingCategoryForm,
    updateCategoryFormMutation,
    hideContacted, setHideContacted,
    sniperRadius, setSniperRadius,
    suitableWorkers, workersLoading,
    workerSearch, setWorkerSearch,
    selectedSniperWorkers, setSelectedSniperWorkers,
    contactedEmails,
    // Editor props
    subject, setSubject,
    templateType, setTemplateType,
    previewDevice, setPreviewDevice,
    HtmlContent, // Renderer component
    handleSend,
    isSending,
    setSaveTemplateOpen,
    openEditor,
    emailTemplates,
    selectedTemplateId,
    handleSelectTemplate,
    queryClient
  } = props;

  const [workerPopupOpen, setWorkerPopupOpen] = useState(false);
  const [popupSearch, setPopupSearch] = useState("");
  const [reassigningContactId, setReassigningContactId] = useState<string | null>(null);
  const [newCatId, setNewCatId] = useState("all");
  const [newSubcatId, setNewSubcatId] = useState("all");
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const filteredPopupWorkers = suitableWorkers?.filter((w: any) => {
    if (!popupSearch) return true;
    const term = popupSearch.toLowerCase();
    return (w.full_name?.toLowerCase().includes(term) || w.email?.toLowerCase().includes(term) || w.city?.toLowerCase().includes(term) || w.description?.toLowerCase().includes(term));
  });

  const handleDelistContact = async (w: any) => {
    const confirmDelist = window.confirm(`Opravdu chcete trvale vyřadit kontakt ${w.full_name || w.email} z této subkategorie?`);
    if (!confirmDelist) return;

    try {
      if (w.contact_source === "lead") {
        const { error } = await supabase.from("marketing_leads").update({
          subcategory: null
        }).eq("id", w.id);
        if (error) throw error;
      } else if (w.contact_source === "registered") {
        const job = openJobs?.find((j: any) => j.id === sniperJobId);
        if (job?.subcategory_id) {
          await supabase.from("worker_services")
            .delete()
            .eq("worker_id", w.id)
            .eq("subcategory_id", job.subcategory_id);
        }
      }
      queryClient?.invalidateQueries({ queryKey: ["admin-suitable-workers"] });
      toast.success(`Kontakt ${w.full_name || w.email} byl vyřazen z této subkategorie.`);
    } catch (err) {
      toast.error("Chyba při vyřazování kontaktu.");
    }
  };

  const handleOpenReassignModal = (w: any) => {
    const job = openJobs?.find((j: any) => j.id === sniperJobId);
    if (job?.subcategory_id) {
      const currentSubcat = subcategories?.find((s: any) => s.id === job.subcategory_id);
      if (currentSubcat?.category_id) {
        setNewCatId(currentSubcat.category_id);
      }
    }
    setReassigningContactId(w.id);
  };

  const handleReassignContact = async (w: any) => {
    if (newSubcatId === "all") {
      toast.error("Vyberte prosím cílovou podkategorii.");
      return;
    }
    setIsUpdatingCategory(true);
    try {
      if (w.contact_source === "lead") {
        const { error } = await supabase.from("marketing_leads").update({
          subcategory: newSubcatId
        }).eq("id", w.id);
        if (error) throw error;
      } else if (w.contact_source === "registered") {
        const job = openJobs?.find((j: any) => j.id === sniperJobId);
        if (job?.subcategory_id) {
          await supabase.from("worker_services")
            .delete()
            .eq("worker_id", w.id)
            .eq("subcategory_id", job.subcategory_id);
        }
        await supabase.from("worker_services").insert({
          worker_id: w.id,
          subcategory_id: newSubcatId
        });
      }
      queryClient?.invalidateQueries({ queryKey: ["admin-suitable-workers"] });
      toast.success(`Kontakt ${w.full_name || w.email} byl úspěšně přeřazen.`);
      setReassigningContactId(null);
    } catch (err) {
      toast.error("Chyba při přeřazování kontaktu.");
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Dynamically filter open jobs based on selected category and subcategory
  const filteredOpenJobs = openJobs?.filter((job: any) => {
    if (campaignFilterSubcategory !== "all") {
      return job.subcategory_id === campaignFilterSubcategory;
    }
    if (campaignFilterCategory !== "all") {
      const subcat = subcategories?.find((s: any) => s.id === job.subcategory_id);
      return subcat?.category_id === campaignFilterCategory;
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-in fade-in duration-500">
      {/* LEFT COLUMN: Controls */}
      <div className="space-y-6">
        {/* HEADER / TOP ACTIONS */}
        <div className="flex items-center justify-between gap-3 w-full mb-2">
          <div>
            <button 
              onClick={() => setHelpOpen(true)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-muted/80 active:scale-95 transition-all rounded-xl border border-border/40 bg-background/50 shadow-sm"
              title="Vysvětlení funkčnosti sekce"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setSaveTemplateOpen(true)}
              className="rounded-xl h-9 px-3 text-[11px] font-bold border-border/80 hover:bg-muted/40 transition-all shadow-sm"
            >
              <Save className="h-3.5 w-3.5 mr-1.5 text-primary" /> Uložit šablonu
            </Button>
            <Button 
              onClick={handleSend}
              disabled={isSending || (campaignMode === "sniper" && (!selectedSniperWorkers || selectedSniperWorkers.length === 0))}
              className="rounded-xl h-9 px-4 text-[11px] font-bold shadow-sm hover:scale-[1.02] transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              {isSending ? "Odesílání..." : `Odeslat kampaň (${campaignMode === "sniper" ? (selectedSniperWorkers?.length || 0) : (estimatedCount || 0)})`}
            </Button>
          </div>
        </div>

        {/* TEMPLATE SELECTOR CARD */}
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/30">
            <CardTitle className="text-xs font-bold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Výběr e-mailové šablony
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Předpřipravená šablona</Label>
              <Select value={selectedTemplateId || "custom"} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border/80 font-bold shadow-sm">
                  <SelectValue placeholder="Vyberte šablonu pro načtení..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="custom" className="font-semibold text-primary">-- Vlastní obsah (nebo upravený) --</SelectItem>
                  {emailTemplates?.filter((t: any) => {
                    const isSniper = t.slug?.toLowerCase().includes("sniper") || t.category?.toLowerCase() === "sniper" || t.layout_type === "sniper";
                    return campaignMode === "sniper" ? isSniper : !isSniper;
                  }).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span>{t.emoji || "📧"}</span>
                        <span className="font-bold">{t.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">({t.subject || "bez předmětu"})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/30">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Definice publika
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2 pr-3 border-r border-border/40">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Sniper</Label>
                  <Switch 
                    checked={campaignMode === "sniper"} 
                    onCheckedChange={(checked) => setCampaignMode(checked ? "sniper" : "broadcast")} 
                    className="scale-75 data-[state=checked]:bg-primary"
                  />
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[10px] font-black">
                  REACH: {estimatedCount || 0}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Common Category and Subcategory Filters (Applies to both Sniper & Broadcast) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/30 rounded-2xl border border-border/60">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-muted-foreground ml-1 uppercase tracking-wider">Kategorie</Label>
                <Select 
                  value={campaignFilterCategory} 
                  onValueChange={(val) => {
                    setCampaignFilterCategory(val);
                    setCampaignFilterSubcategory("all"); // Reset subcategory when category changes
                  }}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 font-semibold shadow-sm">
                    <SelectValue placeholder="Všechny kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny kategorie</SelectItem>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-muted-foreground ml-1 uppercase tracking-wider">Podkategorie</Label>
                <Select 
                  value={campaignFilterSubcategory} 
                  onValueChange={setCampaignFilterSubcategory}
                  disabled={campaignFilterCategory === "all"}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 font-semibold shadow-sm">
                    <SelectValue placeholder={campaignFilterCategory === "all" ? "Vyberte nejdříve kategorii" : "Všechny podkategorie"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny podkategorie</SelectItem>
                    {subcategories
                      ?.filter((s: any) => s.category_id === campaignFilterCategory)
                      .map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {campaignMode === "broadcast" ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground/70 ml-1">Segment</Label>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workers">Pouze Profíci</SelectItem>
                        <SelectItem value="customers">Pouze Zákazníci</SelectItem>
                        <SelectItem value="pro">Pouze PRO členové</SelectItem>
                        <SelectItem value="all">Všichni registrovaní</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground/70 ml-1">Štítky</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 w-full justify-between text-xs rounded-xl bg-background border-border/60">
                          <span className="truncate">{selectedTags.length > 0 ? `${selectedTags.length} vybráno` : "Všechny"}</span>
                          <Tag className="h-3.5 w-3.5 opacity-40" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 rounded-2xl">
                         <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Dostupné štítky</p>
                            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                              {availableTags?.map((tag: string) => (
                                <button 
                                  key={tag}
                                  onClick={() => setSelectedTags(selectedTags.includes(tag) ? selectedTags.filter((t: string) => t !== tag) : [...selectedTags, tag])}
                                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${selectedTags.includes(tag) ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground hover:border-primary/30"}`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                         </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground/70 ml-1">Lokalita / Město</Label>
                    <Select value={city || "all"} onValueChange={(val) => setCity(val === "all" ? "" : val)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 font-medium">
                        <SelectValue placeholder="Celá ČR" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Celá ČR</SelectItem>
                        {Object.keys(CITY_COORDINATES || {}).sort().map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground/70 ml-1">Dosah v okolí (km)</Label>
                    <Select value={radius || "50"} onValueChange={setRadius} disabled={!city || city === "all"}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 font-medium">
                        <SelectValue placeholder="Dosah (km)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">+ 10 km</SelectItem>
                        <SelectItem value="25">+ 25 km</SelectItem>
                        <SelectItem value="50">+ 50 km</SelectItem>
                        <SelectItem value="100">+ 100 km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                    <Info className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] text-primary/80 leading-relaxed font-medium">
                    Tato kampaň bude odeslána na celou vybranou skupinu s odpovídající kategorií a podkategorií. Systém automaticky vyfiltruje uživatele bez marketingového souhlasu.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground/70 ml-1">Zdrojová zakázka</Label>
                    <Select value={sniperJobId} onValueChange={(val) => { setSniperJobId(val); applyJobToCampaign?.(val); }}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 font-semibold shadow-sm truncate">
                        <SelectValue placeholder={jobsLoading ? "Načítám zakázky..." : "Vyberte zakázku"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredOpenJobs?.map((job: any) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title || (job as any).service_subcategories?.name} ({job.city})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground/70 ml-1">Maximální vzdálenost (km)</Label>
                    <Select value={sniperRadius} onValueChange={setSniperRadius}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 font-medium shadow-sm">
                        <SelectValue placeholder="Vzdálenost" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">do 10 km</SelectItem>
                        <SelectItem value="15">do 15 km</SelectItem>
                        <SelectItem value="25">do 25 km</SelectItem>
                        <SelectItem value="50">do 50 km</SelectItem>
                        <SelectItem value="100">do 100 km</SelectItem>
                        <SelectItem value="all">Celá ČR (bez omezení)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Premium Workers Summary Card / Button */}
                <div 
                  onClick={() => setWorkerPopupOpen(true)}
                  className="p-5 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 text-white dark:text-zinc-900 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.01] transition-all flex items-center justify-between group border border-zinc-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-xl shrink-0">
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">Příjemci k oslovení</span>
                        <Badge variant="secondary" className="bg-white/20 dark:bg-black/10 text-white dark:text-zinc-900 border-none font-bold">
                          {selectedSniperWorkers?.length || 0} z {suitableWorkers?.length || 0} vybráno
                        </Badge>
                      </div>
                      <p className="text-xs font-medium opacity-80 mt-1 max-w-md">
                        Kliknutím zobrazíte celý seznam profíků s popisem činnosti, vyřazením či přeřazením do jiné subkategorie.
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-white dark:text-zinc-900 group-hover:translate-x-1 transition-transform font-bold text-xs shrink-0">
                    Otevřít seznam <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Editor Logic would go here or stay in main if too complex */}
      </div>

      {/* RIGHT COLUMN: Live Preview & Send */}
      <div className="space-y-6">
        <Card className="border-border/50 shadow-xl overflow-hidden bg-card/80 backdrop-blur-md sticky top-6">
          <CardHeader className="py-3 px-3 sm:px-4 border-b border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-background/50">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex bg-muted p-1 rounded-xl border border-border/40 shrink-0">
                <button 
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-lg transition-all ${previewDevice === "desktop" ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground"}`}
                  title="Náhled na počítači"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-lg transition-all ${previewDevice === "mobile" ? "bg-background shadow-sm text-primary font-bold" : "text-muted-foreground"}`}
                  title="Náhled na mobilu"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">Živý náhled</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-wrap">
               <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-primary px-2.5 sm:px-3 shrink-0" onClick={openEditor}>
                 <Edit3 className="h-3.5 w-3.5 sm:mr-1.5 shrink-0" />
                 <span className="hidden sm:inline">Upravit obsah</span>
                 <span className="sm:hidden">Upravit</span>
               </Button>
               <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-primary px-2.5 sm:px-3 shrink-0" onClick={() => setSaveTemplateOpen(true)}>
                 <Save className="h-3.5 w-3.5 sm:mr-1.5 shrink-0" />
                 <span className="hidden sm:inline">Uložit šablonu</span>
                 <span className="sm:hidden">Uložit</span>
               </Button>
               <Button 
                 className="h-8 rounded-xl px-3 sm:px-4 text-xs font-bold shadow-sm gap-1.5 shrink-0"
                 disabled={isSending}
                 onClick={handleSend}
               >
                 {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Send className="h-3.5 w-3.5 shrink-0" />}
                 <span>{campaignMode === "sniper" ? "Spustit náběr" : "Odeslat všem"}</span>
               </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-muted/40 dark:bg-zinc-950/50 flex justify-center transition-colors border-t border-border/50">
            <div className={`transition-all duration-500 shadow-2xl my-6 bg-background dark:bg-zinc-900 overflow-hidden ${previewDevice === "mobile" ? "w-[320px] rounded-[32px] border-[8px] border-zinc-800 min-h-[560px]" : "w-full max-w-[600px] rounded-xl border border-border"}`}>
              <div className="bg-muted/50 dark:bg-zinc-950 px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-rose-500/80" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <div className="bg-background dark:bg-zinc-900 text-foreground rounded-md border border-border px-3 py-0.5 text-[9px] font-medium flex-1 truncate shadow-sm">
                  Předmět: {subject || "Bez předmětu"}
                </div>
              </div>
              <div className={`overflow-y-auto ${previewDevice === "mobile" ? "h-[500px]" : "h-[600px]"}`}>
                <HtmlContent />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FULL SCREEN POPUP MODAL FOR SNIPER WORKERS */}
      <Dialog open={workerPopupOpen} onOpenChange={setWorkerPopupOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col bg-zinc-900 text-zinc-100 p-0 rounded-3xl overflow-hidden shadow-2xl border-zinc-800">
          {/* Header */}
          <div className="p-6 bg-zinc-950 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-xl shrink-0">
                🎯
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-white">Detailní seznam příjemců pro Sniper kampaň</DialogTitle>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Celkem {suitableWorkers?.length || 0} profíků k dispozici ({selectedSniperWorkers?.length || 0} vybráno k oslovení).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input 
                  placeholder="Hledat e-mail, jméno, město, text..." 
                  value={popupSearch}
                  onChange={(e) => setPopupSearch(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-white text-xs h-10 rounded-xl"
                />
              </div>

              {suitableWorkers?.length > 0 && (
                <Button 
                  variant="outline" 
                  className="h-10 px-4 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl"
                  onClick={() => setSelectedSniperWorkers(selectedSniperWorkers?.length === suitableWorkers?.length ? [] : (suitableWorkers?.map((w: any) => w.email) || []))}
                >
                  {selectedSniperWorkers?.length === suitableWorkers?.length ? "Zrušit výběr všech" : "Vybrat všech k oslovení"}
                </Button>
              )}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-900">
            {filteredPopupWorkers?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-zinc-500 font-medium">Žádné kontakty neodpovídají hledání.</p>
              </div>
            ) : (
              filteredPopupWorkers?.map((w: any) => {
                const isSelected = selectedSniperWorkers?.includes(w.email);
                const isReassigning = reassigningContactId === w.id;

                return (
                  <div 
                    key={w.id || w.email} 
                    className={`p-6 rounded-2xl border transition-all duration-300 ${
                      isSelected 
                        ? "bg-zinc-800/80 border-primary/50" 
                        : "bg-zinc-950/40 border-zinc-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      {/* Left: Checkbox & Name */}
                      <div className="flex items-start gap-4">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => setSelectedSniperWorkers((prev: any) => prev.includes(w.email) ? prev.filter((e: any) => e !== w.email) : [...prev, w.email])}
                          className="mt-1 h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/20 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-white">{w.full_name || w.company_name || w.email}</h4>
                            <Badge variant="outline" className={`text-[10px] uppercase font-mono ${
                              w.contact_source === "registered" ? "bg-primary/10 text-primary border-primary/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {w.contact_source === "registered" ? "Registrovaný" : "Importovaný Lead"}
                            </Badge>
                            {contactedEmails?.includes(w.email) && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">Už byl osloven</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <span className="font-mono text-zinc-300">{w.email}</span>
                            {w.phone && <span>📞 {w.phone}</span>}
                            {w.distance_km !== null && w.distance_km !== undefined ? (
                              <span className="text-primary font-bold">📍 {w.distance_km.toFixed(1)} km od zakázky</span>
                            ) : w.city ? (
                              <span>📍 {w.city}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 h-9 rounded-xl font-bold gap-1.5"
                          onClick={() => {
                            if (isReassigning) {
                              setReassigningContactId(null);
                            } else {
                              setReassigningContactId(w.id);
                              setNewCatId("all");
                              setNewSubcatId("all");
                            }
                          }}
                        >
                          <Repeat className="h-3.5 w-3.5" /> Přeřadit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-9 rounded-xl font-bold gap-1.5"
                          onClick={() => handleDelistContact(w)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Vyřadit
                        </Button>
                      </div>
                    </div>

                    {/* Contact Description / Bio Box */}
                    {w.description && (
                      <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans mb-4">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-primary" /> Popis činnosti a kvalifikace
                        </div>
                        {w.description}
                      </div>
                    )}

                    {/* Contact AI Icebreaker Box */}
                    {w.icebreaker && (
                      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed font-sans mb-4">
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" /> Připravené AI úvodní oslovení (Icebreaker)
                        </div>
                        "{w.icebreaker}"
                      </div>
                    )}

                    {/* Reassign Selector inline box */}
                    {isReassigning && (
                      <div className="p-4 bg-zinc-900 border border-primary/30 rounded-xl space-y-3 animate-in fade-in mt-3">
                        <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Repeat className="h-3.5 w-3.5" /> Přeřadit kontakt do jiné kategorie / subkategorie
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Select value={newCatId} onValueChange={(val) => { setNewCatId(val); setNewSubcatId("all"); }}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs text-white h-10 rounded-xl">
                              <SelectValue placeholder="Vyberte novou kategorii" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              {categories?.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select value={newSubcatId} onValueChange={setNewSubcatId} disabled={newCatId === "all"}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs text-white h-10 rounded-xl">
                              <SelectValue placeholder="Vyberte novou subkategorii" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                              {subcategories?.filter((s: any) => s.category_id === newCatId).map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-zinc-400 hover:text-white"
                            onClick={() => setReassigningContactId(null)}
                          >
                            Zrušit
                          </Button>
                          <Button 
                            size="sm" 
                            className="text-xs bg-primary text-zinc-900 font-bold rounded-xl h-8 px-4"
                            onClick={() => handleReassignContact(w)}
                            disabled={isUpdatingCategory || newSubcatId === "all"}
                          >
                            {isUpdatingCategory ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Potvrdit přeřazení
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nápovědní okno ke studiu kampaní */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
              <Target className="h-5 w-5 text-primary" />
              {campaignMode === "sniper" ? "Zakázkový automat (Nábor)" : "Plošné kampaně (Broadcast)"}
            </DialogTitle>
            <p className="text-xs font-medium text-muted-foreground pt-1">
              Podrobné vysvětlení fungování a účelu této sekce.
            </p>
          </DialogHeader>

          <div className="space-y-4 text-sm font-sans text-muted-foreground leading-relaxed mt-2">
            {campaignMode === "sniper" ? (
              <>
                <p>
                  <strong className="text-foreground">Co tato sekce dělá:</strong> Slouží k rychlému náboru a oslovení profesionálů v zadaném okruhu pro konkrétní nově zadanou zakázku na tržišti.
                </p>
                <p>
                  <strong className="text-foreground">Jak funguje:</strong> V roletce vyberete poptávku od zákazníka. Systém vyhledá všechny vhodné řemeslníky do 10 km (s možností rozšíření okruhu), seřadí je od nejbližšího a předvolí šablonu <span className="text-amber-500 font-bold">„Sniper recruitment (Day 1)“</span>.
                </p>
                <p>
                  <strong className="text-foreground">Specifika šablony:</strong> V e-mailu je aktivní zelené tlačítko pro okamžité zobrazení a přijetí zakázky a uvítací dárek 100 kreditů do začátku pro nové profíky.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong className="text-foreground">Co tato sekce dělá:</strong> Slouží k hromadnému rozesílání newsletterů, systémových oznámení nebo plošných nabídek vybraným skupinám v databázi.
                </p>
                <p>
                  <strong className="text-foreground">Jak funguje:</strong> Zvolíte si cílový segment (např. všichni instalatéři, všichni zákazníci nebo PRO členové), upravíte předmět a tělo e-mailu ve vizuálním editoru a odešlete zprávu celému vybranému publiku.
                </p>
                <p>
                  <strong className="text-foreground">Proměnné:</strong> Můžete používat personalizační značky jako <code className="text-foreground font-mono">{"{{osloveni}}"}</code> nebo <code className="text-foreground font-mono">{"{{mesto_v_meste}}"}</code>, které se každému příjemci dynamicky vyplní.
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="default" size="sm" onClick={() => setHelpOpen(false)} className="rounded-xl px-6 font-bold">
              Rozumím
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper for the Database/Lead source
const Database = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);
