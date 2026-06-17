import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, Sparkles, Save, X, Edit3, Target, Bold, Italic, Underline, List, Link, Send } from "lucide-react";
import { render } from "@react-email/render";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Shared Email Templates
import SniperRecruitmentEmail from "@/components/email/SniperRecruitmentEmail";
import NewsletterEmail from "@/components/email/NewsletterEmail";
import PlainTextEmail from "@/components/email/PlainTextEmail";
import { CITY_COORDINATES, getLocativeForCity, getPreposition } from "@/lib/city-regions";
import ModularEmailEditorDialog, { ModularLivePreview } from "@/components/admin/email/ModularEmailEditor";

// New Modular Components
import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, Sparkles, Save, X, Edit3, Target, Bold, Italic, Underline, List, Link, Send } from "lucide-react";
import { render } from "@react-email/render";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Shared Email Templates
import SniperRecruitmentEmail from "@/components/email/SniperRecruitmentEmail";
import NewsletterEmail from "@/components/email/NewsletterEmail";
import PlainTextEmail from "@/components/email/PlainTextEmail";
import { CITY_COORDINATES, getLocativeForCity, getPreposition } from "@/lib/city-regions";
import ModularEmailEditorDialog, { ModularLivePreview } from "@/components/admin/email/ModularEmailEditor";

// New Modular Components
import { EmailTopNav } from "@/components/admin/email/EmailTopNav";
import { AdminEmailDashboard } from "@/components/admin/email/AdminEmailDashboard";
import { CampaignManager } from "@/components/admin/email/CampaignManager";
import { AudienceManager } from "@/components/admin/email/AudienceManager";
import { AdminScraping } from "@/components/admin/email/AdminScraping";
import { AdminOutbox } from "@/components/admin/email/AdminOutbox";
import { ProposalsManager } from "@/components/admin/email/ProposalsManager";
import { AiInsightsTab } from "@/components/admin/email/AiInsightsTab";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const EmailTemplatesTab = lazy(() => import("@/components/admin/EmailTemplatesTab"));
const CampaignReview = lazy(() => import("@/components/admin/CampaignReview"));

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
  { key: "{{podkategorie_2pad}}", label: "Podkategorie - Skloněný tvar", desc: "Skloněný tvar podkategorie" },
  { key: "{{firma}}", label: "Firma / Studio", desc: "Název firmy nebo studia" },
  { key: "{{studio}}", label: "Studio / Firma", desc: "Alternativa k {{firma}}" },
  { key: "{{projekt}}", label: "Projekt", desc: "Název posledního projektu z webu" }
];

function RichTextToolbar({ onInsert }: { onInsert: (before: string, after: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 p-1.5 rounded-lg border border-border/50 mb-1.5 text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs font-bold hover:bg-primary/10 hover:text-primary gap-1 rounded"
        onClick={() => onInsert("**", "**")}
        title="Tučně (**text**)"
      >
        <Bold className="h-3 w-3" /> B
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs italic hover:bg-primary/10 hover:text-primary gap-1 rounded"
        onClick={() => onInsert("_", "_")}
        title="Kurzíva (_text_)"
      >
        <Italic className="h-3 w-3" /> I
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary gap-1 rounded"
        onClick={() => onInsert("• ", "")}
        title="Odrážka (• položka)"
      >
        <List className="h-3 w-3" /> Odrážka
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary gap-1 rounded"
        onClick={() => {
          const url = prompt("Zadejte URL odkazu:", "https://");
          if (url) onInsert(`<a href="${url}" style="color: #a6d16f; text-decoration: underline;">`, "</a>");
        }}
        title="Vložit odkaz"
      >
        <Link className="h-3 w-3" /> Odkaz
      </Button>
    </div>
  );
}

export default function AdminEmails() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlJobId = searchParams.get("job_id");

  // State Management
  const [campaignMode, setCampaignMode] = useState<"broadcast" | "sniper">("broadcast");
  const [templateType, setTemplateType] = useState<"standard" | "sniper" | "marketing" | "clean" | "minimal" | "plain">("standard");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSending, setIsSending] = useState(false);
  const [templateLanguage, setTemplateLanguage] = useState("cz");
  
  // Template Content State
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [campaignImage, setCampaignImage] = useState("");
  const [jobCity, setJobCity] = useState("");
  const [jobCategory, setJobCategory] = useState("");
  const [jobCategoryForm, setJobCategoryForm] = useState("architekta");
  const [priceNote, setPriceNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionSnippet, setJobDescriptionSnippet] = useState("");
  const [urgencyBannerEnabled, setUrgencyBannerEnabled] = useState(true);
  const [urgencyBannerText, setUrgencyBannerText] = useState("Spěchá: Zákazník čeká na rychlou reakci. Tuto zakázku jsme právě odeslali pouze vybraným specialistům ve vašem okolí.");
  const [promoBannerEnabled, setPromoBannerEnabled] = useState(true);
  const [promoBannerText, setPromoBannerText] = useState("Zaváděcí akce: Protože Zrobee právě spouštíme, první registrovaní profíci od nás získávají 100 kreditů zdarma do začátku.");
  const [showJobWidget, setShowJobWidget] = useState(true);
  const [showCtaButton, setShowCtaButton] = useState(true);
  const [secondaryText, setSecondaryText] = useState("");
  const [psFooterEnabled, setPsFooterEnabled] = useState(false);
  const [psFooterText, setPsFooterText] = useState("P.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat 'Ne' a už Vás nebudu nabídkami rušit.");
  const [activeInput, setActiveInput] = useState<"subject" | "title" | "body" | "ctaText" | "ctaUrl" | "secondaryText" | "jobDescriptionSnippet">("body");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [segmentFilters, setSegmentFilters] = useState<any>({});
  const [stealthTrackingEnabled, setStealthTrackingEnabled] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insertFormatting = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = body;
    const selectedText = val.substring(start, end);
    const replacement = before + (selectedText || "text") + after;
    const newVal = val.substring(0, start) + replacement + val.substring(end);
    setBody(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + (selectedText || "text").length);
    }, 0);
  };

  const snippetTextareaRef = useRef<HTMLTextAreaElement>(null);
  const insertFormattingSnippet = (before: string, after: string) => {
    const el = snippetTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = jobDescriptionSnippet;
    const selectedText = val.substring(start, end);
    const replacement = before + (selectedText || "text") + after;
    const newVal = val.substring(0, start) + replacement + val.substring(end);
    setJobDescriptionSnippet(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + (selectedText || "text").length);
    }, 0);
  };

  // Broadcast Filters
  const [target, setTarget] = useState("workers");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState("50");
  const [activity, setActivity] = useState("all");
  const [credits, setCredits] = useState("any");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // CRM Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [minEngagement, setMinEngagement] = useState("0");
  const [minPremiumScore, setMinPremiumScore] = useState("0");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [radiusFilter, setRadiusFilter] = useState("50");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [enrichFilter, setEnrichFilter] = useState("all");
  const [crmSort, setCrmSort] = useState<"engagement" | "newest" | "oldest">("engagement");
  const [crmPage, setCrmPage] = useState(0);
  const pageSize = 200;
  
  // Import/Export State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotalCount, setImportTotalCount] = useState(0);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Column Mapping State
  const [importState, setImportState] = useState<"idle" | "mapping" | "importing" | "done">("idle");
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ success: number; errors: number; details: string[] }>({ success: 0, errors: 0, details: [] });
  const [autoEnrich, setAutoEnrich] = useState(false);

  // Queries
  const { data: allSubcategories } = useQuery({
    queryKey: ["all-service-subcategories-with-cats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_subcategories")
        .select("id, name, category_id, service_categories(name, icon, slug)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allCategories } = useQuery({
    queryKey: ["all-service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name, icon, slug")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Campaign & Sniper State
  const [sniperJobId, setSniperJobId] = useState("");
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [campaignFilterCategory, setCampaignFilterCategory] = useState("all");
  const [campaignFilterSubcategory, setCampaignFilterSubcategory] = useState("all");

  const [selectedSniperWorkers, setSelectedSniperWorkers] = useState<string[]>([]);
  const [hideContacted, setHideContacted] = useState(true);
  const [sniperRadius, setSniperRadius] = useState("10");
  const [workerSearch, setWorkerSearch] = useState("");
  const [editingCategoryForm, setEditingCategoryForm] = useState("");

  // Modal states
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [saveMode, setSaveMode] = useState<"overwrite" | "new">("overwrite");

  const saveCampaignMutation = useMutation({
    mutationFn: async (directData?: any) => {
      const payload = {
        subject: directData ? directData.subject || "Bez předmětu" : subject || "Bez předmětu",
        heading: directData ? directData.name || "Bez nadpisu" : title || subject || "Bez nadpisu",
        body: directData ? directData.body || "" : body || "",
        cta_text: directData ? directData.cta_text || "Zobrazit a podat nabídku" : ctaText || "Zobrazit a podat nabídku",
        cta_url: directData ? directData.cta_url || "https://zrobee.cz" : ctaUrl || "https://zrobee.cz",
        secondary_text: directData ? directData.secondary_text || null : secondaryText || null,
        hero_image_url: directData ? directData.hero_image_url || null : campaignImage || null,
        layout_type: directData ? directData.layout_type : (templateType === "sniper" ? "sniper" : templateType) as any,
        urgency_banner_enabled: directData ? directData.urgency_banner_enabled : urgencyBannerEnabled,
        urgency_banner_text: directData ? directData.urgency_banner_text : urgencyBannerText,
        promo_banner_enabled: directData ? directData.promo_banner_enabled : promoBannerEnabled,
        promo_banner_text: directData ? directData.promo_banner_text : promoBannerText,
        ps_footer_enabled: directData ? directData.ps_footer_enabled : psFooterEnabled,
        ps_footer_text: directData ? directData.ps_footer_text : psFooterText,
        show_job_widget: directData ? directData.show_job_widget : showJobWidget,
        show_cta_button: directData ? directData.show_cta_button : showCtaButton,
        job_description_snippet: directData ? directData.job_description_snippet || null : jobDescriptionSnippet || null,
        segment_filters: directData ? directData.segment_filters : segmentFilters,
        language: directData ? directData.language || templateLanguage : templateLanguage,
        updated_at: new Date().toISOString()
      };

      if (saveMode === "overwrite" && selectedTemplateId !== "custom") {
        const { error } = await supabase.from("email_templates").update(payload).eq("id", selectedTemplateId);
        if (error) throw error;
        return selectedTemplateId;
      } else {
        const baseSlug = (newTemplateName || title || "sablona").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const newSlug = baseSlug + "-" + Math.floor(1000 + Math.random() * 9000);
        const insertPayload = {
          ...payload,
          name: newTemplateName || title || "Nová šablona",
          slug: newSlug,
          category: "marketing",
          target_role: "worker",
          trigger_type: "manual",
          is_enabled: true
        };
        const { data, error } = await supabase.from("email_templates").insert([insertPayload]).select("id").single();
        if (error) throw error;
        return data?.id;
      }
    },
    onSuccess: (savedId) => {
      queryClient.invalidateQueries({ queryKey: ["email-templates-all-list"] });
      if (savedId && typeof savedId === "string") setSelectedTemplateId(savedId);
      toast({ title: "Šablona úspěšně uložena", description: "Vaše úpravy a veškeré nastavení byly zapsány do databáze." });
      setSaveTemplateOpen(false);
      setEditorOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Chyba při ukládání", description: err.message || String(err), variant: "destructive" });
    }
  });

  const testSendMutation = useMutation({
    mutationFn: async ({ slug, overrideData, jobId, targetEmail }: { slug: string; overrideData: any; jobId?: string; targetEmail?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-template-test", {
        body: {
          slug: slug || "custom",
          targetEmail: targetEmail || "michal.kasparek91@gmail.com",
          overrideData: {
            name: overrideData.name || overrideData.subject || "Test kampaně",
            subject: overrideData.subject,
            heading: overrideData.name,
            title: overrideData.name,
            body: overrideData.body,
            cta_text: overrideData.cta_text,
            cta_url: overrideData.cta_url || "https://zrobee.cz",
            layout_type: overrideData.layout_type === "sniper" ? "sniper_recruitment" : overrideData.layout_type,
            job_city: jobCity,
            job_category: jobCategory,
            price_note: priceNote,
            customer_name: customerName,
            job_description: overrideData.job_description,
            job_description_snippet: overrideData.job_description_snippet,
            urgency_banner_enabled: overrideData.urgency_banner_enabled,
            urgency_banner_text: overrideData.urgency_banner_text,
            promo_banner_enabled: overrideData.promo_banner_enabled,
            promo_banner_text: overrideData.promo_banner_text,
            ps_footer_enabled: overrideData.ps_footer_enabled,
            ps_footer_text: overrideData.ps_footer_text,
            show_job_widget: overrideData.show_job_widget,
            show_cta_button: overrideData.show_cta_button,
            segment_filters: {
              preview_theme: previewTheme,
              secondary_text_below_job: overrideData.segment_filters?.secondary_text_below_job
            }
          },
          jobId: jobId !== "default" ? jobId : undefined
        }
      });
      if (error) throw error;
      if (data && data.results && data.results.length > 0) {
        const firstError = data.results.find((r: any) => !r.success);
        if (firstError) {
          throw new Error(firstError.error || "Neznámá chyba při odesílání přes Resend.");
        }
      }
      return data;
    },
    onSuccess: (data) => {
      console.log("Success data:", data);
      window.alert("Testovací e-mail byl úspěšně odeslán (nebo server vrátil úspěch). Podívejte se do spamu.");
      toast({ title: "Testovací e-mail odeslán", description: "E-mail byl úspěšně odeslán na michal.kasparek91@gmail.com." });
    },
    onError: (err: any) => {
      console.error("Mutation error:", err);
      window.alert("Chyba při odesílání: " + (err?.message || String(err)));
      toast({ title: "Chyba při odesílání", description: err.message || String(err), variant: "destructive" });
    }
  });


  // Drip paused setting query & mutation
  const { data: isDripPausedData, isLoading: isDripPausedLoading } = useQuery({
    queryKey: ["app-settings", "drip_paused"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "drip_paused")
        .maybeSingle();
      const v: any = data?.value;
      return v === true || v?.paused === true;
    },
  });

  const dripPausedMutation = useMutation({
    mutationFn: async (paused: boolean) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "drip_paused", value: paused as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings", "drip_paused"] });
      toast({ title: "Nastavení uloženo", description: "Nastavení automatizace (drips) bylo úspěšně aktualizováno." });
    },
    onError: (e: any) => {
      toast({ 
        title: "Chyba ukládání", 
        description: `Nepodařilo se uložit nastavení: ${e.message ?? e}`, 
        variant: "destructive" 
      });
    },
  });

  // Queries
  const { data: dbTemplates } = useQuery({
    queryKey: ["marketing-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("marketing_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: emailTemplates } = useQuery({
    queryKey: ["email-templates-all-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState("custom");

  const activeTemplateSlug = useMemo(() => {
    return emailTemplates?.find(t => t.id === selectedTemplateId)?.slug || "custom";
  }, [emailTemplates, selectedTemplateId]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "custom") return;
    const t = emailTemplates?.find(x => x.id === templateId);
    if (t) {
      setSubject(t.subject || "");
      setTitle(t.heading || t.name || "");
      setBody(t.body || "");
      setCtaText(t.cta_text || "Mám zájem");
      setCtaUrl(t.cta_url || "https://zrobee.cz");
      setSecondaryText(t.secondary_text || "");
      setCampaignImage(t.hero_image_url || "");
      setTemplateLanguage(t.language || "cz");
      setTemplateType((t.layout_type || "classic") as any);
      setUrgencyBannerEnabled(t.urgency_banner_enabled ?? true);
      setUrgencyBannerText(t.urgency_banner_text || "");
      setPromoBannerEnabled(t.promo_banner_enabled ?? true);
      setPromoBannerText(t.promo_banner_text || "");
      setPsFooterEnabled(t.ps_footer_enabled ?? false);
      setPsFooterText(t.ps_footer_text || "");
      setShowJobWidget(t.show_job_widget ?? true);
      setShowCtaButton(t.show_cta_button ?? true);
      setJobDescriptionSnippet(t.job_description_snippet || "");
      if (t.segment_filters) {
        const sf = t.segment_filters as any;
        setSegmentFilters(sf);
        setPreviewTheme(sf.preview_theme || "light");
      } else {
        setSegmentFilters({});
        setPreviewTheme("light");
      }
      toast({ title: "Šablona načtena", description: `Šablona "${t.name}" byla úspěšně načtena do editoru.` });
    }
  };

  const { data: openJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["admin-open-jobs"],
    queryFn: async () => {
      const { data: jobs, error } = await supabase.from("jobs").select(`id, title, city, description, subcategory_id, budget_min, budget_max, price_note, customer_id, service_subcategories(name, category_form)`).eq("status", "open").order("created_at", { ascending: false });
      if (error) throw error;
      
      const customerIds = [...new Set(jobs?.map(j => j.customer_id).filter(Boolean) || [])];
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", customerIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        return jobs?.map(j => ({
          ...j,
          customer_name: profileMap.get(j.customer_id) || "Zákazník"
        })) || [];
      }
      return jobs || [];
    },
  });

  const applyJobToCampaign = (jobId: string) => {
    setSniperJobId(jobId);
    setCampaignMode("sniper");
    setTemplateType("sniper");

    const job = openJobs?.find(j => j?.id === jobId);
    if (job?.subcategory_id) {
      const subcat = allSubcategories?.find(s => s.id === job.subcategory_id);
      if (subcat?.category_id) {
        setCampaignFilterCategory(subcat.category_id);
      }
      setCampaignFilterSubcategory(job.subcategory_id);
    }

    const activeTpl = emailTemplates?.find(t => t.id === selectedTemplateId) || emailTemplates?.find(t => t.slug === "sniper-outreach-v2") || emailTemplates?.find(t => t.slug === "sniper-a-zvrdavost");
    const jobCat = job ? ((job as any).service_subcategories?.name || "Architektura a design") : "Architektura a design";
    const jobCatForm = job ? ((job as any).service_subcategories?.category_form || (job as any).service_subcategories?.name || "architekta") : "architekta";
    const jobCityStr = job?.city || "okolí";
    const jobDescStr = job?.description || "";
    const jobTitleStr = job?.title || "Nová zakázka";
    const custFullName = (job as any)?.customer_name || "Jan Novák";
    const custFirstName = custFullName !== "Zákazník" && custFullName ? custFullName.split(" ")[0] : "Jan";

    setJobCity(jobCityStr);
    setJobCategory(jobCat);
    setJobCategoryForm(jobCatForm);
    setJobDescription(jobDescStr);
    setPriceNote(job?.budget_min ? `${job.budget_min.toLocaleString('cs-CZ')} Kč` : "Dle dohody");
    setCustomerName(custFirstName);

    if (activeTpl) {
      let subj = activeTpl.subject || "Poptávka na {{jobCategory}} v okolí ({{jobCity}})";
      subj = subj.replace(/{{jobCategory}}/g, jobCat).replace(/{{jobCity}}/g, jobCityStr);
      setSubject(subj);
      setTitle(jobTitleStr);
      if (!body || body.includes("Zde napište") || body.includes("jsme Zrobee") || body === jobDescStr) {
        setBody(activeTpl.body || "jsme Atmosferi – platforma spojující architekty, designéry a developery s relevantními klienty a projekty v okolí.\n\nZrovna hledáme specialistu na tento konkrétní projekt, který u nás zákazník z lokality dnes ráno poptal.");
      }
      if (activeTpl.cta_text) setCtaText(activeTpl.cta_text);
      if (activeTpl.job_description_snippet !== undefined) setJobDescriptionSnippet(activeTpl.job_description_snippet || "");
      setCtaUrl(`https://zrobee.cz/sdilena-zakazka/${job?.id || jobId}`);
    } else {
      setSubject(`Poptávka na ${jobCat} v okolí (${jobCityStr})`);
      setTitle(jobTitleStr);
      setBody("jsme Atmosferi – platforma spojující architekty, designéry a developery s relevantními klienty a projekty v okolí.\n\nZrovna hledáme specialistu na tento konkrétní projekt, který u nás zákazník z lokality dnes ráno poptal.");
      setCtaText("Zobrazit detail projektu");
      setCtaUrl(`https://zrobee.cz/sdilena-zakazka/${job?.id || jobId}`);
    }
  };

  const handleGoToCampaign = (jobId: string) => {
    navigate("novakampan");
    applyJobToCampaign(jobId);
  };

  const handlePreviewEditDraft = (draft: any) => {
    const isSpecificJob = !!draft.job_id;
    if (isSpecificJob) {
      applyJobToCampaign(draft.job_id);
    }
    const targetSlug = isSpecificJob ? "sniper-a-zvrdavost" : "sniper-recruitment-day1";
    const matchedTpl = emailTemplates?.find(t => t.slug === targetSlug) || draft.template || emailTemplates?.find(t => t.id === draft.template?.id);
    
    if (matchedTpl) {
      if (matchedTpl.id) setSelectedTemplateId(matchedTpl.id);
      let tBody = matchedTpl.body || "";
      if (draft.icebreaker) {
        if (tBody.includes("{{icebreaker}}")) {
          tBody = tBody.replace(/{{icebreaker}}/g, draft.icebreaker);
        } else {
          tBody = `${draft.icebreaker}\n\n${tBody}`;
        }
      }
      setBody(tBody);
      if (matchedTpl.cta_text) setCtaText(matchedTpl.cta_text);
      if (matchedTpl.cta_url) setCtaUrl(matchedTpl.cta_url);
      setSecondaryText(matchedTpl.secondary_text || (isSpecificJob ? "Máte otázku? Odpovězte přímo na tento e-mail." : ""));
      if (matchedTpl.layout_type) setTemplateType(matchedTpl.layout_type);
      setUrgencyBannerEnabled(matchedTpl.urgency_banner_enabled ?? (isSpecificJob ? false : false));
      setPromoBannerEnabled(matchedTpl.promo_banner_enabled ?? (isSpecificJob ? false : true));
      setPsFooterEnabled(matchedTpl.ps_footer_enabled ?? (isSpecificJob ? true : false));
      setShowJobWidget(matchedTpl.show_job_widget ?? (isSpecificJob ? false : false));
      setShowCtaButton(matchedTpl.show_cta_button ?? true);
      setSubject(matchedTpl.subject || (isSpecificJob ? "Poptávka: {{obor}} {{mesto_v_meste}}" : "Zrobee: Pozvánka ke spolupráci"));
      setJobDescriptionSnippet(matchedTpl.job_description_snippet || "");
      if (matchedTpl.segment_filters) {
        setSegmentFilters(matchedTpl.segment_filters);
        setPreviewTheme(matchedTpl.segment_filters.preview_theme || "light");
      } else {
        setSegmentFilters({});
        setPreviewTheme("light");
      }
    } else {
      if (draft.icebreaker) {
        setBody(`${draft.icebreaker}\n\n${body}`);
      }
      // Fallbacks
      if (isSpecificJob) {
        setShowCtaButton(true);
        setSecondaryText("Máte otázku? Odpovězte přímo na tento e-mail.");
        setShowJobWidget(false);
        setUrgencyBannerEnabled(false);
        setPromoBannerEnabled(false);
        setPsFooterEnabled(true);
        setJobDescriptionSnippet("");
        setSubject("Poptávka: {{obor}} {{mesto_v_meste}}");
      } else {
        setShowCtaButton(true);
        setShowJobWidget(false);
        setUrgencyBannerEnabled(false);
        setPromoBannerEnabled(true);
        setPsFooterEnabled(false);
        setJobDescriptionSnippet("");
        setSubject("Atmosferi: Pozvánka ke spolupráci");
      }
    }
    setEditorOpen(true);
  };

  const { data: suitableWorkers, isLoading: workersLoading } = useQuery({
    queryKey: ["admin-suitable-workers", sniperJobId, sniperRadius],
    enabled: !!sniperJobId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_suitable_workers_for_sniper', { p_job_id: sniperJobId, p_radius_km: sniperRadius === 'all' ? null : parseFloat(sniperRadius) });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (suitableWorkers && suitableWorkers.length > 0) {
      setSelectedSniperWorkers(suitableWorkers.map((w: any) => w.email));
    } else {
      setSelectedSniperWorkers([]);
    }
  }, [suitableWorkers]);

  const { data: leadSheetData, isLoading: leadsLoading } = useQuery({
    queryKey: ["admin-lead-sheet", searchTerm, minEngagement, minPremiumScore, categoryFilter, countryFilter, languageFilter, cityFilter, radiusFilter, sourceFilter, enrichFilter, crmPage, crmSort],
    queryFn: async () => {
      let query = supabase.from("unified_contacts" as any).select("*", { count: 'exact' });
      
      if (crmSort === "engagement") {
         query = query.order("engagement_score", { ascending: false }).order("created_at", { ascending: false });
      } else if (crmSort === "newest") {
         query = query.order("created_at", { ascending: false });
      } else if (crmSort === "oldest") {
         query = query.order("created_at", { ascending: true });
      }
      
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      if (minEngagement && parseInt(minEngagement) > 0) query = query.gte("engagement_score", parseInt(minEngagement));
      if (minPremiumScore && parseInt(minPremiumScore) > 0) query = query.gte("premium_score", parseInt(minPremiumScore));

      if (sourceFilter === "organic") query = query.eq("contact_source", "registered");
      else if (sourceFilter === "scraped") query = query.eq("contact_source", "lead");
      else if (sourceFilter === "ai_web_sniper") query = query.eq("contact_source", "ai_web_sniper");

      if (enrichFilter === "unenriched") query = query.is("description", null);
      else if (enrichFilter === "enriched") query = query.not("description", "is", null);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (countryFilter !== "all") {
        query = query.eq("country", countryFilter);
      }

      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter);
      }

      // City & Distance Filter
      if (cityFilter !== "all") {
        const coords = CITY_COORDINATES[cityFilter];
        if (coords) {
          const r = parseFloat(radiusFilter);
          // Simple bounding box for rough filtering (approx 1 deg lat = 111km)
          const latDelta = r / 111;
          const lngDelta = r / (111 * Math.cos(coords.lat * Math.PI / 180));
          
          query = query
            .gte("latitude", coords.lat - latDelta)
            .lte("latitude", coords.lat + latDelta)
            .gte("longitude", coords.lng - lngDelta)
            .lte("longitude", coords.lng + lngDelta);
        } else {
          // Fallback to text matching if no coordinates
          query = query.ilike("city", `%${cityFilter}%`);
        }
      }

      const { data, count, error } = await query.range(crmPage * pageSize, (crmPage + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], totalCount: count || 0 };
    },
  });

  const fetchAllMatchingContacts = async () => {
    const buildQuery = () => {
      let query = supabase.from("unified_contacts" as any).select("id, contact_source");
      if (crmSort === "engagement") {
         query = query.order("engagement_score", { ascending: false }).order("created_at", { ascending: false });
      } else if (crmSort === "newest") {
         query = query.order("created_at", { ascending: false });
      } else if (crmSort === "oldest") {
         query = query.order("created_at", { ascending: true });
      }
      
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      if (minEngagement && parseInt(minEngagement) > 0) query = query.gte("engagement_score", parseInt(minEngagement));
      if (sourceFilter === "organic") query = query.eq("contact_source", "registered");
      else if (sourceFilter === "scraped") query = query.eq("contact_source", "lead");
      else if (sourceFilter === "ai_web_sniper") query = query.eq("contact_source", "ai_web_sniper");
      
      if (enrichFilter === "unenriched") query = query.is("description", null);
      else if (enrichFilter === "enriched") query = query.not("description", "is", null);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (countryFilter !== "all") {
        query = query.eq("country", countryFilter);
      }

      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter);
      }

      if (cityFilter !== "all") {
        const coords = CITY_COORDINATES[cityFilter];
        if (coords) {
          const r = parseFloat(radiusFilter);
          const latDelta = r / 111;
          const lngDelta = r / (111 * Math.cos(coords.lat * Math.PI / 180));
          
          query = query
            .gte("latitude", coords.lat - latDelta)
            .lte("latitude", coords.lat + latDelta)
            .gte("longitude", coords.lng - lngDelta)
            .lte("longitude", coords.lng + lngDelta);
        } else {
          query = query.ilike("city", `%${cityFilter}%`);
        }
      }
      return query;
    };

    let allData: any[] = [];
    let page = 0;
    const fetchLimit = 1000;
    let hasMore = true;

    while (hasMore) {
      const query = buildQuery();
      const { data, error } = await query.range(page * fetchLimit, (page + 1) * fetchLimit - 1);
      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        if (data.length < fetchLimit) hasMore = false;
        page++;
      }
    }
    return allData;
  };

  const leadSheet = leadSheetData?.data || [];
  const leadTotalCount = leadSheetData?.totalCount || 0;
  const totalPages = Math.ceil(leadTotalCount / pageSize);

  const { data: campaignReachCount } = useQuery({
    queryKey: ["admin-campaign-reach", target, campaignFilterCategory, campaignFilterSubcategory, campaignMode, sniperJobId, suitableWorkers?.length, city, radius],
    queryFn: async () => {
      if (campaignMode === "sniper") {
        return suitableWorkers ? suitableWorkers.length : 0;
      }

      let query = supabase.from("unified_contacts" as any).select("*", { count: "exact", head: true });
      
      if (target === "workers") query = query.eq("user_type", "worker");
      else if (target === "customers") query = query.eq("user_type", "customer");
      else if (target === "pro") query = query.eq("is_pro", true);
      
      if (campaignFilterSubcategory !== "all") {
        const subcatName = allSubcategories?.find(s => s.id === campaignFilterSubcategory)?.name;
        if (subcatName) {
          query = query.or(`subcategory.ilike.%${campaignFilterSubcategory}%,subcategory.ilike.%${subcatName}%`);
        } else {
          query = query.ilike("subcategory", `%${campaignFilterSubcategory}%`);
        }
      } else if (campaignFilterCategory !== "all") {
        const subcats = allSubcategories?.filter(s => s.category_id === campaignFilterCategory);
        if (subcats && subcats.length > 0) {
          const conditions = subcats.map(s => `subcategory.ilike.%${s.name}%`).join(",");
          query = query.or(conditions);
        }
      }

      if (city && city !== "all") {
        const coords = CITY_COORDINATES[city];
        if (coords) {
          const r = parseFloat(radius || "50");
          const latDelta = r / 111;
          const lngDelta = r / (111 * Math.cos(coords.lat * Math.PI / 180));
          
          query = query
            .gte("latitude", coords.lat - latDelta)
            .lte("latitude", coords.lat + latDelta)
            .gte("longitude", coords.lng - lngDelta)
            .lte("longitude", coords.lng + lngDelta);
        } else {
          query = query.ilike("city", `%${city}%`);
        }
      }
      
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const [realtimeCityLocative, setRealtimeCityLocative] = useState<string>("");

  useEffect(() => {
    if (!jobCity) return;
    const clean = jobCity.trim();
    const staticLoc = getLocativeForCity(clean);
    const prep = getPreposition(clean);
    if (staticLoc !== clean) {
      setRealtimeCityLocative(`${prep} ${staticLoc}`);
      return;
    }
    (supabase.from("city_locatives").select("locative_phrase").eq("city", clean).maybeSingle() as unknown as Promise<any>)
      .then(({ data }: any) => {
        if (data && data.locative_phrase) {
          setRealtimeCityLocative(data.locative_phrase);
        } else {
          supabase.functions.invoke("get-city-locative", { body: { city: clean } })
            .then(({ data: aiData }) => {
              if (aiData?.phrase) setRealtimeCityLocative(aiData.phrase);
              else setRealtimeCityLocative(`${prep} ${clean}`);
            })
            .catch(() => setRealtimeCityLocative(`${prep} ${clean}`));
        }
      })
      .catch(() => setRealtimeCityLocative(`${prep} ${clean}`));
  }, [jobCity]);

  const previewReplace = (txt: string) => {
    if (!txt) return "";
    const locCity = getLocativeForCity(jobCity || "Praha");
    const prep = getPreposition(jobCity || "Praha");
    const phrase = realtimeCityLocative || `${prep} ${locCity}`;
    return txt
      .replace(/{{osloveni}}/g, "Petře")
      .replace(/{{jmeno}}/g, "Petr Novák")
      .replace(/{{mesto_v_meste}}/g, phrase)
      .replace(/{{mesto}}/g, jobCity || "Praha")
      .replace(/{{obor_2pad}}|{{podkategorie_2pad}}/g, jobCategoryForm || "instalatéra")
      .replace(/{{obor}}/g, jobCategory || "Řemeslné práce")
      .replace(/{{nazev_zakazky}}/g, title || "Ukázková zakázka")
      .replace(/{{popis_zakazky}}/g, jobDescription || "Hledám spolehlivého řemeslníka na kompletní obklad koupelny, rozměr cca 15m2. Materiál mám nakoupený.")
      .replace(/{{cena_rozpocet}}|{{rozpocet}}/g, priceNote || "15 000 Kč")
      .replace(/{{zakaznik}}/g, customerName || "Jan Novák")
      .replace(/{{odkaz_zakazky}}/g, ctaUrl || "https://zrobee.cz/sdilena-zakazka/123")
      .replace(/{{firma}}|{{studio}}/g, "Ukázkové Studio")
      .replace(/{{projekt}}/g, "Národní muzeum")
      .replace(/{{icebreaker}}/g, "Všimli jsme si vašeho skvělého profilu na Zrobee.");
  };

  const HtmlContent = () => {
    try {
      const formState = {
        id: selectedTemplateId,
        name: title || subject || "",
        subject: subject,
        emoji: "📧",
        greeting: "",
        body: body,
        cta_text: ctaText,
        cta_url: ctaUrl,
        secondary_text: secondaryText,
        layout_type: templateType,
        hero_image_url: campaignImage,
        urgency_banner_enabled: urgencyBannerEnabled,
        urgency_banner_text: urgencyBannerText,
        promo_banner_enabled: promoBannerEnabled,
        promo_banner_text: promoBannerText,
        ps_footer_enabled: psFooterEnabled,
        ps_footer_text: psFooterText,
        show_job_widget: showJobWidget,
        show_cta_button: showCtaButton,
        job_description_snippet: jobDescriptionSnippet,
        stealth_tracking_enabled: stealthTrackingEnabled,
        segment_filters: segmentFilters,
      };

      return (
        <ModularLivePreview 
          form={formState as any} 
          previewReplace={previewReplace} 
          previewTheme={previewTheme} 
        />
      );
    } catch (err) {
      return <div className="p-8 text-rose-500 font-medium">Chyba vykreslování náhledu.</div>;
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-template-test", {
        body: {
          slug: selectedTemplateId || "custom",
          targetEmail: "michal.kasparek91@gmail.com",
          overrideData: {
            name: previewReplace(title || subject || "Test kampaně"),
            subject: previewReplace(subject),
            heading: previewReplace(title),
            title: previewReplace(title),
            body: previewReplace(body),
            cta_text: previewReplace(ctaText),
            cta_url: ctaUrl || "https://zrobee.cz",
            layout_type: templateType === "sniper" ? "sniper_recruitment" : templateType,
            job_city: jobCity,
            job_category: jobCategory,
            price_note: priceNote,
            customer_name: customerName,
            job_description: previewReplace(jobDescription),
            job_description_snippet: previewReplace(jobDescriptionSnippet),
            urgency_banner_enabled: urgencyBannerEnabled,
            urgency_banner_text: previewReplace(urgencyBannerText),
            promo_banner_enabled: promoBannerEnabled,
            promo_banner_text: previewReplace(promoBannerText),
            ps_footer_enabled: psFooterEnabled,
            ps_footer_text: psFooterText,
            show_job_widget: showJobWidget,
            show_cta_button: showCtaButton,
            segment_filters: {
              preview_theme: previewTheme,
              secondary_text_below_job: jobDescriptionSnippet
            }
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Testovací e-mail odeslán",
        description: "E-mail byl úspěšně odeslán na michal.kasparek91@gmail.com.",
      });
    } catch (err: any) {
      toast({
        title: "Chyba odeslání testu",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSend = async () => {
    if (campaignMode === "sniper") {
      if (!sniperJobId) {
        toast({ title: "Chyba", description: "Není vybrána žádná zakázka pro sniper kampaň.", variant: "destructive" });
        return;
      }
      if (!selectedSniperWorkers || selectedSniperWorkers.length === 0) {
        toast({ title: "Chyba", description: "Nejsou vybráni žádní příjemci k oslovení.", variant: "destructive" });
        return;
      }

      setIsSending(true);
      try {
        const targets = suitableWorkers?.filter((w: any) => selectedSniperWorkers.includes(w.email)) || [];
        if (targets.length === 0) {
          throw new Error("Nepodařilo se spárovat vybrané e-maily s databází.");
        }

        const template = emailTemplates?.find(t => t.id === selectedTemplateId);
        const templateSlug = template?.slug || "sniper-outreach-v2";

        const outboxRows = targets.map((t: any) => ({
          job_id: sniperJobId,
          lead_id: t.contact_source === "lead" ? t.id : null,
          worker_id: t.contact_source === "registered" ? t.id : null,
          template_slug: templateSlug,
          subject: subject,
          full_body: body,
          job_description_snippet: jobDescriptionSnippet || body,
          urgency_banner_enabled: urgencyBannerEnabled,
          urgency_banner_text: urgencyBannerText,
          promo_banner_enabled: promoBannerEnabled,
          promo_banner_text: promoBannerText,
          ps_footer_enabled: psFooterEnabled,
          ps_footer_text: psFooterText,
          show_job_widget: showJobWidget,
          show_cta_button: showCtaButton,
          cta_text: ctaText,
          cta_url: ctaUrl,
          layout_type: templateType === "sniper" ? "sniper_recruitment" : templateType,
          status: "pending",
          segment_filters: { stealth_tracking_enabled: stealthTrackingEnabled }
        }));

        const { error } = await supabase.from("email_outbox").insert(outboxRows);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["admin-sniper-outbox-progress"] });
        queryClient.invalidateQueries({ queryKey: ["sniper-outbox-count"] });

        toast({ 
          title: "🎯 Kampaň zařazena do fronty!", 
          description: `Celkem ${targets.length} kontaktů zařazeno do automatické rozesílky (30 e-mailů denně).` 
        });

        navigate("schvalovani");
      } catch (err: any) {
        toast({ title: "Chyba při spouštění kampaně", description: err.message || String(err), variant: "destructive" });
      } finally {
        setIsSending(false);
      }
    } else {
      toast({ title: "Odesílání spuštěno", description: "Kampaň byla zařazena do fronty k odeslání." });
    }
  };

  const handleExportCSV = async () => {
    try {
      toast({ title: "Export spuštěn", description: "Připravuji data pro export..." });
      
      let query = supabase.from("unified_contacts" as any).select("*").order("engagement_score", { ascending: false }).order("created_at", { ascending: false });
      
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      if (minEngagement && parseInt(minEngagement) > 0) query = query.gte("engagement_score", parseInt(minEngagement));

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (countryFilter !== "all") {
        query = query.eq("country", countryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Žádná data k exportu.", variant: "destructive" });
        return;
      }

      const header = "full_name,email,phone,user_type,website,is_pro,city,country,language,full_address,postal_code,street_name,street_number,latitude,longitude,tags,category,subcategory,engagement_score,premium_score,decision_maker_name,contact_source,description,ai_icebreaker\n";
      const rows = data.map((c: any) => {
        return `"${c.full_name || ""}","${c.email}","${c.phone || ""}","${c.user_type || "worker"}","${c.website || ""}","${c.is_pro ? "Yes" : "No"}","${c.city || ""}","${c.country || ""}","${c.language || ""}","${c.full_address || ""}","${c.postal_code || ""}","${c.street_name || ""}","${c.street_number || ""}","${c.latitude || ""}","${c.longitude || ""}","${(c.tags || []).join(";")}","${c.category || ""}","${c.subcategory || ""}","${c.engagement_score}","${c.premium_score || ""}","${(c.decision_maker_name || "").replace(/"/g, '""')}","${c.contact_source}","${(c.description || "").replace(/"/g, '""')}","${(c.ai_icebreaker || "").replace(/"/g, '""')}"`;
      });

      const csv = header + rows.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Export dokončen", description: `Exportováno ${data.length} kontaktů.` });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Chyba při exportu.", variant: "destructive" });
    }
  };

  const EXPECTED_CSV_FIELDS = [
    { key: "email", label: "E-mail (Povinné)" },
    { key: "full_name", label: "Jméno a příjmení" },
    { key: "company_name", label: "Název firmy" },
    { key: "phone", label: "Telefon" },
    { key: "city", label: "Město" },
    { key: "country", label: "Země" },
    { key: "language", label: "Jazyk" },
    { key: "website", label: "Web" },
    { key: "decision_maker_name", label: "Rozhodovatel" },
    { key: "premium_score", label: "Skóre kvality (0-100)" },
    { key: "engagement_score", label: "Skóre aktivity" },
    { key: "full_address", label: "Celá adresa" },
    { key: "postal_code", label: "PSČ" },
    { key: "street_name", label: "Ulice" },
    { key: "street_number", label: "Č.p." },
    { key: "category", label: "Kategorie (ID)" },
    { key: "subcategory", label: "Podkategorie (ID)" },
    { key: "tags", label: "Štítky (;)" },
    { key: "is_pro", label: "Je PRO? (yes/no)" },
    { key: "description", label: "Popis" },
    { key: "ai_icebreaker", label: "AI Icebreaker" },
    { key: "user_type", label: "Typ uživatele" },
    { key: "contact_source", label: "Zdroj" },
  ];

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const rows = content.split("\n").filter(l => l.trim());
      if (rows.length <= 1) {
        toast({ title: "CSV soubor je prázdný.", variant: "destructive" });
        return;
      }

      const parseCSVLine = (text: string, sep: string) => {
        const result = [];
        let col = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === sep && !inQuotes) {
            result.push(col);
            col = '';
          } else {
            col += char;
          }
        }
        result.push(col);
        return result.map(p => p.trim().replace(/^"|"$/g, ""));
      };

      const headerRow = rows[0];
      const separator = headerRow.includes("\t") ? "\t" : headerRow.includes(";") ? ";" : ",";
      const rawHeaders = parseCSVLine(headerRow, separator);
      
      const safeHeaders: string[] = [];
      const seen = new Set<string>();
      rawHeaders.forEach((h, i) => {
        let safe = h.trim() || `Sloupec ${i + 1}`;
        let original = safe;
        let counter = 1;
        while (seen.has(safe)) {
          safe = `${original} (${counter})`;
          counter++;
        }
        seen.add(safe);
        safeHeaders.push(safe);
      });
      
      const dataRows = rows.slice(1);
      
      const initialMapping: Record<string, string> = {};
      const expectedKeys = EXPECTED_CSV_FIELDS.map(f => f.key);
      
      safeHeaders.forEach(h => {
        let cleaned = h.toLowerCase();
        if (cleaned === "e-mail" || cleaned === "emailová adresa" || cleaned === "e-mailová adresa") initialMapping["email"] = h;
        else if (cleaned === "jméno" || cleaned === "name") initialMapping["full_name"] = h;
        else if (cleaned === "firma" || cleaned === "společnost" || cleaned === "název firmy") initialMapping["company_name"] = h;
        else if (cleaned === "město" || cleaned === "obec") initialMapping["city"] = h;
        else if (cleaned === "stát" || cleaned === "země") initialMapping["country"] = h;
        else if (cleaned === "jazyk") initialMapping["language"] = h;
        else if (cleaned === "telefon" || cleaned === "tel") initialMapping["phone"] = h;
        else if (cleaned === "web" || cleaned === "stránky") initialMapping["website"] = h;
        else if (cleaned === "majitel" || cleaned === "rozhodovatel" || cleaned === "ředitel") initialMapping["decision_maker_name"] = h;
        else if (cleaned === "premium_score" || cleaned === "skóre kvality") initialMapping["premium_score"] = h;
        else if (expectedKeys.includes(cleaned)) initialMapping[cleaned] = h;
      });

      setParsedHeaders(safeHeaders);
      setColumnMapping(initialMapping);
      
      const parsed = dataRows.map(row => {
        const parts = parseCSVLine(row, separator);
        const rowData: Record<string, string> = {};
        safeHeaders.forEach((h, index) => {
          if (parts[index] !== undefined) rowData[h] = parts[index];
        });
        return rowData;
      });
      
      setParsedData(parsed);
      setImportState("mapping");
    };
    reader.readAsText(file);
  };

  const confirmAndImport = async () => {
    setImportState("importing");
    setIsImporting(true);
    setImportProgress(0);
    setImportTotalCount(parsedData.length);
    
    let successCount = 0;
    let errorCount = 0;
    let errorDetails: string[] = [];
    
    const batchSize = 100;
    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batchRows = parsedData.slice(i, i + batchSize);
      
      const normalizeCountry = (c: string | null) => {
        if (!c) return null;
        const l = c.toLowerCase().trim();
        if (["de", "germany", "deutschland", "nemecko", "německo"].includes(l)) return "Německo";
        if (["at", "austria", "österreich", "osterreich", "rakousko"].includes(l)) return "Rakousko";
        if (["cz", "czech republic", "czechia", "cesko", "česko", "česká republika", "ceska republika"].includes(l)) return "Česká republika";
        if (["sk", "slovakia", "slovensko"].includes(l)) return "Slovensko";
        if (["pl", "poland", "polska", "polsko"].includes(l)) return "Polsko";
        return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
      };

      const normalizeSubcategory = (c: string | null) => {
        if (!c) return null;
        const l = c.toLowerCase().trim();
        if (["real estate", "realestate", "reality"].includes(l)) return "Realitní developer";
        if (["real estate agency", "real estate agent", "realitka", "realitni kancelar", "realitní kancelář", "real estate broker"].includes(l)) return "Realitní kancelář";
        return c;
      };

      let localErrors = 0;
      const batch = batchRows.flatMap((row, idx) => {
        const getVal = (field: string) => {
          const header = columnMapping[field];
          return header ? row[header] : null;
        };
        
        const rawEmail = getVal("email");
        const website = getVal("website");
        
        const garbagePrefixes = ['no-reply@', 'noreply@', 'donotreply@', 'do-not-reply@', 'bounce@', 'bounces@', 'postmaster@', 'mailer-daemon@', 'test@'];
        
        const emails = rawEmail ? rawEmail.split(/[,;]+/)
          .map((e: string) => e.trim().toLowerCase())
          .filter((e: string) => e.includes('@') && !garbagePrefixes.some(prefix => e.startsWith(prefix))) 
          : [];
        
        if (emails.length === 0) {
          if (!website) {
            localErrors++;
            errorDetails.push(`Řádek ${i + idx + 2}: Neplatný/chybějící e-mail a chybí web pro dohledání`);
            return [];
          }
          emails.push(`missing-${Math.random().toString(36).substring(2, 12)}@placeholder.zrobee.cz`);
        }

        return emails.map(email => ({
            full_name: getVal("full_name") || null,
            company_name: getVal("company_name") || null,
            email: email.toLowerCase(),
            phone: getVal("phone") || null,
            city: getVal("city") || null,
            country: normalizeCountry(getVal("country")) || null,
            language: getVal("language") || null,
            website: getVal("website") || null,
            full_address: getVal("full_address") || null,
            postal_code: getVal("postal_code") || null,
            street_name: getVal("street_name") || null,
            street_number: getVal("street_number") || null,
            latitude: getVal("latitude") ? parseFloat(getVal("latitude")!) : null,
            longitude: getVal("longitude") ? parseFloat(getVal("longitude")!) : null,
            category: getVal("category") || null,
            subcategory: normalizeSubcategory(getVal("subcategory")) || null,
            tags: getVal("tags") ? getVal("tags")!.split(";").map((t: string) => t.trim()).filter((t: string) => t) : [],
            is_pro: getVal("is_pro")?.toLowerCase() === "yes" || getVal("is_pro") === "true",
            engagement_score: getVal("engagement_score") ? parseInt(getVal("engagement_score")!) : 0,
            premium_score: getVal("premium_score") ? parseInt(getVal("premium_score")!) : null,
            decision_maker_name: getVal("decision_maker_name") || null,
            description: getVal("description") || null,
            ai_icebreaker: getVal("ai_icebreaker") || null,
            user_type: getVal("user_type") || 'worker',
            source: getVal("contact_source") || 'scraped',
        }));
      });

      errorCount += localErrors;

      if (batch.length > 0) {
        const { error } = await supabase.from("marketing_leads").upsert(batch, { onConflict: 'email' });
        if (error) {
          console.error("Import batch error:", error);
          errorCount += batch.length;
          errorDetails.push(`Záznamy ${i + 2} - ${i + 2 + batch.length}: Chyba databáze (${error.message})`);
        } else {
          successCount += batch.length;
        }
      }
      
      setImportProgress(Math.min(100, Math.round(((i + batchSize) / parsedData.length) * 100)));
    }

    // Auto-enrich is now handled entirely by the Supabase pg_cron background job
    // to prevent browser crashes and rate limits with 50,000+ contacts.

    setIsImporting(false);
    setImportResult({ success: successCount, errors: errorCount, details: errorDetails });
    setImportState("done");
  };

  const handleInsertVariable = (code: string) => {
    if (activeInput === "subject") setSubject(prev => prev + " " + code);
    else if (activeInput === "title") setTitle(prev => prev + " " + code);
    else if (activeInput === "ctaText") setCtaText(prev => prev + " " + code);
    else if (activeInput === "ctaUrl") setCtaUrl(prev => prev + code);
    else setBody(prev => prev + (prev.endsWith("\n") || prev === "" ? "" : " ") + code);
    toast({ title: "Proměnná vložena", description: `Kód ${code} byl vložen.` });
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <AdminPageHeader
        icon={Mail}
        title="Email Marketing Studio"
        subtitle="Zrobee.cz Hub • Verze 2.0"
        className="mb-3"
        actions={
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-background border border-border/50 rounded-2xl shadow-sm">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-foreground">SYNC: LIVE</span>
          </div>
        }
      />

      {/* Top Navigation */}
      <EmailTopNav />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-12 mt-6">
        <div className="w-full space-y-8">

          <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/20" /></div>}>

            <Routes>
              <Route path="historie" element={
                <AdminEmailDashboard onAction={(tab) => {
                  if (tab === "campaign-sniper") {
                    navigate("../novakampan");
                    setCampaignMode("sniper");
                    setTemplateType("sniper");
                  } else {
                    navigate(`../${tab}`);
                  }
                }} />
              } />
              
              <Route path="prehled" element={
                <AdminEmailDashboard onAction={(tab) => {
                  if (tab === "campaign-sniper") {
                    navigate("../novakampan");
                    setCampaignMode("sniper");
                    setTemplateType("sniper");
                  } else {
                    navigate(`../${tab}`);
                  }
                }} />
              } />

              <Route path="novakampan" element={
                <CampaignManager 
                  {...{
                    campaignMode, setCampaignMode,
                    target, setTarget,
                    estimatedCount: campaignReachCount || 0,
                    campaignFilterCategory, setCampaignFilterCategory,
                    campaignFilterSubcategory, setCampaignFilterSubcategory,
                    categoryIds, setCategoryIds,
                    city, setCity,
                    radius, setRadius,
                    activity, setActivity,
                    credits, setCredits,
                    selectedTags, setSelectedTags,
                    sniperJobId, setSniperJobId, applyJobToCampaign,
                    categories: allCategories,
                    subcategories: allSubcategories,
                    openJobs, jobsLoading,
                    editingCategoryForm, setEditingCategoryForm,
                    hideContacted, setHideContacted,
                    sniperRadius, setSniperRadius,
                    suitableWorkers, workersLoading,
                    workerSearch, setWorkerSearch,
                    selectedSniperWorkers, setSelectedSniperWorkers,
                    contactedEmails: [], // Placeholder
                    subject, setSubject,
                    title, setTitle,
                    body, setBody,
                    ctaText, setCtaText,
                    ctaUrl, setCtaUrl,
                    campaignImage, setCampaignImage,
                    templateType, setTemplateType,
                    previewDevice, setPreviewDevice,
                    HtmlContent,
                    handleSend,
                    isSending: isSending,
                    refetchSuitableWorkers: () => {
                      queryClient.invalidateQueries({ queryKey: ["admin-suitable-workers"] });
                      queryClient.invalidateQueries({ queryKey: ["admin-open-jobs"] });
                    },
                    setSaveTemplateOpen,
                    openEditor: () => setEditorOpen(true),
                    emailTemplates,
                    selectedTemplateId,
                    handleSelectTemplate
                  }}
                />
              } />

              <Route path="crm" element={
                <AudienceManager 
                  {...{
                    searchTerm, setSearchTerm,
                    minEngagement: minEngagement, setMinEngagement: setMinEngagement,
                    minPremiumScore: minPremiumScore, setMinPremiumScore: setMinPremiumScore,
                    crmSort, setCrmSort,
                    leadSheet, leadsLoading,
                    leadTotalCount,
                    crmPage, setCrmPage,
                    totalPages,
                    handleExportCSV,
                    categoryFilter, setCategoryFilter,
                    countryFilter, setCountryFilter,
                    languageFilter, setLanguageFilter,
                    cityFilter, setCityFilter,
                    radiusFilter, setRadiusFilter,
                    sourceFilter, setSourceFilter,
                    enrichFilter, setEnrichFilter,
                    allSubcategories,
                    importFileRef,
                    handleFileUpload,
                    isImporting,
                    importProgress,
                    importTotalCount,
                    allCategories,
                    fetchAllMatchingContacts,
                    refetchLeads: () => queryClient.invalidateQueries({ queryKey: ["admin-lead-sheet"] })
                  }}
                />
              } />

              <Route path="sablony" element={<EmailTemplatesTab />} />
              <Route path="ai-data" element={<AiInsightsTab />} />
              <Route path="sber" element={<AdminScraping />} />
              <Route path="outbox" element={<AdminOutbox />} />

              <Route path="nastaveni" element={
                <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold">Nastavení studia</h2>
                    <p className="text-xs text-muted-foreground">Konfigurace odesílání a automatizace marketingu</p>
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="p-6 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
                      <h3 className="text-sm font-bold">Identita odesílatele</h3>
                      <div className="grid gap-2">
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-muted/30 border border-border/40">
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email odesílatele</p>
                            <p className="text-xs font-medium">ahoj@zrobee.cz</p>
                          </div>
                          <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md border border-emerald-500/20">OVĚŘENO</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
                      <h3 className="text-sm font-bold">Automatizace (Drips)</h3>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold">Aktivovat automatické kampaně</p>
                          <p className="text-[10px] text-muted-foreground">Povolit odesílání e-mailů na základě chování uživatele (onboarding, reaktivace)</p>
                        </div>
                        {isDripPausedLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        ) : (
                          <Switch
                            checked={!isDripPausedData}
                            disabled={dripPausedMutation.isPending}
                            onCheckedChange={(checked) => dripPausedMutation.mutate(!checked)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              } />
              
              <Route path="*" element={<Navigate to="sber" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>

      <ModularEmailEditorDialog
        mode="campaign"
        isOpen={isEditorOpen}
        initialData={{
          id: selectedTemplateId || "",
          name: title || subject || "Vizuální editor obsahu kampaně",
          slug: activeTemplateSlug || "custom",
          subject: subject,
          body: body,
          cta_text: ctaText,
          cta_url: ctaUrl,
          secondary_text: secondaryText,
          hero_image_url: campaignImage,
          layout_type: templateType,
          urgency_banner_enabled: urgencyBannerEnabled,
          urgency_banner_text: urgencyBannerText,
          promo_banner_enabled: promoBannerEnabled,
          promo_banner_text: promoBannerText,
          ps_footer_enabled: psFooterEnabled,
          ps_footer_text: psFooterText,
          show_job_widget: showJobWidget,
          show_cta_button: showCtaButton,
          job_description_snippet: jobDescriptionSnippet,
          stealth_tracking_enabled: stealthTrackingEnabled,
          segment_filters: segmentFilters,
          language: templateLanguage,
        }}
        onClose={() => setEditorOpen(false)}
        onSave={(data) => {
          setSubject(data.subject || "");
          setTitle(data.name || "");
          setBody(data.body || "");
          setCtaText(data.cta_text || "");
          setCtaUrl(data.cta_url || "");
          setSecondaryText(data.secondary_text || "");
          setCampaignImage(data.hero_image_url || "");
          setTemplateLanguage(data.language || "cz");
          setTemplateType(data.layout_type as any);
          setUrgencyBannerEnabled(data.urgency_banner_enabled ?? true);
          setUrgencyBannerText(data.urgency_banner_text || "");
          setPromoBannerEnabled(data.promo_banner_enabled ?? true);
          setPromoBannerText(data.promo_banner_text || "");
          setPsFooterEnabled(data.ps_footer_enabled ?? false);
          setPsFooterText(data.ps_footer_text || "");
          setShowJobWidget(data.show_job_widget ?? true);
          setShowCtaButton(data.show_cta_button ?? true);
          setJobDescriptionSnippet(data.job_description_snippet || "");
          setStealthTrackingEnabled(data.stealth_tracking_enabled ?? true);
          if (data.segment_filters) {
            setSegmentFilters(data.segment_filters);
          } else {
            setSegmentFilters({});
          }
          if (selectedTemplateId === "custom") {
            setSaveMode("new");
            setNewTemplateName(data.name || data.subject || "Nová šablona");
          } else {
            setSaveMode("overwrite");
            const existing = emailTemplates?.find(t => t.id === selectedTemplateId);
            setNewTemplateName(existing?.name || data.name || data.subject || "Nová šablona");
          }
          
          // Also store directData for mutation payload if needed, but since we rely on state:
          // Wait, we need to pass language! Let's store direct data in a ref or local state.
          setSaveTemplateOpen(true);
        }}
        isSaving={saveCampaignMutation.isPending}
        onTestSend={(slug, overrideData, jobId, targetEmail) => testSendMutation.mutate({ slug, overrideData, jobId, targetEmail })}
        isSendingTest={testSendMutation.isPending}
      />

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-md bg-background border border-border p-6 rounded-3xl shadow-xl" hideCloseButton={true}>
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" /> Uložit šablonu kampaně
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
              onClick={() => setSaveTemplateOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedTemplateId !== "custom" && (
              <div className="flex flex-col gap-2 p-3.5 bg-muted/30 border border-border/60 rounded-2xl hover:border-primary/40 transition-all">
                <Label htmlFor="mode-overwrite" className="text-xs font-bold flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" id="mode-overwrite" name="saveMode" checked={saveMode === "overwrite"} onChange={() => setSaveMode("overwrite")} className="accent-primary w-4 h-4" />
                  Přepsat stávající šablonu
                </Label>
                <p className="text-[11px] text-muted-foreground pl-7 leading-relaxed">
                  Aktualizuje stávající vybranou šablonu v databázi všemi aktuálními texty a nastavením bannerů.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 p-3.5 bg-muted/30 border border-border/60 rounded-2xl hover:border-primary/40 transition-all">
              <Label htmlFor="mode-new" className="text-xs font-bold flex items-center gap-2.5 cursor-pointer">
                <input type="radio" id="mode-new" name="saveMode" checked={saveMode === "new"} onChange={() => setSaveMode("new")} className="accent-primary w-4 h-4" />
                Uložit jako novou šablonu
              </Label>
              <p className="text-[11px] text-muted-foreground pl-7 leading-relaxed">
                Vytvoří zcela novou šablonu, kterou budete moci v budoucnu znovu použít.
              </p>

              {saveMode === "new" && (
                <div className="pl-7 pt-2 space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Název nové šablony</Label>
                  <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Např. Sniper Kampaň Jaro" className="h-9 text-xs rounded-xl bg-background border-border" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="ghost" className="h-9 rounded-xl text-xs font-bold" onClick={() => setSaveTemplateOpen(false)} disabled={saveCampaignMutation.isPending}>
              Storno
            </Button>
            <Button className="h-9 rounded-xl px-6 text-xs font-bold gap-1.5 shadow-sm" onClick={() => saveCampaignMutation.mutate()} disabled={saveCampaignMutation.isPending}>
              {saveCampaignMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Potvrdit a uložit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importState === "mapping"} onOpenChange={(open) => { if (!open) setImportState("idle"); }}>
        <DialogContent className="max-w-2xl bg-background border border-border p-6 rounded-3xl shadow-xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40 shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Mapování sloupců importu
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
              onClick={() => setImportState("idle")}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="py-4 overflow-y-auto flex-1 px-1">
            <p className="text-sm text-muted-foreground mb-4">
              Zkontrolujte přiřazení sloupců z vašeho CSV souboru k našim polím v databázi. 
              Položky s prázdným výběrem nebudou importovány.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {EXPECTED_CSV_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs font-bold">{field.label}</Label>
                  <Select 
                    value={columnMapping[field.key] || "none"} 
                    onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [field.key]: val === "none" ? "" : val }))}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Ignorovat (neimportovat)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ignorovat (neimportovat) --</SelectItem>
                      {parsedHeaders.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between p-4 bg-muted/40 border border-border/50 rounded-2xl">
              <div className="space-y-1">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Automaticky obohatit chybějící data pomocí AI
                </Label>
                <p className="text-[11px] text-muted-foreground w-11/12">
                  Pokud je zaškrtnuto, AI (Gemini) na pozadí navštíví importované weby a pokusí se z nich vyčíst chybějící údaje jako město, telefon, popis firmy a dokonce vygeneruje oslovení (icebreaker) pro e-mailing. Obohacení proběhne na pozadí do několika minut.
                </p>
              </div>
              <Switch 
                checked={autoEnrich} 
                onCheckedChange={setAutoEnrich}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-border/40 flex justify-end gap-3 shrink-0">
            <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => setImportState("idle")}>
              Zrušit
            </Button>
            <Button className="rounded-xl h-9 text-xs font-bold" onClick={confirmAndImport} disabled={!columnMapping["email"]}>
              Potvrdit a importovat ({parsedData.length} kontaktů)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importState === "done"} onOpenChange={(open) => { if (!open) setImportState("idle"); }}>
        <DialogContent className="max-w-md bg-background border border-border p-6 rounded-3xl shadow-xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" /> Import dokončen
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => {
                setImportState("idle");
                queryClient.invalidateQueries({ queryKey: ["admin-lead-sheet"] });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="py-6 space-y-4 text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl">
              <p className="text-3xl font-black">{importResult.success}</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1">Úspěšně importováno</p>
            </div>
            {importResult.errors > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-left">
                <div className="text-center mb-2">
                  <p className="text-3xl font-black">{importResult.errors}</p>
                  <p className="text-xs font-bold uppercase tracking-widest mt-1">Chybných záznamů (přeskočeno)</p>
                </div>
                {importResult.details.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-rose-500/20 max-h-32 overflow-y-auto space-y-1">
                    {importResult.details.slice(0, 50).map((err, i) => (
                      <p key={i} className="text-[11px] truncate opacity-80" title={err}>• {err}</p>
                    ))}
                    {importResult.details.length > 50 && (
                      <p className="text-[11px] font-bold text-center mt-2 opacity-80">...a dalších {importResult.details.length - 50} chyb</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-border/40 flex justify-end">
            <Button className="rounded-xl h-9 text-xs font-bold" onClick={() => {
              setImportState("idle");
              queryClient.invalidateQueries({ queryKey: ["admin-lead-sheet"] });
            }}>
              Zavřít
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
