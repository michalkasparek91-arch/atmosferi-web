import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Inbox, Mail, Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Schránka příchozích odpovědí.
 * Tabulku email_replies plní webhook email-reply-webhook včetně návrhu
 * odpovědi (ai_draft_reply) a sentimentu — dosud k ní ale neexistovalo UI,
 * takže odpovědi od oslovených firem nikdo neviděl.
 */

const SENTIMENT: Record<string, { label: string; cls: string }> = {
  positive:    { label: "Zájem",      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  interested:  { label: "Zájem",      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  question:    { label: "Dotaz",      cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  negative:    { label: "Odmítnutí",  cls: "bg-red-500/10 text-red-600 border-red-500/30" },
  unsubscribe: { label: "Odhlášení",  cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  other:       { label: "Ostatní",    cls: "bg-muted text-muted-foreground border-border" },
};

export default function EmailRepliesInbox() {
  // email_replies zatím není ve vygenerovaných typech Supabase (tabulka v DB
  // existuje, typy se po ní neregenerovaly), proto netypovaný přístup.
  const db = supabase as any;
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [filter, setFilter] = useState<"unread" | "all">("unread");

  const { data: replies = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["email-replies", filter],
    queryFn: async () => {
      let q = db.from("email_replies").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter === "unread") q = q.eq("status", "unread");
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const unreadCount = replies.filter((r: any) => r.status === "unread").length;

  const setStatus = async (id: string, status: string) => {
    const { error } = await db.from("email_replies").update({ status }).eq("id", id);
    if (error) { toast.error("Nepodařilo se uložit: " + error.message); return; }
    qc.invalidateQueries({ queryKey: ["email-replies"] });
  };

  const openReply = (r: any) => {
    const next = openId === r.id ? null : r.id;
    setOpenId(next);
    if (next) {
      setDraft(r.ai_draft_reply || "");
      if (r.status === "unread") setStatus(r.id, "read");
    }
  };

  // Odpověď se odesílá z vlastního klienta — e-mail tím odejde z adresy,
  // na kterou firma psala, a drží se vlákno konverzace.
  const openInMailClient = (r: any) => {
    const subject = r.subject?.startsWith("Re:") ? r.subject : `Re: ${r.subject || ""}`;
    window.location.href =
      `mailto:${encodeURIComponent(r.from_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
    setStatus(r.id, "replied");
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-sky-500" />
            Příchozí odpovědi
            {unreadCount > 0 && (
              <Badge className="bg-sky-500/15 text-sky-600 border-sky-500/30">{unreadCount} nepřečtených</Badge>
            )}
          </CardTitle>
          <CardDescription>Odpovědi na oslovení včetně připraveného návrhu reakce</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs"
                  onClick={() => setFilter(filter === "unread" ? "all" : "unread")}>
            {filter === "unread" ? "Zobrazit vše" : "Jen nepřečtené"}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} title="Načíst znovu">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : replies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {filter === "unread" ? "Žádné nepřečtené odpovědi." : "Zatím žádné odpovědi."}
          </p>
        ) : (
          <div className="rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
            {replies.map((r: any) => {
              const s = SENTIMENT[r.ai_sentiment] || SENTIMENT.other;
              const isOpen = openId === r.id;
              return (
                <div key={r.id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 ${isOpen ? "bg-muted/25" : ""} ${r.status === "unread" ? "font-medium" : ""}`}
                    onClick={() => openReply(r)}
                  >
                    {r.status === "unread"
                      ? <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                      : <span className="h-2 w-2 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{r.from_name || r.from_email}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.subject || "(bez předmětu)"}</div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${s.cls}`}>{s.label}</Badge>
                    {r.status === "replied" && (
                      <Badge variant="outline" className="text-[10px] shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        odpovězeno
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
                      {new Date(r.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 bg-muted/10 space-y-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Zpráva</div>
                        <div className="text-xs whitespace-pre-line bg-background rounded-lg border border-border/40 p-3 max-h-56 overflow-y-auto">
                          {r.body_text || "(prázdné)"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Návrh odpovědi — před odesláním si ho projdi
                        </div>
                        <Textarea rows={6} className="text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => openInMailClient(r)}>
                          <Mail className="h-3.5 w-3.5" /> Otevřít v e-mailu
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                                onClick={() => { navigator.clipboard.writeText(draft); toast.success("Zkopírováno"); }}>
                          <Copy className="h-3.5 w-3.5" /> Kopírovat
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                                onClick={() => { setStatus(r.id, "done"); setOpenId(null); }}>
                          <Check className="h-3.5 w-3.5" /> Vyřízeno
                        </Button>
                        <span className="text-[11px] text-muted-foreground ml-auto">{r.from_email}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
