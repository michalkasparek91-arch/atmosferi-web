import { Settings, Coins, Plus } from "lucide-react";
import zrobeeLogo from "@/assets/zrobee-logo.svg";
import { 
  OutlineSearch, SolidSearch,
  OutlineDocumentText, SolidDocumentText,
  OutlineBriefcase, SolidBriefcase,
  OutlineChat, SolidChat,
  OutlineCalendar, SolidCalendar,
  OutlinePaperPlane, SolidPaperPlane
} from "@/components/icons/CustomIcons";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hapticTap } from "@/utils/haptics";
import { useProfile } from "@/hooks/use-profile";

const menuItems = [
  { title: "Hledej", url: "/remeslnik/hledej", icon: OutlineSearch, activeIcon: SolidSearch, badgeKey: "search" },
  { title: "Nabídky", url: "/remeslnik/nabidky", icon: OutlinePaperPlane, activeIcon: SolidPaperPlane, badgeKey: null },
  { title: "Probíhající", url: "/remeslnik/probihajici", icon: OutlineBriefcase, activeIcon: SolidBriefcase, badgeKey: "inProgress" },
  { title: "Zprávy", url: "/remeslnik/zpravy", icon: OutlineChat, activeIcon: SolidChat, badgeKey: "messages" },
  { title: "Kalendář", url: "/remeslnik/kalendar", icon: OutlineCalendar, activeIcon: SolidCalendar, badgeKey: null },
];

interface WorkerSidebarProps {
  onPointsClick?: () => void;
}

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

    // Subscribe to new messages
    const channel = supabase
      .channel('worker-unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          checkUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return hasUnread;
}

// Hook to track new accepted jobs (offers accepted by customers)
function useNewAcceptedJobs(clearTrigger: boolean) {
  const [hasNew, setHasNew] = useState(false);

  // Mark accepted offers as viewed when clearTrigger is set
  useEffect(() => {
    if (clearTrigger) {
      const markAsViewed = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Mark all unviewed accepted offers as viewed
        await supabase
          .from('offers')
          .update({ worker_viewed: true })
          .eq('worker_id', session.user.id)
          .eq('status', 'accepted')
          .eq('worker_viewed', false);
      };

      markAsViewed();
      setHasNew(false);
    }
  }, [clearTrigger]);

  // Initial check for unviewed accepted offers
  useEffect(() => {
    const checkInitialAccepted = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check for accepted offers that worker hasn't viewed yet
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', session.user.id)
        .eq('status', 'accepted')
        .eq('worker_viewed', false);

      setHasNew((count || 0) > 0);
    };

    checkInitialAccepted();
  }, []);

  // Subscribe to offer updates in realtime
  useEffect(() => {
    const channel = supabase
      .channel('worker-accepted-offers')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers'
        },
        async (payload) => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          // Check if this offer belongs to the current worker and was just accepted
          if (payload.new.worker_id === session.user.id && 
              payload.new.status === 'accepted' && 
              payload.old?.status !== 'accepted') {
            setHasNew(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return hasNew;
}

// Hook to track new available jobs for the worker
function useNewAvailableJobs(clearTrigger: boolean) {
  const [hasNew, setHasNew] = useState(false);

  // Update last_jobs_viewed_at when clearTrigger is set
  useEffect(() => {
    if (clearTrigger) {
      const updateLastViewed = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Update last_jobs_viewed_at timestamp
        await supabase
          .from('profiles')
          .update({ last_jobs_viewed_at: new Date().toISOString() })
          .eq('id', session.user.id);
      };

      updateLastViewed();
      setHasNew(false);
    }
  }, [clearTrigger]);

  // Initial check for new jobs matching worker's services
  useEffect(() => {
    const checkInitialJobs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get worker's profile with last_jobs_viewed_at
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_jobs_viewed_at')
        .eq('id', session.user.id)
        .single();

      // Get worker's services
      const { data: workerServices } = await supabase
        .from('worker_services')
        .select('subcategory_id')
        .eq('worker_id', session.user.id);

      if (!workerServices || workerServices.length === 0) return;

      const subcategoryIds = workerServices.map(ws => ws.subcategory_id);

      // Use last_jobs_viewed_at or fallback to 24 hours ago
      const lastViewed = profile?.last_jobs_viewed_at 
        ? new Date(profile.last_jobs_viewed_at)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .in('subcategory_id', subcategoryIds)
        .eq('status', 'open')
        .gt('created_at', lastViewed.toISOString());

      setHasNew((count || 0) > 0);
    };

    checkInitialJobs();
  }, []);

  // Subscribe to new jobs in realtime
  useEffect(() => {
    const checkNewJob = async (jobSubcategoryId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Check if worker provides this service
      const { data: workerServices } = await supabase
        .from('worker_services')
        .select('subcategory_id')
        .eq('worker_id', session.user.id);

      if (!workerServices) return false;

      const workerSubcategoryIds = workerServices.map(ws => ws.subcategory_id);
      return workerSubcategoryIds.includes(jobSubcategoryId);
    };

    const channel = supabase
      .channel('worker-new-jobs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs'
        },
        async (payload) => {
          const isRelevant = await checkNewJob(payload.new.subcategory_id);
          if (isRelevant) {
            setHasNew(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return hasNew;
}

// Mobile nav item with custom icon rendering
function MobileNavItem({ 
  item, 
  badges,
  onNavigate 
}: { 
  item: typeof menuItems[0]; 
  badges: { messages: boolean; inProgress: boolean; search: boolean };
  onNavigate: (badgeKey: string | null) => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === item.url;
  
  const showBadge = item.badgeKey && badges[item.badgeKey as keyof typeof badges];

  const renderIcon = () => {
    const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
    // Solid icons don't need strokeWidth, but outline ones do. 
    return <Icon className="h-6 w-6 flex-shrink-0 transition-all duration-300" strokeWidth={isActive ? undefined : 1.5} />;
  };

  return (
    <RouterNavLink
      to={item.url}
      end
      onClick={() => { hapticTap(); onNavigate(item.badgeKey); }}
      className={cn(
        "flex flex-col items-center justify-center gap-0 relative transition-all group flex-1 md:flex-none md:px-4 md:py-3",
        isActive ? "text-foreground font-semibold" : "text-[hsl(var(--menu-inactive))]"
      )}
    >
      {/* Absolute circle for active/tap state */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-full transition-colors duration-500 group-active:duration-75 bg-transparent group-active:bg-black/10 dark:group-active:bg-white/10 pointer-events-none" />

      <div className="relative p-1.5 transition-all md:p-3 z-10 pointer-events-none">
        {renderIcon()}
        {showBadge && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-destructive rounded-full" />
        )}
      </div>
      <span className={cn(
        "text-[9px] md:text-[10px] leading-tight text-center truncate w-full transition-colors",
        isActive ? "text-foreground" : "group-hover:text-foreground"
      )}>{item.title}</span>
    </RouterNavLink>
  );
}

export function WorkerSidebar({ onPointsClick }: WorkerSidebarProps) {
  const { profile } = useProfile();
  const userPoints = profile?.wallet_points ?? profile?.points ?? 0;
  const hasUnreadMessages = useUnreadMessages();
  const [clearInProgress, setClearInProgress] = useState(false);
  const [clearSearch, setClearSearch] = useState(false);
  
  const hasNewAcceptedJobs = useNewAcceptedJobs(clearInProgress);
  const hasNewAvailableJobs = useNewAvailableJobs(clearSearch);

  const handleNavigate = useCallback((badgeKey: string | null) => {
    if (badgeKey === 'inProgress') {
      setClearInProgress(true);
      setTimeout(() => setClearInProgress(false), 100);
    } else if (badgeKey === 'search') {
      setClearSearch(true);
      setTimeout(() => setClearSearch(false), 100);
    }
  }, []);

  const badges = {
    messages: hasUnreadMessages,
    inProgress: hasNewAcceptedJobs,
    search: hasNewAvailableJobs,
  };

  return (
    <>
      {/* Desktop: Left sidebar */}
      <aside className="hidden md:flex md:flex-col w-[16.5rem] h-full bg-background z-50 relative">
        {/* Logo at top - left aligned */}
        <div className="px-5 h-[73px] flex items-center bg-background">
          <RouterNavLink
            to="/remeslnik/hledej"
            className="flex flex-col items-end hover:opacity-80 transition-opacity bg-[hsl(var(--list-item-header))] py-2 px-7 rounded-full"
          >
            <img src={zrobeeLogo} alt="zrobee" className="h-6 logo-adaptive" />
            <span className="text-[9px] font-bold tracking-wider text-[hsl(var(--sidebar-active-text))] leading-none mt-1 uppercase">PROFÍK</span>
          </RouterNavLink>
        </div>

        {/* All menu items - uniform style */}
        <nav className="space-y-2 px-4 flex-1 mt-12">
          {menuItems.map((item) => {
            const showBadge = item.badgeKey && badges[item.badgeKey as keyof typeof badges];
            return (
              <RouterNavLink
                key={item.title}
                to={item.url}
                end
                onClick={() => { hapticTap(); handleNavigate(item.badgeKey); }}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 pl-5 pr-[50px] py-3 rounded-full transition-all text-base font-medium relative group",
                  isActive 
                    ? "text-foreground bg-[hsl(var(--list-item-header))] font-semibold" 
                    : "text-foreground/70 hover:text-foreground hover:bg-[hsl(var(--list-item-header))]"
                )}
              >
                {({ isActive }) => {
                  const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
                  return (
                    <>
                      <Icon className="h-[22px] w-[22px] flex-shrink-0 transition-transform group-hover:scale-105" strokeWidth={isActive ? undefined : 1.5} />
                      <span>{item.title}</span>
                      {showBadge && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 bg-destructive rounded-full" />
                      )}
                    </>
                  );
                }}
              </RouterNavLink>
            );
          })}
        </nav>

        {/* Credits & Settings at bottom */}
        <div className="px-4 pb-6 mt-auto">
          <button
            onClick={onPointsClick}
            className="w-full flex items-center justify-between p-4 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border border-primary/20 group mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-start truncate text-left">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Kreditový zůstatek</span>
                <span className="text-sm font-bold text-foreground">{userPoints} kreditů</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0 ml-1">
              <Plus className="h-4 w-4" />
            </div>
          </button>

          <RouterNavLink
            to="/remeslnik/nastaveni"
            className={({ isActive }) => cn(
              "flex items-center gap-3 pl-5 pr-[50px] py-3 rounded-full transition-all text-base font-medium",
              isActive 
                ? "text-foreground bg-[hsl(var(--list-item-header))] font-semibold" 
                : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--list-item-header))]"
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span>Nastavení</span>
          </RouterNavLink>
        </div>
      </aside>

      {/* Mobile: Bottom navigation bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background mobile-bottom-nav" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-center h-16 px-1 max-w-full overflow-hidden relative">
          {menuItems.map((item) => (
            <MobileNavItem 
              key={item.title} 
              item={item} 
              badges={badges}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </nav>
    </>
  );
}