import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { checkAndRepairSubscription, getNotificationPermission, isIOS, isStandalone, isPushSupported } from "@/lib/push-notifications";
import { messaging } from "@/lib/firebase";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";


export function TabNotificationManager() {
  const { profile } = useProfile();
  const userId = profile?.id;
  const userType = profile?.user_type;

  // 1. Unified Notifications (The new source of truth)
  const { data: unreadNotifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ["user-notifications-unread-all", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Derived counts for specific areas (backwards compatibility for tab badges)
  const unreadMessagesCount = unreadNotifications.filter(n => n.type === 'new_message').length;
  const workerNotificationsValue = unreadNotifications.filter(n => 
    ['job_match', 'offer_accepted', 'low_credits', 'worker_update'].includes(n.type)
  ).length;
  const customerNotificationsValue = unreadNotifications.filter(n => 
    ['new_offer', 'offer_accepted', 'job_completed', 'customer_update'].includes(n.type)
  ).length;

  // 2. Admin Global Notifications (Kept original as these are shared work items, not per-user alerts)
  const { data: adminNotifications = 0, refetch: refetchAdmin } = useQuery({
    queryKey: ["admin-tab-notifications", userId],
    queryFn: async () => {
      if (!userId || userType !== "admin") return 0;
      const [reports, verifications] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("worker_verifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return (reports.count || 0) + (verifications.count || 0);
    },
    enabled: !!userId && userType === "admin",
  });

  // Realtime Subscriptions
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("tab-notifications-unified")
      // The single most important subscription
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "user_notifications",
        filter: `user_id=eq.${userId}` 
      }, () => {
        refetchNotifications();
      })
      // Keep Admin global tables as they are shared
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        if (userType === "admin") refetchAdmin();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "worker_verifications" }, () => {
        if (userType === "admin") refetchAdmin();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userType, refetchNotifications, refetchAdmin]);
  
  // Foreground Push Notification Listener
  useEffect(() => {
    if (!messaging) return;
        const unsubscribe = onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground message received: ", payload);
        
        const notificationTitle = (payload as any)?.notification?.title || (payload as any)?.data?.title || (payload as any)?.title || "Nové upozornění";
        const notificationBody = (payload as any)?.notification?.body || (payload as any)?.data?.body || (payload as any)?.body || "";
        
        toast(notificationTitle, {
          description: notificationBody,
        });
      });

    return () => {
      unsubscribe();
    };
  }, []);

  // 5. Silent Push Repair (Global Self-Healing)
  useEffect(() => {
    // Only run if we have a user
    if (!userId) return;
    
    // We check once per session (sessionStorage) instead of localStorage 
    // to ensure if the PWA is uninstalled and reinstalled (which starts a new session), 
    // it will immediately check and repair the token.
    const REPAIR_KEY = `push_repair_v3_${userId}`;
    const hasCheckedThisSession = sessionStorage.getItem(REPAIR_KEY);

    if (hasCheckedThisSession) {
      console.log('[PushManager] Sync recently verified in this session, skipping...');
      return;
    }

    const timer = setTimeout(async () => {
      console.log('[PushManager] Running diagnostic sync check...');
      try {
        if (!isPushSupported()) return;
        
        const permission = getNotificationPermission();
        
        // Scenario 1: Permission granted, check and repair subscription
        if (permission === 'granted') {
          const success = await checkAndRepairSubscription(userId);
          if (success) {
            sessionStorage.setItem(REPAIR_KEY, 'true');
          }
        } 
        // Scenario 2: Permission is default, check if we should trigger soft prompt
        else if (permission === 'default') {
          // Check DB to see if there is any subscription for this user
          const { count, error } = await supabase
            .from('push_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
            
          const { data: profile } = await supabase.from('profiles').select('push_notifications').eq('id', userId).single();
          const userWantsPush = profile?.push_notifications === true;
          
          // If no subscription exists in DB and permission is default,
          // OR if the user wants push and is currently using the PWA but permission is default,
          // trigger the soft prompt to repair their local subscription.
          if (!error && (count === 0 || (userWantsPush && isStandalone()))) {
            console.log('[PushManager] Permission default -> triggering soft prompt');
            localStorage.setItem("push_onboarding_triggered", Date.now().toString());
            if (isIOS() && !isStandalone()) {
              window.dispatchEvent(new Event("trigger-pwa-install"));
            } else {
              window.dispatchEvent(new Event("trigger-soft-push"));
            }
            sessionStorage.setItem(REPAIR_KEY, 'true');
          }
        }
      } catch (err) {
        console.warn('[PushManager] Sync check failed:', err);
      }
    }, 6000); // 6 second delay to ensure SW is ready and page is idle

    return () => clearTimeout(timer);
  }, [userId]);

  // Document Title Effect
  useEffect(() => {
    const totalCount = unreadMessagesCount + workerNotificationsValue + customerNotificationsValue + adminNotifications;
    const baseTitle = "Zrobee"; // Default title

    if (totalCount > 0) {
      document.title = `(${totalCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [unreadMessagesCount, workerNotificationsValue, customerNotificationsValue, adminNotifications]);

  return null; // Headless component
}
