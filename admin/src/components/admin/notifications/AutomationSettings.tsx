import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Briefcase, MessageSquare, Settings, Zap, ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const eventLabels: Record<string, string> = {
  new_job: "Nová zakázka",
  new_message: "Nová zpráva",
  offer_accepted: "Nabídka přijata",
  job_completed: "Zakázka hotova",
  low_credits: "Nízký kredit",
};

export function AutomationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["admin-push-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_templates")
        .select("*")
        .order("event_key");
      if (error) throw error;
      return data;
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from("push_templates")
        .update({
          title: values.title,
          body: values.body,
          is_enabled: values.is_enabled,
          throttling_rule: values.throttling_rule,
          quiet_hours_enabled: values.quiet_hours_enabled,
          quiet_hours_start: values.quiet_hours_start,
          quiet_hours_end: values.quiet_hours_end
        })
        .eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Šablona uložena", description: "Změny se okamžitě projevily v systému." });
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["admin-push-templates"] });
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 m-0">
      <div className="space-y-3">
        {templatesLoading ? (
           Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-border/50" />
           ))
        ) : (
          templates?.map((t: any) => (
            <div key={t.id} className="group flex items-center justify-between p-4 border border-border/50 bg-card hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 shrink-0">
                  {t.event_key.includes('job') ? <Briefcase className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold">{eventLabels[t.event_key] || t.event_key}</span>
                    <code className="text-[9px] font-mono text-muted-foreground/60 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">key: {t.event_key}</code>
                  </div>
                  <p className="text-[10px] text-muted-foreground/80 leading-tight max-w-lg truncate">{t.title} - {t.body}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Switch checked={t.is_enabled} onCheckedChange={(val) => updateTemplateMutation.mutate({ ...t, is_enabled: val })} />
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-full h-8 px-4 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setEditingTemplate(t)}
                >
                  <Settings className="w-3.5 h-3.5 mr-2" />
                  Upravit
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Sheet open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <SheetContent className="sm:max-w-md w-full border-l border-border/50 bg-card overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-sm font-bold tracking-tight">Upravit automatizaci</SheetTitle>
                <SheetDescription className="text-[10px] font-semibold tracking-widest text-emerald-600/60 uppercase">
                  Událost: {editingTemplate?.event_key}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-semibold tracking-widest opacity-60">Titulek notifikace</Label>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {['worker_name', 'job_title', 'customer_name'].map(v => (
                        <Badge key={v} variant="outline" className="text-[8px] cursor-pointer hover:bg-emerald-50" onClick={() => setEditingTemplate({...editingTemplate, title: (editingTemplate.title || "") + `{{${v}}}`})}>+ {v}</Badge>
                      ))}
                    </div>
                  </div>
                  <Input 
                    id="template-title"
                    value={editingTemplate?.title || ""} 
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    className="h-9 bg-slate-50 dark:bg-slate-950 border-border/60 text-[12px] font-semibold tracking-tight rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-semibold tracking-widest opacity-60">Text zprávy (Body)</Label>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {['worker_name', 'credit_balance', 'job_title', 'customer_name'].map(v => (
                        <Badge key={v} variant="outline" className="text-[8px] cursor-pointer hover:bg-emerald-50" onClick={() => setEditingTemplate({...editingTemplate, body: (editingTemplate.body || "") + `{{${v}}}`})}>+ {v}</Badge>
                      ))}
                    </div>
                  </div>
                  <Textarea 
                    id="template-body"
                    value={editingTemplate?.body || ""} 
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    className="min-h-[120px] bg-slate-50 dark:bg-slate-950 border-border/60 text-[12px] leading-relaxed rounded-xl shadow-none resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Collapsible defaultOpen className="border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pokročilá nastavení</Label>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><ChevronDown className="h-4 w-4" /></Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-medium opacity-70">Pravidlo odesílání (Throttling / Batching)</Label>
                      <Select 
                        value={editingTemplate?.throttling_rule || "none"}
                        onValueChange={(val) => setEditingTemplate({ ...editingTemplate, throttling_rule: val })}
                      >
                        <SelectTrigger className="h-8 text-[10px] bg-white dark:bg-slate-950">
                          <SelectValue placeholder="Bez omezení" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Odeslat ihned (bez omezení)</SelectItem>
                          <SelectItem value="5m">Max 1 notifikace za 5 minut</SelectItem>
                          <SelectItem value="15m">Max 1 notifikace za 15 minut</SelectItem>
                          <SelectItem value="1h">Max 1 notifikace za 60 minut</SelectItem>
                          <SelectItem value="batch">Seskupit upozornění (Dávkování)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-bold">Tiché hodiny (Do Not Disturb)</Label>
                          <p className="text-[9px] text-muted-foreground">Zprávy se zařadí do fronty do rána.</p>
                        </div>
                        <Switch 
                          checked={editingTemplate?.quiet_hours_enabled} 
                          onCheckedChange={(val) => setEditingTemplate({ ...editingTemplate, quiet_hours_enabled: val })}
                        />
                      </div>
                      
                      {editingTemplate?.quiet_hours_enabled && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[9px] text-muted-foreground">Od</Label>
                            <Input 
                              type="time" 
                              value={editingTemplate?.quiet_hours_start || "22:00"} 
                              onChange={(e) => setEditingTemplate({ ...editingTemplate, quiet_hours_start: e.target.value })}
                              className="h-7 text-[10px] px-2 bg-white dark:bg-slate-950" 
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-[9px] text-muted-foreground">Do</Label>
                            <Input 
                              type="time" 
                              value={editingTemplate?.quiet_hours_end || "07:00"} 
                              onChange={(e) => setEditingTemplate({ ...editingTemplate, quiet_hours_end: e.target.value })}
                              className="h-7 text-[10px] px-2 bg-white dark:bg-slate-950" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>

          <SheetFooter className="gap-3 pt-6 mt-auto">
            <Button 
              variant="outline"
              onClick={() => setEditingTemplate(null)}
              className="rounded-full font-semibold text-[10px] tracking-widest h-8 px-8"
            >
              Zrušit
            </Button>
            <Button 
              onClick={() => updateTemplateMutation.mutate(editingTemplate)}
              disabled={updateTemplateMutation.isPending}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] tracking-widest h-8 px-10 shadow-md transition-all active:scale-95"
            >
              {updateTemplateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
              Uložit nastavení
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
