import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Copy, BarChart3, Bold, Italic, Underline, List, Link, Monitor, Smartphone, Sparkles, HardHat, Home, Building2, PaintRoller, Globe
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ModularEmailEditorDialog from "./email/ModularEmailEditor";
import { useMarkets } from "@/hooks/useMarkets";

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

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
  layout_type?: "standard" | "magazine" | "sniper" | "atmosferi_studio";
  hero_image_url?: string | null;
  urgency_banner_enabled?: boolean;
  urgency_banner_text?: string | null;
  promo_banner_enabled?: boolean;
  promo_banner_text?: string | null;
  job_description_snippet?: string | null;
  ps_footer_enabled?: boolean;
  ps_footer_text?: string | null;
  language?: string | null;
  show_job_widget?: boolean;
  show_cta_button?: boolean;
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  architekti: { label: "Architekti", color: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-500/10 dark:text-stone-400 dark:border-stone-500/20", icon: PaintRoller },
  interiery: { label: "Interiéry", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20", icon: Home },
  developeri: { label: "Developeři", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20", icon: Building2 },
  urbanismus: { label: "Urbanismus", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", icon: Globe },
  architekt: { label: "Samostatný architekt", color: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20", icon: UserCheck },
  stavebnictvi: { label: "Stavebnictví", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", icon: HardHat },
  reality: { label: "Reality", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", icon: Home },
  marketing: { label: "Ostatní B2B", color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20", icon: Zap },
  transactional: { label: "Systémové", color: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20", icon: Bell },
  lifecycle: { label: "Lifecycle", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20", icon: Clock },
};



const TARGET_LABELS: Record<string, { label: string, icon?: any }> = {
  all: { label: "Všichni uživatelé", icon: Users },
  worker: { label: "Řemeslníci", icon: UserCheck },
  customer: { label: "Zákazníci", icon: UserCheck },
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
  const [langFilter, setLangFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set(["onboarding-worker", "onboarding-customer", "reactivation"]));
  const [sendingSlug, setSendingSlug] = useState<string | null>(null);
  const [localizingTemplateId, setLocalizingTemplateId] = useState<string | null>(null);
  const [localizeProgress, setLocalizeProgress] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const { markets } = useMarkets();

  const testSendMutation = useMutation({
    mutationFn: async ({ slug, overrideData, jobId, targetEmail }: { slug: string; overrideData?: Partial<EmailTemplate>; jobId?: string; targetEmail?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-template-test", {
        body: { slug, overrideData, jobId, targetEmail },
      });
      if (error) throw error;
      return data;
    },
    onMutate: ({ slug }) => {
      setSendingSlug(slug);
    },
    onSuccess: (data: any) => {
      console.log("Success data:", data);
      const results = data?.results || [];
      const ok = results.filter((r: any) => r.success).length;
      const fail = results.filter((r: any) => !r.success).length;
      const errorMsg = fail > 0 ? results.find((r: any) => !r.success)?.error : "";
      window.alert(`Test odeslán. Úspěch: ${ok}, Selhání: ${fail}. ${errorMsg ? 'Chyba: ' + errorMsg : 'Pokud to nepřišlo, koukněte do spamu.'}`);
      toast({
        title: fail === 0 ? "Testovací e-maily odeslány ✅" : "Částečně odesláno ⚠️",
        description: `Odesláno: ${ok}, Selhalo: ${fail}`,
        variant: fail > 0 ? "destructive" : "default",
      });
      setSendingSlug(null);
    },
    onError: (err: any) => {
      console.error("Mutation error:", err);
      window.alert("Chyba při odesílání: " + (err?.message || String(err)));
      toast({ title: "Chyba odeslání", description: err.message, variant: "destructive" });
      setSendingSlug(null);
    },
  });

  const { data: templates = [], isLoading, error: queryError } = useQuery({
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
        language: template.language || "cs",
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
        ps_footer_enabled: template.ps_footer_enabled ?? false,
        ps_footer_text: template.ps_footer_text,
        language: template.language || "cs",
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

  useEffect(() => {
    if (templates.length > 0 && location.state?.editTemplateId) {
      const templateId = location.state.editTemplateId;
      const targetTemplate = templates.find((t: any) => t.id === templateId || t.slug === templateId);
      if (targetTemplate) {
        setEditingTemplate(targetTemplate);
        // Clear state so it doesn't reopen on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [templates, location.state, navigate]);

  const filtered = useMemo(() => {
    let list = templates;
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);
    if (langFilter !== "all") list = list.filter((t) => t.language === langFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q));
    }
    return list;
  }, [templates, categoryFilter, langFilter, searchQuery]);

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
      layout_type: "atmosferi_studio",
      hero_image_url: "",
    });
  };

  const SERIES_LABELS: Record<string, string> = {
    "onboarding-worker": "🛠️ Onboarding řemeslníků",
    "onboarding-customer": "👤 Onboarding zákazníků",
    reactivation: "🔄 Reaktivace",
    "sniper-outreach": "🎯 Sniper Outreach (All Templates)",
  };

  const handleLocalizeSingle = async (t: EmailTemplate) => {
    if (!confirm(`Opravdu chcete vytvořit všechny chybějící jazykové mutace pro šablonu "${t.name}" pomocí AI? Může to trvat minutu.`)) return;
    
    setLocalizingTemplateId(t.id);
    try {
      const otherMarkets = markets.filter(m => m.id !== "cz");
      let processed = 0;
      let created = 0;

      for (const m of otherMarkets) {
        processed++;
        setLocalizeProgress(`Zpracovávám: ${m.code} (${processed}/${otherMarkets.length})`);
        
        const expectedSlug = t.slug ? `${t.slug}-${m.id}` : null;
        if (!expectedSlug) continue;

        const exists = templates.some(existing => existing.slug === expectedSlug || (existing.category === t.category && existing.language === m.id && t.category !== 'lifecycle' && t.category !== 'transactional'));
        if (exists) continue;

        const payloadToTranslate = {
          subject: t.subject,
          greeting: t.greeting,
          body: t.body,
          cta_text: t.cta_text,
          secondary_text: t.secondary_text,
          urgency_banner_text: t.urgency_banner_text,
          promo_banner_text: t.promo_banner_text,
          ps_footer_text: t.ps_footer_text,
          job_description_snippet: t.job_description_snippet,
          service_1_title: t.segment_filters?.service_1_title,
          service_2_title: t.segment_filters?.service_2_title,
          service_3_title: t.segment_filters?.service_3_title,
        };

        const systemPrompt = `Jsi expert na B2B lokalizaci. Tvým úkolem je přeložit následující texty z češtiny do jazyka ${m.lang} (pro trh: ${m.name}).
DŮLEŽITÉ:
- Zachovej přesně původní tón a smysl (nic nevymýšlej navíc, žádné velké úpravy).
- Pouze do textů (např. do těla e-mailu nebo do patičky) jemně zakomponuj zmínku o cílové zemi (např. "ve Finsku", "v Německu", "pro náš trh v ${m.name}").
- Pokud je v textu proměnná např. {{mesto_v_meste}} nebo {{osloveni}}, NESMÍŠ JE PŘELOŽIT! Musí zůstat přesně ve formátu {{promenna}}.
- Výstup MUSÍ být pouze validní JSON objekt se stejnými klíči, jaké dostaneš na vstupu. Bez markdown značek \`\`\`json.`;

        let translated;
        try {
          const { data, error } = await supabase.functions.invoke("llms-full", {
            body: { prompt: JSON.stringify(payloadToTranslate), systemPrompt }
          });
          if (error) throw error;
          let jsonText = typeof data === "string" ? data : data.content;
          if (jsonText.startsWith("\`\`\`json")) jsonText = jsonText.substring(7);
          if (jsonText.endsWith("\`\`\`")) jsonText = jsonText.substring(0, jsonText.length - 3);
          translated = JSON.parse(jsonText.trim());
        } catch (e) {
          console.error("Chyba překladu pro", expectedSlug, e);
          continue;
        }

        const newTemplate = {
          name: `${t.name.replace(/ CZ| cz/g, '')} (${m.code})`,
          slug: expectedSlug,
          category: t.category,
          emoji: t.emoji,
          greeting: translated.greeting || t.greeting,
          body: translated.body || t.body,
          cta_text: translated.cta_text || t.cta_text,
          cta_url: t.cta_url,
          secondary_text: translated.secondary_text || t.secondary_text,
          target_role: t.target_role,
          trigger_type: t.trigger_type,
          trigger_event: t.trigger_event,
          drip_delay_days: t.drip_delay_days,
          drip_series: t.drip_series,
          is_enabled: false,
          layout_type: "atmosferi_studio",
          hero_image_url: t.hero_image_url,
          urgency_banner_enabled: t.urgency_banner_enabled,
          urgency_banner_text: translated.urgency_banner_text || t.urgency_banner_text,
          promo_banner_enabled: t.promo_banner_enabled,
          promo_banner_text: translated.promo_banner_text || t.promo_banner_text,
          ps_footer_enabled: t.ps_footer_enabled,
          ps_footer_text: translated.ps_footer_text || t.ps_footer_text,
          job_description_snippet: translated.job_description_snippet || t.job_description_snippet,
          show_job_widget: t.show_job_widget,
          show_cta_button: t.show_cta_button,
          language: m.id,
          subject: translated.subject || t.subject,
          segment_filters: {
            ...(t.segment_filters || {}),
            service_1_title: translated.service_1_title || t.segment_filters?.service_1_title,
            service_2_title: translated.service_2_title || t.segment_filters?.service_2_title,
            service_3_title: translated.service_3_title || t.segment_filters?.service_3_title,
          }
        };

        await saveMutation.mutateAsync(newTemplate);
        created++;
      }
      
      toast({ title: "Lokalizace hotova", description: `Bylo vygenerováno ${created} nových šablon.` });
      queryClient.invalidateQueries({ queryKey: ["email-templates-all"] });
    } catch (e: any) {
      toast({ title: "Chyba při lokalizaci", description: e.message, variant: "destructive" });
    } finally {
      setLocalizingTemplateId(null);
      setLocalizeProgress("");
    }
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
          
          <div className="flex bg-background/50 p-1 rounded-md border border-border/30 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setLangFilter("all")}
              className={`flex-none px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all whitespace-nowrap ${
                langFilter === "all" ? "bg-primary/15 dark:bg-primary/25 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🌍 Všechny státy
            </button>
            {markets.map((m) => {
              const isActive = langFilter === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setLangFilter(m.id)}
                  className={`flex-none px-3 py-1.5 text-[10px] font-bold rounded-sm transition-all whitespace-nowrap ${
                    isActive ? "bg-primary/15 dark:bg-primary/25 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {getFlagEmoji(m.code)} {m.name}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {localizingTemplateId && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-primary bg-primary/10 rounded-xl">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {localizeProgress}
            </div>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 rounded-2xl text-xs gap-1.5 px-4 font-bold text-amber-600 border-amber-600/30 hover:bg-amber-600/10" 
            onClick={async () => {
              if (confirm("Chcete opravit staré šablony a štítky u starších kontaktů?")) {
                const { error } = await supabase.from("email_templates").update({ layout_type: "atmosferi_studio" }).in("layout_type", ["standard", "magazine", "plain", null]);
                
                await supabase.from("marketing_leads").update({ language: "cz" }).eq("language", "cs");
                await supabase.from("marketing_leads").update({ category: "architekti" }).eq("category", "B2B").ilike("subcategory", "%architekt%");
                await supabase.from("marketing_leads").update({ category: "interiery" }).eq("category", "B2B").ilike("subcategory", "%interiér%");
                await supabase.from("marketing_leads").update({ category: "interiery" }).eq("category", "B2B").ilike("subcategory", "%interier%");
                await supabase.from("marketing_leads").update({ category: "developeri" }).eq("category", "B2B").ilike("subcategory", "%develop%");
                await supabase.from("marketing_leads").update({ category: "urbanismus" }).eq("category", "B2B").ilike("subcategory", "%urban%");
                await supabase.from("marketing_leads").update({ category: "urbanismus" }).eq("category", "B2B").ilike("subcategory", "%veřejn%");

                if (error) alert("Chyba: " + error.message);
                else { alert("Hotovo! Všechny staré kontakty a šablony jsou nyní plně kompatibilní s novými filtry."); queryClient.invalidateQueries({ queryKey: ["email-templates-all"] }); }
              }
            }}
          >
            Opravit databázi a starší kontakty
          </Button>
          <Button size="sm" className="h-9 rounded-2xl text-xs gap-1.5 px-4 font-bold w-full lg:w-auto shadow-sm" onClick={createNew}>
            <Plus className="h-4 w-4" /> Nová šablona
          </Button>
        </div>
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
                  onLocalize={() => handleLocalizeSingle(t)}
                  isLocalizing={localizingTemplateId === t.id}
                  markets={markets}
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
                onLocalize={() => handleLocalizeSingle(t)}
                isLocalizing={localizingTemplateId === t.id}
                markets={markets}
              />
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 && !isLoading && !queryError && (
        <div className="text-center py-12 text-muted-foreground text-sm italic">
          Žádné šablony k zobrazení.
        </div>
      )}

      {queryError && (
        <div className="text-center py-12 text-red-500 font-bold bg-red-500/10 rounded-xl border border-red-500/20">
          <p>Chyba načítání šablon z databáze:</p>
          <p className="font-mono text-xs mt-2 opacity-80">{queryError.message}</p>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <ModularEmailEditorDialog
        mode="template"
        isOpen={!!editingTemplate}
        initialData={editingTemplate}
        onClose={() => { setEditingTemplate(null); setIsCreating(false); }}
        onSave={(t: any) => saveMutation.mutate(t as any)}
        onDelete={() => editingTemplate && deleteMutation.mutate(editingTemplate.id)}
        isSaving={saveMutation.isPending}
        onTestSend={(slug: string, overrideData: any, jobId: string, targetEmail: string) => testSendMutation.mutate({ slug, overrideData: overrideData as any, jobId, targetEmail })}
        isSendingTest={testSendMutation.isPending}
        onMoveToOutbox={(t: any) => moveToOutboxMutation.mutate(t as any)}
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
  onLocalize,
  isLocalizing,
  markets,
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
  onLocalize?: () => void;
  isLocalizing?: boolean;
  markets: any[];
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
          <Badge variant="outline" className="text-[8px] border-border bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {markets.find(m => m.id === (t.language || "cz"))?.code || (t.language || "cz").toUpperCase()}
          </Badge>
          <Badge variant="outline" className={`text-[8px] ${cat.color}`}>
            {cat.label}
          </Badge>
          {t.target_role !== "all" && (
            <Badge variant="outline" className="text-[8px] border-border text-muted-foreground">
              {target.label}
            </Badge>
          )}
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
        {(t.language === "cz" || !t.language) && onLocalize && (
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted text-primary" onClick={onLocalize} title="Lokalizovat do všech zemí (AI)" disabled={isLocalizing}>
            {isLocalizing ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Globe className="h-4.5 w-4.5" />}
          </Button>
        )}
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

