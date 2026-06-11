import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generateAtmosferiEmailHtml, EmailTemplateData } from "./EmailTemplateGenerator";
import { EmailEditorState } from "./ModularEmailEditor";

interface Props {
  initialData: Partial<EmailEditorState>;
  onClose: () => void;
  onSave: (data: EmailEditorState) => void;
  isSaving: boolean;
}

export default function AtmosferiEmailEditor({ initialData, onClose, onSave, isSaving }: Props) {
  const [form, setForm] = useState<EmailEditorState>({
    ...initialData,
    id: initialData.id || "",
    name: initialData.name || "",
    subject: initialData.subject || "",
    body: initialData.body || "",
    segment_filters: initialData.segment_filters || {},
  } as EmailEditorState);

  // Derive generator data
  const emailData: EmailTemplateData = {
    subject: form.subject || "Předmět e-mailu",
    body: form.body || "Zde bude text e-mailu...",
    heroImageEnabled: form.segment_filters?.hero_image_enabled ?? true,
    heroImageUrl: form.hero_image_url || "https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp",
    portfolioEnabled: form.segment_filters?.portfolio_enabled ?? true,
    portfolioImages: form.segment_filters?.portfolio_images || [
      "https://atmosferi.com/demos/atmosferi-viz/img/01-resonance.webp",
      "https://atmosferi.com/demos/atmosferi-viz/img/03-horizon.webp"
    ],
    icebreakerEnabled: form.segment_filters?.icebreaker_enabled ?? true,
    icebreakerText: form.icebreaker || "Všimli jsme si vaší nedávné práce a zaujalo nás vaše zaměření.",
    signatureEnabled: true,
    signatureName: "Ing. arch. Michal Kašpárek",
    signatureRole: "Architektonické studio",
    signatureEmail: "info@atmosferi.com",
    psEnabled: form.ps_footer_enabled ?? true,
    psText: form.ps_footer_text || "Pokud nyní nemáte kapacitu, stačí odepsat \"Ne\" a už vás nebudeme kontaktovat.",
    themeColor: "#D97757"
  };

  const html = generateAtmosferiEmailHtml(emailData);

  const updateForm = (updates: Partial<EmailEditorState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const updateFilter = (key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      segment_filters: { ...(prev.segment_filters || {}), [key]: value }
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background text-foreground flex flex-col font-sans">
      {/* TOP BAR */}
      <div className="bg-foreground text-background border-b border-black">
        <div className="flex justify-between items-center px-4 py-3 md:px-8">
           <h1 className="text-lg font-bold flex items-baseline gap-2 m-0">
             Atmosferi<sup className="text-[0.5em] relative -top-2">°</sup> 
             <span className="font-mono text-[9px] uppercase tracking-widest opacity-60 border-l border-white/30 pl-2 ml-2">Outreach studio</span>
           </h1>
           <div className="flex gap-4 items-center">
             <Button variant="ghost" className="text-xs hover:bg-white/10 text-white h-8" onClick={onClose}>Zavřít</Button>
             <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-bold px-6" onClick={() => onSave({ ...form, layout_type: "atmosferi_studio" })} disabled={isSaving}>
               {isSaving ? "Ukládám..." : "Uložit šablonu"}
             </Button>
           </div>
        </div>
      </div>

      {/* MAIN APP CONTAINER */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* EDITOR (Left) */}
        <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col border-r border-border bg-card overflow-y-auto">
          <div className="p-6 md:p-8 space-y-8">
             
             {/* Info */}
             <div className="space-y-4">
               <div>
                 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Název šablony</Label>
                 <Input value={form.name || ""} onChange={e => updateForm({ name: e.target.value })} className="h-9" placeholder="Např. Architekti - první kontakt" />
               </div>
             </div>

             {/* Toggles */}
             <div className="space-y-4 border-t border-border pt-6">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Obsahové bloky</Label>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="hero-toggle" className="text-sm font-medium">Úvodní obrázek (Hero)</Label>
                  <Switch id="hero-toggle" checked={emailData.heroImageEnabled} onCheckedChange={c => updateFilter("hero_image_enabled", c)} />
                </div>
                {emailData.heroImageEnabled && (
                  <Input value={form.hero_image_url || ""} onChange={e => updateForm({ hero_image_url: e.target.value })} className="h-8 text-xs mt-2" placeholder="URL obrázku (https://...)" />
                )}

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="port-toggle" className="text-sm font-medium">Portfolio strip</Label>
                  <Switch id="port-toggle" checked={emailData.portfolioEnabled} onCheckedChange={c => updateFilter("portfolio_enabled", c)} />
                </div>
                {emailData.portfolioEnabled && (
                  <Input 
                    value={emailData.portfolioImages.join(", ")} 
                    onChange={e => updateFilter("portfolio_images", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} 
                    className="h-8 text-xs mt-2" placeholder="URL obrázků oddělené čárkou" 
                  />
                )}

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="ice-toggle" className="text-sm font-medium">Icebreaker (Aktivní pouze v outboxu)</Label>
                  <Switch id="ice-toggle" checked={emailData.icebreakerEnabled} onCheckedChange={c => updateFilter("icebreaker_enabled", c)} />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="ps-toggle" className="text-sm font-medium">P.S. patička</Label>
                  <Switch id="ps-toggle" checked={emailData.psEnabled} onCheckedChange={c => updateForm({ ps_footer_enabled: c })} />
                </div>
                {emailData.psEnabled && (
                  <Input value={form.ps_footer_text || ""} onChange={e => updateForm({ ps_footer_text: e.target.value })} className="h-8 text-xs mt-2" placeholder="Text patičky" />
                )}
             </div>

             {/* Content */}
             <div className="space-y-4 border-t border-border pt-6">
               <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Text e-mailu</Label>
               <div>
                 <Input value={form.subject || ""} onChange={e => updateForm({ subject: e.target.value })} className="h-10 font-bold mb-3" placeholder="Předmět" />
                 <Textarea 
                   value={form.body || ""} 
                   onChange={e => updateForm({ body: e.target.value })} 
                   className="min-h-[300px] font-sans leading-relaxed resize-y" 
                   placeholder="Dobrý den,\n\npíšeme vám ohledně..."
                 />
               </div>
               <div className="text-[10px] text-muted-foreground flex gap-2 flex-wrap">
                 <span className="bg-muted px-1.5 py-0.5 rounded cursor-help" title="Zákazník z CRM">{{zakaznik}}</span>
                 <span className="bg-muted px-1.5 py-0.5 rounded cursor-help" title="Město">{{mesto}}</span>
                 <span className="bg-muted px-1.5 py-0.5 rounded cursor-help" title="Oslovení v 5. pádu">{{osloveni}}</span>
               </div>
             </div>

          </div>
        </div>

        {/* PREVIEW (Right) */}
        <div className="flex-1 bg-secondary overflow-y-auto flex items-center justify-center p-4 md:p-8">
           <div className="w-full max-w-[600px] h-full max-h-[800px] bg-white border border-border shadow-2xl overflow-hidden flex flex-col rounded-md">
             <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center gap-2 shrink-0">
               <div className="flex gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
               </div>
               <div className="ml-4 text-[11px] font-medium text-muted-foreground flex-1 truncate">
                 Předmět: <span className="text-foreground">{emailData.subject}</span>
               </div>
             </div>
             <iframe 
               srcDoc={html} 
               className="w-full flex-1 border-none bg-white" 
               title="Email Preview"
             />
           </div>
        </div>
      </div>
    </div>
  );
}
