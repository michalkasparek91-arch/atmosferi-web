import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Mail, Save, X, Trash2, Send, Loader2, Bold, Italic, List, Link, 
  Monitor, Smartphone, Sparkles, ChevronLeft, ChevronRight, Eye, Target, MapPin
} from "lucide-react";
import { toast } from "sonner";

export interface EmailEditorState {
  id: string;
  name: string;
  slug?: string | null;
  category?: string;
  subject: string | null;
  emoji?: string | null;
  greeting?: string | null;
  body: string | null; // Corresponds to body or full_body
  cta_text: string | null;
  cta_url: string | null;
  secondary_text: string | null;
  sender_email?: string | null;
  heading?: string | null;
  title?: string | null;
  target_role?: string;
  trigger_type?: string;
  trigger_event?: string | null;
  drip_delay_days?: number | null;
  drip_series?: string | null;
  is_enabled?: boolean;
  segment_filters?: Record<string, any> | null;
  layout_type?: string;
  hero_image_url?: string | null;
  urgency_banner_enabled?: boolean;
  urgency_banner_text?: string | null;
  promo_banner_enabled?: boolean;
  promo_banner_text?: string | null;
  job_description_snippet?: string | null;
  language?: string | null;
  ps_footer_enabled?: boolean;
  ps_footer_text?: string | null;
  show_job_widget?: boolean;
  show_cta_button?: boolean;
  // Outbox specific
  icebreaker?: string | null;
  worker?: any;
  lead?: any;
  job?: any;
  recipient_email?: string;
  recipient_name?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  transactional: { label: "TransakÄŤnĂ­", color: "bg-blue-100 text-blue-700 border-blue-200" },
  auth: { label: "Auth", color: "bg-purple-100 text-purple-700 border-purple-200" },
  marketing: { label: "Marketing", color: "bg-amber-100 text-amber-700 border-amber-200" },
  lifecycle: { label: "Lifecycle", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  sniper: { label: "Sniper", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

export const TEMPLATE_VARIABLES = [
  { key: "{{osloveni}}", label: "OslovenĂ­ (Vokativ)", desc: "OslovenĂ­ v 5. pĂˇdu (napĹ™. PetĹ™e)" },
  { key: "{{jmeno}}", label: "JmĂ©no", desc: "JmĂ©no pĹ™Ă­jemce v 1. pĂˇdu" },
  { key: "{{mesto}}", label: "MÄ›sto", desc: "MÄ›sto zakĂˇzky nebo profĂ­ka (1. pĂˇd)" },
  { key: "{{mesto_v_meste}}", label: "MÄ›sto (v/ve)", desc: "MÄ›sto s pĹ™edloĹľkou v/ve (napĹ™. v Praze)" },
  { key: "{{obor}}", label: "Obor", desc: "Obor / Specializace (1. pĂˇd)" },
  { key: "{{obor_2pad}}", label: "Obor (2./4. pĂˇd)", desc: "Obor / Specializace (2./4. pĂˇd, napĹ™. instalatĂ©ra)" },
  { key: "{{nazev_zakazky}}", label: "ZakĂˇzka", desc: "NĂˇzev zakĂˇzky" },
  { key: "{{popis_zakazky}}", label: "Popis", desc: "DetailnĂ­ popis zadĂˇnĂ­" },
  { key: "{{rozpocet}}", label: "RozpoÄŤet", desc: "RozpoÄŤet nebo cenovĂˇ poznĂˇmka" },
  { key: "{{zakaznik}}", label: "ZĂˇkaznĂ­k", desc: "JmĂ©no poptĂˇvajĂ­cĂ­ho" },
  { key: "{{odkaz_zakazky}}", label: "Odkaz", desc: "URL na detail zakĂˇzky" },
  { key: "{{icebreaker}}", label: "Icebreaker", desc: "IndividuĂˇlnĂ­ oslovenĂ­ na mĂ­ru" },
  { key: "{{podkategorie_2pad}}", label: "Podkategorie - SklonÄ›nĂ˝ tvar", desc: "SklonÄ›nĂ˝ tvar podkategorie" }
];

export function parseRichTextToHtml(text?: string | null, textAlign: string = "left", isDark: boolean = false) {
  if (!text) return "";
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\b_(.*?)_\b/g, '<em>$1</em>');
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*/g, '<em>$1</em>');
  
  const color = isDark ? "#d4d4d8" : "#4a4a4a";
  const align = textAlign === "center" ? "center" : "left";
  
  const lines = html.split('\n');
  let inList = false;
  let newLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('â€˘ ') || line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        inList = true;
        newLines.push(`<ul style="margin: 12px 0; padding-left: 20px; list-style-type: disc; font-size: 15px; color: ${color}; line-height: 1.6; text-align: ${align};">`);
      }
      const itemText = line.substring(2).trim();
      newLines.push(`<li style="margin-bottom: 6px;">${itemText}</li>`);
    } else {
      if (inList) {
        inList = false;
        newLines.push('</ul>');
      }
      newLines.push(lines[i]);
    }
  }
  if (inList) newLines.push('</ul>');
  
  const paragraphBlocks = newLines.join('\n').split(/\n\s*\n/);
  const formattedParagraphs = paragraphBlocks.map(block => {
    if (block.trim().startsWith('<ul')) return block;
    return `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: ${color}; text-align: ${align};">${block.replace(/\n/g, '<br/>')}</p>`;
  });
  return formattedParagraphs.join('\n');
}

export function RichTextToolbar({ onInsert }: { onInsert: (before: string, after: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 p-1.5 rounded-lg border border-border/50 mb-1.5 text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs font-bold hover:bg-primary/10 hover:text-primary gap-1 rounded"
        onClick={() => onInsert("**", "**")}
        title="TuÄŤnÄ› (**text**)"
      >
        <Bold className="h-3 w-3" /> B
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs italic hover:bg-primary/10 hover:text-primary gap-1 rounded"
        onClick={() => onInsert("_", "_")}
        title="KurzĂ­va (_text_)"
      >
        <Italic className="h-3 w-3" /> I
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary gap-1 rounded"
        onClick={() => onInsert("â€˘ ", "")}
        title="OdrĂˇĹľka (â€˘ poloĹľka)"
      >
        <List className="h-3 w-3" /> OdrĂˇĹľka
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
        title="VloĹľit odkaz"
      >
        <Link className="h-3 w-3" /> Odkaz
      </Button>
    </div>
  );
}

export function ModularLivePreview({ 
  form, 
  previewReplace, 
  previewTheme = "light" 
}: { 
  form: EmailEditorState; 
  previewReplace: (txt: string | null | undefined) => string; 
  previewTheme?: "light" | "dark";
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const isDark = previewTheme === "dark";

  const carouselImages = useMemo(() => {
    const imgs = form?.segment_filters?.carousel_images;
    if (!imgs) return [];
    if (Array.isArray(imgs)) return imgs.filter(url => typeof url === 'string' && url.startsWith("http"));
    if (typeof imgs === 'string') {
      return imgs.split(",").map((url: string) => url.trim()).filter((url: string) => url.startsWith("http"));
    }
    return [];
  }, [form?.segment_filters?.carousel_images]);

  useEffect(() => {
    if (activeSlide >= carouselImages.length) {
      setActiveSlide(0);
    }
  }, [carouselImages, activeSlide]);

  const customerName = previewReplace("{{zakaznik}}") || "Jan";
  const avatarLetter = customerName.substring(0, 1).toUpperCase();

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSlide((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSlide((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
  };

  const isPlainLayout = form.layout_type === "plain";
  const isStandardLayout = form.layout_type === "standard";
  
  if (isStandardLayout) {
    const isDark = previewTheme === "dark";
    return (
      <div className={`font-sans w-full max-w-[520px] mx-auto p-8 rounded-2xl shadow-sm border transition-all ${
        isDark ? "bg-[#121210] text-[#d4d4d8] border-zinc-800" : "bg-white text-zinc-600 border-zinc-100"
      }`} style={{ textAlign: "center" }}>
        
        {/* 1. Header (Logo) */}
        <div className="pb-8 text-center">
          <div className={`font-sans font-bold text-2xl tracking-tight leading-none ${isDark ? "text-white" : "text-black"}`}>
            Atmosferi<sup className="text-[0.5em] font-medium" style={{ top: "-0.7em", position: "relative" }}>°</sup>
          </div>
        </div>

        {/* 2. Emoji & Greeting */}
        {form.emoji && (
          <div className="text-[40px] text-center mb-4">{form.emoji}</div>
        )}
        {form.greeting !== "" && form.greeting !== "none" && (
          <p className={`text-[14px] font-semibold uppercase tracking-[0.05em] text-center mb-2 transition-colors ${
            isDark ? "text-zinc-500" : "text-zinc-500"
          }`}>
            {previewReplace(form.greeting || "Ahoj {{osloveni}},")}
          </p>
        )}

        {/* 3. Subject / Heading */}
        <h1 className={`text-[24px] font-bold leading-[1.2] text-center mb-4 transition-colors ${
          isDark ? "text-white" : "text-zinc-900"
        }`}>
          {previewReplace(form.heading || form.title || form.subject || "Nadpis e-mailu")}
        </h1>

        {/* 4. Body */}
        <div 
          className="text-[16px] leading-[1.6] text-center mb-6"
          dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(previewReplace(form.body || "Zde bude text e-mailu..."), "center", isDark) }}
        />

        {/* 5. Button */}
        {form.cta_url && form.cta_text && form.cta_text !== "none" && (
          <div className="text-center my-8">
            <div className={`inline-flex items-center justify-center gap-3 px-[28px] py-[18px] border font-mono text-[13px] uppercase tracking-[0.08em] cursor-pointer transition-colors ${
              isDark ? "bg-white text-black border-white hover:bg-black hover:text-white" : "bg-black text-white border-black hover:bg-white hover:text-black"
            }`}>
              {previewReplace(form.cta_text)} <span className="transition-transform hover:translate-x-1.5">→</span>
            </div>
          </div>
        )}

        {/* 6. Secondary Text */}
        {form.secondary_text && (
          <div className={`text-[14px] leading-[1.6] text-center mb-6 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {previewReplace(form.secondary_text)}
          </div>
        )}

        <hr className={`my-8 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`} />

        {/* 7. Footer */}
        <div className={`text-[12px] leading-[1.5] text-center ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
          Tento e-mail byl odeslĂˇn automaticky. NastavenĂ­ notifikacĂ­ mĹŻĹľete zmÄ›nit ve svĂ©m profilu.
          <br />
          Â© {new Date().getFullYear()} Atmosferi. VĹˇechna prĂˇva vyhrazena.
        </div>
      </div>
    );
  }

  if (isPlainLayout) {
    return (
      <div className={`font-mono text-xs w-full p-6 space-y-4 text-left transition-all ${
        isDark ? "bg-zinc-950 text-zinc-300 border border-zinc-800" : "bg-white text-zinc-800"
      }`}>
        <div className="border-b border-border/40 pb-2 mb-2 font-bold text-muted-foreground uppercase text-[10px]">
          ÄŚistĂ˝ e-mail (ÄŚistĂ˝ text)
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">
          {previewReplace(form.greeting || "Ahoj {{osloveni}},")}\n\n
          {previewReplace(form.body || "")}\n\n
          {form.cta_text && form.cta_text !== "none" && `[ ${previewReplace(form.cta_text)} ] -> ${previewReplace(form.cta_url || "")}\n`}
          {form.secondary_text && `\n${previewReplace(form.secondary_text)}\n`}
          {form.ps_footer_enabled && `\nP.S. ${previewReplace(form.ps_footer_text || "")}`}
        </div>
      </div>
    );
  }

  return (
    <div className={`font-sans w-full p-6 md:p-8 space-y-6 text-center transition-all ${
      isDark ? "bg-zinc-950 text-zinc-100 border border-zinc-800" : "bg-white text-zinc-800"
    }`} style={{ textAlign: "center" }}>
      {/* 1. Header (Logo Zrobee with exact HEX color Masking) */}
      <div className={`pb-4 text-center border-b ${isDark ? "border-zinc-800" : "border-border/60"}`}>
        <div className={`font-sans font-bold text-2xl tracking-tight leading-none ${isDark ? "text-white" : "text-black"}`}>
          Atmosferi<sup className="text-[0.5em] font-medium" style={{ top: "-0.7em", position: "relative" }}>°</sup>
        </div>
      </div>

      {/* 2. Emoji & Greeting */}
      <div className="space-y-3 pt-2 text-left">
        {!!form.segment_filters?.show_subject_in_body && (
          <div className="text-4xl animate-bounce duration-1000">{form.emoji || "đź“§"}</div>
        )}
        {form.greeting !== "" && (
          form.segment_filters?.graphic_greeting_enabled ? (
            <div className="text-left">
               <span className={`text-[16px] font-black tracking-tight transition-colors ${
                 isDark ? "text-[#a6d16f]" : "text-[#213319]"
               }`}>
                 {previewReplace(form.greeting || "DobrĂ˝ den {{osloveni}},")}
               </span>
            </div>
          ) : (
            <p className={`text-[12px] font-black uppercase tracking-[0.2em] transition-colors ${
              isDark ? "text-primary" : "text-[#213319]"
            } ${
              form.segment_filters?.text_align === "center" ? "text-center" : "text-left"
            }`}>
              {previewReplace(form.greeting || "DobrĂ˝ den {{osloveni}},")}
            </p>
          )
        )}
      </div>

      {/* 3. Subject / Heading */}
      {!!form.segment_filters?.show_subject_in_body && (
        <h1 className={`text-2xl md:text-3xl font-extrabold leading-[1.1] tracking-tight max-w-[500px] mx-auto transition-colors ${
          isDark ? "text-white" : "text-zinc-900"
        }`}>
          {previewReplace(form.subject || "PĹ™edmÄ›t e-mailu")}
        </h1>
      )}

      {/* 4. Hero ObrĂˇzek */}
      {(form.hero_image_url !== "" && form.hero_image_url !== null) && (
        <div className={`relative aspect-[16/9] w-full overflow-hidden border shadow-sm group ${
          isDark ? "border-zinc-800 bg-zinc-900/30" : "border-border/60 bg-muted/30"
        }`}>
          <img src={form.hero_image_url} alt="Hero Banner" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" />
        </div>
      )}

      {/* 5. ObrĂˇzkovĂ˝ Karusel */}
      {!!form.segment_filters?.carousel_enabled && (
        <div className={`relative aspect-[16/9] w-full overflow-hidden border shadow-md group select-none ${
          isDark ? "border-zinc-800 bg-zinc-900/40" : "border-border/60 bg-muted/40"
        }`}>
          {carouselImages.length > 0 ? (
            <>
              <div className="w-full h-full relative">
                {carouselImages.map((img, idx) => (
                  <img
                    key={img}
                    src={img}
                    alt={`SnĂ­mek ${idx + 1}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-in-out ${idx === activeSlide ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
                  />
                ))}
              </div>

              {carouselImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm"
                    title="PĹ™edchozĂ­"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm"
                    title="NĂˇsledujĂ­cĂ­"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/20 hover:bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/5 transition-all">
                    {carouselImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveSlide(idx); }}
                        className={`h-2 rounded-full transition-all cursor-pointer ${idx === activeSlide ? "w-4 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
              <Smartphone className="h-8 w-8 opacity-40 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Karusel aktivnĂ­ (VloĹľte URL adresy oddÄ›lenĂ© ÄŤĂˇrkou)</span>
            </div>
          )}
        </div>
      )}

      {/* 6. HlavnĂ­ tÄ›lo e-mailu */}
      <div 
        className={`text-[15px] leading-relaxed max-w-[520px] mx-auto py-2 font-normal transition-colors ${
          isDark ? "text-zinc-300" : "text-zinc-700"
        } ${
          form.segment_filters?.text_align === "center" ? "text-center" : "text-left"
        }`} 
        dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(previewReplace(form.body || "Zde bude text vaĹˇeho e-mailu..."), form.segment_filters?.text_align || "left", isDark) }}
      />

      {/* 7. Karta zakĂˇzky (Job Card Widget) */}
      {(form.show_job_widget ?? true) && (
        <div className={`border overflow-hidden shadow-md text-left max-w-[500px] mx-auto transition-transform hover:scale-[1.01] ${
          isDark ? "border-zinc-800 bg-zinc-900/60" : "border-[#e1e8dc] bg-white"
        }`}>
            <div className={`px-4 py-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
              isDark ? "bg-zinc-800 text-primary" : "bg-[#EAF4E9] text-[#213319]"
            }`}>
              <span>đź”¨</span>
              <span>{previewReplace("{{obor}}")}</span>
            </div>
            
            <div className="p-6 space-y-4 text-left">
              <div className={`flex flex-wrap items-center gap-4 text-xs font-medium ${
                isDark ? "text-zinc-400" : "text-muted-foreground"
              }`}>
                <span className="flex items-center gap-1">đź“Ť {previewReplace("{{mesto}}")} â€” 15 km</span>
                <span className="flex items-center gap-1">đź—“ Co nejdĹ™Ă­ve</span>
              </div>
              
              <h3 className={`text-lg font-bold leading-snug ${
                isDark ? "text-white" : "text-foreground"
              }`}>
                {previewReplace(form.name || "{{nazev_zakazky}}")}
              </h3>
              
              <div 
                  className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    isDark ? "text-zinc-300" : "text-muted-foreground"
                  }`}
                  dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(previewReplace(form.job_description_snippet || "{{popis_zakazky}}"), "left", isDark) }}
                />

              <div>
                <h4 className={`text-[11px] font-bold mb-0.5 uppercase tracking-wider ${
                  isDark ? "text-zinc-200" : "text-foreground"
                }`}>Cena</h4>
                <p className={`text-xs font-medium ${
                  isDark ? "text-zinc-400" : "text-muted-foreground"
                }`}>{previewReplace("{{cena_rozpocet}}")}</p>
              </div>

              <div className="flex items-center gap-2 pt-1.5 pb-0.5 border-t border-border/40">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  isDark ? "bg-primary/10 text-primary" : "bg-[#EAF4E9] text-[#213319]"
                }`}>
                  {avatarLetter}
                </div>
                <span className={`text-xs font-semibold ${
                  isDark ? "text-zinc-300" : "text-muted-foreground"
                }`}>
                  {customerName}
                </span>
              </div>
            </div>
          </div>
      )}

      {/* 8. UrgentnĂ­ banner */}
      {(form.urgency_banner_enabled ?? true) && (
        <div className={`p-4 text-xs font-semibold text-left max-w-[500px] mx-auto shadow-2xs ${
          isDark ? "bg-amber-950/20 border border-amber-900/30 text-amber-400" : "bg-amber-100/60 border border-amber-200/80 text-amber-800"
        }`}>
          âŹł {previewReplace(form.urgency_banner_text || "SpÄ›chĂˇ: ZĂˇkaznĂ­k ÄŤekĂˇ na rychlou reakci. Tuto zakĂˇzku jsme prĂˇvÄ› odeslali pouze vybranĂ˝m specialistĹŻm ve vaĹˇem okolĂ­.")}
        </div>
      )}

      {(form.show_cta_button ?? true) && form.cta_text && form.cta_text !== "none" && (
        <div className="pt-2 text-center">
          <div className={`inline-flex items-center justify-center gap-3 px-[28px] py-[18px] border font-mono text-[13px] uppercase tracking-[0.08em] cursor-pointer transition-colors ${
            isDark ? "bg-white text-black border-white hover:bg-black hover:text-white" : "bg-black text-white border-black hover:bg-white hover:text-black"
          }`}>
            {previewReplace(form.cta_text || "Zobrazit a podat nabídku")} <span className="transition-transform hover:translate-x-1.5">→</span>
          </div>
          {form.secondary_text && (
            <div 
              className={`mt-2 text-[10px] leading-relaxed max-w-[360px] mx-auto font-medium transition-colors text-center ${
                isDark ? "text-zinc-500" : "text-zinc-400"
              }`} 
              dangerouslySetInnerHTML={{ __html: previewReplace(form.secondary_text).replace(/\n/g, '<br/>') }}
            />
          )}
        </div>
      )}

      {/* 9.5 Secondary text below job card (Now properly formatted and moved below CTA) */}
      {form.segment_filters?.secondary_text_below_job && (
        <div className="max-w-[520px] mx-auto pt-4 pb-2">
          <div 
            className={`text-[15px] leading-relaxed font-normal transition-colors ${
              isDark ? "text-zinc-300" : "text-zinc-700"
            } ${
              form.segment_filters?.text_align === "center" ? "text-center" : "text-left"
            }`} 
            dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(previewReplace(form.segment_filters.secondary_text_below_job), form.segment_filters?.text_align || "left", isDark) }}
          />
        </div>
      )}

      {/* 10. Promo banner */}
      {(form.promo_banner_enabled ?? true) && (
        <div className={`border border-dashed p-4 text-xs text-left max-w-[500px] mx-auto ${
          isDark ? "bg-[#e8f4da]/5 border-[#a6d16f]/40 text-zinc-300" : "bg-[#e8f4da] border-[#a6d16f] text-[#213319]"
        }`}>
          đźŽ  <strong>{previewReplace(form.promo_banner_text || "ZavĂˇdÄ›cĂ­ akce: ProtoĹľe Zrobee prĂˇvÄ› spouĹˇtĂ­me...").split(':')[0] || "ZavĂˇdÄ›cĂ­ akce"}:</strong> {previewReplace(form.promo_banner_text || "ZavĂˇdÄ›cĂ­ akce: ProtoĹľe Zrobee prĂˇvÄ› spouĹˇtĂ­me...").split(':').slice(1).join(':')}
        </div>
      )}

      {/* 11. SouvisejĂ­cĂ­ ÄŤlĂˇnky (Magazine Grid) */}
      {!!form.segment_filters?.articles_enabled && (
        <div className={`pt-6 border-t text-left space-y-4 max-w-[500px] mx-auto ${
          isDark ? "border-zinc-800" : "border-border/50"
        }`}>
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">AktuĂˇlnÄ› z magazĂ­nu</span>
            <span className="text-[11px] text-primary font-bold hover:underline cursor-pointer">Zobrazit vĹˇe â†’</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 group cursor-pointer">
              <div className={`aspect-[4/3] overflow-hidden relative border shadow-2xs ${
                isDark ? "border-zinc-800 bg-zinc-950" : "border-border/60 bg-muted/50"
              }`}>
                <img src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=300&q=80" alt="ÄŚlĂˇnek 1" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                  <div className="text-[8px] text-white font-bold px-2 py-0.5 bg-black/40 backdrop-blur-xs uppercase">NejÄŤtenÄ›jĹˇĂ­</div>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className={`text-xs font-bold leading-tight group-hover:text-primary transition-colors ${
                  isDark ? "text-zinc-200" : "text-foreground"
                }`}>Jak vybrat sprĂˇvnĂ©ho Ĺ™emeslnĂ­ka a neuhoĹ™et</h4>
                <p className="text-[10px] text-muted-foreground leading-snug">5 klĂ­ÄŤovĂ˝ch tipĹŻ, jak poznat profĂ­ka...</p>
              </div>
            </div>
            <div className="space-y-2 group cursor-pointer">
              <div className={`aspect-[4/3] overflow-hidden relative border shadow-2xs ${
                isDark ? "border-zinc-800 bg-zinc-950" : "border-border/60 bg-muted/50"
              }`}>
                <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80" alt="ÄŚlĂˇnek 2" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                  <div className="text-[8px] text-white font-bold px-2 py-0.5 bg-black/40 backdrop-blur-xs uppercase font-sans">Novinka</div>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className={`text-xs font-bold leading-tight group-hover:text-primary transition-colors ${
                  isDark ? "text-zinc-200" : "text-foreground"
                }`}>Rekonstrukce koupelny krok za krokem</h4>
                <p className="text-[10px] text-muted-foreground leading-snug">KompletnĂ­ prĹŻvodce od plĂˇnu po realizaci...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 13. P.S. PatiÄŤka / OdhlĂˇĹˇenĂ­ */}
      {form.ps_footer_enabled ? (
        <div className={`pt-6 border-t text-xs text-left italic leading-relaxed max-w-[500px] mx-auto ${
          isDark ? "border-zinc-800 text-zinc-400" : "border-border/60 text-muted-foreground"
        }`}>
          <p className={form.segment_filters?.text_align === "center" ? "text-center" : "text-left"}>
            {previewReplace(form.ps_footer_text || "P.S. Pokud uĹľ mĂˇte plno a dalĹˇĂ­ zakĂˇzky teÄŹ nepotĹ™ebujete, staÄŤĂ­ mi odepsat 'Ne' a uĹľ VĂˇs nebudu nabĂ­dkami ruĹˇit.")}
          </p>
        </div>
      ) : (
        <div className={`pt-6 border-t text-[11px] text-center space-y-1.5 max-w-[460px] mx-auto ${
          isDark ? "border-zinc-800 text-zinc-500" : "border-border/60 text-muted-foreground"
        }`}>
          <p>Tento e-mail byl odeslĂˇn automaticky z platformy Atmosferi.</p>
          <p>Nechcete od nĂˇs dostĂˇvat dalĹˇĂ­ podobnĂ© nabĂ­dky? <span className="underline text-primary hover:text-primary/80 cursor-pointer">OdhlĂˇsit z odbÄ›ru</span></p>
          <p>Â© 2026 Atmosferi â€˘ VĹˇechna prĂˇva vyhrazena.</p>
        </div>
      )}
    </div>
  );
}

interface ModularEmailEditorDialogProps {
  mode?: "template" | "campaign" | "outbox";
  isOpen: boolean;
  initialData: Partial<EmailEditorState> | null;
  onClose: () => void;
  onSave?: (data: EmailEditorState) => void;
  onDelete?: () => void;
  isSaving?: boolean;
  onTestSend?: (slug: string, overrideData?: Partial<EmailEditorState>, jobId?: string, targetEmail?: string) => void;
  isSendingTest?: boolean;
  onBroadcast?: () => void;
  isBroadcasting?: boolean;
}

export function ModularEmailEditorDialogInner({
  mode = "template",
  isOpen,
  initialData,
  onClose,
  onSave,
  onDelete,
  isSaving,
  onTestSend,
  isSendingTest,
  onBroadcast,
  isBroadcasting
}: ModularEmailEditorDialogProps) {
  const [form, setForm] = useState<EmailEditorState | null>(null);
  const [originalForm, setOriginalForm] = useState<EmailEditorState | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedJobId, setSelectedJobId] = useState<string>("default");
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "widgets" | "settings">("content");
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      const bodyVal = initialData.body !== undefined ? initialData.body : (initialData as any).full_body || "";
      let rawFilters = initialData.segment_filters || {};
      if (typeof rawFilters === "string") {
        try { rawFilters = JSON.parse(rawFilters); } catch(e) { rawFilters = {}; }
      }
      const filters = { ...rawFilters };
      
      const initialEditorState: EmailEditorState = {
        id: initialData.id || "",
        name: initialData.name || "",
        slug: initialData.slug || "",
        category: initialData.category || "marketing",
        subject: initialData.subject || "",
        emoji: initialData.emoji || "đź“§",
        greeting: initialData.greeting !== undefined ? initialData.greeting : "DobrĂ˝ den {{osloveni}},",
        body: bodyVal,
        cta_text: initialData.cta_text || "",
        cta_url: initialData.cta_url || "",
        secondary_text: initialData.secondary_text || "",
        sender_email: (initialData as any).sender_email || null,
        target_role: initialData.target_role || "all",
        trigger_type: initialData.trigger_type || "manual",
        trigger_event: initialData.trigger_event || "",
        drip_delay_days: initialData.drip_delay_days || 0,
        drip_series: initialData.drip_series || "",
        is_enabled: initialData.is_enabled !== undefined ? initialData.is_enabled : true,
        segment_filters: filters,
        layout_type: initialData.layout_type || "standard",
        hero_image_url: initialData.hero_image_url || "",
        urgency_banner_enabled: initialData.urgency_banner_enabled !== undefined ? initialData.urgency_banner_enabled : true,
        urgency_banner_text: initialData.urgency_banner_text || "SpÄ›chĂˇ: ZĂˇkaznĂ­k ÄŤekĂˇ na rychlou reakci. Tuto zakĂˇzku jsme prĂˇvÄ› odeslali pouze vybranĂ˝m specialistĹŻm ve vaĹˇem okolĂ­.",
        promo_banner_enabled: initialData.promo_banner_enabled !== undefined ? initialData.promo_banner_enabled : true,
        promo_banner_text: initialData.promo_banner_text || "ZavĂˇdÄ›cĂ­ akce: ProtoĹľe Zrobee prĂˇvÄ› spouĹˇtĂ­me, neplatĂ­te za kontakt ĹľĂˇdnou provizi.",
        job_description_snippet: initialData.job_description_snippet || "",
        ps_footer_enabled: initialData.ps_footer_enabled !== undefined ? initialData.ps_footer_enabled : false,
        ps_footer_text: initialData.ps_footer_text || "P.S. Pokud uĹľ mĂˇte plno a dalĹˇĂ­ zakĂˇzky teÄŹ nepotĹ™ebujete, staÄŤĂ­ mi odepsat 'Ne' a uĹľ VĂˇs nebudu nabĂ­dkami ruĹˇit.",
        show_job_widget: initialData.show_job_widget !== undefined ? initialData.show_job_widget : true,
        show_cta_button: initialData.show_cta_button !== undefined ? initialData.show_cta_button : true,
        icebreaker: initialData.icebreaker || "",
        worker: initialData.worker || null,
        lead: initialData.lead || null,
        job: initialData.job || null,
        recipient_email: initialData.recipient_email || (initialData.worker?.email || initialData.lead?.email) || "",
        recipient_name: initialData.recipient_name || (initialData.worker?.full_name || initialData.lead?.company_name || initialData.lead?.full_name) || "",
      };

      setForm(initialEditorState);
      setOriginalForm(initialEditorState);

      if (mode === "outbox" && initialData.job?.id) {
        setSelectedJobId(initialData.job.id);
      }
    }
  }, [initialData, isOpen, mode]);

  const { data: openJobs } = useQuery({
    queryKey: ["admin-open-jobs-preview-modular"],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`id, title, city, description, subcategory_id, budget_min, budget_max, price_note, customer_id, service_subcategories(name, category_form)`)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      const customerIds = [...new Set(jobs?.map(j => j.customer_id).filter(Boolean) || [])];
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", customerIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        return jobs?.map(j => ({
          ...j,
          customer_name: profileMap.get(j.customer_id) || "ZĂˇkaznĂ­k"
        })) || [];
      }
      return jobs || [];
    },
  });

  const { data: allTemplates } = useQuery({
    queryKey: ["admin-email-templates-all-selector"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const isDirty = useMemo(() => {
    if (!form || !originalForm) return false;
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  const handleSwitchTemplate = (templateData: any) => {
    if (!form) return;
    const bodyVal = templateData.body !== undefined ? templateData.body : (templateData as any).full_body || "";
    let rawFilters = templateData.segment_filters || {};
    if (typeof rawFilters === "string") {
      try { rawFilters = JSON.parse(rawFilters); } catch(e) { rawFilters = {}; }
    }
    const filters = { ...rawFilters };

    const nextState: EmailEditorState = {
      ...form,
      id: templateData.id || "",
      name: templateData.name || "",
      subject: templateData.subject || "",
      body: bodyVal,
      segment_filters: { ...form.segment_filters, ...filters },
    };
    setForm(nextState);
    toast.success(`Ĺ ablona â€ž${templateData.name}â€ś naÄŤtena.`);
  };

  const selectedJob = useMemo(() => {
    if (mode === "outbox" && selectedJobId === "default" && form?.job) return form.job;
    if (selectedJobId === "default") return null;
    return openJobs?.find((j: any) => j.id === selectedJobId) || null;
  }, [selectedJobId, openJobs, form?.job, mode]);

  const previewData = useMemo(() => {
    const defaultData = {
      osloveni: "PetĹ™e", jmeno: "Petr NovĂˇk", mesto: "Praha", mesto_v_meste: "v Praze",
      obor: "ĹemeslnĂ© prĂˇce", obor_2pad: "Ĺ™emeslnĂ­ka", nazev_zakazky: "Rekonstrukce bytovĂ©ho jĂˇdra",
      popis_zakazky: "HledĂˇm spolehlivĂ©ho Ĺ™emeslnĂ­ka na kompletnĂ­ obklad koupelny...",
      cena_rozpocet: "15 000 KÄŤ", zakaznik: "Jan", odkaz_zakazky: "https://zrobee.cz",
      icebreaker: form?.icebreaker || "VĹˇimli jsme si vaĹˇeho skvÄ›lĂ©ho profilu."
    };
    
    const getCityIn = (city?: string) => {
      if (!city) return "v okolĂ­";
      const cityLower = city.toLowerCase().trim();
      if (cityLower === "praha") return "v Praze";
      if (cityLower === "brno") return "v BrnÄ›";
      if (cityLower === "ostrava") return "v OstravÄ›";
      if (cityLower === "plzeĹ") return "v Plzni";
      if (cityLower === "liberec") return "v Liberci";
      if (cityLower === "olomouc") return "v Olomouci";
      if (cityLower === "hradec krĂˇlovĂ©") return "v Hradci KrĂˇlovĂ©";
      if (cityLower === "ÄŤeskĂ© budÄ›jovice") return "v ÄŚeskĂ˝ch BudÄ›jovicĂ­ch";
      if (cityLower === "pardubice") return "v PardubicĂ­ch";
      if (cityLower === "ĂşstĂ­ nad labem") return "v ĂšstĂ­ nad Labem";
      return `v ${city}`;
    };
    
    if (mode === "outbox" && form) {
      const name = form.recipient_name || "kolego";
      defaultData.osloveni = name.split(" ")[0] || "kolego";
      defaultData.jmeno = name;
      
      const job = form.job;
      if (job) {
        defaultData.nazev_zakazky = job.title || defaultData.nazev_zakazky;
        defaultData.mesto = job.city || defaultData.mesto;
        defaultData.mesto_v_meste = getCityIn(job.city);
        defaultData.popis_zakazky = job.description || defaultData.popis_zakazky;
        defaultData.cena_rozpocet = job.price_note || (job.budget_min ? `${job.budget_min.toLocaleString('cs-CZ')} KÄŤ` : "NenĂ­ stanovena");
        if (job.service_subcategories) {
          defaultData.obor = job.service_subcategories.name || defaultData.obor;
          defaultData.obor_2pad = job.service_subcategories.category_form || job.service_subcategories.name || defaultData.obor_2pad;
        }
      }
    } else if (selectedJob) {
      defaultData.mesto = selectedJob.city || defaultData.mesto;
      defaultData.mesto_v_meste = getCityIn(selectedJob.city);
      defaultData.nazev_zakazky = selectedJob.title || defaultData.nazev_zakazky;
      defaultData.popis_zakazky = selectedJob.description || defaultData.popis_zakazky;
      defaultData.cena_rozpocet = selectedJob.price_note || (selectedJob.budget_min ? `${selectedJob.budget_min.toLocaleString('cs-CZ')} KÄŤ` : "NenĂ­ stanovena");
      if (selectedJob.service_subcategories) {
        defaultData.obor = selectedJob.service_subcategories.name || defaultData.obor;
        defaultData.obor_2pad = selectedJob.service_subcategories.category_form || selectedJob.service_subcategories.name || defaultData.obor_2pad;
      }
    }
    return defaultData;
  }, [selectedJob, form, mode]);

  const previewReplace = (txt: string | null | undefined) => {
    if (!txt) return "";
    return txt
      .replace(/{{osloveni}}/g, previewData.osloveni)
      .replace(/{{jmeno}}/g, previewData.jmeno)
      .replace(/{{mesto}}/g, previewData.mesto)
      .replace(/{{mesto_v_meste}}/g, previewData.mesto_v_meste)
      .replace(/{{obor}}/g, previewData.obor)
      .replace(/{{obor_2pad}}|{{podkategorie_2pad}}/g, previewData.obor_2pad)
      .replace(/{{nazev_zakazky}}/g, previewData.nazev_zakazky)
      .replace(/{{popis_zakazky}}/g, previewData.popis_zakazky)
      .replace(/{{cena_rozpocet}}|{{rozpocet}}/g, previewData.cena_rozpocet)
      .replace(/{{zakaznik}}/g, previewData.zakaznik)
      .replace(/{{odkaz_zakazky}}/g, previewData.odkaz_zakazky)
      .replace(/{{icebreaker}}/g, previewData.icebreaker);
  };

  const setVal = (key: keyof EmailEditorState, val: any) => setForm((p) => p ? ({ ...p, [key]: val }) : null);
  const setSegmentFilter = (key: string, val: any) => {
    setForm((p) => p ? ({ ...p, segment_filters: { ...(p.segment_filters || {}), [key]: val } }) : null);
  };

  const formatText = (tag: string) => {
    if (!form || !activeField) return;
    if (activeField !== "body" && activeField !== "secondary_text" && activeField !== "job_description_snippet") return;
    
    // Only use textareaRef for precise insertion if we are editing the body
    let start = 0;
    let end = 0;
    const current = (form[activeField as keyof EmailEditorState] as string) || "";
    
    if (activeField === "body" && textareaRef.current) {
      start = textareaRef.current.selectionStart;
      end = textareaRef.current.selectionEnd;
    } else {
      // If editing other fields without a ref, just append the tag to the end
      start = current.length;
      end = current.length;
    }
    
    const selectedText = current.substring(start, end);
    const before = current.substring(0, start);
    const after = current.substring(end);
    let newVal = "";
    
    if (tag === "link") {
      const url = prompt("Zadejte URL adresu odkazu:", "https://");
      if (!url) return;
      newVal = `${before}<a href="${url}">${selectedText || "text odkazu"}</a>${after}`;
    } else {
      newVal = `${before}<${tag}>${selectedText || "text"}</${tag}>${after}`;
    }
    
    setVal(activeField as keyof EmailEditorState, newVal);
    
    setTimeout(() => {
      if (activeField === "body" && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  };

  const insertVariable = (variable: string) => {
    if (!form || !activeField) return;
    
    let start = 0;
    let end = 0;
    const current = (form[activeField as keyof EmailEditorState] as string) || "";
    
    if (activeField === "body" && textareaRef.current) {
      start = textareaRef.current.selectionStart;
      end = textareaRef.current.selectionEnd;
    } else {
      start = current.length;
      end = current.length;
    }
    
    const before = current.substring(0, start);
    const after = current.substring(end);
    
    // Add space padding if needed
    const padBefore = before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n") ? " " : "";
    const padAfter = after.length > 0 && !after.startsWith(" ") && !after.startsWith("\n") ? " " : "";
    
    setVal(activeField as keyof EmailEditorState, `${before}${padBefore}${variable}${padAfter}${after}`);
    
    setTimeout(() => {
      if (activeField === "body" && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  };

  const handleRegenerateIcebreaker = async () => {
    if (!form) return;
    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("llms-full", {
        body: { prompt: "NapiĹˇ krĂˇtkĂ˝ icebreaker pro e-mail.", systemPrompt: "Jsi expert na B2B cold emaily." }
      });
      if (error) throw error;
      setVal("icebreaker", data?.content || data);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isOpen || !form) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background font-sans animate-in fade-in duration-300 w-screen h-screen overflow-hidden">
        
        {/* Unified Premium Header */}
        <div className="px-4 md:px-6 py-3 border-b border-border bg-card/50 flex flex-row items-center justify-between shrink-0 overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-3 truncate shrink-0">
            <Button variant="outline" size="icon" onClick={onClose} className="h-8 w-8 rounded-full shrink-0 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-bold flex items-center gap-2 truncate shrink-0 text-zinc-800 dark:text-zinc-200">
              <span className="truncate hidden md:inline">
                {mode === "template" && `Ĺ ablona: ${form.name || "NovĂˇ"}`}
                {mode === "campaign" && `KampaĹ: ${form.name || "VizuĂˇlnĂ­ Editor"}`}
                {mode === "outbox" && `Revize zprĂˇvy pro: ${form.recipient_name || form.recipient_email}`}
              </span>
            </h2>
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile View Toggler */}
            <div className="flex md:hidden items-center border-r border-border/80 pr-2 mr-1 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMobileView(mobileView === "editor" ? "preview" : "editor")} 
                className="h-8 px-3 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-muted text-[10px] font-bold"
              >
                {mobileView === "editor" ? "NĂˇhled" : "Upravit"}
              </Button>
            </div>



            {mode === "template" && (
              <div className="flex items-center gap-2 border-r border-border/80 pr-2 sm:pr-3 mr-1 sm:mr-2 shrink-0">
                <Switch 
                  id="header-template-enabled" 
                  checked={form.is_enabled} 
                  onCheckedChange={(checked) => setVal("is_enabled", checked)}
                  className="h-5 w-9 shrink-0 cursor-pointer data-[state=checked]:bg-zinc-800 dark:data-[state=checked]:bg-zinc-200 data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-800"
                  title={form.is_enabled ? "AktivnĂ­" : "VypnutĂˇ"}
                />
              </div>
            )}

            {mode === "outbox" && (
              <Badge variant="outline" className="hidden lg:flex bg-emerald-500/10 text-emerald-500 border-emerald-500/20 mr-2 uppercase text-[9px] font-black tracking-widest shrink-0">
                Koncept k revizi
              </Badge>
            )}

            {onDelete && mode === "template" && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                  if (confirm("Opravdu chcete tuto Ĺˇablonu smazat?")) {
                    onClose();
                    onDelete();
                  }
                }}
                className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 cursor-pointer shrink-0"
                title="Smazat"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
              </Button>
            )}

            {form.slug && onTestSend && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const email = window.prompt("Zadejte e-mail pro testovacĂ­ zprĂˇvu:", "michal.kasparek91@gmail.com");
                  if (email) {
                    onTestSend(form.slug!, form, selectedJobId || null, email);
                  }
                }} 
                disabled={isSendingTest} 
                className="h-8 px-2 sm:px-3 text-[11px] font-bold gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer shrink-0"
              >
                {isSendingTest ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Send className="h-3 w-3 shrink-0" />}
                <span className="hidden sm:inline">Poslat test</span>
              </Button>
            )}


            
            <Button 
              variant="outline"
              size="sm" 
              className="h-8 px-3 sm:px-4 text-[11px] font-bold rounded-full gap-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer transition-all shrink-0" 
              disabled={isSaving || (mode !== "outbox" && !form.name)}
              onClick={() => onSave(form)}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Save className="h-3 w-3 shrink-0" />}
              <span className="hidden sm:inline">{mode === "campaign" ? "UloĹľit a pouĹľĂ­t" : "UloĹľit"}</span>
              <span className="inline sm:hidden">UloĹľit</span>
            </Button>

            {onBroadcast && (
              <Button 
                variant="outline"
                size="sm" 
                className="h-8 px-3 text-[11px] font-bold gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/40 cursor-pointer shrink-0"
                onClick={() => {
                  if (confirm("Opravdu chcete tyto koncepty pĹ™esunout k odeslĂˇnĂ­ do Outboxu?")) {
                    onBroadcast();
                  }
                }}
                disabled={isBroadcasting}
              >
                {isBroadcasting ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Send className="h-3 w-3 shrink-0" />}
                <span className="truncate hidden sm:inline font-bold">PĹ™esunout do Outboxu</span>
              </Button>
            )}
          </div>
        </div>

        {/* Dialog Main Content Area */}
        <div className="flex-1 flex overflow-hidden bg-muted/20">
          
          {/* Left Panel */}
          <div className={`w-full md:w-[420px] border-r border-border bg-background overflow-y-auto p-4 space-y-4 shrink-0 flex-col justify-between ${mobileView === "preview" ? "hidden md:flex" : "flex"}`}>
            <div className="space-y-4 flex-1">
              
              {/* Internal editor tabs */}
              <div className="flex flex-wrap border-b border-border mb-2">
                <button 
                  onClick={() => setActiveTab("content")}
                  className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === "content" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  đź“ť Obsah
                </button>
                <button 
                  onClick={() => setActiveTab("widgets")}
                  className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === "widgets" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  đź§© Widgety
                </button>
                  <button 
                    onClick={() => setActiveTab("settings")}
                    className={`flex-1 py-2 px-1 text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all ${activeTab === "settings" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    đź‘Ą Publikum
                  </button>
              </div>

              {activeTab === "content" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Panel formĂˇtovĂˇnĂ­ a promÄ›nnĂ˝ch */}
                  <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center gap-1 border-b border-border/50 pb-2 mb-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 font-bold" onClick={(e) => { e.preventDefault(); formatText("b"); }}>B</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 italic" onClick={(e) => { e.preventDefault(); formatText("i"); }}>I</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 underline" onClick={(e) => { e.preventDefault(); formatText("u"); }}>U</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => { e.preventDefault(); formatText("link"); }}>Odkaz</Button>
                      {activeField === "body" && (
                        <Button variant="outline" size="sm" className="h-7 ml-auto text-[10px] gap-1" onClick={(e) => { e.preventDefault(); handleRegenerateIcebreaker(); }} disabled={isRegenerating}>
                          {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          AI Icebreaker
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                      {TEMPLATE_VARIABLES.map(v => (
                        <button
                          key={v.key}
                          onClick={(e) => { e.preventDefault(); insertVariable(v.key); }}
                          title={v.desc}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded shadow-sm hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground/80">OslovenĂ­ (smaĹľte pro vypnutĂ­)</Label>
                    <Input value={form.greeting ?? ""} onChange={(e) => setVal("greeting", e.target.value)} onFocus={() => setActiveField("greeting")} placeholder="DobrĂ˝ den {{osloveni}}," className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground/80">PĹ™edmÄ›t e-mailu</Label>
                    <Input value={form.subject || ""} onChange={(e) => setVal("subject", e.target.value)} onFocus={() => setActiveField("subject")} placeholder="PĹ™edmÄ›t e-mailu..." className="h-9 text-xs" />
                  </div>
                  <Textarea ref={textareaRef} value={form.body || ""} onChange={(e) => setVal("body", e.target.value)} onFocus={() => setActiveField("body")} className="min-h-[120px] text-xs" />
                  
                  {/* SekundĂˇrnĂ­ text */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground/80">CTA doplĹkovĂ˝ text</Label>
                    <Textarea value={form.secondary_text || ""} onChange={(e) => setVal("secondary_text", e.target.value)} onFocus={() => setActiveField("secondary_text")} placeholder="..." className="min-h-[60px] text-xs mt-1" />
                  </div>

                  {/* DoplĹkovĂ˝ text pod e-mailem */}
                  <div className="space-y-1 mt-4">
                    <Label className="text-[11px] font-medium text-muted-foreground/80">DoplĹkovĂ˝ text pod e-mailem (volitelnĂ©)</Label>
                    <Textarea value={form.segment_filters?.secondary_text_below_job || ""} onChange={(e) => setSegmentFilter("secondary_text_below_job", e.target.value)} onFocus={() => setActiveField("secondary_text_below_job")} placeholder="..." className="min-h-[60px] text-xs mt-1" />
                  </div>

                  {/* GrafickĂ© oslovenĂ­ */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">GrafickĂ© oslovenĂ­</Label>
                      <Switch checked={!!form.segment_filters?.graphic_greeting_enabled} onCheckedChange={(c) => setSegmentFilter("graphic_greeting_enabled", c)} />
                    </div>
                  </div>

                  {/* ZarovnĂˇnĂ­ na stĹ™ed */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">ZarovnĂˇnĂ­ na stĹ™ed</Label>
                      <Switch checked={form.segment_filters?.text_align === "center"} onCheckedChange={(c) => setSegmentFilter("text_align", c ? "center" : "left")} />
                    </div>
                  </div>

                  {/* Emoji a pĹ™edmÄ›t v obsahu */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">Emoji a pĹ™edmÄ›t v obsahu</Label>
                      <Switch checked={!!form.segment_filters?.show_subject_in_body} onCheckedChange={(c) => setSegmentFilter("show_subject_in_body", c)} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "widgets" && (
                <div className="space-y-0.5 animate-in fade-in duration-200 p-1">
                  
                  {/* GrafickĂ© oslovenĂ­ */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">GrafickĂ© oslovenĂ­</Label>
                      <Switch checked={!!form.segment_filters?.graphic_greeting_enabled} onCheckedChange={(c) => setSegmentFilter("graphic_greeting_enabled", c)} />
                    </div>
                  </div>

                  {/* HlavnĂ­ ObrĂˇzek */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">HlavnĂ­ ObrĂˇzek (Hero)</Label>
                      <Switch checked={!!form.hero_image_url} onCheckedChange={(c) => setVal("hero_image_url", c ? "https://" : "")} />
                    </div>
                    {form.hero_image_url !== "" && form.hero_image_url !== null && (
                      <Input value={form.hero_image_url || ""} onChange={(e) => setVal("hero_image_url", e.target.value)} onFocus={() => setActiveField("hero_image_url")} placeholder="https://url-obrazku.jpg" className="h-8 text-xs mt-2" />
                    )}
                  </div>
                  {/* TlaÄŤĂ­tko akce (CTA) */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">TlaÄŤĂ­tko akce (CTA)</Label>
                      <Switch checked={form.show_cta_button ?? true} onCheckedChange={(c) => setVal("show_cta_button", c)} />
                    </div>
                    {form.show_cta_button !== false && (
                      <div className="space-y-2 mt-2">
                        <Input value={form.cta_text || ""} onChange={(e) => setVal("cta_text", e.target.value)} onFocus={() => setActiveField("cta_text")} placeholder="Text tlaÄŤĂ­tka (napĹ™. Zobrazit detail)" className="h-8 text-xs" />
                        <Input value={form.cta_url || ""} onChange={(e) => setVal("cta_url", e.target.value)} onFocus={() => setActiveField("cta_url")} placeholder="https://..." className="h-8 text-xs" />
                      </div>
                    )}
                  </div>

                  {/* Informace o zakĂˇzce */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">ShrnutĂ­ zakĂˇzky (Job Snippet)</Label>
                    </div>
                    <Textarea value={form.job_description_snippet || ""} onChange={(e) => setVal("job_description_snippet", e.target.value)} onFocus={() => setActiveField("job_description_snippet")} placeholder="StruÄŤnĂ˝ popis zakĂˇzky..." className="min-h-[60px] text-xs mt-2" />
                  </div>

                  {/* SouvisejĂ­cĂ­ ÄŤlĂˇnky */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">ÄŚlĂˇnky z magazĂ­nu</Label>
                      <Switch checked={!!form.segment_filters?.articles_enabled} onCheckedChange={(c) => setSegmentFilter("articles_enabled", c)} />
                    </div>
                  </div>

                  {/* Urgency Banner */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">Urgency Banner</Label>
                      <Switch checked={form.urgency_banner_enabled ?? false} onCheckedChange={(c) => setVal("urgency_banner_enabled", c)} />
                    </div>
                    {form.urgency_banner_enabled && (
                      <Input value={form.urgency_banner_text || ""} onChange={(e) => setVal("urgency_banner_text", e.target.value)} onFocus={() => setActiveField("urgency_banner_text")} placeholder="Text urgence..." className="h-8 text-xs mt-2" />
                    )}
                  </div>

                  {/* Promo Banner */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">Promo Banner</Label>
                      <Switch checked={form.promo_banner_enabled ?? false} onCheckedChange={(c) => setVal("promo_banner_enabled", c)} />
                    </div>
                    {form.promo_banner_enabled && (
                      <Input value={form.promo_banner_text || ""} onChange={(e) => setVal("promo_banner_text", e.target.value)} onFocus={() => setActiveField("promo_banner_text")} placeholder="Text proma..." className="h-8 text-xs mt-2" />
                    )}
                  </div>

                  {/* PS Footer */}
                  <div className="py-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground/80">P.S. PatiÄŤka</Label>
                      <Switch checked={form.ps_footer_enabled ?? false} onCheckedChange={(c) => setVal("ps_footer_enabled", c)} />
                    </div>
                    {form.ps_footer_enabled && (
                      <Input value={form.ps_footer_text || ""} onChange={(e) => setVal("ps_footer_text", e.target.value)} onFocus={() => setActiveField("ps_footer_text")} placeholder="Text patiÄŤky..." className="h-8 text-xs mt-2" />
                    )}
                  </div>

                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6 animate-in fade-in duration-200 p-1">
                  
                  {/* Settings section */}
                  <div className="space-y-5">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold border-b border-border/50 pb-2">ZĂˇkladnĂ­ chovĂˇnĂ­</h3>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground/80 cursor-pointer">Povoleno k odesĂ­lĂˇnĂ­</Label>
                        <Switch checked={form.is_enabled ?? true} onCheckedChange={(c) => setVal("is_enabled", c)} />
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Kategorie</Label>
                          <Select value={form.category || "marketing"} onValueChange={(v) => setVal("category", v)}>
                            <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="Kategorie..." /></SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="marketing">Marketing (Akvizice)</SelectItem>
                              <SelectItem value="transactional">TransakÄŤnĂ­ (SystĂ©movĂ©)</SelectItem>
                              <SelectItem value="drip">Drip KampaĹ (Sekvence)</SelectItem>
                              <SelectItem value="newsletter">Newsletter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Odeslat jako roli</Label>
                          <Select value={form.target_role || "all"} onValueChange={(v) => setVal("target_role", v)}>
                            <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="Role..." /></SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="all">VĹˇem (VĂ˝chozĂ­)</SelectItem>
                              <SelectItem value="worker">Pro ĹemeslnĂ­ky</SelectItem>
                              <SelectItem value="customer">Pro ZĂˇkaznĂ­ky</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Jazyk Ĺˇablony (Pro AutonomnĂ­ rozesĂ­lku)</Label>
                          <Select value={form.language || "cs"} onValueChange={(v) => setVal("language", v)}>
                            <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="Jazyk..." /></SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectItem value="cs">ÄŚeĹˇtina (cs)</SelectItem>
                              <SelectItem value="en">AngliÄŤtina (en)</SelectItem>
                              <SelectItem value="de">NÄ›mÄŤina (de)</SelectItem>
                              <SelectItem value="sk">SlovenĹˇtina (sk)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audience filters section */}
                  <div className="space-y-5 pt-4 border-t border-border/40">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold border-b border-border/50 pb-2">Filtry Publika</h3>
                      
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Zdroj kontaktĹŻ</Label>
                        <Select value={form.segment_filters?.sourceFilter || "all"} onValueChange={(v) => setSegmentFilter("sourceFilter", v)}>
                          <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="VĹˇechny zdroje" /></SelectTrigger>
                          <SelectContent className="z-[200]">
                            <SelectItem value="all">VĹˇechny zdroje</SelectItem>
                            <SelectItem value="organic">RegistrovanĂ­ (Organic)</SelectItem>
                            <SelectItem value="scraped">Scraping (Lead)</SelectItem>
                            <SelectItem value="ai_web_sniper">AI Web Sniper</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Typ uĹľivatele</Label>
                        <Select value={form.segment_filters?.userTypeFilter || "all"} onValueChange={(v) => setSegmentFilter("userTypeFilter", v)}>
                          <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="VĹˇichni" /></SelectTrigger>
                          <SelectContent className="z-[200]">
                            <SelectItem value="all">ZĂˇkaznĂ­ci i ĹemeslnĂ­ci</SelectItem>
                            <SelectItem value="worker">Pouze ĹemeslnĂ­ci</SelectItem>
                            <SelectItem value="customer">Pouze ZĂˇkaznĂ­ci</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Lokalita (MÄ›sto)</Label>
                      <Input 
                        placeholder="NapĹ™. Praha, Brno..." 
                        value={form.segment_filters?.cityFilter || ""} 
                        onChange={(e) => setSegmentFilter("cityFilter", e.target.value)} 
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>

                    {form.segment_filters?.cityFilter && (
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">VzdĂˇlenost (Radius)</Label>
                        <Select value={form.segment_filters?.radiusFilter || "10"} onValueChange={(v) => setSegmentFilter("radiusFilter", v)}>
                          <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="VzdĂˇlenost" /></SelectTrigger>
                          <SelectContent className="z-[200]">
                            <SelectItem value="10">Do 10 km</SelectItem>
                            <SelectItem value="25">Do 25 km</SelectItem>
                            <SelectItem value="50">Do 50 km</SelectItem>
                            <SelectItem value="100">Do 100 km</SelectItem>
                            <SelectItem value="999">CelĂˇ ÄŚR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">MinimĂˇlnĂ­ Engagement SkĂłre</Label>
                      <Select value={form.segment_filters?.minEngagement || "0"} onValueChange={(v) => setSegmentFilter("minEngagement", v)}>
                        <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="JakĂˇkoliv aktivita" /></SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="0">VĹˇichni (i bez aktivity)</SelectItem>
                          <SelectItem value="15">AlespoĹ kontaktovĂˇni (15+)</SelectItem>
                          <SelectItem value="40">OtevĹ™eli e-mail (40+)</SelectItem>
                          <SelectItem value="70">OdpovÄ›dÄ›li (70+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 animate-in fade-in duration-200 p-1">
                  <div className="p-4 bg-muted/10 rounded-2xl border border-border/40 space-y-4">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">CĂ­lenĂ­ & Trigger spouĹˇtÄ›nĂ­</p>
                    
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground/80">CĂ­lovĂ© role</Label>
                      <Select value={form.target_role || "all"} onValueChange={(v) => setVal("target_role", v)}>
                        <SelectTrigger className="mt-1 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="all">VĹˇichni</SelectItem>
                          <SelectItem value="worker">ĹemeslnĂ­ci</SelectItem>
                          <SelectItem value="customer">ZĂˇkaznĂ­ci</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground/80">Typ spouĹˇtÄ›ÄŤe</Label>
                      <Select value={form.trigger_type || "manual"} onValueChange={(v) => setVal("trigger_type", v)}>
                        <SelectTrigger className="mt-1 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="event">UdĂˇlost v systĂ©mu</SelectItem>
                          <SelectItem value="cron">AutomatickĂˇ sĂ©rie (cron)</SelectItem>
                          <SelectItem value="manual">ManuĂˇlnĂ­ rozesĂ­lka</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.trigger_type === "cron" && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30 animate-in slide-in-from-top-2">
                        <div>
                          <Label className="text-[11px] font-medium text-muted-foreground/80">ZpoĹľdÄ›nĂ­ (dny)</Label>
                          <Input 
                            type="number" 
                            value={form.drip_delay_days ?? 0} 
                            onChange={(e) => setVal("drip_delay_days", parseInt(e.target.value))} 
                            className="mt-1 h-9 text-xs rounded-xl" 
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-medium text-muted-foreground/80">SĂ©rie (Drip)</Label>
                          <Input 
                            value={form.drip_series || ""} 
                            onChange={(e) => setVal("drip_series", e.target.value)} 
                            className="mt-1 h-9 text-xs rounded-xl" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border/40 mt-4">
                    <h3 className="text-sm font-bold border-b border-border/50 pb-2">OdesĂ­lacĂ­ Ăşdaje</h3>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">OdesĂ­latel (Z koho)</Label>
                      <Select value={form.sender_email || "default"} onValueChange={(v) => setVal("sender_email", v === "default" ? null : v)}>
                        <SelectTrigger className="mt-1 h-9 rounded-xl text-xs"><SelectValue placeholder="VĂ˝chozĂ­ (Atmosferi <info@atmosferi.com>)" /></SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="default">VĂ˝chozĂ­ (info@atmosferi.com)</SelectItem>
                          <SelectItem value="michal@atmosferi.com">Michal Kasparek (michal@atmosferi.com)</SelectItem>
                          <SelectItem value="info@atmosferi.com">Atmosferi Info (info@atmosferi.com)</SelectItem>
                          <SelectItem value="support@atmosferi.com">Atmosferi Podpora (support@atmosferi.com)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              )}

            </div>
          </div>

          {/* Right Panel: Live Realtime Preview */}
          <div className={`flex-1 bg-muted/30 dark:bg-zinc-950 p-6 md:p-12 overflow-y-auto flex-col items-center border-t md:border-t-0 md:border-l border-border/50 ${mobileView === "editor" ? "hidden md:flex" : "flex"}`}>
            <div className="w-full max-w-[640px] flex-1 flex flex-col space-y-6">
              
              {/* Preview Header controls */}
              <div className="flex items-center justify-between px-4 text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  VizuĂˇlnĂ­ nĂˇhled
                </div>
                
                {/* Desktop / Mobile segmented toggler */}
                <div className="flex items-center bg-muted/80 dark:bg-zinc-800 p-0.5 rounded-xl border border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2.5 rounded-lg gap-1.5 text-[10px] font-bold transition-all ${previewDevice === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setPreviewDevice("desktop")}
                  >
                    <Monitor className="h-3 w-3" />
                    Desktop
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2.5 rounded-lg gap-1.5 text-[10px] font-bold transition-all ${previewDevice === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setPreviewDevice("mobile")}
                  >
                    <Smartphone className="h-3 w-3" />
                    Mobil
                  </Button>
                </div>
              </div>

              {/* Job Selector for dynamic previews */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2.5 bg-card dark:bg-zinc-900/50 rounded-2xl border border-border/60 shadow-xs text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  đźŽŻ TestovacĂ­ data zakĂˇzky:
                </span>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="w-full sm:w-[320px] h-8 text-xs rounded-xl bg-background border-border/50 shadow-2xs font-medium">
                    <SelectValue placeholder="VĂ˝chozĂ­ ukĂˇzkovĂˇ data" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] z-[200]">
                    <SelectItem value="default" className="text-xs font-semibold">âś¨ VĂ˝chozĂ­ ukĂˇzkovĂˇ data</SelectItem>
                    {openJobs?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id} className="text-xs">
                        {job.title} ({job.city || "CelĂˇ ÄŚR"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Frame Rendering based on previewDevice */}
              <div className="flex-1 w-full flex items-center justify-center p-2">
                {previewDevice === "mobile" ? (
                  /* Premium Smartphone device frame */
                  <div className="relative w-[340px] h-[640px] rounded-[48px] border-[12px] border-zinc-800 dark:border-zinc-700 bg-zinc-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ring-4 ring-zinc-800/10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center">
                      <div className="w-12 h-1 bg-zinc-900 rounded-full mb-1" />
                      <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full absolute right-6 top-1.5" />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-6 bg-background dark:bg-zinc-900 select-none">
                      <div className="bg-muted/40 dark:bg-zinc-950 px-3 py-1 border-b border-border flex items-center gap-2">
                        <div className="flex gap-1 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <div className="bg-background dark:bg-zinc-900 text-foreground rounded-md border border-border px-2 py-0.5 text-[9px] font-medium flex-1 truncate shadow-2xs">
                          {previewReplace(form.subject || form.name) || "Bez pĹ™edmÄ›tu"}
                        </div>
                      </div>
                      
                      <div className="scale-[0.88] origin-top translate-y-2 pb-6">
                        <ModularLivePreview form={form} previewReplace={previewReplace} previewTheme={previewTheme} />
                      </div>
                    </div>
                    
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-zinc-800 rounded-full z-50" />
                  </div>
                ) : (
                  /* Standard Desktop frame */
                  <div className="w-full max-w-[580px] bg-background dark:bg-zinc-900 text-foreground shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-border/60 dark:border-zinc-800 rounded-[24px] overflow-hidden min-h-[700px] transition-all duration-500">
                    <div className="bg-muted/40 dark:bg-zinc-950 px-4 py-2 border-b border-border flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="bg-background dark:bg-zinc-900 text-foreground rounded-md border border-border px-3 py-0.5 text-[10px] font-medium flex-1 truncate shadow-sm">
                        PĹ™edmÄ›t: {previewReplace(form.subject || form.name) || "Bez pĹ™edmÄ›tu"}
                      </div>
                    </div>
                    <ModularLivePreview form={form} previewReplace={previewReplace} previewTheme={previewTheme} />
                  </div>
                )}
              </div>

              <p className="text-center text-[10px] text-muted-foreground italic">
                PoznĂˇmka: SkuteÄŤnĂ˝ e-mail se mĹŻĹľe v rĹŻznĂ˝ch klientech (Outlook, Gmail) mĂ­rnÄ› liĹˇit.
              </p>
            </div>
          </div>

        </div>

      </div>,
      document.body
    );
  }


class EditorErrorBoundary extends React.Component<{children: any}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 text-red-400 p-8">
          <h1 className="text-2xl font-bold mb-4">CRASH Editoru</h1>
          <pre className="text-xs text-left bg-zinc-900 p-4 rounded-xl border border-red-900/50 w-full max-w-4xl overflow-auto whitespace-pre-wrap">
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-900/50 hover:bg-red-900 text-white font-bold rounded-full"
          >
            Obnovit strĂˇnku
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ModularEmailEditorDialog(props: any) {
  return <EditorErrorBoundary><ModularEmailEditorDialogInner {...props} /></EditorErrorBoundary>;
}

