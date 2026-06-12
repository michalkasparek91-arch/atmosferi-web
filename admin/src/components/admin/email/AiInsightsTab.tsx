import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Star, MessageSquare, Briefcase, Zap, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const AiInsightsTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: insightsData, isLoading, refetch } = useQuery({
    queryKey: ["admin-ai-insights", searchTerm, page],
    queryFn: async () => {
      let query = supabase.from("unified_contacts").select("*", { count: 'exact' })
        .not("icebreaker", "is", null)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      }

      const { data, count, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], totalCount: count || 0 };
    },
  });

  const contacts = insightsData?.data || [];
  const totalCount = insightsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card/40 p-4 rounded-3xl border border-border/50 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center border border-amber-500/30 shadow-inner">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground">AI Zjištění (Sniper)</h2>
            <p className="text-xs text-muted-foreground font-medium">Správa vygenerovaných Icebreakerů a dat od umělé inteligence.</p>
          </div>
        </div>

        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Hledat kontakt..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/60 rounded-xl h-10 focus-visible:ring-amber-500/30"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500/60 mb-4" />
          <p className="text-sm text-muted-foreground font-medium">Načítám AI zjištění...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-3xl border border-border/50 border-dashed">
          <p className="text-sm text-muted-foreground font-medium">Zatím zde nejsou žádná AI data (nebo neodpovídají hledání).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contacts.map((contact: any) => (
            <InsightCard key={contact.id} contact={contact} onSaved={refetch} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-xl h-9">
            Předchozí
          </Button>
          <span className="text-xs font-bold text-muted-foreground">Strana {page + 1} z {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="rounded-xl h-9">
            Další
          </Button>
        </div>
      )}
    </div>
  );
};

const InsightCard = ({ contact, onSaved }: { contact: any, onSaved: () => void }) => {
  const [icebreaker, setIcebreaker] = useState(contact.icebreaker || contact.ai_icebreaker || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSave = async () => {
    if (icebreaker === contact.icebreaker) return;
    setIsSaving(true);
    try {
      if (contact.outbox_id) {
        const { error } = await supabase.from("email_outbox").update({ icebreaker }).eq("id", contact.outbox_id);
        if (error) throw error;
      } else {
        const insertData: any = {
          template_slug: "sniper-a-zvrdavost",
          icebreaker: icebreaker,
          status: "draft"
        };
        if (contact.contact_source === "registered") {
          insertData.worker_id = contact.id;
        } else {
          insertData.lead_id = contact.id;
        }
        const { error } = await supabase.from("email_outbox").insert(insertData);
        if (error) throw error;
      }
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
      onSaved();
    } catch (e: any) {
      toast.error("Chyba při ukládání: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card/50 rounded-2xl group">
      <div className="p-4 border-b border-border/30 bg-muted/20 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-foreground truncate">{contact.full_name || contact.company_name || "Neznámý kontakt"}</h3>
          <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">{contact.email}</p>
        </div>
        {contact.premium_score > 0 && (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0 gap-1 rounded-lg px-2 text-[10px]">
            <Star className="h-3 w-3" /> {contact.premium_score}
          </Badge>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" /> Úvodní oslovení (Icebreaker)
          </label>
          <div className="relative">
            <textarea 
              value={icebreaker}
              onChange={e => setIcebreaker(e.target.value)}
              onBlur={handleSave}
              className="w-full h-24 bg-background/50 border border-border/80 rounded-xl p-3 text-xs leading-relaxed font-medium focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40 outline-none resize-none transition-all group-hover:bg-background/80"
              placeholder="Zde bude AI vygenerovaný úvod zprávy..."
            />
            {isSaving && (
              <div className="absolute right-2 bottom-2 bg-background/80 backdrop-blur rounded p-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
              </div>
            )}
            {isSuccess && (
              <div className="absolute right-2 bottom-2 bg-emerald-500/10 text-emerald-500 rounded p-1 animate-in zoom-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>

        {contact.company_description && (
          <div className="space-y-1 mt-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3 w-3" /> Bio / Popis
            </label>
            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {contact.company_description}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
