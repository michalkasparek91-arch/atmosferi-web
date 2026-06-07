import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Send, MailOpen, MousePointer2, Trophy, Mail, Loader2 } from "lucide-react";

export type MetricFilter = "sent" | "opened" | "clicked" | "converted" | "pending" | "delivered" | null;

const FILTER_LABELS: Record<string, string> = {
  sent: "Odesláno",
  opened: "Otevřeno",
  clicked: "Kliknuto",
  converted: "Konvertováno",
  pending: "Ve frontě",
  delivered: "Doručeno",
};

interface FilteredEmailListProps {
  filter: MetricFilter;
  onClose: () => void;
}

export const FilteredEmailList: React.FC<FilteredEmailListProps> = ({ filter, onClose }) => {
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["admin-email-logs", filter],
    queryFn: async () => {
      if (!filter) return [];
      const statusMap: Record<string, string[]> = {
        sent: ["sent"],
        opened: ["opened", "clicked"],
        clicked: ["clicked"],
        converted: ["converted"],
        pending: ["pending"],
        delivered: ["delivered"],
      };
      const statuses = statusMap[filter] ?? [];
      
      const { data: logsData, error: logsError } = await supabase
        .from("email_logs")
        .select("id, recipient_email, status, created_at, resend_id")
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(200);

      if (logsError) throw logsError;

      let combinedData = [...(logsData || [])];

      if (filter === "sent" || filter === "pending" || filter === "delivered") {
        const { data: outboxData, error: outboxError } = await supabase
          .from("email_outbox")
          .select("id, status, sent_at, created_at, worker:profiles(email), lead:marketing_leads(email)")
          .eq("status", filter)
          .order("created_at", { ascending: false })
          .limit(200);

        if (outboxError) throw outboxError;

        if (outboxData) {
          const mappedOutbox = outboxData.map(item => ({
            id: item.id,
            recipient_email: (item.worker as any)?.email || (item.lead as any)?.email || "Neznámý adresát",
            status: item.status,
            created_at: item.sent_at || item.created_at || new Date().toISOString(),
            resend_id: null,
          }));
          combinedData = [...combinedData, ...mappedOutbox];
        }
      }

      // Sort combined by created_at desc
      combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Limit to 200 overall
      return combinedData.slice(0, 200);
    },
    enabled: !!filter,
  });

  if (!filter) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-3 duration-400">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${filter === "sent" ? "bg-blue-500/10" : filter === "opened" ? "bg-emerald-500/10" : filter === "clicked" ? "bg-amber-500/10" : "bg-purple-500/10"}`}>
              {filter === "sent" && <Send className="h-3.5 w-3.5 text-blue-500" />}
              {filter === "opened" && <MailOpen className="h-3.5 w-3.5 text-emerald-500" />}
              {filter === "clicked" && <MousePointer2 className="h-3.5 w-3.5 text-amber-500" />}
              {filter === "converted" && <Trophy className="h-3.5 w-3.5 text-purple-500" />}
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                Filtr: {FILTER_LABELS[filter]}
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isLoading ? "Načítám…" : `${emails.length} e-mailů odpovídá filtru`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[250px] max-w-[250px] text-[9px] font-bold uppercase tracking-widest text-muted-foreground py-2.5 pl-5">Příjemce</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground py-2.5">Resend ID</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground py-2.5">Datum</TableHead>
                  <TableHead className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground py-2.5 pr-5 text-right">Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <p className="text-xs text-muted-foreground italic font-medium">
                        {filter === "sent"
                          ? "Žádné odeslané e-maily."
                          : "Sledování této metriky zatím není napojené (chybí webhook od Resendu)."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email: any, index: number) => (
                    <TableRow
                      key={email.id}
                      className="group hover:bg-muted/20 border-border/30 transition-colors cursor-default"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell className="py-3 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {email.recipient_email?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-xs font-medium text-foreground truncate">
                              <Mail className="h-2.5 w-2.5 opacity-60 shrink-0" /> {email.recipient_email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <code className="text-[10px] text-muted-foreground font-mono">{email.resend_id ?? "—"}</code>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {new Date(email.created_at).toLocaleString("cs-CZ")}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 pr-5 text-right">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-500 border-blue-500/20"
                        >
                          <Send className="h-3 w-3" />
                          {email.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
