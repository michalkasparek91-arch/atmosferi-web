import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, Smartphone, Loader2, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getNotificationPermission } from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

export function DiagnosticsPanel() {
  const { toast } = useToast();
  const [debugEmail, setDebugEmail] = useState("");
  const [debugData, setDebugData] = useState<any>(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const invalidateTokenMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Odstraněno", description: "Zařízení bylo odebráno ze seznamu odběratelů." });
      runDiagnostics();
    },
    onError: (err: any) => toast({ title: "Chyba", description: err.message, variant: "destructive" })
  });

  const deviceTestPushMutation = useMutation({
    mutationFn: async (sub: any) => {
      const { error } = await supabase.functions.invoke("test-push-notification", {
        body: { subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } } },
      });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Odesláno", description: "Testovací zpráva byla odeslána na zařízení." }),
    onError: (err: any) => toast({ title: "Chyba", description: err.message, variant: "destructive" })
  });

  const runDiagnostics = async () => {
    if (!debugEmail) return;
    setIsDebugLoading(true);
    setDebugData(null);
    const trimmedEmail = debugEmail.trim().toLowerCase();
    
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('id, full_name, email, push_notifications')
        .eq('email', trimmedEmail)
        .maybeSingle();

      const { data: profile, error: profileError } = await Promise.race([
        profilePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile query timeout')), 5000))
      ]) as any;

      if (profileError) throw profileError;
      if (!profile) {
        toast({ title: "Uživatel nenalezen", variant: "destructive" });
        setIsDebugLoading(false);
        return;
      }

      setDebugData({ profile, subs: null, receipts: null });

      const subsPromise = supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      const { data: subs, error: subsError } = await Promise.race([
        subsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Subscriptions query timeout')), 5000))
      ]) as any;

      if (subsError) throw subsError;
      setDebugData((prev: any) => ({ ...prev, subs }));

      const subIds = subs?.map((s: any) => s.id) || [];
      const receiptsPromise = supabase
        .from('push_receipts')
        .select('*')
        .or(subIds.length > 0 
          ? `subscription_id.in.(${subIds.join(',')}),note.ilike.%[${profile.id}]%` 
          : `note.ilike.%[${profile.id}]%`
        )
        .order('created_at', { ascending: false })
        .limit(40);

      const { data: receipts, error: receiptsError } = await Promise.race([
        receiptsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Receipts query timeout')), 5000))
      ]) as any;

      if (receiptsError) throw receiptsError;
      setDebugData((prev: any) => ({ ...prev, receipts }));
      toast({ title: "Data načtena", description: `Nalezeno ${subs?.length || 0} zařízení.` });
    } catch (err: any) {
      toast({ title: "Chyba diagnostiky", description: err.message, variant: "destructive" });
    } finally {
      setIsDebugLoading(false);
    }
  };

  const sendDirectTest = async (isRaw: boolean) => {
    if (!debugEmail) return;
    setIsTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-push-notification', {
        body: { 
          raw: isRaw,
          userId: debugData?.profile?.id
        }
      });
      if (error) throw error;
      toast({ 
        title: isRaw ? "Raw push odeslán" : "Testovací push odeslán", 
        description: `Odesláno na ${data.sent} zařízení.` 
      });
      setTimeout(runDiagnostics, 1500);
    } catch (err: any) {
      toast({ title: "Chyba při odesílání", description: err.message, variant: "destructive" });
    } finally {
      setIsTestLoading(false);
    }
  };

  return (
    <Card className="border border-border/50 shadow-none overflow-hidden bg-card rounded-xl m-0">
      <CardHeader className="p-6 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Diagnostika zařízení</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="relative max-w-xl mx-auto mb-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input 
              id="diag-email"
              placeholder="Hledat zařízení podle emailu uživatele..."
              value={debugEmail}
              onChange={(e) => setDebugEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && debugEmail && runDiagnostics()}
              className="h-12 pl-12 pr-32 text-xs rounded-full border-border/60 bg-muted/20 focus-visible:ring-1 focus-visible:ring-emerald-500/30 shadow-none transition-all"
            />
            <Button 
              onClick={runDiagnostics}
              disabled={isDebugLoading || !debugEmail}
              className="absolute right-1.5 top-1.5 h-9 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-black font-semibold text-[10px] px-6 shadow-none transition-all"
            >
              {isDebugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Vyhledat"}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="h-12 rounded-full border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4"
              onClick={async () => {
                if (!('serviceWorker' in navigator)) {
                  toast({ title: "Chyba", description: "SW nepodporován.", variant: "destructive" });
                  return;
                }
                if (Notification.permission !== "granted") {
                  toast({ title: "Chyba", description: "Práva na notifikace nejsou udělena.", variant: "destructive" });
                  return;
                }
                try {
                  let reg = await navigator.serviceWorker.getRegistration();
                  if (!reg) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    if (regs.length > 0) {
                      reg = regs[0];
                    } else {
                      toast({ title: "Chyba", description: "Service Worker nenalezen ani přes getRegistrations. Musíte v Nastavení zapnout Push notifikace.", variant: "destructive" });
                      return;
                    }
                  }
                  await reg.showNotification("Úspěch! Lokální test", {
                    body: "Service worker a OS notifikace fungují.",
                    icon: "/icons/icon-192x192.png"
                  });
                  toast({ title: "Lokální push zobrazen", description: "Měla by se ukázat notifikace na vašem zařízení." });
                } catch (e: any) {
                  toast({ title: "Chyba při zobrazení", description: e.message, variant: "destructive" });
                }
              }}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Lokální Test (Nativní API)
            </Button>
          </div>
        </div>

        {debugData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                  <Smartphone className="w-3 h-3 text-blue-500" /> Registrovaná zařízení ({debugData.subs?.length || 0})
                </h4>
                <Badge variant="outline" className={cn("text-[9px] font-semibold tracking-wider bg-slate-50 text-slate-600")}>
                  TENTO PROHLÍŽEČ: {getNotificationPermission().toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-3">
                {debugData.subs === null ? (
                   <div className="p-8 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
                ) : debugData.subs.length === 0 ? (
                  <div className="py-6 px-4 text-center border-2 border-dashed border-rose-500/30 bg-rose-500/5 rounded-2xl text-[10px] text-muted-foreground space-y-3">
                    <p className="font-bold text-rose-600">Žádná registrovaná zařízení!</p>
                  </div>
                ) : debugData.subs.map((sub: any) => (
                  <div key={sub.id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/40 border border-border/80 shadow-sm flex flex-col gap-3 transition-all hover:border-blue-500/30">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <p className="text-[11px] font-bold text-foreground mb-0.5 truncate">{sub.device_name || "Neznámé zařízení"}</p>
                        <p className="text-[9px] font-medium text-muted-foreground opacity-60 uppercase">{format(new Date(sub.created_at), "d. M. yyyy HH:mm")}</p>
                      </div>
                      <Badge variant="outline" className="text-[8px] bg-blue-50 text-blue-600 border-blue-100 shrink-0">AKTIVNÍ</Badge>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/50 text-[10px] text-muted-foreground/70 font-mono break-all line-clamp-2">
                      {sub.endpoint}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" size="sm" 
                        onClick={() => deviceTestPushMutation.mutate(sub)}
                        disabled={deviceTestPushMutation.isPending}
                        className="h-7 text-[10px] flex-1 rounded-lg"
                      >
                        {deviceTestPushMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Smartphone className="w-3 h-3 mr-1.5" />}
                        Ping Zařízení
                      </Button>
                      <Button 
                        variant="outline" size="sm" 
                        onClick={() => invalidateTokenMutation.mutate(sub.endpoint)}
                        className="h-7 text-[10px] rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 bg-white"
                      >
                        Smazat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                  <Activity className="w-3 h-3 text-emerald-500" /> Logy (posledních 40)
                </h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 rounded-md" onClick={() => sendDirectTest(true)} disabled={isTestLoading}>
                    RAW PING
                  </Button>
                  <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 rounded-md bg-blue-50 text-blue-600 border-blue-200" onClick={() => sendDirectTest(false)} disabled={isTestLoading}>
                    STANDARD PUSH
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={runDiagnostics}><RotateCw className="w-3 h-3 text-muted-foreground" /></Button>
                </div>
              </div>

              {debugData.receipts === null ? (
                <div className="p-8 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
              ) : debugData.receipts.length === 0 ? (
                <div className="py-8 text-center text-[10px] text-muted-foreground bg-slate-50 rounded-2xl border border-dashed border-border/50">Žádné logy pro tohoto uživatele v historii.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {debugData.receipts.map((r: any) => (
                    <div key={r.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-border/40 flex justify-between items-center">
                      <div>
                        <Badge className={cn(
                          "text-[8px] font-bold px-1.5 h-4 rounded-lg mb-1 border-none",
                          r.note === 'push-event-received' ? 'bg-blue-100 text-blue-700' : 
                          r.note === 'notification-shown' ? 'bg-emerald-100 text-emerald-700' :
                          r.note === 'notification-clicked' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'
                        )}>
                          {r.note?.includes('click') ? 'KLIKNUTÍ' : r.note?.includes('shown') ? 'ZOBRAZENÍ' : r.note?.includes('received') ? 'PŘÍJEM' : 'OSTATNÍ'}
                        </Badge>
                        <p className="text-[9px] font-medium text-muted-foreground opacity-60">{format(new Date(r.created_at), "d. M. HH:mm:ss")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
