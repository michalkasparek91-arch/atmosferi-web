import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Check, Copy, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * Replies from the michal@atmosferi.com mailbox.
 * The sync-inbox function reads the mailbox every 10 minutes and sorts messages into
 * replies (with AI sentiment and a suggested answer), bounces and automatic replies.
 */

const SENTIMENT: Record<string, { label: string; cls: string }> = {
  interested:  { label: "Zájem",        cls: "bg-black text-white" },
  positive:    { label: "Zájem",        cls: "bg-black text-white" },
  question:    { label: "Dotaz",        cls: "bg-neutral-800 text-white" },
  not_now:     { label: "Teď ne",       cls: "bg-neutral-200 text-neutral-700" },
  negative:    { label: "Odmítnutí",    cls: "bg-neutral-200 text-neutral-700" },
  unsubscribe: { label: "Odhlášení",    cls: "border border-red-200 text-red-600" },
  bounce:      { label: "Nedoručeno",   cls: "border border-red-200 text-red-600" },
  soft_bounce: { label: "Dočasně nedoručeno", cls: "bg-neutral-100 text-neutral-500" },
  auto:        { label: "Automatická",  cls: "bg-neutral-100 text-neutral-500" },
  other:       { label: "Ostatní",      cls: "bg-neutral-100 text-neutral-600" },
};
const VIEWS = [
  { id: "unread", label: "Nepřečtené" },
  { id: "replies", label: "Všechny odpovědi" },
  { id: "bounce", label: "Nedoručené" },
  { id: "auto", label: "Automatické" },
] as const;
type View = typeof VIEWS[number]["id"];

const when = (iso: string) => new Date(iso).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

export default function EmailRepliesInbox() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<View>("unread");
  const [syncing, setSyncing] = useState(false);

  const { data: replies = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["email-replies", view],
    queryFn: async () => {
      let q = db.from("email_replies").select("*").order("created_at", { ascending: false }).limit(200);
      if (view === "unread") q = q.eq("kind", "reply").eq("status", "unread");
      if (view === "replies") q = q.eq("kind", "reply");
      if (view === "bounce") q = q.eq("kind", "bounce");
      if (view === "auto") q = q.eq("kind", "auto");
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: sync } = useQuery({
    queryKey: ["inbox-sync-state"],
    queryFn: async () => {
      const { data, error } = await db.from("email_inbox_sync_state").select("*").eq("id", 1).maybeSingle();
      if (error) return { missing: true } as any;
      return data as null | { missing?: boolean; last_run_at: string | null; last_error: string | null; replies_total: number; bounces_total: number };
    },
    refetchInterval: syncing ? 3000 : 60000,
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await db.from("email_replies").update({ status }).eq("id", id);
    if (error) { toast.error("Nepodařilo se uložit: " + error.message); return; }
    qc.invalidateQueries({ queryKey: ["email-replies"] });
    qc.invalidateQueries({ queryKey: ["replies-unread-nav"] });
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-inbox", { body: {} });
      if (error) {
        let m = error.message;
        try { m = (await (error as any).context?.json())?.error || m; } catch { /* keep message */ }
        throw new Error(m);
      }
      toast.success(`Prošlo ${data?.scanned ?? 0} zpráv: ${data?.replies ?? 0} odpovědí, ${data?.bounces ?? 0} nedoručených (${data?.blocked ?? 0} adres zablokováno), ${data?.auto ?? 0} automatických.${data?.more ? " Zbytek schránky se načte v dalších kolech (každých 10 minut)." : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Načtení schránky selhalo");
    } finally {
      setSyncing(false);
      qc.invalidateQueries({ queryKey: ["email-replies"] });
      qc.invalidateQueries({ queryKey: ["inbox-sync-state"] });
      qc.invalidateQueries({ queryKey: ["replies-unread-nav"] });
    }
  };

  const openReply = (r: any) => {
    const next = openId === r.id ? null : r.id;
    setOpenId(next);
    if (next) {
      setDraft(r.ai_draft_reply || "");
      if (r.status === "unread") setStatus(r.id, "read");
    }
  };

  // The answer goes out from your own mail client, so the conversation stays in one thread.
  const openInMailClient = (r: any) => {
    const subject = /^re:/i.test(r.subject || "") ? r.subject : `Re: ${r.subject || ""}`;
    window.location.href = `mailto:${encodeURIComponent(r.from_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
    setStatus(r.id, "replied");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] bg-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-medium">Schránka michal@atmosferi.com</div>
          <div className="text-xs text-muted-foreground mt-1">
            Načítá se automaticky každých 10 minut. Nic se v ní neoznačuje jako přečtené.
            {sync?.last_run_at && <> Naposledy {when(sync.last_run_at)}.</>}
            {sync && !sync.missing && <> Celkem {sync.replies_total} odpovědí, {sync.bounces_total} nedoručených.</>}
          </div>
          {sync?.missing && (
            <div className="text-xs text-red-600 mt-1 flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />V databázi chybí migrace 20261125090000_inbox_sync.sql. Spusť ji v Supabase SQL Editoru, jinak se schránka nenačte.</div>
          )}
          {sync && !sync.missing && sync.last_run_at === null && !sync.last_error && !syncing && (
            <div className="text-xs text-muted-foreground mt-1">Schránka se ještě nenačetla. Klikni na „Načíst teď“.</div>
          )}
          {sync?.last_error?.startsWith("Probíhá") && (
            <div className="text-xs text-muted-foreground mt-1">{sync.last_error}{!syncing && " (pokud se to dlouho nemění, běh byl přerušen; zkus Načíst teď znovu)"}</div>
          )}
          {sync?.last_error && !sync.last_error.startsWith("Probíhá") && (
            <div className="text-xs text-red-600 mt-1 flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />{sync.last_error}</div>
          )}
        </div>
        <Button size="sm" onClick={() => void syncNow()} disabled={syncing}>
          {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}{syncing ? "Načítám…" : "Načíst teď"}
        </Button>
      </div>

      <div className="rounded-[20px] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {VIEWS.map(v => (
              <Button key={v.id} size="sm" variant={view === v.id ? "default" : "outline"} onClick={() => { setView(v.id); setOpenId(null); }}>{v.label}</Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Obnovit seznam">
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>

        {view === "bounce" && (
          <p className="text-xs text-muted-foreground mb-3">Trvale nedoručitelné adresy se automaticky blokují pro všechny kampaně a agentury se přepnou na „Neoslovovat“. Dočasné chyby (plná schránka apod.) se jen zaznamenají.</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : replies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {view === "unread" ? "Žádné nepřečtené odpovědi." : view === "bounce" ? "Žádné nedoručené e-maily." : view === "auto" ? "Žádné automatické odpovědi." : "Zatím žádné odpovědi."}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {replies.map((r: any) => {
              const s = SENTIMENT[r.ai_sentiment] || SENTIMENT.other;
              const isOpen = openId === r.id;
              const isReply = (r.kind || "reply") === "reply";
              return (
                <li key={r.id}>
                  <button type="button" className={`w-full text-left flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-neutral-50 ${isOpen ? "bg-neutral-50" : ""}`} onClick={() => openReply(r)}>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${r.status === "unread" ? "bg-foreground" : ""}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm truncate ${r.status === "unread" ? "font-semibold" : ""}`}>{r.kind === "bounce" ? r.bounced_email : (r.from_name || r.from_email)}</span>
                      <span className="block text-xs text-muted-foreground truncate">{r.subject || "(bez předmětu)"}</span>
                    </span>
                    <span className={`text-[11px] rounded-full px-2 py-0.5 shrink-0 ${s.cls}`}>{s.label}</span>
                    {r.status === "replied" && <span className="text-[11px] rounded-full px-2 py-0.5 shrink-0 bg-neutral-100">odpovězeno</span>}
                    <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">{when(r.received_at || r.created_at)}</span>
                  </button>

                  {isOpen && (
                    <div className="px-2 pb-4 pt-1 space-y-3">
                      <div className="text-sm whitespace-pre-line rounded-xl bg-neutral-50 p-3 max-h-64 overflow-y-auto">{r.body_text || "(prázdné)"}</div>
                      {isReply && (
                        <>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Návrh odpovědi, před odesláním si ho projdi</div>
                            <Textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" onClick={() => openInMailClient(r)}><Mail /> Otevřít v e-mailu</Button>
                            <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(draft); toast.success("Zkopírováno"); }}><Copy /> Kopírovat</Button>
                            <Button size="sm" variant="outline" onClick={() => { void setStatus(r.id, "done"); setOpenId(null); }}><Check /> Vyřízeno</Button>
                            <span className="text-xs text-muted-foreground ml-auto">{r.from_email}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
