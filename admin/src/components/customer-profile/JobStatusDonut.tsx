import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export function JobStatusDonut() {
  const [data, setData] = useState<StatusData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: jobs } = await supabase
      .from("jobs")
      .select("status")
      .eq("customer_id", session.user.id);

    if (jobs) {
      const open = jobs.filter(j => j.status === "open").length;
      const inProgress = jobs.filter(j => j.status === "in_progress" || j.status === "pending_approval").length;
      const completed = jobs.filter(j => j.status === "completed").length;
      setTotal(open + inProgress + completed);
      setData([
        { name: "Otevřené", value: open, color: "hsl(var(--primary))" },
        { name: "Probíhající", value: inProgress, color: "hsl(var(--accent-foreground))" },
        { name: "Dokončené", value: completed, color: "hsl(var(--muted-foreground))" },
      ].filter(d => d.value > 0));
    }
    setLoading(false);
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

  if (total === 0) {
    return (
      <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
        <CardContent className="p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">STAV ZAKÁZEK</p>
          <div className="flex items-center justify-center h-[160px]">
            <p className="text-sm text-muted-foreground">Zatím žádné zakázky</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = total > 0 ? Math.round((data.find(d => d.name === "Dokončené")?.value || 0) / total * 100) : 0;

  return (
    <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
      <CardContent className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">STAV ZAKÁZEK</p>
        
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative w-[130px] h-[130px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={58}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Hotovo</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2.5">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
