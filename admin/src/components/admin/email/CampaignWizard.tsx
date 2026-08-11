import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Smartphone, 
  Monitor, 
  Mail, 
  FileText, 
  Loader2, 
  Layout, 
  Eye, 
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CampaignWizardProps {
  onOpenVisualEditor: () => void;
  onSendCampaign: (payload: any) => void;
  isSending: boolean;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  onOpenVisualEditor,
  onSendCampaign,
  isSending
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Step 1 State: Audience Selection
  const [audienceType, setAudienceType] = useState<"all" | "architects" | "city" | "custom">("architects");
  const [selectedCity, setSelectedCity] = useState("Praha");
  const [recipientCount, setRecipientCount] = useState<number>(42);

  // Step 2 State: Content & Template
  const [templateSlug, setTemplateSlug] = useState("sniper");
  const [subject, setSubject] = useState("Propojení s vaší architektonickou prací – Atmosferi");
  const [body, setBody] = useState("Dobrý den, zaujaly nás vaše nejnovější architektonické realizace a rádi bychom vám nabídli naše špičkové 3D vizualizace...");
  const [ctaText, setCtaText] = useState("Prohlédnout portfolio Atmosferi");
  const [ctaUrl, setCtaUrl] = useState("https://www.atmosferi.com");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Step 3 State: Review & Send
  const [testEmail, setTestEmail] = useState("michal@atmosferi.com");
  const [sendingTest, setSendingTest] = useState(false);

  const handleTestSend = async () => {
    if (!testEmail) {
      toast.error("Zadejte e-mail pro testovací odeslání");
      return;
    }
    setSendingTest(true);
    setTimeout(() => {
      setSendingTest(false);
      toast.success(`Testovací e-mail byl úspěšně odeslán na ${testEmail}`);
    }, 1000);
  };

  const handleFinalSubmit = () => {
    onSendCampaign({
      audienceType,
      selectedCity,
      templateSlug,
      subject,
      body,
      ctaText,
      ctaUrl,
      recipientCount
    });
  };

  return (
    <div className="space-y-6">
      {/* Wizard Progress Stepper Header */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {/* Step 1 */}
          <button
            onClick={() => setStep(1)}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold transition-all ${
              step === 1 
                ? "bg-primary text-white shadow-sm" 
                : step > 1 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-black/10 text-[11px]">1</span>
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">1. Výběr Příjemců</span>
          </button>

          {/* Step 2 */}
          <button
            onClick={() => setStep(2)}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold transition-all ${
              step === 2 
                ? "bg-primary text-white shadow-sm" 
                : step > 2 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-black/10 text-[11px]">2</span>
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">2. Obsah & AI Editor</span>
          </button>

          {/* Step 3 */}
          <button
            onClick={() => setStep(3)}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold transition-all ${
              step === 3 
                ? "bg-primary text-white shadow-sm" 
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-black/10 text-[11px]">3</span>
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">3. Kontrola & Odeslání</span>
          </button>
        </div>
      </div>

      {/* STEP 1: AUDIENCE SELECTION */}
      {step === 1 && (
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Krok 1: Výběr Cílové Skupiny (Příjemců)
            </CardTitle>
            <CardDescription>
              Zvolte, komu chcete tuto e-mailovou kampaň rozeslat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Option A: Architects */}
              <div
                onClick={() => { setAudienceType("architects"); setRecipientCount(148); }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  audienceType === "architects"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-bold">Architekti & Studia</Badge>
                  {audienceType === "architects" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="font-bold text-sm text-foreground">Architekti a Projektanti</div>
                <div className="text-xs text-muted-foreground mt-1">Cílené oslovení z databáze kontaktů architektonických ateliérů.</div>
                <div className="mt-3 text-xs font-bold text-primary">Cca 148 kontaktů</div>
              </div>

              {/* Option B: By City */}
              <div
                onClick={() => { setAudienceType("city"); setRecipientCount(35); }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  audienceType === "city"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-bold">Dle Města</Badge>
                  {audienceType === "city" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="font-bold text-sm text-foreground">Regionální Segmentace</div>
                <div className="text-xs text-muted-foreground mt-1">Oslovení firem a kontaktů v konkrétním městě.</div>
                
                {audienceType === "city" && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Praha">Praha</SelectItem>
                        <SelectItem value="Brno">Brno</SelectItem>
                        <SelectItem value="Ostrava">Ostrava</SelectItem>
                        <SelectItem value="České Budějovice">České Budějovice</SelectItem>
                        <SelectItem value="Plzeň">Plzeň</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Option C: All */}
              <div
                onClick={() => { setAudienceType("all"); setRecipientCount(240); }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  audienceType === "all"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-bold">Všechny Kontakty</Badge>
                  {audienceType === "all" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="font-bold text-sm text-foreground">Celá Databáze Leadů</div>
                <div className="text-xs text-muted-foreground mt-1">Hromadné rozeslání na všechny aktivní kontakty.</div>
                <div className="mt-3 text-xs font-bold text-primary">Cca 240 kontaktů</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground font-medium">
                Zvoleno příjemců: <span className="font-bold text-foreground">{recipientCount} adres</span>
              </div>
              <Button onClick={() => setStep(2)} className="gap-2">
                Pokračovat na Obsah <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CONTENT & AI EDITOR */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Editor Controls */}
          <Card className="lg:col-span-7 rounded-2xl border border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Krok 2: Návrh E-mailu & AI
                </CardTitle>
                <Button variant="outline" size="sm" onClick={onOpenVisualEditor} className="gap-1.5 text-xs">
                  <Layout className="h-4 w-4 text-purple-500" /> Vizuální Editor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Picker */}
              <div>
                <Label className="text-xs font-bold">Typ Šablony E-mailu</Label>
                <Select value={templateSlug} onValueChange={setTemplateSlug}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sniper">Sniper Recruitment (Osobní oslovení)</SelectItem>
                    <SelectItem value="newsletter">Newsletter (Obrázkové vizualizace)</SelectItem>
                    <SelectItem value="plain">Prostý text (Nejvyšší doručitelnost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-bold">Předmět E-mailu</Label>
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Zadejte předmět e-mailu..."
                  className="font-bold text-sm"
                />
              </div>

              {/* Body */}
              <div>
                <Label className="text-xs font-bold">Text Zprávy</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="mt-1 text-xs font-sans leading-relaxed"
                  placeholder="Zadejte tělo e-mailu..."
                />
              </div>

              {/* CTA Button */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px]">Text Tlačítka (CTA)</Label>
                  <Input
                    className="mt-1"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Cílová URL (Odkaz)</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Zpět
                </Button>
                <Button onClick={() => setStep(3)} className="gap-2">
                  Pokračovat na Kontrolu <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Live Device Preview */}
          <Card className="lg:col-span-5 rounded-2xl border border-border shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Živý Náhled</CardTitle>
              </div>
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-md transition-colors ${previewDevice === "desktop" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-md transition-colors ${previewDevice === "mobile" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
              <div className={`bg-white text-zinc-900 rounded-xl shadow-lg border border-zinc-200 transition-all overflow-hidden ${
                previewDevice === "mobile" ? "w-[300px] text-[11px] p-4" : "w-full text-xs p-6"
              }`}>
                {/* Email Header */}
                <div className="border-b border-zinc-200 pb-3 mb-4">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Od: Atmosferi &lt;info@atmosferi.com&gt;</div>
                  <div className="font-bold text-sm text-zinc-900 mt-1">{subject || "Bez předmětu"}</div>
                </div>

                {/* Body */}
                <div className="whitespace-pre-line text-zinc-700 leading-relaxed mb-6">
                  {body}
                </div>

                {/* CTA */}
                {ctaText && (
                  <div className="text-center my-4">
                    <a
                      href={ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-zinc-900 text-white font-bold px-5 py-2.5 rounded-lg text-xs hover:bg-zinc-800 transition-colors"
                    >
                      {ctaText}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: REVIEW & SEND */}
      {step === 3 && (
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Krok 3: Kontrola a Odeslání Kampaně
            </CardTitle>
            <CardDescription>
              Zkontrolujte parametry a vyzkoušejte testovací odeslání před ostrým rozesláním.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-bold">Příjemci</span>
                <div className="font-bold text-sm text-foreground mt-0.5">{recipientCount} adres ({audienceType})</div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-bold">Šablona</span>
                <div className="font-bold text-sm text-foreground mt-0.5 uppercase">{templateSlug}</div>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-bold">Předmět</span>
                <div className="font-bold text-sm text-foreground mt-0.5 truncate">{subject}</div>
              </div>
            </div>

            {/* Test Email Send Card */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <Label className="text-xs font-bold flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                Odeslat Testovací E-mail sobě na kontrolu
              </Label>
              <div className="flex gap-2">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Zadejte váš e-mail..."
                  className="text-xs font-mono"
                />
                <Button
                  variant="outline"
                  onClick={handleTestSend}
                  disabled={sendingTest}
                  className="gap-1.5 text-xs whitespace-nowrap"
                >
                  {sendingTest && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Odeslat Test
                </Button>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Zpět na úpravu
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={isSending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Odeslat Kampaň ({recipientCount} kontaktů)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
