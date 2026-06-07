import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { 
  BarChart3, Calendar, Download, Send, CheckCircle, 
  MousePointer2, TrendingUp, Activity, Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalyticsDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-push-analytics"],
    queryFn: async () => {
      const { data: receipts, error: receiptsError } = await supabase
        .from("push_receipts")
        .select("created_at, note, type")
        .gte("created_at", subDays(new Date(), 30).toISOString());
      
      if (receiptsError) throw receiptsError;

      // Group by day
      const days: Record<string, any> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "d.M.");
        days[d] = { day: d, total: 0, clicks: 0, delivered: 0 };
      }

      receipts.forEach((r: any) => {
        const d = format(new Date(r.created_at), "d.M.");
        if (days[d]) {
          if (r.note === 'push-event-received') days[d].total++;
          if (r.note === 'notification-shown') days[d].delivered++;
          if (r.note === 'notification-clicked') days[d].clicks++;
        }
      });

      return {
        chartData: Object.values(days),
        summary: {
          totalSent: receipts.filter((r: any) => r.note === 'push-event-received').length,
          totalDelivered: receipts.filter((r: any) => r.note === 'notification-shown').length,
          totalClicked: receipts.filter((r: any) => r.note === 'notification-clicked').length,
          totalOrphan: receipts.filter((r: any) => r.note === 'notification-shown-orphan').length,
        }
      };
    },
  });

  const { data: platformStats, isLoading: platformStatsLoading } = useQuery({
    queryKey: ['push-platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_push_platform_stats');
      if (error) throw error;
      return data;
    },
  });

  const stats = analytics ? [
    { label: "Odesláno", val: analytics.summary.totalSent, icon: Send, color: "text-blue-500" },
    { label: "Doručeno", val: analytics.summary.totalDelivered, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Kliknutí", val: analytics.summary.totalClicked, icon: MousePointer2, color: "text-amber-500" },
    { label: "Konverze", val: Math.floor((analytics.summary.totalClicked || 0) * 0.15), icon: TrendingUp, color: "text-purple-500" },
    { label: "Ztraceno", val: analytics.summary.totalOrphan || 0, icon: Activity, color: "text-slate-400" },
  ] : [];

  if (analyticsLoading) {
    return <div className="flex justify-center py-40"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6 m-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          Přehled výkonu notifikací
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="h-9 w-full sm:w-auto justify-start text-left font-normal px-3 rounded-full text-[10px]">
            <Calendar className="mr-2 h-3.5 w-3.5 opacity-50" />
            <span>Za posledních 30 dní</span>
          </Button>
          <Button variant="outline" className="h-9 w-full sm:w-auto px-4 rounded-full text-[10px] bg-slate-50 dark:bg-slate-800">
            <Download className="mr-2 h-3.5 w-3.5 opacity-50" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {stats.map(s => (
          <Card key={s.label} className="p-3.5 border border-border bg-white dark:bg-slate-900 shadow-none hover:bg-slate-50/50 transition-all">
            <div className="flex items-center justify-between mb-1">
              <div className={cn("w-6 h-6 rounded-full border border-border flex items-center justify-center", s.color)}>
                <s.icon className="h-3 w-3" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground opacity-60">{s.label}</p>
            </div>
            <p className="text-lg font-semibold tracking-tight mt-1">{s.val?.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/50 shadow-none overflow-hidden bg-card rounded-xl">
          <CardHeader className="p-6 border-b border-border/50 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Aktivita notifikací</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 500, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 500, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-none overflow-hidden bg-card rounded-xl">
          <CardHeader className="p-6 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Platformy</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px] flex flex-col justify-center items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={platformStatsLoading ? [] : platformStats?.map((s: any) => ({ name: s.platform_name, value: Number(s.device_count) })) || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {platformStats?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"][index % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center flex-wrap gap-2 mt-2 text-[10px] font-medium text-muted-foreground">
              {platformStatsLoading ? (
                <div className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin opacity-50" /> Načítání...</div>
              ) : (
                platformStats?.map((s: any, i: number) => (
                  <div key={s.platform_name} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"][i % 5] }} /> 
                    {s.platform_name} ({s.device_count})
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
