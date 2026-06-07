import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface CategoryData {
  name: string;
  amount: number;
}

export function CategoryBreakdownChart() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: jobs } = await supabase
      .from("jobs")
      .select("category_id, final_price")
      .eq("customer_id", session.user.id)
      .eq("status", "completed")
      .not("final_price", "is", null);

    if (!jobs?.length) { setLoading(false); return; }

    // Get unique category IDs
    const categoryIds = [...new Set(jobs.map(j => j.category_id))];
    const { data: categories } = await supabase
      .from("service_categories")
      .select("id, name")
      .in("id", categoryIds);

    const categoryMap = new Map((categories || []).map(c => [c.id, c.name]));

    // Group spending by category
    const grouped = new Map<string, number>();
    for (const job of jobs) {
      const catName = categoryMap.get(job.category_id) || "Ostatní";
      grouped.set(catName, (grouped.get(catName) || 0) + Number(job.final_price));
    }

    const sorted = [...grouped.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    setData(sorted);
    setLoading(false);
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

  // Generate opacity variants of primary
  const getBarColor = (index: number) => {
    const opacity = 1 - index * 0.15;
    return `hsl(var(--primary) / ${opacity})`;
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

  if (!data.length) {
    return (
      <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
        <CardContent className="p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">VÝDAJE DLE KATEGORIE</p>
          <div className="flex items-center justify-center h-[140px]">
            <p className="text-sm text-muted-foreground">Zatím žádná data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
      <CardContent className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">VÝDAJE DLE KATEGORIE</p>

        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis 
                type="number" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : `${v}`}
              />
              <YAxis 
                type="category" 
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((_, index) => (
                  <Cell key={index} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
