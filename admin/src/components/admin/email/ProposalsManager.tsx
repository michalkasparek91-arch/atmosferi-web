import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Plus, FileText, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProposalsManager() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    companyName: "",
    projectTitle: "",
    description: "",
    priceQuote: "",
    portfolioImages: "https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp, https://atmosferi.com/demos/atmosferi-viz/img/08-d28.webp"
  });

  const loadProposals = async () => {
    const { data, error } = await supabase.from("proposals").select("*").order("created_at", { ascending: false });
    if (!error && data) setProposals(data);
  };

  React.useEffect(() => {
    loadProposals();
  }, []);

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from("proposals").insert({
        client_name: form.clientName,
        company_name: form.companyName,
        project_title: form.projectTitle,
        description: form.description,
        price_quote: form.priceQuote,
        portfolio_images: form.portfolioImages.split(",").map(s => s.trim())
      });

      if (error) throw error;
      toast.success("Nabídka úspěšně vytvořena!");
      setIsCreating(false);
      setForm({
        clientName: "", companyName: "", projectTitle: "", description: "", priceQuote: "", portfolioImages: ""
      });
      loadProposals();
    } catch (e: any) {
      toast.error("Chyba při tvorbě nabídky: " + e.message);
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/nabidka/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Odkaz zkopírován do schránky!");
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Nabídky pro klienty</h2>
          <p className="text-xs text-muted-foreground">Generátor tajných URL pro vaše rozjednané zakázky.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nová nabídka
        </Button>
      </div>

      {isCreating && (
        <div className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-400">Vytvořit novou nabídku</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Jméno klienta</Label>
              <Input value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} placeholder="Petr Novák" className="h-9 text-xs bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Firma / Studio</Label>
              <Input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} placeholder="Studio Černý" className="h-9 text-xs bg-background" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Název zakázky</Label>
            <Input value={form.projectTitle} onChange={e => setForm({...form, projectTitle: e.target.value})} placeholder="Web pro Studio Černý" className="h-9 text-xs bg-background" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Popis rozsahu a návrh řešení</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Vytvoříme pro vás 5 vizualizací..." className="min-h-[100px] text-xs bg-background" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Cena / Rozpočet</Label>
            <Input value={form.priceQuote} onChange={e => setForm({...form, priceQuote: e.target.value})} placeholder="25 000 Kč bez DPH" className="h-9 text-xs bg-background" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Odkazy na referenční fotky (oddělené čárkou)</Label>
            <Textarea value={form.portfolioImages} onChange={e => setForm({...form, portfolioImages: e.target.value})} placeholder="https://..., https://..." className="min-h-[60px] text-xs bg-background" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-emerald-500/20">
            <Button variant="ghost" onClick={() => setIsCreating(false)} className="h-9 text-xs font-bold">Zrušit</Button>
            <Button onClick={handleCreate} className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs">Uložit nabídku</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {proposals.map(p => (
          <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:border-emerald-500/30 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">{p.project_title}</h4>
                <p className="text-xs text-muted-foreground">{p.client_name} ({p.company_name})</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  <span>{new Date(p.created_at).toLocaleDateString("cs-CZ")}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Zobrazeno {p.view_count}x</span>
                  <span className={`px-2 py-0.5 rounded-full border ${p.status === 'accepted' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/10' : 'border-border'}`}>{p.status}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => copyLink(p.id)} className="h-8 gap-1.5 text-xs font-bold">
                <Copy className="w-3.5 h-3.5" /> Kopírovat odkaz
              </Button>
            </div>
          </div>
        ))}
        {proposals.length === 0 && !isCreating && (
          <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-3xl">
            Zatím nemáte vytvořené žádné nabídky.
          </div>
        )}
      </div>
    </div>
  );
}
