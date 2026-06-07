import { Settings, Heart } from "lucide-react";
import zrobeeLogo from "@/assets/zrobee-logo.svg";
import { BeeIcon } from "@/components/icons/BeeIcon";
import { 
  OutlineClipboardList, SolidClipboardList,
  OutlineBriefcase, SolidBriefcase,
  OutlineChat, SolidChat,
  OutlineUsers, SolidUsers,
  OutlineBullhorn, SolidBullhorn
} from "@/components/icons/CustomIcons";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { useProfile } from "@/hooks/use-profile";
import { hapticTap } from "@/utils/haptics";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { title: "Probíhající", url: "/zakaznik/prehled", icon: OutlineBriefcase, activeIcon: SolidBriefcase, badgeKey: "probiha" },
  { title: "Poptávky", url: "/zakaznik/poptavky", icon: OutlineBullhorn, activeIcon: SolidBullhorn, badgeKey: "poptavky" },
  { title: "Nová", url: "/zakaznik/nova-zakazka", icon: BeeIcon, activeIcon: BeeIcon, badgeKey: null },
  { title: "Zprávy", url: "/zakaznik/zpravy", icon: OutlineChat, activeIcon: SolidChat, badgeKey: "messages" },
  { title: "Profíci", url: "/zakaznik/profici", icon: OutlineUsers, activeIcon: SolidUsers, badgeKey: null },
];

interface CustomerSidebarProps {
  onSettingsClick?: () => void;
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
      .channel('customer-unread-messages')
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

// Hook to track new worker offers on customer's jobs
function useNewOffers(clearTrigger: boolean) {
  const [hasNew, setHasNew] = useState(false);

  // Mark offers as viewed when clearTrigger is set
  useEffect(() => {
    if (clearTrigger) {
      const markOffersAsViewed = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get customer's jobs
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('customer_id', session.user.id);

        if (!jobs || jobs.length === 0) return;

        const jobIds = jobs.map(j => j.id);

        // Mark all pending offers on customer's jobs as viewed
        await supabase
          .from('offers')
          .update({ customer_viewed: true })
          .in('job_id', jobIds)
          .eq('status', 'pending')
          .eq('customer_viewed', false);
      };

      markOffersAsViewed();
      setHasNew(false);
    }
  }, [clearTrigger]);

  // Initial check for unviewed pending offers on mount
  useEffect(() => {
    const checkInitialOffers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get customer's open jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('customer_id', session.user.id)
        .eq('status', 'open');

      if (!jobs || jobs.length === 0) return;

      const jobIds = jobs.map(j => j.id);

      // Check for pending offers that haven't been viewed
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds)
        .eq('status', 'pending')
        .eq('customer_viewed', false);

      setHasNew((count || 0) > 0);
    };

    checkInitialOffers();
  }, []);

  // Subscribe to new offers in realtime
  useEffect(() => {
    const channel = supabase
      .channel('customer-new-offers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers'
        },
        async (payload) => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          // Check if this offer is for one of the customer's jobs
          const { data: job } = await supabase
            .from('jobs')
            .select('customer_id')
            .eq('id', payload.new.job_id)
            .single();
          
          if (job && job.customer_id === session.user.id) {
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

// Hook to check for job status updates (e.g., worker marks complete)
function useNewJobUpdates() {
  const [hasUpdates, setHasUpdates] = useState(false);

  useEffect(() => {
    const checkUpdates = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check for jobs in pending_approval status (worker marked complete, customer hasn't reviewed)
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', session.user.id)
        .eq('status', 'pending_approval');

      setHasUpdates((count || 0) > 0);
    };

    checkUpdates();

    const channel = supabase
      .channel('customer-job-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs' },
        (payload) => {
          if (payload.new.status === 'pending_approval') {
            checkUpdates();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return hasUpdates;
}

// Mobile nav item with custom icon rendering
function MobileNavItem({ 
  item, 
  badges,
  onNavigate 
}: { 
  item: typeof menuItems[0]; 
  badges: { messages: boolean; poptavky: boolean };
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
      to={item.url!}
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

export function CustomerSidebar({ onSettingsClick }: CustomerSidebarProps) {
  const hasUnreadMessages = useUnreadMessages();
  const [clearPoptavky, setClearPoptavky] = useState(false);
  const { profile } = useProfile();
  
  const hasNewOffers = useNewOffers(clearPoptavky);
  const hasJobUpdates = useNewJobUpdates();

  const handleNavigate = useCallback((badgeKey: string | null) => {
    if (badgeKey === 'poptavky') {
      setClearPoptavky(true);
      setTimeout(() => setClearPoptavky(false), 100);
    }
  }, []);

  const badges = {
    messages: hasUnreadMessages,
    poptavky: hasNewOffers,
    probiha: hasJobUpdates,
  };

  return (
    <>
      {/* Desktop: Left sidebar */}
      <aside className="hidden md:flex md:flex-col w-[16.5rem] h-full bg-background z-50 relative">
        {/* Logo at top - left aligned, no badge */}
        <div className="px-5 h-[73px] flex items-center border-b border-border/50 md:border-none">
          <RouterNavLink
            to="/zakaznik/nova-zakazka"
            className="flex flex-col items-start hover:opacity-80 transition-opacity"
          >
            <img src={zrobeeLogo} alt="zrobee" className="h-6 w-auto logo-adaptive" />
          </RouterNavLink>
        </div>
        
        {/* Menu items */}
        <nav className="space-y-2 px-4 flex-1 mt-12">
          {menuItems.map((item) => {
            const showBadge = item.badgeKey && badges[item.badgeKey as keyof typeof badges];
            const renderIcon = () => {
              const Icon = item.icon;
              return <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />;
            };
            return (
              <RouterNavLink
                key={item.title}
                to={item.url!}
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


        {/* Settings at bottom */}
        <div className="px-4 pb-6">
          <RouterNavLink
            to="/zakaznik/nastaveni"
            onClick={() => hapticTap()}
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
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background z-50 mobile-bottom-nav" 
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