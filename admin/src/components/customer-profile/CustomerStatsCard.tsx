import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Stats {
  openJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  totalSpent: number;
}

export const CustomerStatsCard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ 
    openJobs: 0, 
    inProgressJobs: 0, 
    completedJobs: 0,
    totalSpent: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    // Get jobs by status
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, status, final_price')
      .eq('customer_id', session.user.id);

    if (jobs) {
      const openJobs = jobs.filter(j => j.status === 'open').length;
      const inProgressJobs = jobs.filter(j => j.status === 'in_progress' || j.status === 'pending_approval').length;
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const totalSpent = jobs
        .filter(j => j.status === 'completed' && j.final_price)
        .reduce((sum, j) => sum + Number(j.final_price), 0);

      setStats({
        openJobs,
        inProgressJobs,
        completedJobs,
        totalSpent
      });
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="border-border/50 shadow-sm bg-card rounded-2xl">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">MŮJ PŘEHLED</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Open Jobs */}
          <button 
            onClick={() => navigate('/zakaznik/poptavky')}
            className="text-left group"
          >
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">OTEVŘENÉ</p>
              {loading ? (
                <div className="h-8 bg-muted/50 rounded animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{stats.openJobs}</span>
                  <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              )}
            </div>
          </button>

          {/* In Progress */}
          <button 
            onClick={() => navigate('/zakaznik/prehled')}
            className="text-left group"
          >
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">PROBÍHAJÍCÍ</p>
              {loading ? (
                <div className="h-8 bg-muted/50 rounded animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{stats.inProgressJobs}</span>
                </div>
              )}
            </div>
          </button>

          {/* Completed */}
          <button 
            onClick={() => navigate('/zakaznik/prehled?status=completed')}
            className="text-left group"
          >
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">DOKONČENÉ</p>
              {loading ? (
                <div className="h-8 bg-muted/50 rounded animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{stats.completedJobs}</span>
                  <CheckCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Total Spent */}
        <div className="pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CELKEM UTRACENO</p>
              {loading ? (
                <div className="h-6 w-24 bg-muted/50 rounded animate-pulse mt-1" />
              ) : (
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold text-foreground">{formatCurrency(stats.totalSpent)}</span>
                  <span className="text-sm text-muted-foreground">Kč</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/zakaznik/prehled?status=completed')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span>HISTORIE</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerStatsCard;
