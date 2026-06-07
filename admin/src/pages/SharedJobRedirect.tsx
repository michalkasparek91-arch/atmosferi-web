import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, User, Hexagon, Compass, CircleDot, MessageCircle, CalendarDays, Inbox, Settings, Coins, Flame } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SwipeableImageGallery, ImageLightbox } from "@/components/SwipeableImageGallery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import zrobeeLogo from "@/assets/zrobee-logo.svg";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkerJobCard } from "@/components/WorkerJobCard";

const fakeSidebarItems = [
  { title: "Hledej", icon: Compass },
  { title: "Nabídky", icon: Inbox },
  { title: "Probíhající", icon: CircleDot },
  { title: "Zprávy", icon: MessageCircle },
  { title: "Kalendář", icon: CalendarDays },
];

function SharedJobRedirect() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const run = async () => {
      if (!jobId) {
        navigate("/", { replace: true });
        return;
      }

      // 1. Fetch job data first so we know who owns it
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(jobId);
      let query = supabase
        .from('jobs')
        .select(`
          *,
          profiles!jobs_customer_id_fkey(full_name, avatar_url, phone),
          service_categories(name, icon),
          service_subcategories(name)
        `);
        
      if (isUuid) {
        query = query.eq('id', jobId);
      } else {
        query = query.eq('slug', jobId);
      }

      const { data: jobData, error } = await query.single();

      if (error || !jobData) {
        navigate('/');
        return;
      }

      // 2. Check auth session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setHasSession(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type, phone, company_type, is_admin")
          .eq("id", session.user.id)
          .single();

        if (profile?.is_admin) {
          navigate(`/remeslnik/zakazka/${jobId}`, { replace: true });
          return;
        }

        // Check if worker profile is complete
        const isWorker = profile?.user_type === "worker" || profile?.user_type === "both";
        
        if (isWorker) {
          // Check if onboarding is complete (has services)
          const { count } = await supabase
            .from("worker_services" as any)
            .select("*", { count: "exact", head: true })
            .eq("worker_id", session.user.id);

          const hasServices = (count || 0) > 0;
          const hasPhone = !!profile?.phone;
          const hasCompanyType = !!profile?.company_type;

          if (hasServices && hasPhone && hasCompanyType) {
            navigate(`/remeslnik/zakazka/${jobId}`, { replace: true });
            return;
          }

          // Incomplete worker — send to onboarding with sniper context
          localStorage.setItem("sniperJobId", jobId);
          navigate("/registrace-remeslnika", { replace: true, state: { from: `/sdilena-zakazka/${jobId}` } });
          return;
        }

        if (profile?.user_type === "customer") {
          // Only redirect to customer dashboard if they OWN the job
          if (jobData.customer_id === session.user.id) {
            navigate(`/zakaznik/zakazka/${jobId}`, { replace: true });
            return;
          }
          // If they don't own it, do not redirect. Just show the public view.
        } else if (!profile?.user_type) {
          // If no user_type (e.g. new Google user), send to Auth to pick a role
          localStorage.setItem("postAuthRedirect", `/sdilena-zakazka/${jobId}`);
          navigate("/prihlaseni", { replace: true });
          return;
        }
      }

      setJob(jobData);
      setLoading(false);
    };

    run();
  }, [jobId, navigate]);

  function handleApplyClick() {
    if (jobId) {
      localStorage.setItem("sniperJobId", jobId);
    }
    localStorage.setItem("postAuthRedirect", `/registrace-remeslnika`);
    navigate("/registrace-remeslnika", { state: { from: `/sdilena-zakazka/${jobId}` } });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Hexagon className="h-12 w-12 text-primary animate-spin" />
          <p className="mt-4 text-muted-foreground font-medium">Načítání zakázky...</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const IconComponent = getCategoryIcon(job?.service_categories?.icon || 'Wrench');

  return (
    <div className="h-screen overflow-hidden w-full bg-background flex">
      {/* Fake Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden md:flex md:flex-col w-[16.5rem] h-full bg-background z-50 relative">
          {/* Frosted overlay — starts below the logo */}
          <div className="absolute inset-0 top-[73px] bg-background/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="bg-primary/10 rounded-2xl p-6 text-center mx-4 border border-primary/20">
              <Hexagon className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground mb-1">Váš dashboard</p>
              <p className="text-xs text-muted-foreground mb-4">Zaregistrujte se a získejte přístup ke všem zakázkám</p>
              <Button size="sm" className="w-full text-xs" onClick={handleApplyClick}>
                Začít zdarma
              </Button>
            </div>
          </div>

          {/* Underlying sidebar structure (blurred behind overlay) */}
          {/* Logo + badge — above the frosted overlay (z-20) */}
          <div className="px-5 h-[73px] flex items-center bg-background relative z-20">
            <div className="flex flex-col items-end bg-[hsl(var(--list-item-header))] py-2 px-7 rounded-full">
              <img src={zrobeeLogo} alt="zrobee" className="h-6 logo-adaptive" />
              <span className="text-[9px] font-bold tracking-wider text-[hsl(var(--sidebar-active-text))] leading-none mt-1">PRACOVNÍK</span>
            </div>
          </div>
          <nav className="space-y-2 px-4 flex-1 mt-12">
            {fakeSidebarItems.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 pl-5 pr-[50px] py-3 rounded-full text-base font-medium text-muted-foreground"
              >
                <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
                <span>{item.title}</span>
              </div>
            ))}
          </nav>
          <div className="px-4 pb-6 mt-auto">
            <div className="w-full flex items-center justify-between p-4 rounded-3xl bg-primary/10 border border-primary/20 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                  <Coins className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Kreditový zůstatek</span>
                  <span className="text-sm font-bold text-foreground">— kreditů</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-5 pr-[50px] py-3 rounded-full text-base font-medium text-muted-foreground">
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span>Nastavení</span>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b border-border/40 w-full h-[73px] flex items-center justify-between px-4 sm:px-8 shrink-0">
          {isMobile && (
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={zrobeeLogo} alt="zrobee" className="h-7 logo-adaptive" />
            </Link>
          )}
          {!isMobile && <div />}
          <div className="flex items-center gap-3">
            {hasSession ? (
              <Button variant="ghost" onClick={() => navigate('/')} className="text-sm font-medium">
                Moje Nástěnka
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => {
                localStorage.setItem("postAuthRedirect", `/sdilena-zakazka/${jobId}`);
                sessionStorage.setItem("postAuthRedirect", `/sdilena-zakazka/${jobId}`);
                localStorage.setItem("sniperJobId", jobId || "");
                sessionStorage.setItem("sniperJobId", jobId || "");
                navigate('/prihlaseni');
              }} className="text-sm font-medium">
                Přihlásit se
              </Button>
            )}
            <Button onClick={handleApplyClick} className="text-sm font-semibold rounded-full px-6">
              Získat zakázku
            </Button>
          </div>
        </header>

        {/* Scrollable job content */}
        <main className="flex-1 overflow-y-auto px-3 md:px-6 pt-4 pb-32 md:pb-12">
          <div className="w-full max-w-5xl mx-auto">
            {/* Job Card — matching WorkerJobListings format */}
            <WorkerJobCard
              job={job}
              isPublicView={true}
              showFullDescription={true}
              onApply={handleApplyClick}
              onImageClick={(images, index) => {
                setLightboxIndex(index);
                setLightboxOpen(true);
              }}
            />

            {/* Motivational CTA below the card */}
            <div className="mt-6 bg-primary/5 rounded-2xl p-6 border border-primary/10 text-center">
              <h2 className="text-lg font-bold mb-1">Máte zájem o tuto zakázku?</h2>
              <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                Zaregistrujte se jako řemeslník a podejte svou nabídku. Registrace trvá jen minutu a je zdarma.
              </p>
              <Button 
                className="h-12 text-base font-bold rounded-xl px-8"
                onClick={handleApplyClick}
              >
                Zaregistrovat se a podat nabídku
              </Button>
            </div>
          </div>
        </main>

        {/* Mobile: Sticky bottom CTA bar */}
        {isMobile && (
          <div 
            className="fixed bottom-0 left-0 right-0 bg-background z-50 px-4 py-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{job.service_subcategories?.name}</p>
                <p className="text-[10px] text-muted-foreground">{job.city} · Krok 1 ze 3 — Vytvořte si účet</p>
              </div>
              <Button className="h-10 rounded-full px-5 text-sm font-semibold shrink-0" onClick={handleApplyClick}>
                Podat nabídku
              </Button>
            </div>
          </div>
        )}

        {/* Fake mobile bottom nav hint */}
        {isMobile && (
          <div 
            className="fixed bottom-[72px] left-0 right-0 bg-background/40 backdrop-blur-sm border-t border-border/30 z-40"
            style={{ paddingBottom: '0' }}
          >
            <div className="flex items-center justify-center h-14 px-1 opacity-30">
              {fakeSidebarItems.map((item) => (
                <div key={item.title} className="flex flex-col items-center justify-center gap-0.5 flex-1">
                  <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-[9px] text-muted-foreground">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox 
        images={job.photos || []} 
        initialIndex={lightboxIndex} 
        open={lightboxOpen} 
        onOpenChange={setLightboxOpen} 
      />
    </div>
  );
}

export default SharedJobRedirect;
