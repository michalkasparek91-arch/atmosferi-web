import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, Mail, Zap, Clock, Search, Plus, Pencil, Trash2, 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye, Save, X, Users, UserCheck, Shield, Send, Loader2,
  Copy, BarChart3, Bold, Italic, Underline, List, Link, Monitor, Smartphone, Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ModularEmailEditorDialog from "./email/ModularEmailEditor";

type EmailTemplate = {
  id: string;
  slug: string | null;
  category: string;
  name: string;
  subject: string | null;
  emoji: string | null;
  greeting: string | null;
  body: string | null;
  cta_text: string | null;
  cta_url: string | null;
  secondary_text: string | null;
  target_role: string;
  trigger_type: string;
  trigger_event: string | null;
  drip_delay_days: number | null;
  drip_series: string | null;
  is_enabled: boolean;
  segment_filters: Record<string, any> | null;
  heading: string | null;
  sender_email?: string | null;
  created_at: string | null;
  updated_at: string | null;
  layout_type?: "standard" | "magazine" | "sniper";
  hero_image_url?: string | null;
  urgency_banner_enabled?: boolean;
  urgency_banner_text?: string | null;
  promo_banner_enabled?: boolean;
  promo_banner_text?: string | null;
  job_description_snippet?: string | null;
  ps_footer_enabled?: boolean;
  ps_footer_text?: string | null;
  show_job_widget?: boolean;
  show_cta_button?: boolean;
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  transactional: { label: "Transakční", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Bell },
  auth: { label: "Auth", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield },
  marketing: { label: "Marketing", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Mail },
  lifecycle: { label: "Lifecycle", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Clock },
  sniper: { label: "Sniper", color: "bg-rose-100 text-rose-700 border-rose-200", icon: Zap },
};

const TARGET_LABELS: Record<string, { label: string; icon: typeof Users }> = {
  all: { label: "Všichni", icon: Users },
  worker: { label: "Profíci", icon: UserCheck },
  customer: { label: "Zákazníci", icon: Users },
};

const TRIGGER_LABELS: Record<string, string> = {
  event: "Událost",
  cron: "Plánovaný",
  manual: "Ruční",
};

const previewReplaceGlobal = (txt: string | null | undefined) => {
  if (!txt) return "";
  return txt
    .replace(/{{osloveni}}/g, "Petře")
    .replace(/{{jmeno}}/g, "Petr Novák")
    .replace(/{{mesto_v_meste}}/g, "v Praze")
    .replace(/{{mesto}}/g, "Praha")
    .replace(/{{obor_2pad}}|{{podkategorie_2pad}}/g, "řemeslníka")
    .replace(/{{obor}}/g, "Řemeslné práce")
    .replace(/{{nazev_zakazky}}/g, "Rekonstrukce bytového jádra")
    .replace(/{{popis_zakazky}}/g, "Hledám spolehlivého řemeslníka na kompletní obklad koupelny...")
    .replace(/{{cena_rozpocet}}|{{rozpocet}}/g, "15 000 Kč")
    .replace(/{{zakaznik}}/g, "Jan")
    .replace(/{{odkaz_zakazky}}/g, "https://zrobee.cz/sdilena-zakazka/123")
    .replace(/{{icebreaker}}/g, "Všimli jsme si vašeho skvělého profilu na Zrobee.");
};

// Completeness validation helper
function getCompleteness(t: EmailTemplate): { color: string; label: string } {
  if (!t.subject || !t.body) return { color: "bg-red-500", label: "Kriticky neúplná" };
  if (!t.cta_text || !t.cta_url) return { color: "bg-amber-500", label: "Neúplná – chybí CTA" };
  return { color: "bg-emerald-500", label: "Kompletní" };
}

// Available template variables
const TEMPLATE_VARIABLES = [
  { key: "{{osloveni}}", label: "Oslovení (Vokativ)", desc: "Oslovení v 5. pádu (např. Petře)" },
  { key: "{{jmeno}}", label: "Jméno", desc: "Jméno příjemce v 1. pádu" },
  { key: "{{mesto}}", label: "Město", desc: "Město zakázky nebo profíka (1. pád)" },
  { key: "{{mesto_v_meste}}", label: "Město (v/ve)", desc: "Město s předložkou v/ve (např. v Praze)" },
  { key: "{{obor}}", label: "Obor", desc: "Obor / Specializace (1. pád)" },
  { key: "{{obor_2pad}}", label: "Obor (2./4. pád)", desc: "Obor / Specializace (2./4. pád, např. instalatéra)" },
  { key: "{{nazev_zakazky}}", label: "Zakázka", desc: "Název zakázky" },
  { key: "{{popis_zakazky}}", label: "Popis", desc: "Detailní popis zadání" },
  { key: "{{cena_rozpocet}}", label: "Rozpočet", desc: "Rozpočet nebo cenová poznámka" },
  { key: "{{rozpocet}}", label: "Rozpočet (alt.)", desc: "Rozpočet zakázky (alternativní)" },
  { key: "{{zakaznik}}", label: "Zákazník", desc: "Jméno poptávajícího" },
  { key: "{{odkaz_zakazky}}", label: "Odkaz", desc: "URL na detail zakázky" },
  { key: "{{icebreaker}}", label: "Icebreaker", desc: "Individuální oslovení na míru" },
  { key: "{{podkategorie_2pad}}", label: "Podkategorie - Skloněný tvar", desc: "Skloněný tvar podkategorie" }
];

export default function EmailTemplatesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set(["onboarding-worker", "onboarding-customer", "reactivation"]));
  const [sendingSlug, setSendingSlug] = useState<string | null>(null);

  const testSendMutation = useMutation({
    mutationFn: async ({ slug, overrideData, jobId }: { slug: string; overrideData?: Partial<EmailTemplate>; jobId?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-template-test", {
        body: { slug, overrideData, jobId },
      });
      if (error) throw error;
      return data;
    },
    onMutate: ({ slug }) => {
      setSendingSlug(slug);
    },
    onSuccess: (data: any) => {
      const results = data?.results || [];
      const ok = results.filter((r: any) => r.success).length;
      const fail = results.filter((r: any) => !r.success).length;
      toast({
        title: fail === 0 ? "Testovací e-maily odeslány ✅" : "Částečně odesláno ⚠️",
        description: `Odesláno: ${ok}, Selhalo: ${fail}`,
        variant: fail > 0 ? "destructive" : "default",
      });
      setSendingSlug(null);
    },
    onError: (err: any) => {
      toast({ title: "Chyba odeslání", description: err.message, variant: "destructive" });
      setSendingSlug(null);
    },
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("category")
        .order("drip_delay_days" as any)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as EmailTemplate[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ is_enabled: enabled } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates-all"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id?: string }) => {
      const payload: Record<string, any> = {
        name: template.name,
        subject: template.subject,
        slug: template.slug,
        category: template.category,
        emoji: template.emoji,
        greeting: template.greeting,
        body: template.body,
        cta_text: template.cta_text,
        cta_url: template.cta_url,
        secondary_text: template.secondary_text,
        sender_email: template.sender_email,
        target_role: template.target_role,
        trigger_type: template.trigger_type,
        trigger_event: template.trigger_event,
        drip_delay_days: template.drip_delay_days,
        drip_series: template.drip_series,
        is_enabled: template.is_enabled,
        segment_filters: template.segment_filters,
        layout_type: template.layout_type,
        hero_image_url: template.hero_image_url,
        urgency_banner_enabled: template.urgency_banner_enabled ?? true,
        urgency_banner_text: template.urgency_banner_text,
        promo_banner_enabled: template.promo_banner_enabled ?? true,
        promo_banner_text: template.promo_banner_text,
        job_description_snippet: template.job_description_snippet,
        ps_footer_enabled: template.ps_footer_enabled ?? false,
        ps_footer_text: template.ps_footer_text,
        show_job_widget: template.show_job_widget ?? true,
        show_cta_button: template.show_cta_button ?? true,
      };

      if (template.id) {
        const { error } = await supabase.from("email_templates").update(payload).eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates-all"] });
      setEditingTemplate(null);
      setIsCreating(false);
      toast({ title: "Uloženo", description: "Šablona byla uložena." });
    },
    onError: (err: any) => {
      toast({ title: "Chyba", description: err.message, variant: "destructive" });
    },
  });

  // Drip send stats
  const { data: dripStats = {} } = useQuery({
    queryKey: ["drip-email-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drip_email_log")
        .select("template_slug");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.template_slug] = (counts[r.template_slug] || 0) + 1;
      });
      return counts;
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const payload: Record<string, any> = {
        name: `${template.name} (kopie)`,
        slug: `${template.slug}-copy`,
        subject: template.subject,
        category: template.category,
        emoji: template.emoji,
        greeting: template.greeting,
        body: template.body,
        cta_text: template.cta_text,
        cta_url: template.cta_url,
        secondary_text: template.secondary_text,
        sender_email: template.sender_email,
        target_role: template.target_role,
        trigger_type: template.trigger_type,
        trigger_event: template.trigger_event,
        drip_delay_days: template.drip_delay_days,
        drip_series: template.drip_series,
        is_enabled: false,
        segment_filters: template.segment_filters,
        layout_type: template.layout_type,
        hero_image_url: template.hero_image_url,
        urgency_banner_enabled: template.urgency_banner_enabled ?? true,
        urgency_banner_text: template.urgency_banner_text,
        promo_banner_enabled: template.promo_banner_enabled ?? true,
        promo_banner_text: template.promo_banner_text,
        job_description_snippet: template.job_description_snippet,
        ps_footer_enabled: template.ps_footer_enabled ?? false,
        ps_footer_text: template.ps_footer_text,
        show_job_widget: template.show_job_widget ?? true,
      };
      const { error } = await supabase.from("email_templates").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates-all"] });
      toast({ title: "Duplikováno ✅", description: "Kopie šablony vytvořena (vypnutá)." });
    },
    onError: (err: any) => {
      toast({ title: "Chyba duplikace", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates-all"] });
      toast({ title: "Smazáno" });
    },
  });

  const moveToOutboxMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate>) => {
      const payload: Record<string, any> = {
        name: `${template.name} (Z Outboxu)`,
        subject: template.subject,
        body: template.body,
        template_id: template.id,
        status: "draft",
        target_role: template.target_role || "all",
        cta_text: template.cta_text,
        cta_url: template.cta_url,
        secondary_text: template.secondary_text,
        hero_image_url: template.hero_image_url,
        layout_type: template.layout_type,
        urgency_banner_enabled: template.urgency_banner_enabled ?? true,
        urgency_banner_text: template.urgency_banner_text,
        promo_banner_enabled: template.promo_banner_enabled ?? true,
        promo_banner_text: template.promo_banner_text,
        ps_footer_enabled: template.ps_footer_enabled ?? false,
        ps_footer_text: template.ps_footer_text,
        show_job_widget: template.show_job_widget ?? true,
        show_cta_button: template.show_cta_button ?? true,
        job_description_snippet: template.job_description_snippet,
        segment_filters: template.segment_filters,
      };
      const { error } = await supabase.from("marketing_campaigns").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Přesunuto do Outboxu", description: "Z této šablony byl vytvořen nový koncept kampaně." });
      setEditingTemplate(null);
    },
    onError: (err: any) => {
      toast({ title: "Chyba přesunu", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    let list = templates;
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);
    if (roleFilter !== "all") list = list.filter((t) => t.target_role === roleFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q));
    }
    return list;
  }, [templates, categoryFilter, roleFilter, searchQuery]);

  // Group lifecycle templates by series
  const grouped = useMemo(() => {
    const series: Record<string, EmailTemplate[]> = {};
    const standalone: EmailTemplate[] = [];
    filtered.forEach((t) => {
      if (t.category === "lifecycle" && t.drip_series) {
        if (!series[t.drip_series]) series[t.drip_series] = [];
        series[t.drip_series].push(t);
      } else {
        standalone.push(t);
      }
    });
    // Sort series items by delay
    Object.values(series).forEach((arr) => arr.sort((a, b) => (a.drip_delay_days || 0) - (b.drip_delay_days || 0)));
    return { series, standalone };
  }, [filtered]);

  const stats = useMemo(() => {
    const total = templates.length;
    const enabled = templates.filter((t) => t.is_enabled).length;
    const byCategory: Record<string, number> = {};
    templates.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });
    return { total, enabled, byCategory };
  }, [templates]);

  const toggleSeries = (series: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(series)) next.delete(series);
      else next.add(series);
      return next;
    });
  };

  const createNew = () => {
    setIsCreating(true);
    setEditingTemplate({
      id: "",
      slug: "",
      category: "lifecycle",
      name: "",
      subject: "",
      emoji: "",
      greeting: "",
      body: "",
      cta_text: "",
      cta_url: "",
      secondary_text: "",
      target_role: "all",
      trigger_type: "cron",
      trigger_event: "",
      drip_delay_days: 0,
      drip_series: "",
      is_enabled: true,
      segment_filters: {},
      heading: null,
      created_at: null,
      updated_at: null,
      layout_type: "standard",
      hero_image_url: "",
    });
  };

  const SERIES_LABELS: Record<string, string> = {
    "onboarding-worker": "🛠️ Onboarding řemeslníků",
    "onboarding-customer": "👤 Onboarding zákazníků",
    reactivation: "🔄 Reaktivace",
    "sniper-outreach": "🎯 Sniper Outreach (All Templates)",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stats Row & Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button 
          onClick={() => setCategoryFilter("all")}
          className={`flex-1 min-w-[100px] p-2.5 rounded-md border transition-all text-left ${categoryFilter === "all" ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20" : "bg-card text-card-foreground border-border hover:border-primary/50 shadow-sm"}`}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Vše</p>
          <p className="text-xl font-black">{stats.total}</p>
        </button>
        
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const isActive = categoryFilter === key;
          const count = stats.byCategory[key] || 0;
          return (
            <button 
              key={key}
              onClick={() => setCategoryFilter(isActive ? "all" : key)}
              className={`flex-1 min-w-[100px] p-2.5 rounded-md border transition-all text-left ${isActive ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20" : "bg-card border-border hover:border-primary/30 shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <p className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-primary font-black" : "text-muted-foreground"}`}>{cfg.label}</p>
                <cfg.icon className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
              </div>
              <p className={`text-xl font-black ${isActive ? "text-primary" : "text-foreground/80"}`}>{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-card/50 p-2 rounded-3xl border border-border/50">
        <div className="flex gap-2 items-center flex-wrap w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Hledat šablonu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs w-full lg:w-64 rounded-2xl border-none bg-background/50 focus-visible:ring-primary/20"
            />
          </div>
          
          <div className="flex bg-background/50 p-1 rounded-md border border-border/30">
            <button 
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all ${roleFilter === "all" ? "bg-primary/15 dark:bg-primary/25 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Všichni
            </button>
            <button 
              onClick={() => setRoleFilter("worker")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all ${roleFilter === "worker" ? "bg-primary/15 dark:bg-primary/25 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Profíci
            </button>
            <button 
              onClick={() => setRoleFilter("customer")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all ${roleFilter === "customer" ? "bg-primary/15 dark:bg-primary/25 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Zákazníci
            </button>
          </div>
        </div>
        
        <Button size="sm" className="h-9 rounded-2xl text-xs gap-1.5 px-4 font-bold w-full lg:w-auto shadow-sm" onClick={createNew}>
          <Plus className="h-4 w-4" /> Nová šablona
        </Button>
      </div>

      {/* Series Groups (Lifecycle) */}
      {Object.entries(grouped.series).map(([seriesKey, items]) => (
        <Card key={seriesKey} className="border-border bg-card shadow-sm overflow-hidden">
          <button
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
            onClick={() => toggleSeries(seriesKey)}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[9px] ${CATEGORY_CONFIG.lifecycle.color}`}>
                Lifecycle
              </Badge>
              <span className="text-sm font-semibold text-foreground">
                {SERIES_LABELS[seriesKey] || seriesKey}
              </span>
              <span className="text-[10px] text-muted-foreground">{items.length} emailů</span>
            </div>
            {expandedSeries.has(seriesKey) ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {expandedSeries.has(seriesKey) && (
            <div className="border-t border-border">
            {items.map((t, idx) => (
                <TemplateRow
                  key={t.id}
                  template={t}
                  showDelay
                  isLast={idx === items.length - 1}
                  onEdit={() => setEditingTemplate(t)}
                  onToggle={(enabled) => toggleMutation.mutate({ id: t.id, enabled })}
                  onDelete={() => deleteMutation.mutate(t.id)}
                  onTestSend={() => t.slug && testSendMutation.mutate({ slug: t.slug })}
                  isSending={sendingSlug === t.slug}
                  onDuplicate={() => duplicateMutation.mutate(t)}
                  sendCount={t.slug ? dripStats[t.slug] : undefined}
                />
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Standalone Templates Table */}
      {grouped.standalone.length > 0 && (
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent">
            <CardTitle className="text-[11px] font-semibold text-foreground">
              Jednotlivé šablony
            </CardTitle>
          </CardHeader>
          <div>
            {grouped.standalone.map((t, idx) => (
              <TemplateRow
                key={t.id}
                template={t}
                isLast={idx === grouped.standalone.length - 1}
                onEdit={() => setEditingTemplate(t)}
                onToggle={(enabled) => toggleMutation.mutate({ id: t.id, enabled })}
                onDelete={() => deleteMutation.mutate(t.id)}
                onTestSend={() => t.slug && testSendMutation.mutate({ slug: t.slug })}
                isSending={sendingSlug === t.slug}
                onDuplicate={() => duplicateMutation.mutate(t)}
                sendCount={t.slug ? dripStats[t.slug] : undefined}
              />
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm italic">
          Žádné šablony k zobrazení.
        </div>
      )}

      {/* Edit/Create Dialog */}
      <ModularEmailEditorDialog
        mode="template"
        isOpen={!!editingTemplate}
        initialData={editingTemplate}
        onClose={() => { setEditingTemplate(null); setIsCreating(false); }}
        onSave={(t) => saveMutation.mutate(t as any)}
        onDelete={() => editingTemplate && deleteMutation.mutate(editingTemplate.id)}
        isSaving={saveMutation.isPending}
        onTestSend={(slug, overrideData, jobId) => testSendMutation.mutate({ slug, overrideData: overrideData as any, jobId })}
        isSendingTest={testSendMutation.isPending}
        onMoveToOutbox={(t) => moveToOutboxMutation.mutate(t as any)}
      />

    </div>
  );
}

function TemplateRow({
  template: t,
  showDelay,
  isLast,
  onEdit,
  onToggle,
  onDelete,
  onTestSend,
  isSending,
  onDuplicate,
  sendCount,
}: {
  template: EmailTemplate;
  showDelay?: boolean;
  isLast?: boolean;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  onTestSend?: () => void;
  isSending?: boolean;
  onDuplicate?: () => void;
  sendCount?: number;
}) {
  const cat = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.transactional;
  const target = TARGET_LABELS[t.target_role] || TARGET_LABELS.all;
  const completeness = getCompleteness(t);

  return (
    <TooltipProvider>
    <div className={`px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors ${!isLast ? "border-b border-border/30" : ""}`}>
      {/* Status dot + Emoji */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative shrink-0 w-8 text-center">
            <span className={`text-lg transition-opacity ${t.is_enabled ? "" : "opacity-50 grayscale"}`}>{t.emoji || "📧"}</span>
            <span className={`absolute top-0 -right-0.5 w-2 h-2 rounded-full ${t.is_enabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"} ring-2 ring-background`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">{t.is_enabled ? "Aktivní" : "Vypnuto"}</TooltipContent>
      </Tooltip>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground truncate">{t.name}</span>
          <Badge variant="outline" className={`text-[8px] ${cat.color}`}>
            {cat.label}
          </Badge>
          <Badge variant="outline" className="text-[8px] border-border text-muted-foreground">
            {target.label}
          </Badge>
          {showDelay && t.drip_delay_days !== null && (
            <Badge variant="outline" className="text-[8px] border-border text-muted-foreground">
              Den {t.drip_delay_days}
            </Badge>
          )}
          {(t.segment_filters?.hero_image_enabled || t.segment_filters?.carousel_enabled || t.segment_filters?.articles_enabled) && (
            <Badge variant="outline" className="text-[8px] bg-primary/10 text-primary border-primary/20 font-bold">
              Modulární ✨
            </Badge>
          )}
          {sendCount !== undefined && sendCount > 0 && (
            <Badge variant="outline" className="text-[8px] border-border text-muted-foreground gap-1">
              <BarChart3 className="h-2.5 w-2.5" /> {sendCount}×
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.subject}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onDuplicate && (
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted" onClick={onDuplicate} title="Duplikovat">
            <Copy className="h-4.5 w-4.5 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted" onClick={onEdit} title="Upravit">
          <Pencil className="h-4.5 w-4.5 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
}

