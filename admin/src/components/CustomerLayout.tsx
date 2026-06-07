import { useEffect, useState, useRef, Suspense } from "react";
import { useNavigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getPageTitle } from "@/lib/page-titles";
import { CustomerSidebar } from "@/components/CustomerSidebar";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import zrobeeLogo from "@/assets/zrobee-logo.svg";
import { useProfile } from "@/hooks/use-profile";
import { NotificationInbox } from "./NotificationInbox";
import UserMenu from "./UserMenu";
import { usePushNotificationPrompt } from "@/hooks/use-push-notification-prompt";
import { JobApprovalDialog } from "@/components/JobApprovalDialog";
import { toast } from "@/hooks/use-toast";
import ContentLoader from "@/components/ContentLoader";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import { safeGoBack } from "@/utils/navigation";

// Hook to check for unread messages
function useUnreadMessages() {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const checkUnread = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .eq('read', false);

      setHasUnread((count || 0) > 0);
    };

    checkUnread();

    const channel = supabase
      .channel('layout-unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        checkUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return hasUnread;
}

export function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const { profile } = useProfile();
  const [isWorkerRegistered, setIsWorkerRegistered] = useState(false);
  const [pendingApprovalJob, setPendingApprovalJob] = useState<any>(null);
  const urgentPaymentProcessedRef = useRef(false);
  const [pwaPromptDismissed, setPwaPromptDismissed] = useState(() => {
    // If app is already installed (standalone), skip waiting for PWA prompt
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  });

  // Sync existing push permission (no prompt)
  usePushNotificationPrompt();

  // Handle urgent job payment success
  useEffect(() => {
    const urgentPaymentStatus = searchParams.get('urgent_payment');
    const sessionId = searchParams.get('session_id');
    
    if (urgentPaymentStatus === 'success' && sessionId && !urgentPaymentProcessedRef.current) {
      urgentPaymentProcessedRef.current = true;
      handleUrgentPaymentSuccess(sessionId);
      searchParams.delete('urgent_payment');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    } else if (urgentPaymentStatus === 'cancelled') {
      toast({
        title: "Platba zrušena",
        description: "Platba za urgentní poptávku byla zrušena. Můžete to zkusit znovu.",
        variant: "destructive",
      });
      searchParams.delete('urgent_payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const handleUrgentPaymentSuccess = async (sessionId: string) => {
    try {
      const pendingJobDataStr = sessionStorage.getItem('pendingUrgentJobData');
      let jobData = null;
      if (pendingJobDataStr) {
        jobData = JSON.parse(pendingJobDataStr);
        sessionStorage.removeItem('pendingUrgentJobData');
      }

      const { data, error } = await supabase.functions.invoke('create-urgent-job', {
        body: { sessionId, jobData }
      });

      if (error) throw new Error(error.message);

      if (data?.success && data?.job) {
        toast({
          title: "🔥 Urgentní poptávka vytvořena!",
          description: "Vaše poptávka byla označena jako urgentní a řemeslníci v okolí budou okamžitě upozorněni.",
        });

        supabase.functions.invoke('notify-workers-new-job', {
          body: { job: data.job, isUrgent: true }
        }).catch(err => console.log('[Push] Failed to notify workers:', err));
      }
    } catch (error: any) {
      console.error('Error creating urgent job:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit urgentní poptávku. Kontaktujte prosím podporu.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkUser();
    localStorage.setItem("last_role", "customer");
  }, []);

  useEffect(() => {
    if (!profile?.id) { setIsWorkerRegistered(false); return; }
    supabase.from('worker_services').select('id').eq('worker_id', profile.id).limit(1)
      .then(({ data }) => setIsWorkerRegistered(!!data && data.length > 0));
  }, [profile?.id]);

  // Global real-time subscription for job completion approval
  useEffect(() => {
    if (!user?.id) return;

    const checkExistingPendingJobs = async () => {
      const { data: pendingJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', user.id)
        .eq('status', 'pending_approval')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (pendingJobs && pendingJobs.length > 0) {
        setPendingApprovalJob(pendingJobs[0]);
      }
    };

    checkExistingPendingJobs();

    const channel = supabase
      .channel('global-job-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedJob = payload.new as any;
          if (updatedJob.status === 'pending_approval') {
            setPendingApprovalJob(updatedJob);
          }
        }
      )
      .subscribe();

    const interval = window.setInterval(checkExistingPendingJobs, 15000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
    const [profileResult, servicesResult] = await Promise.all([
      supabase.from('profiles').select('phone, company_type').eq('id', profile.id).single(),
      supabase.from('worker_services').select('id').eq('worker_id', profile.id)
    ]);
    if (!profileResult.data?.phone || !profileResult.data?.company_type ||
        !servicesResult.data || servicesResult.data.length === 0) {
      navigate('/registrace-remeslnika');
      return;
    }
    await supabase.from('profiles').update({ user_type: 'worker' as any }).eq('id', profile.id);
    navigate('/remeslnik/hledej');
    window.location.reload();
  };

  const pageTitle = getPageTitle(location.pathname);
  const isJobDetail = location.pathname.startsWith('/zakaznik/zakazka/');

  return (
    <div className="min-h-[100dvh] h-[100dvh] flex w-full bg-background overflow-hidden md:pl-[60px] xl:pl-[120px]">
      <CustomerSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-background fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center justify-between px-3 md:pl-[calc(16.5rem+60px)] xl:pl-[calc(16.5rem+120px)] md:pr-[60px] xl:pr-[120px] py-4">
            <div className="flex items-center gap-2 min-w-0">
              {isJobDetail && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => safeGoBack(navigate, '/zakaznik/poptavky')}
                  className="h-9 rounded-full px-2.5 md:px-3 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 md:mr-1.5" />
                  <span className="hidden md:inline text-sm font-semibold">Zpět</span>
                </Button>
              )}
              <div className="flex flex-col items-start md:hidden">
                <img src={zrobeeLogo} alt="zrobee" className="h-5 w-auto logo-adaptive" />
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
                title={isWorkerRegistered ? "Přepnout na pracovníka" : "Stát se pracovníkem"}
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
                  userType="customer"
                  profile={profile}
                  isWorkerContext={false}
                  onLogout={handleLogout}
                  onAccountTypeSwitch={handleAccountTypeSwitch}
                />
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto overscroll-contain pt-[73px] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 layout-main-content">
          <Suspense fallback={<ContentLoader />}>
            <div key={location.pathname} className="route-fade-enter md:pr-[60px] xl:pr-[120px]">
              <Outlet />
            </div>
          </Suspense>
        </div>

      </main>

      {/* Global Job Approval Dialog */}
      {pendingApprovalJob && (
        <JobApprovalDialog
          isOpen={true}
          job={pendingApprovalJob}
          onApprove={() => setPendingApprovalJob(null)}
        />
      )}


      {/* PWA Install Prompt (shows first) */}
      <AddToHomeScreen onDismissed={() => setPwaPromptDismissed(true)} />
    </div>
  );
}
