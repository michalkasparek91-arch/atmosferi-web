import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ChevronRight, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimePeriod = 'month' | 'year';

interface Stats {
  earnings: number;
  jobCount: number;
  previousEarnings?: number;
  previousJobCount?: number;
  responseRate?: number;
  previousResponseRate?: number;
}

interface MonthlyEarning {
  month: string;
  earnings: number;
}

const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
const MONTHS_SHORT = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];

// Earning Goal configuration
const MONTHLY_GOAL = 50000;
const YEARLY_GOAL = 600000;

export const BusinessStatsCard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TimePeriod>('month');
  
  // Historical selectors
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const [stats, setStats] = useState<Stats>({ earnings: 0, jobCount: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyEarning[]>([]);
  const [loading, setLoading] = useState(true);

  // Available years for dropdown (e.g. from 2024 to current)
  const availableYears = Array.from(
    { length: new Date().getFullYear() - 2023 }, 
    (_, i) => 2024 + i
  ).reverse();

  useEffect(() => {
    loadStats();
    loadSparklineData();
  }, [period, selectedYear, selectedMonth]);

  const loadSparklineData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let startDate: Date;
    let endDate: Date;
    
    if (period === 'month') {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
    }

    const { data: offers } = await supabase
      .from('offers')
      .select(`id, price, jobs!inner(final_price, status, updated_at)`)
      .eq('worker_id', session.user.id)
      .eq('status', 'accepted')
      .eq('jobs.status', 'completed')
      .gte('jobs.updated_at', startDate.toISOString())
      .lte('jobs.updated_at', endDate.toISOString());

    if (period === 'year') {
      const monthMap: Record<string, number> = {};
      
      for (let i = 0; i < 12; i++) {
        monthMap[i.toString()] = 0;
      }

      offers?.forEach((offer: any) => {
        const date = new Date((offer.jobs as any)?.updated_at);
        const key = date.getMonth().toString();
        const price = (offer.jobs as any)?.final_price || offer.price || 0;
        monthMap[key] += Number(price);
      });

      const data: MonthlyEarning[] = Object.entries(monthMap).map(([key, earnings]) => {
        return { month: MONTHS_SHORT[Number(key)], earnings };
      });
      setMonthlyData(data);
    } else {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const dayMap: Record<string, number> = {};
      
      for (let i = 1; i <= daysInMonth; i++) {
        dayMap[i.toString()] = 0;
      }

      offers?.forEach((offer: any) => {
        const date = new Date((offer.jobs as any)?.updated_at);
        const key = date.getDate().toString();
        const price = (offer.jobs as any)?.final_price || offer.price || 0;
        dayMap[key] += Number(price);
      });

      const data: MonthlyEarning[] = Object.entries(dayMap).map(([key, earnings]) => {
        return { month: `${key}.`, earnings };
      });
      setMonthlyData(data);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    
    if (period === 'month') {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
      
      previousStartDate = new Date(selectedYear, selectedMonth - 1, 1);
      previousEndDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
      
      previousStartDate = new Date(selectedYear - 1, 0, 1);
      previousEndDate = new Date(selectedYear - 1, 11, 31, 23, 59, 59);
    }

    const { data: currentOffers } = await supabase
      .from('offers')
      .select(`id, price, job_id, updated_at, jobs!inner(final_price, status, updated_at)`)
      .eq('worker_id', session.user.id)
      .eq('status', 'accepted')
      .eq('jobs.status', 'completed')
      .gte('jobs.updated_at', startDate.toISOString())
      .lte('jobs.updated_at', endDate.toISOString());

    const { data: previousOffers } = await supabase
      .from('offers')
      .select(`id, price, job_id, updated_at, jobs!inner(final_price, status, updated_at)`)
      .eq('worker_id', session.user.id)
      .eq('status', 'accepted')
      .eq('jobs.status', 'completed')
      .gte('jobs.updated_at', previousStartDate.toISOString())
      .lte('jobs.updated_at', previousEndDate.toISOString());

    // Response rate queries
    const { count: currentTotalOffers } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', session.user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { count: currentAcceptedOffers } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', session.user.id)
      .in('status', ['accepted', 'completed'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { count: prevTotalOffers } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', session.user.id)
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString());

    const { count: prevAcceptedOffers } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', session.user.id)
      .in('status', ['accepted', 'completed'])
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString());

    const calculateEarnings = (offers: any[] | null) => {
      if (!offers) return 0;
      return offers.reduce((sum, offer) => {
        const price = (offer.jobs as any)?.final_price || offer.price || 0;
        return sum + Number(price);
      }, 0);
    };

    const responseRate = (currentTotalOffers && currentTotalOffers > 0)
      ? Math.round(((currentAcceptedOffers || 0) / currentTotalOffers) * 100)
      : 0;

    const prevResponseRate = (prevTotalOffers && prevTotalOffers > 0)
      ? Math.round(((prevAcceptedOffers || 0) / prevTotalOffers) * 100)
      : 0;

    setStats({
      earnings: calculateEarnings(currentOffers),
      jobCount: currentOffers?.length || 0,
      previousEarnings: calculateEarnings(previousOffers),
      previousJobCount: previousOffers?.length || 0,
      responseRate,
      previousResponseRate: prevResponseRate,
    });

    setLoading(false);
  };

  const calculatePercentChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const earningsChange = calculatePercentChange(stats.earnings, stats.previousEarnings);
  const jobsChange = calculatePercentChange(stats.jobCount, stats.previousJobCount);
  const responseChange = calculatePercentChange(stats.responseRate || 0, stats.previousResponseRate);

  const hasSparklineData = monthlyData.some(d => d.earnings > 0);
  
  const currentGoal = period === 'month' ? MONTHLY_GOAL : YEARLY_GOAL;
  const goalProgress = Math.min(100, Math.round((stats.earnings / currentGoal) * 100));

  return (
    <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
      <CardContent className="p-5">
        {/* Header with Period Toggle & Historical Selectors */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Můj přehled</span>
            </div>
            
            <div className="flex bg-muted/50 rounded-full p-0.5">
              {(['month', 'year'] as TimePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-all",
                    period === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === 'month' ? 'MĚSÍC' : 'ROK'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {period === 'month' && (
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="h-7 text-xs border-border/50 bg-muted/20 w-auto rounded-full px-3">
                  <SelectValue placeholder="Měsíc" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="h-7 text-xs border-border/50 bg-muted/20 w-auto rounded-full px-3">
                <SelectValue placeholder="Rok" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {/* Earnings */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2 relative overflow-visible group">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vyděláno</p>
              <div className="absolute right-3 -top-1">
                <GoalRing progress={goalProgress} />
              </div>
            </div>
            {loading ? (
              <div className="h-7 bg-muted/50 rounded animate-pulse" />
            ) : (
              <div>
                <div className="flex items-baseline gap-0.5 mt-2">
                  <span className="text-lg font-bold text-foreground">
                    <AnimatedNumber value={stats.earnings} />
                  </span>
                  <span className="text-xs text-muted-foreground">Kč</span>
                </div>
                <TrendIndicator value={earningsChange} />
              </div>
            )}
          </div>

          {/* Job Count */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2 relative overflow-hidden group">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Zakázek</p>
            {loading ? (
              <div className="h-7 bg-muted/50 rounded animate-pulse" />
            ) : (
              <div>
                <span className="text-lg font-bold text-foreground inline-block mt-2">
                  <AnimatedNumber value={stats.jobCount} />
                </span>
                <TrendIndicator value={jobsChange} />
              </div>
            )}
          </div>

          {/* Response Rate */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2 relative overflow-hidden group">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Úspěšnost</p>
            {loading ? (
              <div className="h-7 bg-muted/50 rounded animate-pulse" />
            ) : (
              <div>
                <div className="flex items-baseline gap-0.5 mt-2">
                  <span className="text-lg font-bold text-foreground">
                    <AnimatedNumber value={stats.responseRate || 0} />
                  </span>
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <TrendIndicator value={responseChange} />
              </div>
            )}
          </div>
        </div>

        {/* Sparkline / Bar Chart */}
        {hasSparklineData && (
          <div className="h-[72px] w-full mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              {period === 'year' ? (
                <BarChart data={monthlyData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as MonthlyEarning;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-1.5 shadow-lg">
                          <p className="text-xs font-medium text-foreground">
                            {data.month}: {new Intl.NumberFormat('cs-CZ').format(data.earnings)} Kč
                          </p>
                        </div>
                      );
                    }}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  />
                  <Bar dataKey="earnings" radius={[2, 2, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.earnings > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={monthlyData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as MonthlyEarning;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-1.5 shadow-lg">
                          <p className="text-xs font-medium text-foreground">
                            {data.month}: {new Intl.NumberFormat('cs-CZ').format(data.earnings)} Kč
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Invoice Link */}
        <button
          onClick={() => navigate('/remeslnik/fakturace')}
          className="w-full flex items-center justify-end gap-1 mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span>PŘEJÍT NA FAKTURACI</span>
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </CardContent>
    </Card>
  );
};

// Sub-components

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) {
    return <div className="mt-1"><span className="text-[10px] text-muted-foreground">—</span></div>;
  }
  const isPositive = value > 0;
  return (
    <div className="mt-1">
      <span className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded-sm",
        isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      )}>
        {isPositive ? '↑' : '↓'} {Math.abs(value)}%
      </span>
    </div>
  );
}

function GoalRing({ progress }: { progress: number }) {
  const radius = 8;
  const stroke = 2.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = Math.max(0, circumference - (progress / 100) * circumference);
  
  return (
    <div className="relative group/goal flex items-center justify-center mt-3 cursor-pointer">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} className="text-muted/30" r={normalizedRadius} cx={radius} cy={radius} />
        <circle 
          stroke="currentColor" 
          fill="transparent" 
          strokeWidth={stroke} 
          strokeDasharray={circumference + ' ' + circumference} 
          style={{ strokeDashoffset }} 
          strokeLinecap="round" 
          className="text-primary transition-all duration-1000 ease-out" 
          r={normalizedRadius} 
          cx={radius} 
          cy={radius} 
        />
      </svg>
      {/* Tooltip on hover */}
      <div className="absolute hidden group-hover/goal:flex -top-8 right-0 bg-popover text-popover-foreground text-[10px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-10 border pointer-events-none">
        Splněný cíl: {progress}%
      </div>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const duration = 800; // 0.8s animation
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(ease * value));
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    animationFrame = window.requestAnimationFrame(step);
    
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(displayValue)}</>;
}

export default BusinessStatsCard;
