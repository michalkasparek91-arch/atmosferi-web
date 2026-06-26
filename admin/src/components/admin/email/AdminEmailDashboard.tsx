import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Mail, Send, Zap, Users, Trophy, 
  ArrowUpRight, Clock, Sparkles, AlertCircle, ShieldAlert, UserMinus, CheckCircle2
} from "lucide-react";
import { FilteredEmailList, MetricFilter } from "./FilteredEmailList";

interface FilterTabProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  metricKey: MetricFilter;
  isActive: boolean;
  onClick: (key: MetricFilter) => void;
}

const FilterTab = ({ title, value, icon: Icon, color, metricKey, isActive, onClick }: FilterTabProps) => {
  const activeColorClasses = {
    'bg-blue-500': 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400',
    'bg-slate-500': 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-400',
    'bg-emerald-500': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400',
    'bg-amber-500': 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400',
    'bg-purple-500': 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-400',
    'bg-red-500': 'bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-400',
    'bg-rose-500': 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400',
    'bg-orange-500': 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400',
  }[color] || 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20';

  const baseClasses = isActive 
    ? activeColorClasses 
    : "bg-card text-card-foreground border-border hover:border-primary/30 shadow-sm";

  return (
    <button
      onClick={() => onClick(metricKey)}
      className={`flex-1 min-w-[80px] p-2.5 rounded-md border transition-all text-left ${baseClasses}`}
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
  const [activeMetric, setActiveMetric] = useState<MetricFilter>("sent");

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
      
      const counts = { sent: 0, pending: 0, delivered: 0, clicked: 0, converted: 0, bounced: 0, spam: 0, unsubscribed: 0 };
      
      logs.forEach((l: any) => {
        if (['sent', 'delivered', 'opened', 'clicked', 'converted', 'bounced', 'spam', 'unsubscribed'].includes(l.status)) counts.sent++;
        if (['delivered', 'opened', 'clicked', 'converted'].includes(l.status)) counts.delivered++;
        if (['clicked', 'converted'].includes(l.status)) counts.clicked++;
        if (l.status === 'converted') counts.converted++;
        if (l.status === 'bounced') counts.bounced++;
        if (l.status === 'spam') counts.spam++;
        if (l.status === 'unsubscribed') counts.unsubscribed++;
      });
      
      outbox.forEach((o: any) => {
        if (['sent', 'delivered', 'opened', 'clicked', 'converted'].includes(o.status)) counts.sent++;
        if (['pending', 'ready_for_outbox'].includes(o.status)) counts.pending++;
        if (['delivered', 'opened', 'clicked', 'converted'].includes(o.status)) counts.delivered++;
      });
      
      return counts;
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Filter Tabs Row */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <FilterTab 
          title="Celkem odesláno" 
          value={stats?.sent?.toLocaleString("cs-CZ") ?? 0} 
          icon={Send} 
          color="bg-blue-500" 
          metricKey="sent"
          isActive={activeMetric === "sent"}
          onClick={setActiveMetric}
        />
        <FilterTab 
          title="Ve frontě" 
          value={stats?.pending?.toLocaleString("cs-CZ") ?? 0} 
          icon={Clock} 
          color="bg-slate-500" 
          metricKey="pending"
          isActive={activeMetric === "pending"}
          onClick={setActiveMetric}
        />
        <FilterTab 
          title="Doručeno" 
          value={stats?.delivered?.toLocaleString("cs-CZ") ?? 0} 
          icon={CheckCircle2} 
          color="bg-emerald-500" 
          metricKey="delivered"
          isActive={activeMetric === "delivered"}
          onClick={setActiveMetric}
        />
        <FilterTab 
          title="Click-Through" 
          value={stats?.clicked?.toLocaleString("cs-CZ") ?? 0} 
          icon={Zap} 
          color="bg-amber-500" 
          metricKey="clicked"
          isActive={activeMetric === "clicked"}
          onClick={setActiveMetric}
        />
        <FilterTab 
          title="Konverze" 
          value={stats?.converted?.toLocaleString("cs-CZ") ?? 0} 
          icon={Trophy} 
          color="bg-purple-500" 
          metricKey="converted"
          isActive={activeMetric === "converted"}
          onClick={setActiveMetric}
        />
        <FilterTab 
          title="Bounced" 
          value={stats?.bounced?.toLocaleString("cs-CZ") ?? 0} 
          icon={AlertCircle} 
          color="bg-red-500" 
          metricKey="bounced"
          isActive={activeMetric === "bounced"}
          onClick={setActiveMetric}
        />
        <FilterTab 
          title="Spam" 
          value={stats?.spam?.toLocaleString("cs-CZ") ?? 0} 
          icon={ShieldAlert} 
          color="bg-rose-500" 
          metricKey="spam"
          isActive={activeMetric === "spam"}
          onClick={setActiveMetric}
        />
        <FilterTab 
          title="Odhlášeno" 
          value={stats?.unsubscribed?.toLocaleString("cs-CZ") ?? 0} 
          icon={UserMinus} 
          color="bg-orange-500" 
          metricKey="unsubscribed"
          isActive={activeMetric === "unsubscribed"}
          onClick={setActiveMetric}
        />
      </div>

      {/* Always-visible email list — defaults to "sent", switches with tabs above */}
      <FilteredEmailList 
        filter={activeMetric}
        onClose={() => setActiveMetric("sent")}
      />
    </div>
  );
};
