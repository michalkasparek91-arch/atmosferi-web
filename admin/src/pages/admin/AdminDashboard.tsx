import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, AlertTriangle, Crown, CreditCard, ShieldCheck, ArrowRight, Clock, LayoutDashboard, Bell, Ticket, User, CheckCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface RecentUser {
  id: string;
  full_name: string;
  user_type: string;
  created_at: string;
}

interface RecentJob {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeJobs: 0,
    pendingReports: 0,
    proMembers: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyUsers, setDailyUsers] = useState<{ day: string; count: number }[]>([]);
  const [dailyJobs, setDailyJobs] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          { count: usersCount },
          { count: jobsCount },
          { count: proCount },
          { count: reportsCount },
          { count: verificationsCount },
          { data: revenue },
          { data: users },
          { data: jobs },
          { data: allUsers },
          { data: allJobs },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_pro', true),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('worker_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('points_purchases').select('price_czk').eq('payment_status', 'completed'),
          supabase.from('profiles').select('id, full_name, user_type, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('jobs').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('profiles').select('created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('jobs').select('created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        ]);

        const totalRevenue = revenue?.reduce((sum, p) => sum + (p.price_czk || 0), 0) || 0;

        setStats({
          totalUsers: usersCount || 0,
          activeJobs: jobsCount || 0,
          pendingReports: reportsCount || 0,
          proMembers: proCount || 0,
          totalRevenue,
          pendingVerifications: verificationsCount || 0,
        });
        setRecentUsers(users || []);
        setRecentJobs(jobs || []);

        // Build sparkline data for last 7 days
        const buildDailyData = (items: { created_at: string }[]) => {
          const days: { day: string; count: number }[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dayStr = d.toISOString().split('T')[0];
            const count = items.filter(item => item.created_at.startsWith(dayStr)).length;
            days.push({ day: dayStr, count });
          }
          return days;
        };
        setDailyUsers(buildDailyData(allUsers || []));
        setDailyJobs(buildDailyData(allJobs || []));
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const summaryCards = [
    { title: "Celkem uživatelů", value: stats.totalUsers, icon: Users, color: "text-blue-500", sparkData: dailyUsers },
    { title: "Aktivní zakázky", value: stats.activeJobs, icon: Briefcase, color: "text-primary", sparkData: dailyJobs },
    { title: "PRO členové", value: stats.proMembers, icon: Crown, color: "text-amber-500", sparkData: null },
    { title: "Tržby (CZK)", value: stats.totalRevenue, icon: CreditCard, color: "text-emerald-500", sparkData: null, isCurrency: true },
    { title: "Čekající hlášení", value: stats.pendingReports, icon: AlertTriangle, color: "text-orange-500", sparkData: null },
    { title: "Čekající ověření", value: stats.pendingVerifications, icon: ShieldCheck, color: "text-violet-500", sparkData: null },
  ];

  const quickActions = [
    { label: 'Správa uživatelů', desc: 'Zobrazit a spravovat uživatele', path: '/admin/uzivatele', icon: Users },
    { label: 'Verifikace', desc: `${stats.pendingVerifications} čekajících`, path: '/admin/verifikace', icon: CheckCircle },
    { label: 'Hlášení', desc: `${stats.pendingReports} nevyřešených`, path: '/admin/hlaseni', icon: AlertTriangle },
    { label: 'Odeslat notifikaci', desc: 'Push oznámení uživatelům', path: '/admin/notifikace', icon: Bell },
    { label: 'Vytvořit kupón', desc: 'Nový slevový kód', path: '/admin/kupony', icon: Ticket },
    { label: 'Analytika', desc: 'Statistiky platformy', path: '/admin/analytika', icon: CreditCard },
  ];

  const getUserTypeBadge = (type: string) => {
    switch (type) {
      case 'worker': return <Badge variant="default" className="text-[10px] font-medium">Pracovník</Badge>;
      case 'customer': return <Badge variant="secondary" className="text-[10px] font-medium">Zákazník</Badge>;
      default: return <Badge variant="outline" className="text-[10px] font-medium">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400 text-[10px] font-medium">Otevřená</Badge>;
      case 'in_progress': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-400 text-[10px] font-medium">Probíhá</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400 text-[10px] font-medium">Dokončená</Badge>;
      default: return <Badge variant="outline" className="text-[10px] font-medium">{status}</Badge>;
    }
  };

  // Build unified activity timeline
  const activityTimeline = useMemo(() => {
    const items = [
      ...recentUsers.map(u => ({
        id: u.id,
        type: 'user' as const,
        label: u.full_name,
        sub: u.user_type === 'worker' ? 'Nový pracovník' : 'Nový zákazník',
        icon: User,
        time: u.created_at,
      })),
      ...recentJobs.map(j => ({
        id: j.id,
        type: 'job' as const,
        label: j.title,
        sub: j.status === 'open' ? 'Nová zakázka' : j.status === 'completed' ? 'Dokončená' : 'Probíhá',
        icon: Briefcase,
        time: j.created_at,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
     .slice(0, 8);
    return items;
  }, [recentUsers, recentJobs]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Vítejte v administraci"
        subtitle="Systémový přehled a rychlé akce"
      />

      {/* Stat cards with sparklines */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.title} className="rounded-xl border border-border shadow-none hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-lg font-semibold text-foreground">
                  {(card as any).isCurrency
                    ? `${card.value.toLocaleString('cs-CZ')} Kč`
                    : card.value.toLocaleString('cs-CZ')}
                </div>
              )}
              {card.sparkData && card.sparkData.length > 0 && (
                <div className="h-8 mt-1 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={card.sparkData}>
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(90,50%,63%)"
                        strokeWidth={1.5}
                        fill="hsl(90,50%,63%)"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        {quickActions.map(action => (
          <Card 
            key={action.path} 
            className="cursor-pointer rounded-xl bg-card border-border hover:bg-muted/50 transition-all hover:shadow-sm group" 
            onClick={() => navigate(action.path)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[10px] text-card-foreground">{action.label}</p>
                <p className="text-[10px] text-muted-foreground">{action.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unified Activity Timeline */}
      <Card className="rounded-xl shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-foreground">Poslední aktivita</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)
          ) : activityTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádná aktivita</p>
          ) : (
            activityTimeline.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-2">
                <div className={`p-1.5 rounded-lg ${item.type === 'user' ? 'bg-blue-500/10' : 'bg-primary/10'}`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.type === 'user' ? 'text-blue-500' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                  <Clock className="h-3 w-3 opacity-50" />
                  {formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: cs })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
