import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  HelpCircle, 
  User, 
  ChevronRight, 
  Plus,
  Sun,
  Moon,
  Settings,
  Briefcase,
  FileText
} from "lucide-react";
import { CustomerStatsCard, JobStatusDonut, SpendingChart, CategoryBreakdownChart } from "./customer-profile";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { useQuery } from "@tanstack/react-query";

export function CustomerProfileMenu() {
  const navigate = useNavigate();
  const { profile, isLoading: loading } = useProfile();
  
  const { data: stats = { totalJobs: 0, yearsActive: 1 } } = useQuery({
    queryKey: ['customer-profile-stats', profile?.id],
    queryFn: async () => {
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', profile!.id);
      return { totalJobs: jobsCount || 0, yearsActive: 1 };
    },
    enabled: !!profile?.id,
  });

  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );

  const getInitials = () => {
    if (!profile?.full_name) return "U";
    return profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 rounded-full bg-muted animate-pulse" />
            <div className="mt-4 h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="mt-2 h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex justify-center gap-8">
            <div className="h-16 w-20 bg-muted rounded animate-pulse" />
            <div className="h-16 w-20 bg-muted rounded animate-pulse" />
            <div className="h-16 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-3 md:px-0 md:pr-2 py-6">
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Left Column - Profile & Actions */}
          <div className="flex-1 space-y-5">
            {/* Hero Profile Card */}
            <button
              onClick={() => navigate('/zakaznik/nastaveni')}
              className="relative w-full overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group text-left"
            >
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_50%_50%,_hsl(var(--foreground))_1px,_transparent_1px)] bg-[size:24px_24px]" />
              
              <div className="relative p-6">
                <div className="flex items-center gap-5">
                  {/* Avatar with glow effect */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-sm group-hover:from-primary/30 group-hover:to-primary/10 transition-all" />
                    <Avatar className="relative h-20 w-20 border-2 border-primary/20 shadow-lg ring-2 ring-background">
              <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground truncate">
                {profile?.full_name || "Vaše jméno"}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {[profile?.city, profile?.country].filter(Boolean).join(', ') || "Nastavte lokaci"}
            </p>
                    
                    {/* Inline Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ČLENSTVÍ</span>
                        <span className="font-semibold text-foreground">{stats.yearsActive} {stats.yearsActive === 1 ? 'rok' : 'roky'}</span>
                      </div>
                      <div className="w-px h-6 bg-border/50" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ZAKÁZEK</span>
                        <span className="font-semibold text-foreground">{stats.totalJobs} celkem</span>
                      </div>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </button>

            {/* Quick Actions - Compact Row */}
            <div className="grid grid-cols-2 gap-3">
              <CompactActionCard
                icon={<Plus className="h-4 w-4" />}
                title="Nová zakázka"
                subtitle="Vytvořte novou poptávku"
                onClick={() => navigate('/zakaznik/nova-zakazka')}
                linkText="VYTVOŘIT"
                accent
              />
              <CompactActionCard
                icon={<Briefcase className="h-4 w-4" />}
                title="Probíhající"
                subtitle="Aktivní zakázky"
                onClick={() => navigate('/zakaznik/prehled')}
                linkText="ZOBRAZIT"
              />
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-3">
              <CompactActionCard
                icon={<FileText className="h-4 w-4" />}
                title="Poptávky"
                subtitle="Nabídky řemeslníků"
                onClick={() => navigate('/zakaznik/poptavky')}
                linkText="OTEVŘÍT"
              />
              <CompactActionCard
                icon={<User className="h-4 w-4" />}
                title="Dokončené"
                subtitle="Historie zakázek"
                onClick={() => navigate('/zakaznik/prehled?status=completed')}
                linkText="ZOBRAZIT"
              />
            </div>
          </div>

          {/* Right Column - Stats (desktop) */}
          <div className="lg:w-[380px] mt-5 lg:mt-0 space-y-5">
            {/* Customer Stats Card */}
            <CustomerStatsCard />

            {/* Job Status Donut */}
            <JobStatusDonut />

          </div>
        </div>

        {/* Charts Section - Full Width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <SpendingChart />
          <CategoryBreakdownChart />
        </div>
      </div>
    </div>
  );
}

// Compact Action Card Component
interface CompactActionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  linkText: string;
  accent?: boolean;
}

function CompactActionCard({ icon, title, subtitle, onClick, linkText, accent }: CompactActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col p-4 rounded-2xl border transition-all duration-200 group text-left",
        accent 
          ? "bg-card border-border/50 hover:border-primary/30"
          : "bg-card border-border/50 hover:border-primary/30"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
        accent ? "bg-primary/10" : "bg-muted"
      )}>
        <span className={accent ? "text-primary" : "text-foreground"}>{icon}</span>
      </div>
      <p className="font-semibold text-sm text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">{subtitle}</p>
      <div className="mt-auto flex items-center gap-1 text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        <span>{linkText}</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
}

// Menu Link Component
interface MenuLinkProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function MenuLink({ icon, label, onClick }: MenuLinkProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {icon}
        </span>
        <span className="font-medium text-foreground text-sm">
          {label}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

export default CustomerProfileMenu;
