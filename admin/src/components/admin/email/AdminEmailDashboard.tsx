import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Mail, Send, Zap, Users, BarChart3, Trophy, 
  ArrowUpRight, ArrowDownRight, Clock, Plus, Sparkles
} from "lucide-react";
import { FilteredEmailList, MetricFilter } from "./FilteredEmailList";

interface FilterTabProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  metricKey: MetricFilter;
  isActive: boolean;
  onClick: (key: MetricFilter | null) => void;
}

const FilterTab = ({ title, value, icon: Icon, color, metricKey, isActive, onClick }: FilterTabProps) => {
  const activeColorClasses = {
    'bg-blue-500': 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400',
    'bg-slate-500': 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-400',
    'bg-emerald-500': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400',
    'bg-amber-500': 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400',
    'bg-purple-500': 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400',
  }[color] || 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20';

  const baseClasses = isActive 
    ? activeColorClasses 
    : "bg-card text-card-foreground border-border hover:border-primary/30 shadow-sm";

  return (
    <button
      onClick={() => onClick(isActive ? null : metricKey)}
      className={`flex-1 min-w-[100px] p-2.5 rounded-md border transition-all text-left ${baseClasses}`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <p className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "font-black" : "text-muted-foreground"}`}>
          {title}
        </p>
        <Icon className={`h-3.5 w-3.5 ${isActive ? "" : "text-muted-foreground/40"}`} />
      </div>
      <p className={`text-xl font-black ${isActive ? "" : "text-foreground/80"}`}>
        {value}
      </p>
    </button>
  );
};

export const AdminEmailDashboard = ({ onAction }: { onAction: (tab: string) => void }) => {
  const [activeMetric, setActiveMetric] = useState<MetricFilter>(null);

  const handleMetricClick = (key: MetricFilter) => {
    setActiveMetric(key);
  };

  // Real metrics from email_logs AND email_outbox (last 30 days)
  const { data: stats } = useQuery({
    queryKey: ["admin-email-stats-30d"],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const [currLogs, currOutbox] = await Promise.all([
        supabase.from("email_logs").select("status").gte("created_at", start),
        supabase.from("email_outbox").select("status").gte("created_at", start),
      ]);
      
      const logs = currLogs.data || [];
      const outbox = currOutbox.data || [];
      
      const counts = { sent: 0, pending: 0, delivered: 0, clicked: 0, converted: 0 };
      
      logs.forEach((l: any) => {
        if (['sent', 'delivered', 'opened', 'clicked', 'converted'].includes(l.status)) counts.sent++;
        if (['delivered', 'opened', 'clicked', 'converted'].includes(l.status)) counts.delivered++;
        if (['clicked', 'converted'].includes(l.status)) counts.clicked++;
        if (l.status === 'converted') counts.converted++;
      });
      
      outbox.forEach((o: any) => {
        if (['sent', 'delivered', 'opened', 'clicked', 'converted'].includes(o.status)) counts.sent++;
        if (['pending', 'ready_for_outbox'].includes(o.status)) counts.pending++;
        if (['delivered', 'opened', 'clicked', 'converted'].includes(o.status)) counts.delivered++;
      });
      
      return counts;
    },
  });

  // Fetch real history from email_outbox
  const { data: historyItems, isLoading: historyLoading } = useQuery({
    queryKey: ["admin-email-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_outbox")
        .select(`
          id,
          status,
          sent_at,
          created_at,
          subject,
          template:email_templates(name),
          worker:profiles(full_name, email),
          lead:marketing_leads(full_name, email)
        `)
        .in("status", ["sent", "delivered", "failed", "pending", "ready_for_outbox"])
        .order("created_at", { ascending: false })
        .limit(10);
        
      if (error) throw error;
      return data;
    }
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'sent': return 'bg-emerald-500';
      case 'delivered': return 'bg-emerald-600';
      case 'failed': return 'bg-rose-500';
      case 'pending': return 'bg-blue-500';
      case 'ready_for_outbox': return 'bg-blue-400';
      default: return 'bg-slate-300';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'sent': return 'Odesláno';
      case 'delivered': return 'Doručeno';
      case 'failed': return 'Chyba';
      case 'pending': return 'Ve frontě';
      case 'ready_for_outbox': return 'Příprava';
      default: return 'Draft';
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('cs-CZ', { 
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Filter Tabs Row */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <FilterTab 
          title="Celkem odesláno" 
          value={stats?.sent?.toLocaleString("cs-CZ") ?? 0} 
          icon={Send} 
          color="bg-blue-500" 
          metricKey="sent"
          isActive={activeMetric === "sent"}
          onClick={handleMetricClick}
        />
        <FilterTab 
          title="Ve frontě" 
          value={stats?.pending?.toLocaleString("cs-CZ") ?? 0} 
          icon={Clock} 
          color="bg-slate-500" 
          metricKey="pending"
          isActive={activeMetric === "pending"}
          onClick={handleMetricClick}
        />
        <FilterTab 
          title="Doručeno" 
          value={stats?.delivered?.toLocaleString("cs-CZ") ?? 0} 
          icon={Mail} 
          color="bg-emerald-500" 
          metricKey="delivered"
          isActive={activeMetric === "delivered"}
          onClick={handleMetricClick}
        />
        <FilterTab 
          title="Click-Through" 
          value={stats?.clicked?.toLocaleString("cs-CZ") ?? 0} 
          icon={Zap} 
          color="bg-amber-500" 
          metricKey="clicked"
          isActive={activeMetric === "clicked"}
          onClick={handleMetricClick}
        />
        <FilterTab 
          title="Konverze" 
          value={stats?.converted?.toLocaleString("cs-CZ") ?? 0} 
          icon={Trophy} 
          color="bg-purple-500" 
          metricKey="converted"
          isActive={activeMetric === "converted"}
          onClick={handleMetricClick}
        />
      </div>

      {/* Filtered Email List – appears when a metric is clicked */}
      {activeMetric && (
        <FilteredEmailList 
          filter={activeMetric} 
          onClose={() => setActiveMetric(null)} 
        />
      )}

      {/* History / Recent Activity */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Nedávná historie aktivit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {historyLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Načítání historie...</div>
            ) : historyItems && historyItems.length > 0 ? (
              historyItems.map((item, i) => {
                const recipient = item.worker || item.lead;
                const label = item.subject || (item.template as any)?.name || 'E-mail bez předmětu';
                const recipientName = recipient?.full_name || recipient?.email || 'Neznámý adresát';
                
                return (
                  <div key={item.id} className="flex items-center justify-between group cursor-default border-b border-border/40 last:border-0 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold group-hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-[400px]" title={label}>
                        {label}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Pro: {recipientName} • {formatTime(item.sent_at || item.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{getStatusLabel(item.status)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">Zatím žádná historie.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
