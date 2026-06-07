import { useState, useMemo } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Briefcase, TrendingUp, Loader2, Coins, 
  Zap, Crosshair, Activity, MapPin, 
  CreditCard, ArrowUpRight, ArrowDownRight,
  BarChart3, Sparkles, PieChart as PieChartIcon, Search, RotateCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
  LineChart, Line
} from "recharts";
import { format, subDays, isAfter } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CHART_COLORS = ["hsl(90,50%,63%)", "hsl(217,91%,60%)", "hsl(38,92%,50%)", "hsl(350,89%,60%)", "hsl(263,70%,50%)", "hsl(330,81%,60%)"];

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const days = parseInt(range);
  const sinceDate = subDays(new Date(), days).toISOString();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-analytics-v2", range],
    queryFn: async () => {
      const [profilesRes, jobsRes, offersRes, purchasesRes, categoriesRes, analyticsRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at, user_type, is_pro, last_opened_at, city, engagement_score"),
        supabase.from("jobs").select("id, created_at, status, final_price, category_id, city, customer_id"),
        supabase.from("offers").select("id, created_at, status, job_id, worker_id"),
        supabase.from("points_purchases").select("id, created_at, price_czk, payment_status"),
        supabase.from("service_categories").select("id, name"),
        supabase.from("analytics_events" as any).select("*").gte("created_at", sinceDate),
      ]);

      return {
        profiles: profilesRes.data || [],
        jobs: jobsRes.data || [],
        offers: offersRes.data || [],
        purchases: purchasesRes.data || [],
        categories: categoriesRes.data || [],
        analytics: (analyticsRes.data || []) as any[],
      };
    },
  });

  const metrics = useMemo(() => {
    if (!stats) return null;

    const analytics = stats.analytics || [];
    const sessions = analytics.filter(e => e.event_type === 'session_start').length;
    const conversions = analytics.filter(e => e.event_type === 'conversion').length;
    const cr = sessions > 0 ? ((conversions / sessions) * 100).toFixed(1) : "0";

    const revenue = stats.purchases
      .filter(p => p.payment_status === 'completed')
      .reduce((s, p) => s + (p.price_czk || 0), 0);

    const now = new Date();
    const joined3mo = stats.profiles.filter(p => {
      const c = new Date(p.created_at);
      return c >= subDays(now, 120) && c <= subDays(now, 90);
    });
    const active3mo = joined3mo.filter(p =>
      p.last_opened_at && isAfter(new Date(p.last_opened_at), subDays(now, 30))
    ).length;
    const retention = joined3mo.length > 0
      ? ((active3mo / joined3mo.length) * 100).toFixed(1)
      : "0";

    // Funnel
    const totalUsers = stats.profiles.length;
    const usersWithJobs = new Set(stats.jobs.map(j => j.customer_id)).size;
    const jobsWithOffers = new Set(stats.offers.map(o => o.job_id)).size;
    const completedJobs = stats.jobs.filter(j => j.status === 'completed').length;

    // Worker utilization
    const uniqueWorkers = new Set(stats.offers.map(o => o.worker_id)).size;
    const totalWorkers = stats.profiles.filter(p => p.user_type === 'worker').length;
    const workerUtil = totalWorkers > 0 ? ((uniqueWorkers / totalWorkers) * 100).toFixed(0) : "0";

    // Avg bids per job
    const bidsPerJob = stats.jobs.length > 0 ? (stats.offers.length / stats.jobs.length).toFixed(1) : "0";

    // AOV
    const completedWithPrice = stats.jobs.filter(j => j.status === 'completed' && j.final_price);
    const aov = completedWithPrice.length > 0
      ? (completedWithPrice.reduce((s, j) => s + (j.final_price || 0), 0) / completedWithPrice.length).toFixed(0)
      : "0";

    // Time to first offer (avg days)
    const jobOfferTimes = stats.jobs.map(job => {
      const firstOffer = stats.offers
        .filter(o => o.job_id === job.id)
        .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())[0];
      if (!firstOffer) return null;
      const diff = (new Date(firstOffer.created_at!).getTime() - new Date(job.created_at!).getTime()) / (1000 * 60 * 60);
      return diff;
    }).filter(Boolean) as number[];
    const avgTimeToOffer = jobOfferTimes.length > 0
      ? (jobOfferTimes.reduce((s, t) => s + t, 0) / jobOfferTimes.length).toFixed(1)
      : "—";

    // Geo
    const cities = Array.from(new Set([...stats.jobs.map(j => j.city), ...stats.profiles.map(p => p.city)]))
      .filter(Boolean)
      .map(city => ({
        city,
        jobs: stats.jobs.filter(j => j.city === city).length,
        workers: stats.profiles.filter(p => p.city === city && p.user_type === 'worker').length,
      }))
      .map(c => ({ ...c, gap: c.jobs - c.workers }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 8);

    // Category distribution
    const liquidity = stats.categories.map(cat => ({
      name: cat.name,
      jobs: stats.jobs.filter(j => j.category_id === cat.id).length,
    })).sort((a, b) => b.jobs - a.jobs).slice(0, 6);

    // Searches
    const searchMap = analytics
      .filter(e => e.event_type === 'search')
      .reduce((acc: Record<string, number>, e) => {
        const term = (e.metadata as any)?.term || 'unknown';
        acc[term] = (acc[term] || 0) + 1;
        return acc;
      }, {});
    const topSearches = Object.entries(searchMap)
      .map(([term, count]) => ({ term, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // User segments for pie
    const customers = stats.profiles.filter(p => p.user_type === 'customer').length;
    const workers = totalWorkers;
    const proCount = stats.profiles.filter(p => p.is_pro).length;

    return {
      revenue, sessions, cr, retention,
      totalUsers, usersWithJobs, jobsWithOffers, completedJobs,
      workerUtil, bidsPerJob, aov, avgTimeToOffer,
      cities, liquidity, topSearches,
      customers, workers, proCount,
      joined3moCount: joined3mo.length,
    };
  }, [stats]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    const labels = [];
    for (let i = days - 1; i >= 0; i--) labels.push(format(subDays(new Date(), i), "d.M."));
    return labels.map(label => ({
      date: label,
      users: stats.profiles.filter(p => format(new Date(p.created_at!), "d.M.") === label).length,
      jobs: stats.jobs.filter(j => format(new Date(j.created_at!), "d.M.") === label).length,
      sessions: stats.analytics.filter(e => e.event_type === 'session_start' && format(new Date(e.created_at), "d.M.") === label).length,
      conversionRate: (() => {
        const s = stats.analytics.filter(e => e.event_type === 'session_start' && format(new Date(e.created_at), "d.M.") === label).length;
        const c = stats.analytics.filter(e => e.event_type === 'conversion' && format(new Date(e.created_at), "d.M.") === label).length;
        return s > 0 ? ((c / s) * 100).toFixed(1) : 0;
      })(),
      revenue: stats.purchases
        .filter(p => p.payment_status === "completed" && format(new Date(p.created_at!), "d.M.") === label)
        .reduce((sum, p) => sum + (p.price_czk || 0), 0),
    }));
  }, [stats, days]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
        <p className="text-xs font-medium text-muted-foreground">Načítám analytiku…</p>
      </div>
    );
  }

  const tooltipStyle = {
    borderRadius: '10px',
    border: '1px solid hsl(var(--border))',
    backgroundColor: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    boxShadow: '0 4px 12px hsl(var(--foreground) / 0.06)',
    fontSize: '10px',
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-16">
      {/* Header */}
      <AdminPageHeader
        icon={BarChart3}
        title="Analytika"
        subtitle="Pokročilé statistiky platformy"
        actions={
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8 p-0 flex gap-1 bg-transparent border-none shadow-none">
                <TabsTrigger value="overview" className="h-7 rounded-full px-3 text-[10px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground outline-none">Přehled</TabsTrigger>
                <TabsTrigger value="funnel" className="h-7 rounded-full px-3 text-[10px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground outline-none">Funnel</TabsTrigger>
                <TabsTrigger value="market" className="h-7 rounded-full px-3 text-[10px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground outline-none">Trh</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-8 w-28 text-[10px] font-medium bg-muted/40 border-border rounded-full focus:ring-1 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dní</SelectItem>
                <SelectItem value="30">30 dní</SelectItem>
                <SelectItem value="90">90 dní</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted/60 transition-all active:scale-95"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-analytics-v2"] })}
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Tržby", value: `${metrics?.revenue.toLocaleString()} Kč`, icon: Coins, delta: null },
          { label: "Sessions", value: `${metrics?.sessions.toLocaleString()}`, icon: Users, delta: null },
          { label: "Konverze", value: `${metrics?.cr}%`, icon: Crosshair, delta: null },
          { label: "Retence 90d", value: `${metrics?.retention}%`, icon: Zap, delta: null },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/60 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-800 flex items-center justify-center text-foreground transition-all">
                  <kpi.icon className="h-3 w-3 opacity-60" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground opacity-70">{kpi.label}</span>
              </div>
              <div className="text-lg font-semibold text-foreground tracking-tight">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Main chart */}
            <Card className="border-border/60 shadow-none">
              <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent">
                <CardTitle className="text-xs font-bold text-foreground">Uživatelé & Zakázky</CardTitle>
                <p className="text-[10px] text-muted-foreground font-medium">Denní trend</p>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="users" stroke="hsl(90,50%,63%)" strokeWidth={2.5} fill="hsl(90,50%,63%)" fillOpacity={0.08} name="Uživatelé" />
                    <Area type="monotone" dataKey="jobs" stroke="hsl(217,91%,60%)" strokeWidth={2.5} fill="hsl(217,91%,60%)" fillOpacity={0.08} name="Zakázky" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue chart */}
            <Card className="border-border/60 shadow-none">
              <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-3 w-3 text-foreground" /> Tržby (CZK)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} name="Tržby" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion chart */}
            <Card className="border-border/60 shadow-none">
              <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent">
                <CardTitle className="text-xs font-bold text-foreground">Sessions & Konverze</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(217,91%,60%)' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} name="Sessions" />
                    <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="hsl(217,91%,60%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(217,91%,60%)', strokeWidth: 2, stroke: 'hsl(var(--card))' }} name="Konverze %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <Card className="border-border/60 shadow-none">
              <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent">
                <CardTitle className="text-[10px] font-bold text-foreground">Marketplace KPIs</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[
                  { label: "Ø Nabídky/zakázku", value: metrics?.bidsPerJob },
                  { label: "Ø Čas do nabídky", value: `${metrics?.avgTimeToOffer}h` },
                  { label: "Ø Hodnota zakázky", value: `${metrics?.aov} Kč` },
                  { label: "Využití pracovníků", value: `${metrics?.workerUtil}%` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
                    <span className="text-sm font-bold text-foreground font-mono">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* User Segments Pie */}
            <Card className="border-border shadow-none">
              <CardHeader className="py-3 px-5 border-b border-border">
                <CardTitle className="text-[10px] font-bold text-muted-foreground">Segmenty uživatelů</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Zákazníci', value: metrics?.customers },
                        { name: 'Pracovníci', value: metrics?.workers },
                        { name: 'PRO', value: metrics?.proCount },
                      ]}
                      dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70} stroke="none"
                    >
                      {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {[{ l: 'Zákazníci', c: 0 }, { l: 'Pracovníci', c: 1 }, { l: 'PRO', c: 2 }].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[item.c] }} />
                      <span className="text-[9px] font-medium text-muted-foreground">{item.l}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Retention Ring */}
            <Card className="border-border shadow-none">
              <CardHeader className="py-3 px-5 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-muted-foreground">Retence 90d</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center">
                <div className="relative h-28 w-28 flex items-center justify-center">
                  <svg className="h-full w-full rotate-[-90deg]">
                    <circle cx="56" cy="56" r="50" stroke="hsl(var(--muted))" strokeWidth="7" fill="transparent" />
                    <circle cx="56" cy="56" r="50" stroke="hsl(var(--primary))" strokeWidth="7" fill="transparent"
                      strokeDasharray={314} strokeDashoffset={314 * (1 - Number(metrics?.retention) / 100)}
                      className="transition-all duration-1000" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-foreground">{metrics?.retention}%</span>
                    <span className="text-[10px] font-medium text-muted-foreground">aktivních</span>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground text-center">Z {metrics?.joined3moCount} uživatelů (3 měsíce)</p>
              </CardContent>
            </Card>

            {/* Top Searches */}
            <Card className="border-border shadow-none">
              <CardHeader className="py-3 px-5 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-muted-foreground">Hledané výrazy</CardTitle>
                <Search className="h-3.5 w-3.5 text-muted-foreground/50" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {(!metrics?.topSearches || metrics.topSearches.length === 0) ? (
                      <TableRow>
                        <TableCell className="text-center py-6 text-muted-foreground text-xs italic">Zatím žádná data</TableCell>
                      </TableRow>
                    ) : (
                      metrics.topSearches.map((item, i) => (
                        <TableRow key={i} className="border-border/50 hover:bg-muted/30">
                          <TableCell className="text-[11px] font-medium text-foreground pl-5 lowercase">{item.term}</TableCell>
                          <TableCell className="text-right text-[11px] font-mono font-bold text-muted-foreground pr-5">{item.count}×</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "funnel" && (
        <div className="space-y-4">
          {/* Funnel Visualization */}
          <Card className="border-border/60 shadow-none">
            <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent">
              <CardTitle className="text-xs font-bold text-foreground">Konverzní Funnel</CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium">Registrace → Zakázka → Nabídka → Dokončení</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {[
                  { label: "Registrovaní uživatelé", value: metrics?.totalUsers || 0, color: "hsl(90,50%,63%)" },
                  { label: "Zadali zakázku", value: metrics?.usersWithJobs || 0, color: "hsl(217,91%,60%)" },
                  { label: "Obdrželi nabídku", value: metrics?.jobsWithOffers || 0, color: "hsl(38,92%,50%)" },
                  { label: "Dokončené zakázky", value: metrics?.completedJobs || 0, color: "hsl(350,89%,60%)" },
                ].map((step, i, arr) => {
                  const pct = arr[0].value > 0 ? ((step.value / arr[0].value) * 100).toFixed(1) : "0";
                  const dropoff = i > 0 && arr[i - 1].value > 0
                    ? ((1 - step.value / arr[i - 1].value) * 100).toFixed(0)
                    : null;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-foreground">{step.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-foreground font-mono">{step.value}</span>
                          <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                          {dropoff && (
                            <span className="text-[9px] font-semibold text-destructive flex items-center gap-0.5">
                              <ArrowDownRight className="h-3 w-3" />-{dropoff}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: step.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Marketplace Health Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Ø Nabídky/Job", value: metrics?.bidsPerJob, icon: Briefcase },
              { label: "Ø Čas do nabídky", value: `${metrics?.avgTimeToOffer}h`, icon: Zap },
              { label: "Ø Hodnota zakázky", value: `${metrics?.aov} Kč`, icon: CreditCard },
              { label: "Aktivní pracovníci", value: `${metrics?.workerUtil}%`, icon: Users },
            ].map((item, i) => (
              <Card key={i} className="border-border shadow-none">
                <CardContent className="p-4 text-center">
                  <div className="mx-auto p-2 bg-muted rounded-lg w-fit mb-2 text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="text-lg font-bold text-foreground font-mono">{item.value}</div>
                  <div className="text-[10px] font-medium text-muted-foreground mt-1">{item.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "market" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Geo Heatmap */}
          <Card className="border-border/60 shadow-none overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent">
              <CardTitle className="text-[10px] font-bold text-foreground/70">Geo Demand</CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5 opacity-60">Lokality dle poptávky</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[10px] font-medium text-muted-foreground/60 pl-5">Město</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground/60 text-center">Zakázky</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground/60 text-center">Pracovníci</TableHead>
                    <TableHead className="text-[10px] font-medium text-muted-foreground/60 text-right pr-5">Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics?.cities.map((city, i) => (
                    <TableRow key={i} className="border-border hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary/60" />
                          <span className="text-[11px] font-bold text-foreground">{city.city}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[11px] font-mono font-bold text-muted-foreground">{city.jobs}</TableCell>
                      <TableCell className="text-center text-[11px] font-mono font-bold text-muted-foreground">{city.workers}</TableCell>
                      <TableCell className="text-right pr-5">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${city.gap > 2 ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                          {city.gap > 0 ? `+${city.gap}` : city.gap}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="border-border/60 shadow-none">
            <CardHeader className="py-2.5 px-4 border-b border-border/50 bg-slate-50/30 dark:bg-transparent flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-bold text-foreground/70">Poptávka dle kategorií</CardTitle>
              <BarChart3 className="h-3 w-3 text-foreground/40" />
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {metrics?.liquidity.map((item, i) => {
                const max = Math.max(...(metrics?.liquidity.map(l => l.jobs) || [1]));
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-semibold text-foreground">{item.name}</span>
                      <span className="text-[9px] font-bold text-muted-foreground">{item.jobs}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(item.jobs / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Growth Hub */}
          <Card className="lg:col-span-2 border-border shadow-none bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <TrendingUp className="h-32 w-32 text-foreground" />
            </div>
            <CardContent className="p-6">
              <span className="text-[10px] font-medium text-primary/70">Growth Hub</span>
              <h2 className="text-xl font-bold text-foreground mt-1">Doporučení pro růst</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex gap-3 items-start p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all shadow-sm group">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    <Crosshair className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Poptávka v {metrics?.cities[0]?.city}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Spusťte kampaň pro nábor pracovníků v tomto regionu.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start p-4 rounded-xl bg-card border border-border hover:border-accent/30 transition-all shadow-sm group">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Zvyšte konverzi nabídek</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Ø {metrics?.bidsPerJob} nabídek/zakázku — motivujte PRO pracovníky.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
