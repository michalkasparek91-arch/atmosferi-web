import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Loader2, RotateCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  user_banned: "Uživatel zablokován",
  credits_gifted: "Kredity darovány",
  verification_approved: "Verifikace schválena",
  verification_rejected: "Verifikace zamítnuta",
  job_deleted: "Zakázka smazána",
  review_hidden: "Recenze skryta",
  promo_created: "Kupón vytvořen",
  settings_updated: "Nastavení změněno",
};

const actionColors: Record<string, string> = {
  user_banned: "bg-red-100 text-red-700 border-red-200",
  credits_gifted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  verification_approved: "bg-green-100 text-green-700 border-green-200",
  verification_rejected: "bg-orange-100 text-orange-700 border-orange-200",
  job_deleted: "bg-red-100 text-red-700 border-red-200",
  review_hidden: "bg-yellow-100 text-yellow-700 border-yellow-200",
  promo_created: "bg-blue-100 text-blue-700 border-blue-200",
  settings_updated: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function AdminAuditLog() {
  const queryClient = useQueryClient();
  const [filterAction, setFilterAction] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-log", filterAction],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={ScrollText}
        title="Audit Log"
        subtitle="Historie systémových změn a akcí"
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted/60 transition-all active:scale-95"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-audit-log"] })}
            disabled={isLoading}
          >
            <RotateCw className={cn("h-3.5 w-3.5", isLoading ? "animate-spin" : "")} />
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="h-8 w-[200px] text-[10px] font-medium bg-muted/40 border-border rounded-full focus:ring-1 focus:ring-primary/20">
            <SelectValue placeholder="Filtrovat akci" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny akce</SelectItem>
            {Object.entries(actionLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !logs?.length ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ScrollText className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Zatím žádné záznamy</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0 rounded", actionColors[log.action] || "bg-gray-100 text-gray-700 border-gray-200")}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    {log.target_type && (
                      <span className="text-[10px] font-medium text-muted-foreground opacity-60 tracking-tight">
                        &rarr; {log.target_type} {log.target_id ? `(${log.target_id.slice(0, 8)})` : ""}
                      </span>
                    )}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.created_at), "d. M. yyyy HH:mm", { locale: cs })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
