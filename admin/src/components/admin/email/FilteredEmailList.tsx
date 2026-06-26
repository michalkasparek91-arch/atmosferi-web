import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Send, MailOpen, MousePointer2, Trophy, Mail, Loader2,
  AlertCircle, ShieldAlert, UserMinus, Trash2, Clock, CheckCircle2, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export type MetricFilter = "sent" | "opened" | "clicked" | "converted" | "pending" | "delivered" | "bounced" | "spam" | "unsubscribed" | null;

const FILTER_LABELS: Record<string, string> = {
  sent:         "Odesláno",
  opened:       "Otevřeno",
  clicked:      "Kliknuto",
  converted:    "Konvertováno",
  pending:      "Ve frontě",
  delivered:    "Doručeno",
  bounced:      "Odraženo (Bounce)",
  spam:         "Spam",
  unsubscribed: "Odhlášeno",
};

const STATUS_BADGE: Record<string, React.ReactNode> = {
  sent:         <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 border border-blue-500/20"><Send className="w-2.5 h-2.5" />Odesláno</Badge>,
  delivered:    <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-2.5 h-2.5" />Doručeno</Badge>,
  opened:       <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-emerald-400/10 text-emerald-500 border border-emerald-400/20"><MailOpen className="w-2.5 h-2.5" />Otevřeno</Badge>,
  clicked:      <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20"><MousePointer2 className="w-2.5 h-2.5" />Kliknuto</Badge>,
  converted:    <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-purple-500/10 text-purple-600 border border-purple-500/20"><Trophy className="w-2.5 h-2.5" />Konverze</Badge>,
  bounced:      <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-red-500/10 text-red-600 border border-red-500/20"><AlertCircle className="w-2.5 h-2.5" />Odraženo</Badge>,
  spam:         <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 border border-rose-500/20"><ShieldAlert className="w-2.5 h-2.5" />Spam</Badge>,
  failed:       <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-red-600/10 text-red-700 border border-red-600/20"><AlertCircle className="w-2.5 h-2.5" />Chyba</Badge>,
  unsubscribed: <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 border border-orange-500/20"><UserMinus className="w-2.5 h-2.5" />Odhlášeno</Badge>,
  pending:      <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-slate-500/10 text-slate-500 border border-slate-300"><Clock className="w-2.5 h-2.5" />Ve frontě</Badge>,
};

interface FilteredEmailListProps {
  filter: MetricFilter;
  onClose: () => void;
}

const TAB_FILTERS: { key: MetricFilter; label: string; icon: React.ElementType; color: string }[] = [
  { key: "sent",         label: "Odesláno",   icon: Send,          color: "blue"    },
  { key: "delivered",   label: "Doručeno",    icon: CheckCircle2,  color: "emerald" },
  { key: "opened",      label: "Otevřeno",    icon: MailOpen,      color: "green"   },
  { key: "clicked",     label: "Kliknuto",    icon: MousePointer2, color: "amber"   },
  { key: "converted",   label: "Konverze",    icon: Trophy,        color: "purple"  },
  { key: "bounced",     label: "Bounce",      icon: AlertCircle,   color: "red"     },
  { key: "spam",        label: "Spam",        icon: ShieldAlert,   color: "rose"    },
  { key: "unsubscribed",label: "Odhlášeno",   icon: UserMinus,     color: "orange"  },
  { key: "pending",     label: "Fronta",      icon: Clock,         color: "slate"   },
];

const COLOR_CLASSES: Record<string, string> = {
  blue:    "bg-blue-500/10 text-blue-600 border-blue-500/30",
  emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  green:   "bg-emerald-400/10 text-emerald-500 border-emerald-400/30",
  amber:   "bg-amber-500/10 text-amber-600 border-amber-500/30",
  purple:  "bg-purple-500/10 text-purple-600 border-purple-500/30",
  red:     "bg-red-500/10 text-red-600 border-red-500/30",
  rose:    "bg-rose-500/10 text-rose-600 border-rose-500/30",
  orange:  "bg-orange-500/10 text-orange-600 border-orange-500/30",
  slate:   "bg-slate-500/10 text-slate-500 border-slate-300",
};

export const FilteredEmailList: React.FC<FilteredEmailListProps> = ({ filter, onClose }) => {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<MetricFilter>(filter ?? "sent");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["admin-email-logs-v2", activeFilter],
    queryFn: async () => {
      if (!activeFilter) return [];

      const statusMap: Record<string, string[]> = {
        sent:         ["sent"],
        opened:       ["opened", "clicked", "converted"],
        clicked:      ["clicked", "converted"],
        converted:    ["converted"],
        pending:      ["pending"],
        delivered:    ["delivered"],
        bounced:      ["bounced"],
        spam:         ["spam"],
        unsubscribed: ["unsubscribed"],
      };
      const statuses = statusMap[activeFilter] ?? [activeFilter];

      // Primary: email_outbox (has full context - template, lead info, archive URL)
      const { data: outboxData, error: outboxErr } = await supabase
        .from("email_outbox")
        .select(`
          id,
          status,
          delivery_status,
          html_archive_url,
          error_message,
          sent_at,
          created_at,
          subject,
          provider,
          template:email_templates(name),
          worker:profiles(full_name, email),
          lead:marketing_leads(full_name, email, company_name)
        `)
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(500);

      if (outboxErr) throw outboxErr;

      // Secondary: email_logs (webhook delivery events - opened, clicked, bounced, spam)
      const { data: logsData } = await supabase
        .from("email_logs")
        .select("id, recipient_email, status, created_at, resend_id")
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(200);

      // Merge: outbox entries enriched with email_logs events
      const outboxRows = (outboxData || []).map((item: any) => ({
        id: item.id,
        source: "outbox" as const,
        recipientEmail: item.worker?.email || item.lead?.email || "—",
        recipientName: item.worker?.full_name || item.lead?.full_name || item.lead?.company_name || "",
        templateName: item.template?.name || item.subject || "—",
        status: item.delivery_status || item.status,
        provider: item.provider || "—",
        htmlArchiveUrl: item.html_archive_url,
        errorMessage: item.error_message,
        date: item.sent_at || item.created_at,
      }));

      // For event-only statuses (opened/clicked/bounced/spam/unsubscribed), also include logs
      const outboxEmails = new Set(outboxRows.map(r => r.recipientEmail));
      const logRows = (logsData || [])
        .filter((l: any) => !outboxEmails.has(l.recipient_email))
        .map((l: any) => ({
          id: l.id,
          source: "log" as const,
          recipientEmail: l.recipient_email,
          recipientName: "",
          templateName: "—",
          status: l.status,
          provider: "—",
          htmlArchiveUrl: null,
          errorMessage: null,
          date: l.created_at,
        }));

      const combined = [...outboxRows, ...logRows];
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return combined;
    },
    enabled: true,
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map(e => e.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsArr = Array.from(selectedIds);
      // Delete from outbox (source=outbox ids) — log ids are UUIDs from a different table
      const outboxIds = idsArr.filter(id => emails.find(e => e.id === id && e.source === "outbox"));
      const logIds    = idsArr.filter(id => emails.find(e => e.id === id && e.source === "log"));

      if (outboxIds.length > 0) {
        const { error } = await supabase.from("email_outbox").delete().in("id", outboxIds);
        if (error) throw error;
      }
      if (logIds.length > 0) {
        const { error } = await supabase.from("email_logs").delete().in("id", logIds);
        if (error) throw error;
      }

      toast.success(`Smazáno ${idsArr.length} záznamů`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-email-logs-v2"] });
      queryClient.invalidateQueries({ queryKey: ["admin-email-stats-30d"] });
    } catch (e: any) {
      toast.error("Chyba při mazání: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeTab = TAB_FILTERS.find(t => t.key === activeFilter);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Tab strip */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {TAB_FILTERS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveFilter(tab.key); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                isActive
                  ? `${COLOR_CLASSES[tab.color]} shadow-sm`
                  : "bg-card text-muted-foreground border-border/40 hover:border-primary/30"
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/20 border-b border-border/30">
          <input
            type="checkbox"
            checked={emails.length > 0 && selectedIds.size === emails.length}
            onChange={toggleAll}
            className="w-3.5 h-3.5 accent-primary cursor-pointer"
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
            {isLoading ? "Načítám…" : `${emails.length} záznamů`}
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-foreground">Vybráno: {selectedIds.size}</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-[10px] px-2.5 gap-1 rounded-full"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Smazat vybrané
              </Button>
            </div>
          )}
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : emails.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs text-muted-foreground italic">Žádné záznamy v kategorii „{FILTER_LABELS[activeFilter!]}".</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {emails.map((email) => (
              <li
                key={email.id}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors ${selectedIds.has(email.id) ? "bg-primary/5" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(email.id)}
                  onChange={() => toggleSelect(email.id)}
                  className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"
                />

                {/* Avatar */}
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 uppercase">
                  {email.recipientEmail?.[0] ?? "?"}
                </div>

                {/* Recipient */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {email.recipientName || email.recipientEmail}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-mono">
                    {email.recipientEmail}
                  </p>
                </div>

                {/* Template */}
                <div className="hidden sm:block w-40 min-w-0 shrink-0">
                  <p className="text-[10px] font-medium text-muted-foreground truncate">{email.templateName}</p>
                </div>

                {/* Provider */}
                <div className="hidden md:block w-16 shrink-0">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground/60">{email.provider}</span>
                </div>

                {/* Date */}
                <div className="hidden sm:block w-28 shrink-0 text-right">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(email.date).toLocaleString("cs-CZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {STATUS_BADGE[email.status] ?? (
                    <Badge variant="outline" className="text-[9px] uppercase">{email.status}</Badge>
                  )}
                </div>

                {/* Error tooltip */}
                {email.errorMessage && (
                  <div title={email.errorMessage} className="shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  </div>
                )}

                {/* Archive link */}
                {email.htmlArchiveUrl && (
                  <button
                    onClick={() => window.open(email.htmlArchiveUrl, "_blank")}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    title="Zobrazit archivovaný e-mail"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
