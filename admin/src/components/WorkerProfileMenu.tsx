import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  ChevronRight, 
  Award,
  Sparkles,
  Phone as PhoneIcon,
  ShieldCheck,
  Camera,
  FileText,
  Pencil,
  BarChart3,
  Briefcase,
  PlusCircle,
  Globe,
  type LucideIcon
} from "lucide-react";
import { WorkerShareDialog } from "./WorkerShareDialog";
import { WorkerVerificationCard } from "./WorkerVerificationCard";
import { ReputationCard, BusinessStatsCard, CreditsCard, PromotionCard, type BadgeData } from "./worker-profile";
import PointsPurchaseDialog from "./PointsPurchaseDialog";
import { ReferralDialog } from "./worker-profile/ReferralDialog";
import { cn } from "@/lib/utils";
import { PublicWorkerProfileCard } from "./PublicWorkerProfileCard";
import { useProfile } from "@/hooks/use-profile";

interface WorkerProfileMenuProps {
  onPointsClick?: () => void;
}

export function WorkerProfileMenu({ onPointsClick }: WorkerProfileMenuProps) {
  const navigate = useNavigate();
  const { profile: unifiedProfile, isLoading: profileLoading, invalidateProfile } = useProfile();
  const [stats, setStats] = useState({
    completedJobs: 0,
    reviews: 0,
    yearsActive: 0,
    medianRating: 0
  });
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('unverified');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (unifiedProfile?.id) {
      loadStatsAndBadges(unifiedProfile.id);
    }
  }, [unifiedProfile?.id]);
  
  const loadStatsAndBadges = async (userId: string) => {
    setLoadingStats(true);
    try {
      const createdAt = new Date((unifiedProfile as any).created_at || Date.now());
      const now = new Date();
      const yearsActive = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', userId);

      const { data: completedJobsData } = await supabase
        .from('offers')
        .select('id')
        .eq('worker_id', userId)
        .eq('status', 'completed');

      const reviewCount = reviewsData?.length || 0;
      const completedCount = completedJobsData?.length || 0;
      
      let medianRating = 0;
      if (reviewsData && reviewsData.length > 0) {
        const sortedRatings = reviewsData.map(r => r.rating).sort((a, b) => a - b);
        const mid = Math.floor(sortedRatings.length / 2);
        medianRating = sortedRatings.length % 2 !== 0
          ? sortedRatings[mid]
          : (sortedRatings[mid - 1] + sortedRatings[mid]) / 2;
      }

      setStats({
        completedJobs: completedCount,
        reviews: reviewCount,
        yearsActive,
        medianRating
      });

      const { data: verificationData } = await supabase
        .from('worker_verifications')
        .select('status')
        .eq('worker_id', userId)
        .single();
      
      const vStatus = verificationData?.status || 'unverified';
      setVerificationStatus(vStatus);

      const earnedBadges: BadgeData[] = [
        {
          id: 'verified',
          name: 'Ověřený profil',
          description: 'Identita ověřena administrátorem',
          icon: 'shield-check',
          category: 'trust',
          earned: vStatus === 'verified'
        },
        {
          id: 'phone-verified',
          name: 'Ověřený telefon',
          description: 'Telefonní číslo bylo ověřeno',
          icon: 'phone',
          category: 'trust',
          earned: unifiedProfile?.phone_verified || false
        },
        {
          id: 'top-rated',
          name: 'Top kvalita',
          description: 'Medián hodnocení 4.5+ hvězd',
          icon: 'star',
          category: 'quality',
          earned: medianRating >= 4.5
        },
        {
          id: 'rising-star',
          name: 'Talent',
          description: '1–9 zakázek s hodnocením 4.0+',
          icon: 'zap',
          category: 'quality',
          earned: completedCount >= 1 && completedCount < 10 && medianRating >= 4.0
        },
        {
          id: 'experienced',
          name: 'Profík',
          description: '10+ dokončených zakázek',
          icon: 'trophy',
          category: 'experience',
          earned: completedCount >= 10
        },
        {
          id: 'veteran',
          name: 'Stálice',
          description: 'Aktivní na platformě 2+ roky',
          icon: 'award',
          category: 'experience',
          earned: yearsActive >= 2
        },
        {
          id: 'superstar',
          name: 'Elita',
          description: '50+ zakázek s hodnocením 4.8+',
          icon: 'sparkles',
          category: 'quality',
          earned: completedCount >= 50 && medianRating >= 4.8
        }
      ];

      setBadges(earnedBadges);
    } catch (err) {
      console.error('[Profile] Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };


  if (profileLoading || (unifiedProfile && loadingStats)) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 rounded-full bg-muted animate-pulse" />
            <div className="mt-4 h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="mt-2 h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const calculateCompletion = () => {
    if (!unifiedProfile) return 0;
    let score = 20; // Base account creation
    if (unifiedProfile.full_name) score += 10;
    if (unifiedProfile.phone) score += 15;
    if (unifiedProfile.city) score += 15;
    if (unifiedProfile.avatar_url) score += 20;
    if (unifiedProfile.bio && unifiedProfile.bio.length > 10) score += 20;
    return score;
  };

  const completionScore = calculateCompletion();

  return (
    <div className="min-h-screen px-3 md:px-0 md:pr-2 pt-8 pb-6">
      
      {unifiedProfile && (
        <div 
          onClick={() => navigate('/remeslnik/profil/upravit')}
          className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary/20 w-16 h-16 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {completionScore === 100 ? "Váš profil je 100% kompletní!" : `Váš profil je vyplněn na ${completionScore} %`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {completionScore === 100 ? "Skvělá práce, zákazníci vás snadno najdou." : "Získejte lepší dosah a více zakázek"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="relative z-10">
            {/* simple custom progress bar to avoid import issues */}
            <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out" 
                style={{ width: `${completionScore}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Left Column — Business Cockpit */}
          <div className="flex-1 space-y-5">
            {/* Credits & Quick Actions - 50/50 split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CreditsCard 
                points={unifiedProfile?.points || 0} 
                isPro={unifiedProfile?.is_pro}
                onTopUp={() => setPointsDialogOpen(true)}
                onReferral={() => setReferralDialogOpen(true)}
              />

              {/* Mobile Profile Card — Embedded Preview */}
              <div className="lg:hidden w-full order-2 md:order-none">
                <PublicWorkerProfileCard 
                  workerId={unifiedProfile?.id || ""} 
                  isEmbedded={true}
                  showShadow={false}
                  badges={badges}
                  showEditButton={true}
                />
              </div>

              {/* Quick Actions moved here */}
              <div className="grid grid-cols-1 gap-2 order-3 md:order-none">
                <QuickActionCard
                  icon={Briefcase}
                  title="Historie"
                  subtitle="Historie vašich prací"
                  badge={stats.completedJobs > 0 ? `${stats.completedJobs} dokončených` : undefined}
                  onClick={() => navigate('/remeslnik/profil/prace')}
                />
                <QuickActionCard
                  icon={PlusCircle}
                  title="Nová zakázka"
                  subtitle="Založit a sdílet s klientem"
                  onClick={() => setShareDialogOpen(true)}
                  accent
                />
                <QuickActionCard
                  icon={Pencil}
                  title="Upravit profil"
                  subtitle="Foto, popis, služby"
                  onClick={() => navigate('/remeslnik/profil/upravit')}
                />
                <QuickActionCard
                  icon={BarChart3}
                  title="Statistiky"
                  subtitle="Výdělky a fakturace"
                  onClick={() => navigate('/remeslnik/fakturace')}
                />
                <QuickActionCard
                  icon={Globe}
                  title="Můj odznak"
                  subtitle="Odznak na váš web"
                  onClick={() => navigate('/remeslnik/nastaveni', { state: { activeTab: 'badge' } })}
                />
              </div>
            </div>

            {/* Promotion, Business Stats & Reputation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <PromotionCard 
                isPro={unifiedProfile?.is_pro || false}
                isPromoted={unifiedProfile?.is_promoted || false}
                userId={unifiedProfile?.id}
                onToggle={(val) => invalidateProfile()}
                onUpgradeClick={() => setPointsDialogOpen(true)}
              />
              <BusinessStatsCard />
              
              <div className="md:col-span-2">
                <ReputationCard 
                  currentXp={unifiedProfile?.xp_total} 
                  currentLevel={unifiedProfile?.current_level}
                  badges={badges}
                  todoItems={[
                    ...(verificationStatus !== 'verified' ? [{
                      label: 'Získejte odznak OVĚŘENO',
                      done: false,
                      icon: <ShieldCheck className="h-3.5 w-3.5" />,
                      action: () => navigate('/remeslnik/verifikace'),
                    }] : []),
                    ...(!unifiedProfile?.phone_verified ? [{
                      label: 'Ověřte telefonní číslo',
                      done: false,
                      icon: <PhoneIcon className="h-3.5 w-3.5" />,
                      action: () => navigate('/remeslnik/nastaveni'),
                    }] : []),
                    ...(!unifiedProfile?.bio ? [{
                      label: 'Přidejte popis profilu',
                      done: false,
                      icon: <FileText className="h-3.5 w-3.5" />,
                      action: () => navigate('/remeslnik/profil/upravit'),
                    }] : []),
                    ...(!unifiedProfile?.portfolio_photos?.length ? [{
                      label: 'Nahrajte fotky předchozích prací',
                      done: false,
                      icon: <Camera className="h-3.5 w-3.5" />,
                      action: () => navigate('/remeslnik/profil/upravit'),
                    }] : []),
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Right Column — Growth Tools */}
          <div className="hidden lg:block lg:w-[380px] mt-5 lg:mt-0 space-y-5">
            {/* Hero Profile Card — Embedded Preview */}
            <div className="w-full">
              <PublicWorkerProfileCard 
                workerId={unifiedProfile?.id || ""} 
                isEmbedded={true}
                showShadow={false}
                badges={badges}
                showEditButton={true}
              />
            </div>
            
            {/* Zrobee Widget pro weby */}
            <div className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                Vložte si odznak na svůj web
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Zkopírujte si tento kód a vložte jej na své webové stránky.
              </p>
              
              <div className="flex flex-col items-center justify-center bg-muted/20 p-3 rounded-xl border border-dashed mb-4">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Náhled widgetu</div>
                {unifiedProfile?.slug ? (
                  <iframe 
                    src={`/widget/${unifiedProfile.slug}`} 
                    width="300" 
                    height="135" 
                    style={{ border: "none", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-4">Musíte mít nastavený veřejný profil.</div>
                )}
              </div>

              <div>
                <Label className="text-xs mb-1 block">Váš HTML kód:</Label>
                <div className="relative">
                  <pre className="p-2.5 bg-muted rounded-lg text-[9px] overflow-x-auto border text-muted-foreground font-mono whitespace-pre-wrap word-break">
                    {`<iframe src="https://zrobee.cz/widget/${unifiedProfile?.slug || 'vas-slug'}" width="300" height="135" style="border:none; border-radius: 12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"></iframe>`}
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-1.5 right-1.5 h-6 px-2 text-[10px]"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://zrobee.cz/widget/${unifiedProfile?.slug || 'vas-slug'}" width="300" height="135" style="border:none; border-radius: 12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"></iframe>`);
                      import("sonner").then(module => module.toast.success("Kód zkopírován"));
                    }}
                  >
                    Kopírovat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      <WorkerShareDialog 
        open={shareDialogOpen} 
        onOpenChange={setShareDialogOpen}
        workerId={unifiedProfile?.id || ""}
        workerName={unifiedProfile?.full_name || ""}
      />

      <PointsPurchaseDialog
        open={pointsDialogOpen}
        onOpenChange={setPointsDialogOpen}
        currentPoints={unifiedProfile?.points || 0}
        onPurchaseComplete={invalidateProfile}
      />

      <ReferralDialog
        open={referralDialogOpen}
        onOpenChange={setReferralDialogOpen}
      />
    </div>
  );
}

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
  onClick: () => void;
  accent?: boolean;
}

function QuickActionCard({ icon: Icon, title, subtitle, badge, onClick, accent }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 group text-left",
        "bg-card border-border/50 hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/10 group-hover:text-foreground text-muted-foreground">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {title}
          </p>
          {badge && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

