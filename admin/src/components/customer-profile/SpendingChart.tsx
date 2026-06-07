import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface MonthData {
  month: string;
  amount: number;
}

export function SpendingChart() {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const { data: jobs } = await supabase
      .from("jobs")
      .select("created_at, final_price")
      .eq("customer_id", session.user.id)
      .eq("status", "completed")
      .gte("created_at", sixMonthsAgo.toISOString())
      .not("final_price", "is", null);

    // Build 6 months of data
    const months: MonthData[] = [];
    const monthNames = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = monthNames[d.getMonth()];
      
      const monthTotal = (jobs || [])
        .filter(j => j.created_at?.startsWith(key))
        .reduce((sum, j) => sum + Number(j.final_price || 0), 0);
      
      months.push({ month: label, amount: monthTotal });
    }

    setData(months);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return `${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            {new Intl.NumberFormat("cs-CZ").format(payload[0].value)} Kč
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
        <CardContent className="p-5">
          <div className="h-[200px] bg-muted/50 rounded-xl animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.amount > 0);

  return (
    <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">MĚSÍČNÍ VÝDAJE</p>
          <p className="text-[10px] text-muted-foreground">Posledních 6 měsíců</p>
        </div>

        {!hasData ? (
          <div className="flex items-center justify-center h-[160px]">
            <p className="text-sm text-muted-foreground">Zatím žádné výdaje</p>
          </div>
        ) : (
          <div className="h-[180px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#spendingGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
