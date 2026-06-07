import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import EmojiPicker from 'emoji-picker-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmilePlus, Image as ImageIcon, Send, Loader2, ChevronRight, ChevronLeft, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MobileLivePreview } from "./MobileLivePreview";
import { cn } from "@/lib/utils";

const campaignSchema = z.object({
  title: z.string().min(1, "Titulek je povinný").max(60, "Maximálně 60 znaků"),
  body: z.string().min(1, "Text je povinný").max(200, "Maximálně 200 znaků"),
  isAbTesting: z.boolean().default(false),
  titleB: z.string().max(60).optional(),
  bodyB: z.string().max(200).optional(),
  url: z.string().optional(),
  imageUrl: z.string().optional(),
  target: z.enum(["all", "workers", "customers", "pro"]).default("all"),
  targetCity: z.string().default("all"),
  targetRole: z.string().default("all"),
  targetActivity: z.string().default("all"),
  isScheduled: z.boolean().default(false),
  scheduledAt: z.string().optional(),
}).refine(data => {
  if (data.isAbTesting) {
    return !!data.titleB && !!data.bodyB;
  }
  return true;
}, {
  message: "Varianta B je povinná, pokud je A/B testování zapnuté",
  path: ["titleB"],
}).refine(data => {
  if (data.isScheduled) {
    return !!data.scheduledAt;
  }
  return true;
}, {
  message: "Datum odeslání je povinné",
  path: ["scheduledAt"],
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignWizardProps {
  initialData?: any;
  onClearInitialData?: () => void;
}

export function CampaignWizard({ initialData, onClearInitialData }: CampaignWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState<"title" | "body" | "titleB" | "bodyB" | null>(null);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      body: "",
      isAbTesting: false,
      titleB: "",
      bodyB: "",
      url: "",
      imageUrl: "",
      target: "all",
      targetCity: "all",
      targetRole: "all",
      targetActivity: "all",
      isScheduled: false,
      scheduledAt: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || "",
        body: initialData.body || "",
        url: initialData.url || "",
        target: initialData.target_audience || "all",
        isAbTesting: initialData.target_filters?.isAbTesting || false,
        titleB: initialData.target_filters?.titleB || "",
        bodyB: initialData.target_filters?.bodyB || "",
        imageUrl: initialData.target_filters?.imageUrl || "",
        targetCity: initialData.target_filters?.targetCity || "all",
        targetRole: initialData.target_filters?.targetRole || "all",
        targetActivity: initialData.target_filters?.targetActivity || "all",
        isScheduled: false,
        scheduledAt: "",
      });
      setStep(1);
      if (onClearInitialData) onClearInitialData();
    }
  }, [initialData, form, onClearInitialData]);

  const sendMutation = useMutation({
    mutationFn: async (opts: { isDraft?: boolean, values: CampaignFormValues }) => {
      const { isDraft = false, values } = opts;
      
      if (values.isScheduled || isDraft) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Nejste přihlášeni");

        const { error } = await supabase
          .from("broadcast_notifications")
          .insert({
            admin_id: user.id,
            title: values.title,
            body: values.body,
            url: values.url || null,
            target_audience: values.target || 'all',
            status: isDraft ? 'draft' : 'scheduled',
            scheduled_at: isDraft ? null : values.scheduledAt,
            recipients_count: 0,
            target_filters: { 
              targetCity: values.targetCity, 
              targetRole: values.targetRole, 
              targetActivity: values.targetActivity, 
              isAbTesting: values.isAbTesting, 
              titleB: values.titleB, 
              bodyB: values.bodyB, 
              imageUrl: values.imageUrl 
            }, 
          });
        if (error) throw error;
        return { success: true, scheduled: !isDraft, draft: isDraft };
      } else {
        const { data, error } = await supabase.functions.invoke("admin-send-broadcast-push", {
          body: { 
            title: values.title, 
            body: values.body, 
            url: values.url || undefined, 
            target: values.target, 
            targetCity: values.targetCity, 
            targetRole: values.targetRole, 
            targetActivity: values.targetActivity, 
            imageUrl: values.imageUrl, 
            isAbTesting: values.isAbTesting, 
            titleB: values.titleB, 
            bodyB: values.bodyB 
          },
        });
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data, variables) => {
      if (data.scheduled) {
        toast({ title: "Naplánováno", description: `Notifikace bude odeslána ${format(new Date(variables.values.scheduledAt!), "d. M. HH:mm")}` });
      } else if (data.draft) {
        toast({ title: "Uloženo", description: "Koncept byl uložen." });
      } else {
        toast({
          title: "Kampaň dokončena",
          description: `Úspěšně: ${data.sent || 0}, Vyčištěno: ${data.cleanedUp || 0}`,
        });
      }
      form.reset();
      setStep(1);
      queryClient.invalidateQueries({ queryKey: ["admin-broadcast-notifications"] });
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nejste přihlášeni");

      const { data, error } = await supabase.functions.invoke("test-push-notification", {
        body: { 
          userId: user.id,
          title: values.title || "🚀 Vítejte v ZROBEE!", 
          body: values.body || "Toto je testovací oznámení.",
          url: values.url || undefined
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Testovací notifikace odeslána",
        description: `Zpráva odeslána na vaše zařízení (${data?.sent || 0} úspěšně).`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: CampaignFormValues) => {
    sendMutation.mutate({ values });
  };

  const nextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await form.trigger(["title", "body", "titleB", "bodyB", "imageUrl", "url"]);
    } else if (step === 2) {
      isValid = await form.trigger(["target", "targetCity", "targetRole", "targetActivity"]);
    }
    if (isValid) {
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const watchedValues = form.watch();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border/50 shadow-sm overflow-hidden transition-all bg-card rounded-xl">
          <CardHeader className="py-4 px-6 border-b border-border/40 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <CardTitle className="text-sm font-semibold">Tvorba Kampaně</CardTitle>
              <CardDescription className="text-[10px] font-medium mt-1">Krok {step} ze 3</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors", step >= num ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                    {num}
                  </div>
                  {num < 3 && <div className={cn("w-4 h-0.5", step > num ? "bg-emerald-500" : "bg-slate-200")} />}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* KROK 1: Obsah */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">A/B Testování</Label>
                    <Switch 
                      checked={watchedValues.isAbTesting} 
                      onCheckedChange={(checked) => form.setValue("isAbTesting", checked)} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-medium text-muted-foreground opacity-60">Nadpis zprávy {watchedValues.isAbTesting && "(Var A)"} *</Label>
                        <span className={cn("text-[9px] font-semibold", watchedValues.title.length > 55 ? "text-amber-500" : "text-muted-foreground/30")}>
                          {watchedValues.title.length}/60
                        </span>
                      </div>
                      <div className="relative">
                        <Input 
                          {...form.register("title")} 
                          placeholder="Zadejte stručný titulek..." 
                          maxLength={60} 
                          className="h-9 pr-8 text-xs bg-slate-50/30 dark:bg-slate-950/30" 
                        />
                        <Popover open={showEmojiPicker === "title"} onOpenChange={(open) => setShowEmojiPicker(open ? "title" : null)}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9"><SmilePlus className="h-4 w-4" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end" side="right">
                            <EmojiPicker onEmojiClick={(e) => form.setValue("title", form.getValues("title") + e.emoji)} width={280} height={350} searchDisabled />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {form.formState.errors.title && <p className="text-red-500 text-[10px]">{form.formState.errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-medium text-muted-foreground opacity-60">Obrázek (URL) - volitelně</Label>
                      </div>
                      <div className="flex gap-2">
                        <Input {...form.register("imageUrl")} placeholder="https://..." className="h-9 text-xs bg-slate-50/30 dark:bg-slate-950/30" />
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"><ImageIcon className="h-4 w-4 text-muted-foreground/60" /></Button>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-medium text-muted-foreground opacity-60">Text zprávy {watchedValues.isAbTesting && "(Var A)"} *</Label>
                        <span className={cn("text-[9px] font-semibold", watchedValues.body.length > 180 ? "text-amber-500" : "text-muted-foreground/30")}>
                          {watchedValues.body.length}/200
                        </span>
                      </div>
                      <div className="relative">
                        <Textarea 
                          {...form.register("body")} 
                          placeholder="Napište text zprávy..." 
                          maxLength={200} 
                          className="min-h-[120px] pb-8 text-xs bg-slate-50/30 dark:bg-slate-950/30 resize-none" 
                        />
                        <div className="absolute bottom-2 right-2">
                          <Popover open={showEmojiPicker === "body"} onOpenChange={(open) => setShowEmojiPicker(open ? "body" : null)}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6"><SmilePlus className="h-4 w-4" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end" side="left">
                              <EmojiPicker onEmojiClick={(e) => form.setValue("body", form.getValues("body") + e.emoji)} width={280} height={350} searchDisabled />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      {form.formState.errors.body && <p className="text-red-500 text-[10px]">{form.formState.errors.body.message}</p>}
                    </div>
                  </div>

                  {watchedValues.isAbTesting && (
                    <div className="space-y-6 pt-4 border-t border-dashed border-border/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-medium text-muted-foreground opacity-60">Nadpis zprávy (Varianta B) *</Label>
                          </div>
                          <div className="relative">
                            <Input {...form.register("titleB")} placeholder="Zadejte titulek B..." maxLength={60} className="h-9 pr-8 text-xs bg-slate-50/30 dark:bg-slate-950/30 focus:border-blue-500" />
                          </div>
                          {form.formState.errors.titleB && <p className="text-red-500 text-[10px]">{form.formState.errors.titleB.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-medium text-muted-foreground opacity-60">Text zprávy (Varianta B) *</Label>
                          </div>
                          <div className="relative">
                            <Textarea {...form.register("bodyB")} placeholder="Napište text zprávy B..." maxLength={200} className="min-h-[80px] pb-8 text-xs bg-slate-50/30 dark:bg-slate-950/30 resize-none focus:border-blue-500" />
                          </div>
                          {form.formState.errors.bodyB && <p className="text-red-500 text-[10px]">{form.formState.errors.bodyB.message}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <Label className="text-[10px] font-medium text-muted-foreground opacity-60">Cílová URL po kliknutí (volitelné)</Label>
                    <Input {...form.register("url")} placeholder="Např. /pracovnik/hledej nebo absolutní URL" className="h-9 text-xs bg-slate-50/30 dark:bg-slate-950/30" />
                  </div>
                </div>
              )}

              {/* KROK 2: Audience */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-sm font-bold border-b border-border/50 pb-2 mb-4">Základní Cílení</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Hlavní publikum</Label>
                      <Select value={watchedValues.target} onValueChange={(val: any) => form.setValue("target", val)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Všichni</SelectItem>
                          <SelectItem value="workers">Pracovníci</SelectItem>
                          <SelectItem value="customers">Zákazníci</SelectItem>
                          <SelectItem value="pro">PRO Členové</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Uživatelská role v profilu</Label>
                      <Select value={watchedValues.targetRole} onValueChange={(val) => form.setValue("targetRole", val)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Nefiltrovat</SelectItem>
                          <SelectItem value="workers">Pouze pracovníci</SelectItem>
                          <SelectItem value="customers">Pouze zákazníci</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold border-b border-border/50 pb-2 mt-6 mb-4">Pokročilá Segmentace</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Lokalita (Město)</Label>
                      <Select value={watchedValues.targetCity} onValueChange={(val) => form.setValue("targetCity", val)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Celá ČR</SelectItem>
                          <SelectItem value="praha">Praha</SelectItem>
                          <SelectItem value="brno">Brno</SelectItem>
                          <SelectItem value="ostrava">Ostrava</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Aktivita Uživatele</Label>
                      <Select value={watchedValues.targetActivity} onValueChange={(val) => form.setValue("targetActivity", val)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Všichni (bez ohledu na aktivitu)</SelectItem>
                          <SelectItem value="active_30">Aktivní (posledních 30 dní)</SelectItem>
                          <SelectItem value="inactive_30">Neaktivní (více než 30 dní)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* KROK 3: Review & Schedule */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-emerald-500" /> Souhrn Kampaně</h3>
                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <div className="text-muted-foreground">Publikum:</div>
                      <div className="font-semibold">{watchedValues.target === 'all' ? 'Všichni' : watchedValues.target}</div>
                      
                      <div className="text-muted-foreground">A/B Testování:</div>
                      <div className="font-semibold">{watchedValues.isAbTesting ? "Zapnuto (50/50 rozdělení)" : "Vypnuto"}</div>

                      <div className="text-muted-foreground">Filtry:</div>
                      <div className="font-semibold">Město: {watchedValues.targetCity}, Role: {watchedValues.targetRole}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" /> Naplánovat odeslání
                        </Label>
                        <p className="text-xs text-muted-foreground">Zpráva bude automaticky odeslána ve zvolený čas, místo okamžitě.</p>
                      </div>
                      <Switch 
                        checked={watchedValues.isScheduled} 
                        onCheckedChange={(val) => form.setValue("isScheduled", val)}
                      />
                    </div>
                    
                    {watchedValues.isScheduled && (
                      <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 pt-2">
                        <Label className="text-xs">Datum a čas odeslání *</Label>
                        <Input
                          type="datetime-local"
                          {...form.register("scheduledAt")}
                          className="max-w-xs h-9 text-xs"
                        />
                        {form.formState.errors.scheduledAt && <p className="text-red-500 text-[10px]">{form.formState.errors.scheduledAt.message}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={step === 1}
                  className="rounded-full px-6 text-xs h-9"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Zpět
                </Button>

                {step < 3 ? (
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => testMutation.mutate(watchedValues)} 
                      disabled={testMutation.isPending || !watchedValues.title || !watchedValues.body}
                      className="rounded-full px-6 text-[10px]"
                    >
                      Test na mě
                    </Button>
                    <Button 
                      type="button" 
                      onClick={nextStep}
                      className="rounded-full px-8 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Pokračovat <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => sendMutation.mutate({ isDraft: true, values: watchedValues })}
                      disabled={sendMutation.isPending}
                      className="rounded-full px-6 text-xs h-9"
                    >
                      Uložit koncept
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={sendMutation.isPending}
                      className="rounded-full px-8 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    >
                      {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      {watchedValues.isScheduled ? 'Naplánovat kampaň' : 'Odeslat ihned'}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <div className="hidden lg:block lg:col-span-1">
        <MobileLivePreview 
          title={watchedValues.title} 
          body={watchedValues.body} 
          imageUrl={watchedValues.imageUrl} 
        />
      </div>
    </div>
  );
}
