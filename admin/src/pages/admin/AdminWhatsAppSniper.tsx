import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { MessageSquare, Send, CheckCircle2, Clock, Settings2, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WhatsAppMessage {
  id: string;
  created_at: string;
  phone_number: string;
  ai_message: string;
  status: string;
}

export default function AdminWhatsAppSniper() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, ready: 0, no_whatsapp: 0, sent: 0 });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isPromptLoading, setIsPromptLoading] = useState(true);
  const [isPromptSaving, setIsPromptSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const defaultPrompt = `Jsi asistentka Zrobee. Přišla nová zakázka a my chceme obeslat řemeslníky. Napiš krátkou SMS/Push notifikaci a krátký text e-mailu pro tuto zakázku. Mluv neformálně, ale profesionálně a osobně, jako by to byla zpráva od milé asistentky. Místo jména použij PŘESNĚ zástupný znak "{jmeno}".
Příklad dobré notifikace: "Dobrý den {jmeno}, paní Nováková z Prahy 4 právě poptala opravu kotle na zítřek. Máte volno?"

Název zakázky: {{job_title}}
Město: {{job_city}}
Popis: {{job_description}}

Vrať POUZE validní JSON v tomto formátu (bez markdownových bloků):
{
  "pushTitle": "Krátký lákavý nadpis notifikace (max 50 znaků)",
  "pushBody": "Krátký text push notifikace oslovující {jmeno} (max 150 znaků)",
  "emailSubject": "Atraktivní předmět e-mailu",
  "emailBody": "Lákavý a osobní text e-mailu pro {jmeno} (2-3 věty)"
}`;

  const fetchPrompt = async () => {
    setIsPromptLoading(true);
    const { data, error } = await supabase.from('platform_settings').select('value').eq('key', 'ai_prompt_sniper').maybeSingle();
    if (!error && data?.value && (data.value as any).prompt) {
      setAiPrompt((data.value as any).prompt);
    } else {
      setAiPrompt(defaultPrompt);
    }
    setIsPromptLoading(false);
  };

  const handleSavePrompt = async () => {
    setIsPromptSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    
    // Check if exists first since upsert might need all columns
    const { data: existing } = await supabase.from('platform_settings').select('id').eq('key', 'ai_prompt_sniper').maybeSingle();
    
    let err;
    if (existing) {
      const { error } = await supabase.from('platform_settings').update({
        value: { prompt: aiPrompt },
        updated_at: new Date().toISOString(),
        updated_by: userData.user?.id
      }).eq('key', 'ai_prompt_sniper');
      err = error;
    } else {
      const { error } = await supabase.from('platform_settings').insert({
        key: 'ai_prompt_sniper',
        value: { prompt: aiPrompt },
        updated_by: userData.user?.id
      });
      err = error;
    }

    if (err) {
      toast({ title: 'Chyba', description: 'Nepodařilo se uložit nastavení promptu.', variant: 'destructive' });
    } else {
      toast({ title: 'Uloženo', description: 'AI Prompt byl úspěšně uložen.' });
    }
    setIsPromptSaving(false);
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.from('whatsapp_outbox').select('status');
      if (error) throw error;
      const counts = { pending: 0, ready: 0, no_whatsapp: 0, sent: 0 };
      data.forEach(r => {
        if (r.status === 'pending_verification') counts.pending++;
        else if (r.status === 'ready_for_admin') counts.ready++;
        else if (r.status === 'no_whatsapp') counts.no_whatsapp++;
        else if (r.status === 'sent') counts.sent++;
      });
      setStats(counts);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const fetchReadyMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_outbox')
        .select('*')
        .eq('status', 'ready_for_admin')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }
      setMessages(data || []);
    } catch (error: any) {
      toast({ 
        title: 'Chyba při načítání', 
        description: error.message || 'Nepodařilo se načíst zprávy.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyMessages();
    fetchStats();
    fetchPrompt();
    
    const channel = supabase
      .channel('whatsapp_outbox_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_outbox' },
        (payload: any) => {
           // Reload stats on any change
           fetchStats();

           // Handle new ready messages
           if (payload.new && payload.new.status === 'ready_for_admin') {
             setMessages((prev) => {
               const exists = prev.find(p => p.id === payload.new.id);
               if (exists) return prev;
               return [...prev, payload.new as WhatsAppMessage];
             });
           }
           // Remove messages that are no longer ready
           if (payload.new && payload.new.status !== 'ready_for_admin') {
             setMessages((prev) => prev.filter(p => p.id !== payload.new.id));
           }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSend = async (msg: WhatsAppMessage) => {
    // 1. Open WhatsApp tab immediately to not block the browser popup blocker
    const encodedText = encodeURIComponent(msg.ai_message);
    const formattedNumber = msg.phone_number.replace(/\D/g, '');
    const waUrl = `https://wa.me/${formattedNumber}?text=${encodedText}`;
    window.open(waUrl, '_blank');

    // 2. Update status in database
    const { error } = await supabase
      .from('whatsapp_outbox')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', msg.id);

    if (error) {
      toast({ title: 'Chyba', description: 'Zpráva se neoznačila jako odeslaná.', variant: 'destructive' });
      return;
    }

    // 3. Invalidate/Remove from local state immediately
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    toast({ title: 'Odesláno', description: 'WhatsApp okno bylo otevřeno.', action: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminPageHeader
          icon={MessageSquare}
          title="WhatsApp Sniper"
          subtitle="Odesílání automatizovaných zpráv na WhatsApp"
        />
        <Button 
          variant="outline" 
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings2 className="w-4 h-4" />
          Nastavení AI
          {showSettings ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      {showSettings && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              AI Prompt pro Sniper Kampaň
            </CardTitle>
            <CardDescription>
              Tento systémový prompt řídí, jak Gemini AI píše notifikace (WhatsApp, Push, E-mail).<br/>
              Můžete použít značky pro data zakázky: <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-xs font-semibold">{`{{job_title}}`}</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-xs font-semibold">{`{{job_city}}`}</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-xs font-semibold">{`{{job_description}}`}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isPromptLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Načítám prompt...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Znění systémového promptu</Label>
                  <Textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-[300px] font-mono text-xs bg-muted/30"
                    placeholder="Zadejte instrukce pro AI..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setAiPrompt(defaultPrompt)}>
                    Vrátit výchozí
                  </Button>
                  <Button onClick={handleSavePrompt} disabled={isPromptSaving} className="gap-2">
                    {isPromptSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Uložit nastavení
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 flex flex-col justify-center">
          <div className="text-sm font-medium text-muted-foreground">Ve frontě bota</div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex flex-col justify-center">
          <div className="text-sm font-medium text-muted-foreground">Připraveno k odeslání</div>
          <div className="text-2xl font-bold text-blue-600">{stats.ready}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex flex-col justify-center">
          <div className="text-sm font-medium text-muted-foreground">Nemá WA (Do E-mailu)</div>
          <div className="text-2xl font-bold text-orange-600">{stats.no_whatsapp}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex flex-col justify-center">
          <div className="text-sm font-medium text-muted-foreground">Odesláno vámi</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.sent}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Telefonní číslo</TableHead>
              <TableHead>Náhled zprávy</TableHead>
              <TableHead className="w-[150px]">Vytvořeno</TableHead>
              <TableHead className="text-right w-[150px]">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Načítám...
                  </div>
                </TableCell>
              </TableRow>
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  Žádné zprávy nečekají na odeslání.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium font-mono">{msg.phone_number}</TableCell>
                  <TableCell>
                    <div className="max-w-2xl text-xs text-muted-foreground truncate" title={msg.ai_message || 'Zpráva se generuje...'}>
                      {msg.ai_message || <span className="italic text-yellow-600">Zpráva se generuje pomocí AI...</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleString('cs-CZ')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleSend(msg)} className="gap-2" disabled={!msg.ai_message}>
                      <Send className="h-3.5 w-3.5" />
                      Odeslat
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
