import { useEffect, useState, useRef, Suspense } from "react";
import { useNavigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { getPageTitle } from "@/lib/page-titles";
import PointsPurchaseDialog from "@/components/PointsPurchaseDialog";
import { WorkerSidebar } from "@/components/WorkerSidebar";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import zrobeeLogo from "@/assets/zrobee-logo.svg";
import { NotificationInbox } from "./NotificationInbox";
import UserMenu from "./UserMenu";
import { usePushNotificationPrompt } from "@/hooks/use-push-notification-prompt";
import { toast } from "@/hooks/use-toast";
import ContentLoader from "@/components/ContentLoader";
import { useProfile } from "@/hooks/use-profile";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import { safeGoBack } from "@/utils/navigation";


export function WorkerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const { profile, invalidateProfile } = useProfile();
  const userPoints = profile?.points || 0;
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const paymentProcessedRef = useRef(false);
  const [pwaPromptDismissed, setPwaPromptDismissed] = useState(() => {
    // If app is already installed (standalone), skip waiting for PWA prompt
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  });

  // Sync existing push permission (no prompt)
  usePushNotificationPrompt();

  // Listen for open-points-purchase event (from notifications, insufficient points modal, etc.)
  useEffect(() => {
    const handler = () => setPointsDialogOpen(true);
    window.addEventListener("open-points-purchase", handler);
    return () => window.removeEventListener("open-points-purchase", handler);
  }, []);

  useEffect(() => {
    checkUser();
    // Persist last active role for redirect logic
    localStorage.setItem("last_role", "worker");
  }, []);

  // Handle payment success/cancel from URL params - in WorkerLayout for reliability
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const pointsParam = searchParams.get('points');
    const sessionId = searchParams.get('session_id');
    
    if (paymentStatus === 'success' && pointsParam && sessionId && !paymentProcessedRef.current) {
      paymentProcessedRef.current = true;
      const points = parseInt(pointsParam);
      handlePaymentSuccess(points, sessionId);
      // Clear URL params immediately
      searchParams.delete('payment');
      searchParams.delete('points');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Platba zrušena",
        description: "Platba byla zrušena. Můžete to zkusit znovu.",
        variant: "destructive",
      });
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (points: number, sessionId: string) => {
    console.log('[WorkerLayout] Processing payment success:', { points, sessionId });
    try {
      // Call edge function to process payment server-side
      // This handles: points addition, purchase record, invoice, referral rewards
      console.log('[WorkerLayout] Calling process-payment-success edge function...');
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-payment-success', {
        body: { sessionId },
      });

      if (processError) {
        console.error('[WorkerLayout] Error from process-payment-success:', processError);
        toast({
          title: "Chyba při zpracování",
          description: "Platba proběhla, ale nepodařilo se ji zpracovat. Kontaktujte podporu.",
          variant: "destructive",
        });
      } else {
        console.log('[WorkerLayout] Payment processed successfully:', processResult);
        toast({
          title: "Úspěch!",
          description: `Zakoupili jste ${points} kreditů. Kredity byly připsány na váš účet.`,
        });
      }

      // Refresh profile to show updated points
      invalidateProfile();
    } catch (error) {
      console.error('[WorkerLayout] Error handling payment success:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se zpracovat platbu. Kontaktujte podporu.",
        variant: "destructive",
      });
    }
  };

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/prihlaseni');
      return;
    }
    setUser(session.user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAccountTypeSwitch = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({ user_type: 'customer' as any }).eq('id', profile.id);
    navigate('/zakaznik/nova-zakazka');
    window.location.reload();
  };

  useEffect(() => {
    if (!user?.id) return;

    // Listen for new direct hire assignments (accepted offers where current user is the worker)
    const channel = supabase
      .channel('direct-hires')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers',
          filter: `worker_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new.status === 'accepted') {
            const { data: job } = await supabase
              .from('jobs')
              .select('title')
              .eq('id', payload.new.job_id)
              .single();

            toast({
              title: "🎉 Nová práce!",
              description: `Byl jste přímo vybrán pro: ${job?.title || 'Zakázka'}. Klepnutím zobrazíte detaily.`,
              action: (
                <Button 
                  size="sm" 
                  onClick={() => navigate(`/remeslnik/zakazka/${payload.new.job_id}`)}
                >
                  Detail
                </Button>
              ),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, navigate]);

  const pageTitle = getPageTitle(location.pathname);
  const isJobDetail = location.pathname.startsWith('/remeslnik/zakazka/');

  return (
    <div className="min-h-[100dvh] h-[100dvh] flex w-full overflow-hidden md:pl-[60px] xl:pl-[120px] bg-background">
      <WorkerSidebar onPointsClick={() => setPointsDialogOpen(true)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Fixed to prevent movement on mobile scroll */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-background">
          <div className="flex items-center justify-between px-3 md:pl-[calc(60px+16.5rem)] xl:pl-[calc(120px+16.5rem)] md:pr-[60px] xl:pr-[120px] h-[73px]">
            {/* Left: Mobile logo with PRACOVNÍK badge + page title (desktop only) */}
            <div className="flex items-center gap-2 min-w-0">
              {isJobDetail && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => safeGoBack(navigate, '/remeslnik/hledej')}
                  className="h-9 rounded-full px-2.5 md:px-3 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 md:mr-1.5" />
                  <span className="hidden md:inline text-sm font-semibold">Zpět</span>
                </Button>
              )}
              <div className="flex flex-col items-end md:hidden bg-[hsl(var(--list-item-header))] py-1.5 px-4 rounded-full font-bold">
                <img src={zrobeeLogo} alt="zrobee" className="h-4 logo-adaptive" />
                <span className="text-[7px] font-bold tracking-wider text-[hsl(var(--sidebar-active-text))] leading-none mt-0.5 uppercase">PROFÍK</span>
              </div>
              {pageTitle && (
                <h1 className="hidden md:block text-sm md:text-base font-semibold text-foreground truncate">
                  {pageTitle}
                </h1>
              )}
            </div>

             <div className="flex items-center gap-3">
               <Button 
                 variant="ghost" 
                 size="icon"
                 onClick={handleAccountTypeSwitch}
                 className="hidden md:flex h-10 w-10 rounded-full bg-card hover:bg-accent border border-border/10 shadow-sm transition-all active:scale-95 group"
                 title="Přepnout na zákazníka"
               >
                 <ArrowLeftRight className="h-5 w-5 text-foreground transition-colors" />
               </Button>
               <div className="flex items-center">
                 <NotificationInbox />
               </div>
              <HamburgerMenu />
              {user && (
                <UserMenu 
                  user={user}
                  userType="worker"
                  profile={profile}
                  isWorkerContext={true}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </div>
        </header>

        {/* Main Content - pt-[73px] to account for fixed header */}
        <div className="flex-1 overflow-auto overscroll-contain scrollbar-hide pt-[73px] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 layout-main-content">
          <Suspense fallback={<ContentLoader />}>
            <div key={location.pathname} className="route-fade-enter md:pr-[60px] xl:pr-[120px] min-h-full">
              <Outlet context={{ userPoints, loadUserPoints: invalidateProfile }} />
            </div>
          </Suspense>
        </div>
      </main>

        <PointsPurchaseDialog 
          open={pointsDialogOpen}
          onOpenChange={setPointsDialogOpen}
          currentPoints={userPoints} 
          onPurchaseComplete={invalidateProfile}
        />

      {/* PWA Install Prompt (shows first) */}
      <AddToHomeScreen onDismissed={() => setPwaPromptDismissed(true)} />
    </div>
  );
}
