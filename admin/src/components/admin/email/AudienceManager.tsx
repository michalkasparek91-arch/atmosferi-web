import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, Search, Download, Upload, Filter, 
  ChevronLeft, ChevronRight, Loader2, Tag, Star, Activity, Calendar, Globe, ExternalLink,
  MousePointer2, Mail, Phone, MapPin, Building2, Trash2, Database, X, Briefcase,
  Send, MailOpen, Clock, PenLine, CheckCircle2, XCircle, AlertCircle, MoreHorizontal
} from "lucide-react";
import { CITY_COORDINATES } from "@/lib/city-regions";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── CRM Status Types ──
type CrmStatus = "lead" | "contacted" | "opened" | "replied" | "converted" | "rejected";

const CRM_STATUS_CONFIG: Record<CrmStatus, { label: string; color: string; icon: any }> = {
  lead: { label: "Lead", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: AlertCircle },
  contacted: { label: "Kontaktován", color: "bg-sky-500/10 text-sky-500 border-sky-500/20", icon: Send },
  opened: { label: "Otevřel", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: MailOpen },
  replied: { label: "Odpověděl", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 },
  converted: { label: "Konvertováno", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Star },
  rejected: { label: "Nechce", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: XCircle },
};

// ── Mock CRM status assignment (based on engagement_score) ──
const getMockCrmStatus = (contact: any): CrmStatus => {
  const score = contact.engagement_score || 0;
  if (score >= 100) return "converted";
  if (score >= 70) return "replied";
  if (score >= 40) return "opened";
  if (score >= 15) return "contacted";
  return "lead";
};

// ── Mock email timeline for a contact ──
interface TimelineEvent {
  date: string;
  subject: string;
  status: "Doručeno" | "Otevřeno" | "Kliknuto";
}

const TIMELINE_STATUS_COLORS: Record<string, string> = {
  "Doručeno": "bg-blue-500",
  "Otevřeno": "bg-emerald-500",
  "Kliknuto": "bg-amber-500",
};

const generateMockTimeline = (contact: any): TimelineEvent[] => {
  // Generate deterministic mock data based on contact name hash
  const seed = (contact.full_name || contact.email || "").length;
  const templates = [
    "Pozvánka ke spolupráci na Zrobee",
    "Poptávka: Řemeslník ve vašem okolí",
    "Zrobee: 100 kreditů zdarma",
    "Nová zakázka v okolí",
    "Sniper: Personalizované oslovení",
    "Zrobee Newsletter – Novinky",
  ];
  const statuses: TimelineEvent["status"][] = ["Doručeno", "Otevřeno", "Kliknuto"];
  const count = Math.min(2 + (seed % 4), 5);
  const events: TimelineEvent[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = i * 3 + (seed % 5);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    events.push({
      date: format(d, "dd.MM.yyyy HH:mm", { locale: cs }),
      subject: templates[(seed + i) % templates.length],
      status: statuses[Math.min(i, statuses.length - 1)],
    });
  }
  return events;
};

// ── Mobile detection hook ──
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

export const AudienceManager = (props: any) => {
  const {
    searchTerm, setSearchTerm,
    minEngagement, setMinEngagement,
    sourceFilter, setSourceFilter,
    leadSheet, leadsLoading,
    leadTotalCount,
    crmPage, setCrmPage,
    totalPages,
    handleExportCSV,
    importFileRef,
    handleFileUpload,
    isImporting,
    importProgress,
    importTotalCount,
    addTagMutation,
    removeTagMutation,
    updateSubcategoriesMutation,
    subcatFilter, setSubcatFilter,
    categoryFilter, setCategoryFilter,
    userTypeFilter, setUserTypeFilter,
    cityFilter, setCityFilter,
    radiusFilter, setRadiusFilter,
    allSubcategories,
    allCategories
  } = props;

  const isMobile = useIsMobile();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedContactForSheet, setSelectedContactForSheet] = React.useState<any | null>(null);
  const [sheetIcebreaker, setSheetIcebreaker] = React.useState<string>("");
  const [isSavingIcebreaker, setIsSavingIcebreaker] = React.useState(false);
  const [selectedSources, setSelectedSources] = React.useState<Record<string, string>>({});
  const [isSelectingAllGlobal, setIsSelectingAllGlobal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [selectedBulkCategory, setSelectedBulkCategory] = React.useState<string>("all");
  const [selectedBulkSubcategory, setSelectedBulkSubcategory] = React.useState<string>("all");
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [isAssignPopoverOpen, setIsAssignPopoverOpen] = React.useState(false);
  const [realTimeline, setRealTimeline] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (selectedContactForSheet) {
      setSheetIcebreaker(selectedContactForSheet.ai_icebreaker || selectedContactForSheet.icebreaker || "");
      
      const fetchTimeline = async () => {
        if (!selectedContactForSheet.email) {
          setRealTimeline([]);
          return;
        }
        try {
          const { data, error } = await supabase
            .from("email_logs")
            .select("*")
            .eq("recipient_email", selectedContactForSheet.email)
            .order("created_at", { ascending: false });
          if (error) throw error;
          
          if (!data || data.length === 0) {
            setRealTimeline([]);
            return;
          }
          
          const formatted = data.map((log: any) => {
            let title = "Odesláno";
            let status = "Doručeno";
            if (log.status === "opened") { title = "E-mail otevřen"; status = "Otevřeno"; }
            if (log.status === "clicked") { title = "Odkaz prokliknut"; status = "Kliknuto"; }
            if (log.status === "failed" || log.status === "bounced") { title = "Chyba doručení"; status = "Odmítnuto"; }
            return {
              id: log.id,
              date: log.created_at,
              title,
              status,
              details: log.status
            };
          });
          setRealTimeline(formatted);
        } catch (e) {
          console.error("Timeline error", e);
          setRealTimeline([]);
        }
      };
      fetchTimeline();
    }
  }, [selectedContactForSheet]);

  const handleSaveIcebreaker = async (newText: string) => {
    if (!selectedContactForSheet) return;
    setIsSavingIcebreaker(true);
    try {
      if (selectedContactForSheet.outbox_id) {
        const { error } = await supabase.from("email_outbox").update({ icebreaker: newText }).eq("id", selectedContactForSheet.outbox_id);
        if (error) throw error;
        toast.success("AI Icebreaker byl úspěšně upraven.");
      } else {
        const insertData: any = {
          template_slug: "sniper-a-zvrdavost",
          icebreaker: newText,
          status: "draft"
        };
        if (selectedContactForSheet.contact_source === "registered") {
          insertData.worker_id = selectedContactForSheet.id;
        } else {
          insertData.lead_id = selectedContactForSheet.id;
        }
        const { data, error } = await supabase.from("email_outbox").insert(insertData).select("id").single();
        if (error) throw error;
        setSelectedContactForSheet((prev: any) => ({ ...prev, outbox_id: data.id, icebreaker: newText }));
        toast.success("Nový AI Icebreaker byl úspěšně uložen.");
      }
    } catch (err: any) {
      console.error("Failed to save icebreaker:", err);
      toast.error("Chyba při ukládání Icebreakeru.");
    } finally {
      setIsSavingIcebreaker(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leadSheet.length || selectedIds.length === leadTotalCount) {
      setSelectedIds([]);
      setSelectedSources({});
    } else {
      const newIds = leadSheet.map((l: any) => l.id);
      const newSources: Record<string, string> = {};
      leadSheet.forEach((l: any) => { newSources[l.id] = l.contact_source; });
      setSelectedIds(newIds);
      setSelectedSources(newSources);
    }
  };

  const handleSelectAllGlobal = async () => {
    if (!props.fetchAllMatchingContacts) return;
    setIsSelectingAllGlobal(true);
    try {
      const allContacts = await props.fetchAllMatchingContacts();
      const newIds = allContacts.map((c: any) => c.id);
      const newSources: Record<string, string> = {};
      allContacts.forEach((c: any) => { newSources[c.id] = c.contact_source; });
      setSelectedIds(newIds);
      setSelectedSources(newSources);
      toast.success(`Vybráno všech ${allContacts.length} kontaktů odpovídajících filtru.`);
    } catch (error) {
      console.error("Global select error:", error);
      toast.error("Chyba při načítání všech kontaktů.");
    } finally {
      setIsSelectingAllGlobal(false);
    }
  };

  const toggleSelect = (id: string, source: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setSelectedSources(prev => ({ ...prev, [id]: source }));
  };

  const chunkArray = (arr: string[], size = 500) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const handleAssignCategory = async () => {
    if (selectedBulkSubcategory === "all" || selectedIds.length === 0) return;
    
    setIsAssigning(true);
    try {
      const subcat = allSubcategories?.find((s: any) => s.id === selectedBulkSubcategory);
      const cat = allCategories?.find((c: any) => c.id === selectedBulkCategory);
      
      if (!subcat) throw new Error("Subcategory not found");

      const newSubcatName = subcat.name;
      const newCatName = cat?.name || null;

      // Separate IDs by source
      const leadIds = selectedIds.filter(id => (selectedSources[id] || leadSheet.find((l: any) => l.id === id)?.contact_source) === 'lead');
      const registeredIds = selectedIds.filter(id => (selectedSources[id] || leadSheet.find((l: any) => l.id === id)?.contact_source) === 'registered');

      // Update marketing_leads in chunks
      if (leadIds.length > 0) {
        for (const chunk of chunkArray(leadIds)) {
          const { error } = await supabase
            .from("marketing_leads")
            .update({
              category: newCatName,
              subcategory: newSubcatName
            })
            .in("id", chunk);
          if (error) throw error;
        }
      }

      // Update profiles in chunks
      if (registeredIds.length > 0) {
        for (const chunk of chunkArray(registeredIds)) {
          const { error } = await supabase
            .from("profiles")
            .update({
              category: newCatName,
              subcategory: newSubcatName
            })
            .in("id", chunk);
          if (error) throw error;
        }
      }

      toast.success(`Přiřazeno ${selectedIds.length} kontaktů do ${newSubcatName}.`);
      setSelectedIds([]);
      setSelectedSources({});
      setIsAssignPopoverOpen(false);
      setSelectedBulkCategory("all");
      setSelectedBulkSubcategory("all");
      if (props.refetchLeads) props.refetchLeads();
    } catch (error) {
      console.error("Assign error:", error);
      toast.error("Chyba při přiřazování kategorie.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    const leadIds = selectedIds.filter(id => (selectedSources[id] || leadSheet.find((l: any) => l.id === id)?.contact_source) === 'lead');
    const confirmDelete = window.confirm(`Opravdu chcete smazat ${leadIds.length} importovaných kontaktů z ${selectedIds.length} vybraných? Registrovaní uživatelé nebudou smazáni.`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      if (leadIds.length > 0) {
        for (const chunk of chunkArray(leadIds)) {
          const { error } = await supabase
            .from("marketing_leads")
            .delete()
            .in("id", chunk);
          if (error) throw error;
        }
      }

      toast.success(`Smazáno ${leadIds.length} kontaktů.`);
      setSelectedIds([]);
      setSelectedSources({});
      if (props.refetchLeads) props.refetchLeads();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Chyba při mazání kontaktů.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 w-full lg:w-auto items-center">
          <div className="relative flex-1 lg:max-w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Hledat kontakt..." 
              className="pl-8 h-9 text-[12px] rounded-xl bg-background border-border/60"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 rounded-xl gap-2 font-bold px-4">
                <Filter className="h-4 w-4" />
                Filtry
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border-border/60" align="start">
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-foreground">Rozšířené filtry</h4>
                <div className="grid grid-cols-1 gap-3">
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/60 font-medium text-[12px]">
                      <div className="flex items-center"><Database className="h-3 w-3 mr-1.5 text-primary/70 shrink-0" /><SelectValue placeholder="Zdroje" /></div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-[12px]">
                      <SelectItem value="all">Všechny zdroje</SelectItem>
                      <SelectItem value="organic">Registrovaní</SelectItem>
                      <SelectItem value="scraped">Importovaní / Scrap</SelectItem>
                      <SelectItem value="ai_web_sniper">🎯 AI Web Sniper</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={(val) => {
                    setCategoryFilter(val);
                    setSubcatFilter("all");
                  }}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/60 font-medium text-[12px]">
                      <div className="flex items-center"><Briefcase className="h-3 w-3 mr-1.5 text-primary/70 shrink-0" /><SelectValue placeholder="Kategorie" /></div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-[12px]">
                      <SelectItem value="all">Všechny kategorie</SelectItem>
                      {allCategories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={subcatFilter} onValueChange={setSubcatFilter}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/60 font-medium text-[12px]">
                      <div className="flex items-center"><Tag className="h-3 w-3 mr-1.5 text-primary/70 shrink-0" /><SelectValue placeholder="Podkategorie" /></div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl text-[12px]">
                      <SelectItem value="all">Všechny podkategorie</SelectItem>
                      {allSubcategories
                        ?.filter((sub: any) => categoryFilter === "all" || sub.category_id === categoryFilter)
                        .map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/60 font-medium text-[12px]">
                      <div className="flex items-center"><Users className="h-3 w-3 mr-1.5 text-primary/70 shrink-0" /><SelectValue placeholder="Typ" /></div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-[12px]">
                      <SelectItem value="all">Všichni</SelectItem>
                      <SelectItem value="worker">Firma/Profil</SelectItem>
                      <SelectItem value="customer">Zákazník</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/60 font-medium text-[12px]">
                      <div className="flex items-center"><MapPin className="h-3 w-3 mr-1.5 text-primary/70 shrink-0" /><SelectValue placeholder="Místo" /></div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-[12px]">
                      <SelectItem value="all">Celá ČR</SelectItem>
                      {Object.keys(CITY_COORDINATES || {}).sort().map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {cityFilter !== "all" && (
                    <Select value={radiusFilter} onValueChange={setRadiusFilter}>
                      <SelectTrigger className="h-9 rounded-xl bg-background border-border/60 font-medium text-[12px]">
                        <SelectValue placeholder="Okolí" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-[12px]">
                        <SelectItem value="10">+10 km</SelectItem>
                        <SelectItem value="25">+25 km</SelectItem>
                        <SelectItem value="50">+50 km</SelectItem>
                        <SelectItem value="100">+100 km</SelectItem>
                        <SelectItem value="200">+200 km</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={minEngagement} onValueChange={setMinEngagement}>
                    <SelectTrigger className="h-9 rounded-xl bg-background border-border/60 font-medium text-[12px]">
                      <div className="flex items-center"><Activity className="h-3 w-3 mr-1.5 text-primary/70 shrink-0" /><SelectValue placeholder="Aktivita" /></div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-[12px]">
                      <SelectItem value="0">Aktivita: Vše</SelectItem>
                      <SelectItem value="10">Skóre &gt; 10</SelectItem>
                      <SelectItem value="50">Skóre &gt; 50</SelectItem>
                      <SelectItem value="100">Skóre &gt; 100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-dashed">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 rounded-2xl shadow-xl border-border/60" align="end">
              <div className="flex flex-col gap-1">
                <Button variant="ghost" className="justify-start rounded-xl px-3 h-9 text-xs font-medium w-full" onClick={() => importFileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-2" /> Import CSV
                </Button>
                <input type="file" ref={importFileRef} className="hidden" accept=".csv" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'import')} />
                
                <Button variant="ghost" className="justify-start rounded-xl px-3 h-9 text-xs font-medium w-full" onClick={handleExportCSV}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Export CSV
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isImporting && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Probíhá import kontaktů...</span>
            </div>
            <span className="text-xs font-black text-primary">{importProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
              style={{ width: `${importProgress}%` }} 
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            Zpracovávám celkem {importTotalCount} řádků. Prosím nezavírejte okno.
          </p>
        </div>
      )}

      {selectedIds.length === leadSheet.length && leadSheet.length > 0 && leadTotalCount > leadSheet.length && selectedIds.length < leadTotalCount && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in">
          <span className="font-medium text-foreground text-center sm:text-left">
            Vybrali jste všech <strong className="text-primary">{selectedIds.length}</strong> kontaktů na této stránce.
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSelectAllGlobal} 
            disabled={isSelectingAllGlobal}
            className="h-8 rounded-xl font-bold text-primary hover:bg-primary/20 text-xs shrink-0"
          >
            {isSelectingAllGlobal ? (
              <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Načítám...</>
            ) : (
              `Vybrat všech ${leadTotalCount} kontaktů v tomto filtru`
            )}
          </Button>
        </div>
      )}

      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-10 py-2 px-3">
                  <Checkbox 
                    checked={selectedIds.length > 0 && (selectedIds.length === leadSheet.length || selectedIds.length === leadTotalCount)}
                    onCheckedChange={toggleSelectAll}
                    className="rounded-md border-muted-foreground/30"
                  />
                </TableHead>
                <TableHead className="w-[160px] max-w-[160px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground py-2">Kontakt</TableHead>
                <TableHead className="w-[120px] max-w-[120px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground py-2">Lokalita & Zdroj</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground py-2 text-center">Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/20" />
                    <p className="text-xs text-muted-foreground mt-4 font-medium italic">Načítám publikum...</p>
                  </TableCell>
                </TableRow>
              ) : leadSheet.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <p className="text-sm text-muted-foreground italic font-medium">Žádné kontakty neodpovídají filtrům.</p>
                  </TableCell>
                </TableRow>
              ) : (
                leadSheet.map((lead: any) => (
                  <TableRow key={lead.id} className={`group border-border/30 transition-all duration-150 cursor-pointer ${selectedIds.includes(lead.id) ? "bg-primary/5" : "hover:bg-zinc-800/30 dark:hover:bg-zinc-800/50 hover:shadow-sm"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('[data-checkbox]') || (e.target as HTMLElement).closest('button')) return; setSelectedContactForSheet(lead); }}>
                    <TableCell className="py-2 px-3" data-checkbox>
                      <Checkbox 
                        checked={selectedIds.includes(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id, lead.contact_source)}
                        className="rounded-md border-muted-foreground/30"
                      />
                    </TableCell>
                    <TableCell className="py-2 w-[160px] max-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">{lead.full_name || lead.company_name || "Bezejmenný"}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium truncate opacity-80 mt-0.5">
                            <Mail className="h-2.5 w-2.5 opacity-60 shrink-0" /> {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-medium truncate mt-0.5">
                              <Phone className="h-2.5 w-2.5 opacity-60 shrink-0" /> {lead.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium truncate mt-0.5">
                            <Calendar className="h-2.5 w-2.5 opacity-40 shrink-0" /> 
                            {lead.last_activity 
                              ? `Aktivita: ${new Date(lead.last_activity).toLocaleDateString("cs-CZ")}` 
                              : `Přidáno: ${new Date(lead.created_at).toLocaleDateString("cs-CZ")}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 w-[120px] max-w-[120px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-foreground/80">
                          <MapPin className="h-2.5 w-2.5 text-rose-500/40" /> {lead.city || "Nezadáno"} {lead.country && <span className="text-muted-foreground ml-0.5">({lead.country})</span>}
                        </div>
                        {(() => {
                           const crmStatus = getMockCrmStatus(lead);
                           const statusConf = CRM_STATUS_CONFIG[crmStatus];
                           const StatusIcon = statusConf.icon;
                           return (
                             <Badge variant="outline" className={`text-[8px] h-4 px-1.5 py-0 font-bold tracking-tight rounded-md flex items-center gap-1 w-max ${statusConf.color}`}>
                               <StatusIcon className="h-2.5 w-2.5 shrink-0" /> {statusConf.label}
                             </Badge>
                           );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                       <span className="text-[10px] font-bold text-foreground/80 border border-border/60 bg-muted/30 px-2 py-0.5 rounded-md flex items-center justify-center gap-1.5 w-max mx-auto shadow-sm">
                         <Mail className="h-3 w-3 text-muted-foreground" /> {lead.engagement_score >= 100 ? "2" : lead.engagement_score >= 50 ? "1" : lead.engagement_score > 0 ? "1" : "0"} 
                         <span className="text-border mx-0.5">|</span>
                         <MailOpen className="h-3 w-3 text-muted-foreground" /> {lead.engagement_score >= 100 ? "2" : lead.engagement_score >= 50 ? "1" : "0"}
                       </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-4 border-t border-border/50 bg-muted/10 flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Zobrazeno <span className="text-foreground">{leadSheet.length}</span> z <span className="text-foreground">{leadTotalCount}</span> kontaktů
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" disabled={crmPage === 0} onClick={() => setCrmPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] font-black w-24 text-center uppercase">Strana {crmPage + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" disabled={crmPage >= totalPages - 1} onClick={() => setCrmPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Floating Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-300 flex justify-center pointer-events-none">
          <div className="bg-zinc-900 text-white rounded-2xl shadow-2xl p-2 md:p-3 max-w-full flex flex-wrap items-center justify-between md:justify-center gap-2 md:gap-4 border border-white/10 backdrop-blur-xl pointer-events-auto w-full md:w-auto">
            <div className="flex items-center gap-2 shrink-0 px-2 md:px-0">
              <div className="h-6 w-6 md:h-7 md:w-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                {selectedIds.length}
              </div>
              <span className="text-xs md:text-sm font-bold tracking-tight truncate max-w-[120px] md:max-w-none">Vybráno</span>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-white/10 shrink-0" />
            
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <Popover open={isAssignPopoverOpen} onOpenChange={setIsAssignPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 md:h-9 px-2.5 md:px-4 rounded-xl font-bold text-xs gap-1.5 bg-white/5 text-white border-white/10 hover:bg-white/10 hover:text-white shrink-0"
                    disabled={isAssigning || isDeleting}
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Zařadit do kategorie</span>
                    <span className="sm:hidden">Kategorie</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-zinc-900 border-white/10 text-white rounded-2xl shadow-2xl space-y-4" align="center" side="top" sideOffset={12}>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold">Zařadit vybrané kontakty</h4>
                    <p className="text-[10px] text-white/60">Zvolte novou kategorii a podkategorii pro vybrané kontakty.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/60">Kategorie</label>
                      <Select value={selectedBulkCategory} onValueChange={(val) => {
                        setSelectedBulkCategory(val);
                        setSelectedBulkSubcategory("all");
                      }}>
                        <SelectTrigger className="h-9 rounded-xl bg-white/5 border-white/10 text-white font-medium text-xs">
                          <SelectValue placeholder="Vyberte kategorii" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[250px]">
                          <SelectItem value="all" className="focus:bg-white/10 focus:text-white">-- Vyberte kategorii --</SelectItem>
                          {allCategories?.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id} className="focus:bg-white/10 focus:text-white">{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedBulkCategory !== "all" && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/60">Podkategorie</label>
                        <Select value={selectedBulkSubcategory} onValueChange={setSelectedBulkSubcategory}>
                          <SelectTrigger className="h-9 rounded-xl bg-white/5 border-white/10 text-white font-medium text-xs">
                            <SelectValue placeholder="Vyberte podkategorii" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[250px]">
                            <SelectItem value="all" className="focus:bg-white/10 focus:text-white">-- Vyberte podkategorii --</SelectItem>
                            {allSubcategories
                              ?.filter((sub: any) => sub.category_id === selectedBulkCategory)
                              .map((sub: any) => (
                                <SelectItem key={sub.id} value={sub.id} className="focus:bg-white/10 focus:text-white">{sub.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button 
                        className="w-full rounded-xl font-bold text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90" 
                        onClick={handleAssignCategory}
                        disabled={selectedBulkSubcategory === "all" || isAssigning}
                      >
                        {isAssigning ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Potvrdit zařazení"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                variant="destructive" 
                size="sm" 
                className="h-8 md:h-9 px-2.5 md:px-4 rounded-xl font-bold text-xs gap-1.5 shrink-0"
                onClick={handleDeleteSelected}
                disabled={isDeleting || isAssigning}
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Trash2 className="h-3.5 w-3.5 shrink-0" />}
                <span className="hidden sm:inline">Smazat vybrané</span>
                <span className="sm:hidden">Smazat</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 md:h-9 px-2 md:px-3 rounded-xl font-bold text-xs text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                onClick={() => { setSelectedIds([]); setSelectedSources({}); }}
              >
                <X className="h-4 w-4 md:hidden" />
                <span className="hidden md:inline">Zrušit</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
           Contact Detail Panel – Side Sheet / Bottom Drawer
         ═══════════════════════════════════════════════════ */}
      {(() => {
        const contactDetailContent = selectedContactForSheet ? (() => {
          const crmStatus = getMockCrmStatus(selectedContactForSheet);
          const statusConf = CRM_STATUS_CONFIG[crmStatus];
          const StatusIcon = statusConf.icon;
          const timeline = realTimeline;

          return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              {/* ─── Header Profile Banner ─── */}
              <div className="flex items-start gap-4 pb-5 border-b border-border/80">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-extrabold text-foreground truncate">
                      {selectedContactForSheet.full_name || selectedContactForSheet.company_name || "Bezejmenný kontakt"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Mail className="h-4 w-4 opacity-60 text-primary" />
                    <span className="text-foreground/90 select-all font-mono text-sm">{selectedContactForSheet.email}</span>
                  </div>
                  {selectedContactForSheet.company_name && selectedContactForSheet.company_name !== selectedContactForSheet.full_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span>{selectedContactForSheet.company_name}</span>
                    </div>
                  )}
                  {/* Status Badges Row */}
                  <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm inline-flex items-center gap-1.5 ${statusConf.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConf.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border shadow-sm ${selectedContactForSheet.contact_source === 'registered' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : selectedContactForSheet.contact_source === 'ai_web_sniper' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"}`}>
                      {selectedContactForSheet.contact_source === 'registered' ? "REGISTROVANÝ" : selectedContactForSheet.contact_source === 'ai_web_sniper' ? "🌐 AI WEB SNIPER" : "MARKETING LEAD"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* ─── CTA Button: Napsat e-mail ─── */}
              <Button
                className="w-full h-12 rounded-2xl font-bold text-sm gap-2.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01]"
                onClick={() => {
                  toast.success("Příprava e-mailu", { description: `Otevírám editor pro ${selectedContactForSheet.full_name || selectedContactForSheet.email}` });
                }}
              >
                <PenLine className="h-4.5 w-4.5" />
                Napsat e-mail
              </Button>

              {/* ─── Email Activity Timeline ─── */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Časová osa komunikace
                </h3>
                <div className="bg-card/60 rounded-2xl border border-border/80 overflow-hidden">
                  {timeline.length === 0 ? (
                    <div className="p-6 text-center">
                      <Clock className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground italic font-medium">Zatím žádná komunikace.</p>
                    </div>
                  ) : (
                    <div className="relative pl-8 pr-4 py-4">
                      {/* Vertical timeline line */}
                      <div className="absolute left-[18px] top-6 bottom-6 w-px bg-border/60" />
                      
                      {timeline.map((event, idx) => {
                        const dotColor = TIMELINE_STATUS_COLORS[event.status] || "bg-zinc-400";
                        return (
                          <div key={idx} className={`relative flex items-start gap-3 ${idx > 0 ? "mt-5" : ""} group`}>
                            {/* Timeline dot */}
                            <div className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full ${dotColor} ring-4 ring-background shadow-sm transition-transform group-hover:scale-125`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                  {event.subject}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`text-[8px] font-black uppercase px-1.5 py-0 rounded-md border shrink-0 ${
                                    event.status === "Kliknuto" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    event.status === "Otevřeno" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  }`}
                                >
                                  {event.status}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 opacity-50" /> {event.date}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Engagement & Premium Score ─── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-4 rounded-2xl border border-border flex flex-col justify-center gap-1 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-3 -top-3 p-4 bg-primary/5 rounded-full text-primary/20 pointer-events-none">
                    <Activity className="h-10 w-10" />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Engagement</p>
                  <p className="text-xl font-extrabold text-foreground">{selectedContactForSheet.engagement_score || 0} <span className="text-xs font-medium text-muted-foreground">bodů</span></p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4 rounded-2xl border border-amber-500/20 flex flex-col justify-center gap-1 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-3 -top-3 p-4 bg-amber-500/10 rounded-full text-amber-500/20 pointer-events-none">
                    <Star className="h-10 w-10" />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-amber-600/80">Premium Score (AI)</p>
                  <p className="text-xl font-extrabold text-foreground">{selectedContactForSheet.premium_score || 0} <span className="text-xs font-medium text-muted-foreground">/ 100</span></p>
                </div>
              </div>

              {/* ─── Contact Info Section ─── */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Kontaktní a adresní údaje
                </h3>
                <div className="bg-card/60 p-4 rounded-2xl border border-border/80 space-y-3 text-xs">
                  {selectedContactForSheet.decision_maker_name && (
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium"><Star className="h-3.5 w-3.5 text-amber-500" /> Rozhodovatel (Majitel)</span>
                      <span className="font-bold text-foreground">{selectedContactForSheet.decision_maker_name}</span>
                    </div>
                  )}
                  {selectedContactForSheet.phone && (
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium"><Phone className="h-3.5 w-3.5 text-primary" /> Telefon</span>
                      <span className="font-mono font-bold text-foreground">{selectedContactForSheet.phone}</span>
                    </div>
                  )}
                  {selectedContactForSheet.website && (
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium"><Globe className="h-3.5 w-3.5 text-primary" /> Webová stránka</span>
                      <a href={selectedContactForSheet.website.startsWith("http") ? selectedContactForSheet.website : `https://${selectedContactForSheet.website}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                        {selectedContactForSheet.website} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}
                  <div className="flex items-start justify-between pb-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2 font-medium shrink-0"><MapPin className="h-3.5 w-3.5 text-rose-500" /> Adresa</span>
                    <span className="font-medium text-foreground text-right">
                      {selectedContactForSheet.full_address || [selectedContactForSheet.street_name, selectedContactForSheet.street_number, selectedContactForSheet.city, selectedContactForSheet.postal_code].filter(Boolean).join(", ") || selectedContactForSheet.city || "Nezadáno"}
                    </span>
                  </div>
                  {selectedContactForSheet.country && (
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <span className="text-muted-foreground flex items-center gap-2 font-medium"><Globe className="h-3.5 w-3.5 text-primary" /> Země / Jazyk</span>
                      <span className="font-bold text-foreground">{selectedContactForSheet.country} {selectedContactForSheet.language && <span className="text-muted-foreground uppercase text-[10px]">({selectedContactForSheet.language})</span>}</span>
                    </div>
                  )}
                  {(selectedContactForSheet.latitude !== null && selectedContactForSheet.longitude !== null && selectedContactForSheet.latitude !== undefined) && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground text-[11px]">GPS souřadnice</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{selectedContactForSheet.latitude.toFixed(5)}, {selectedContactForSheet.longitude.toFixed(5)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Categories & Subcategories ─── */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Odbornost a kategorie
                </h3>
                <div className="bg-card dark:bg-muted/20 p-4 rounded-2xl border border-border space-y-3 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const leadSubcats = (selectedContactForSheet.subcategory || "").split(";").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                      if (leadSubcats.length === 0) return <p className="text-xs text-muted-foreground italic">Žádné přiřazené kategorie.</p>;
                      
                      const groups: Record<string, { name: string, icon: string, slug: string, subcats: string[] }> = {};
                      const orphanSubcats: string[] = [];

                      leadSubcats.forEach(ls => {
                        let match = allSubcategories?.find((s: any) => s.id?.toLowerCase() === ls || s.name?.toLowerCase() === ls);
                        if (!match) {
                          match = allSubcategories?.find((s: any) => s.name && (ls.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(ls)));
                        }
                        if (match && match.service_categories) {
                          const cat = Array.isArray(match.service_categories) ? match.service_categories[0] : match.service_categories;
                          if (cat && cat.name) {
                            if (!groups[cat.name]) groups[cat.name] = { name: cat.name, icon: cat.icon, slug: cat.slug, subcats: [] };
                            if (!groups[cat.name].subcats.includes(match.name)) groups[cat.name].subcats.push(match.name);
                            return;
                          }
                        }
                        // If no match found or no category, keep it as orphan
                        const originalName = (selectedContactForSheet.subcategory || "").split(";").find((s:string) => s.trim().toLowerCase() === ls)?.trim() || ls;
                        if (!orphanSubcats.includes(originalName)) orphanSubcats.push(originalName);
                      });

                      return (
                        <div className="flex flex-col gap-3 w-full">
                          {Object.values(groups).map((group) => {
                            const Icon = getCategoryIcon(group.icon, group.slug);
                            return (
                              <div key={group.name} className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-background/50 dark:bg-background/20 border border-border">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary shadow-sm">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-wider text-foreground">{group.name}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pl-[38px]">
                                  {group.subcats.map(sub => (
                                    <Badge key={sub} variant="secondary" className="px-2 py-0.5 text-[10px] rounded-md bg-muted/80 text-foreground border border-border/50 hover:bg-muted transition-colors">
                                      {sub}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {orphanSubcats.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {orphanSubcats.map(sub => (
                                <Badge key={sub} variant="secondary" className="px-2.5 py-1 text-[10px] rounded-lg bg-muted/80 text-foreground border border-border/50 hover:bg-muted transition-colors">
                                  {sub}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  {(selectedContactForSheet.tags && selectedContactForSheet.tags.length > 0) && (
                    <div className="pt-3 border-t border-border/50 flex flex-wrap gap-1.5 items-center">
                      <Tag className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
                      {selectedContactForSheet.tags.map((tag: string) => (
                         <span key={tag} className="text-[10px] font-bold text-muted-foreground bg-muted/50 border border-border/50 px-2 py-0.5 rounded-md">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Company Description / Bio ─── */}
              {(selectedContactForSheet.description || selectedContactForSheet.company_description) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Popis / Bio
                  </h3>
                  <div className="bg-muted/40 p-4 rounded-2xl border border-border text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedContactForSheet.description || selectedContactForSheet.company_description}
                  </div>
                </div>
              )}

              {/* ─── AI Icebreaker (Editovatelný) ─── */}
              {(selectedContactForSheet.contact_source === 'lead' || selectedContactForSheet.contact_source === 'ai_web_sniper') && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> AI Icebreaker (Úvodní oslovení)
                    </h3>
                    {isSavingIcebreaker && <span className="text-[10px] text-primary flex items-center gap-1 font-bold"><Loader2 className="h-3 w-3 animate-spin" /> Ukládám...</span>}
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full min-h-[90px] bg-muted/40 border border-border/80 rounded-2xl p-3 text-xs leading-relaxed text-foreground font-medium focus:ring-1 focus:ring-primary/30 focus:border-primary/40 outline-none resize-y transition-all shadow-sm font-sans"
                      value={sheetIcebreaker}
                      onChange={(e) => setSheetIcebreaker(e.target.value)}
                      onBlur={(e) => handleSaveIcebreaker(e.target.value)}
                      placeholder="Zde napište nebo nechte AI vygenerovat úvodní oslovení na míru..."
                    />
                    <p className="text-[10px] text-muted-foreground italic mt-1">
                      Kliknutím vedle textového pole se úvodní oslovení automaticky uloží k tomuto kontaktu.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Notification Preferences & Consents ─── */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Souhlasy a notifikace
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className={`p-3 rounded-2xl border ${selectedContactForSheet.email_notifications ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
                    <Mail className="h-4 w-4 mx-auto mb-1 opacity-80" />
                    <span>E-mailové info</span>
                  </div>
                  <div className={`p-3 rounded-2xl border ${selectedContactForSheet.push_notifications ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
                    <Activity className="h-4 w-4 mx-auto mb-1 opacity-80" />
                    <span>Push zprávy</span>
                  </div>
                  <div className={`p-3 rounded-2xl border ${selectedContactForSheet.marketing_notifications ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
                    <Star className="h-4 w-4 mx-auto mb-1 opacity-80" />
                    <span>Marketing info</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : null;

        // ── Mobile: Drawer (bottom sheet) ──
        if (isMobile) {
          return (
            <Drawer open={!!selectedContactForSheet} onOpenChange={(open) => !open && setSelectedContactForSheet(null)}>
              <DrawerContent className="max-h-[92vh] bg-background border-t border-border">
                <DrawerHeader className="pb-0">
                  <DrawerTitle className="sr-only">Detail kontaktu</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-5 pb-8 pt-2 custom-scrollbar">
                  {contactDetailContent}
                </div>
              </DrawerContent>
            </Drawer>
          );
        }

        // ── Desktop: Side Sheet ──
        return (
          <Sheet open={!!selectedContactForSheet} onOpenChange={(open) => !open && setSelectedContactForSheet(null)}>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-l border-border p-6 sm:p-8 overflow-y-auto shadow-2xl custom-scrollbar z-50">
              <SheetHeader className="sr-only">
                <SheetTitle>Detail kontaktu</SheetTitle>
                <SheetDescription>Podrobnosti o vybraném kontaktu</SheetDescription>
              </SheetHeader>
              {contactDetailContent}
            </SheetContent>
          </Sheet>
        );
      })()}
    </div>
  );
};
