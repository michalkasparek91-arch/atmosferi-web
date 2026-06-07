import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPushSupported, getNotificationPermission, isIOS, isStandalone } from "@/lib/push-notifications";
import { useSession } from "@/providers/SessionProvider";

const COOLDOWN_KEY = "push_notification_dismissed_at";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function useSoftPushTrigger() {
  const lastCheckedUserId = useRef<string | null>(null);
  const { session } = useSession();

  useEffect(() => {
    const checkAndTrigger = async () => {
      if (!session?.user) return;
      if (lastCheckedUserId.current === session.user.id) return;
      
      lastCheckedUserId.current = session.user.id;

      if (!isPushSupported()) return;

      const permission = getNotificationPermission();
      // Only trigger if permission is default (not yet asked)
      if (permission !== "default") return;

      // Check cooldown
      const dismissedAt = localStorage.getItem(COOLDOWN_KEY);
      if (dismissedAt) {
        const timeSinceDismissed = Date.now() - parseInt(dismissedAt, 10);
        if (timeSinceDismissed < COOLDOWN_MS) {
          console.log("[SoftPushTrigger] Skipped due to 3-day cooldown.");
          return;
        }
      }

      // Check profile preference
      const { data: profile } = await supabase
        .from("profiles")
        .select("push_notifications")
        .eq("id", session.user.id)
        .single();
      
      if (profile && profile.push_notifications === false) {
        return;
      }

      // Check if there is already an active subscription in the DB
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);
        
      // If they have a subscription in the DB, we usually skip to avoid annoying them on a second device.
      // BUT if they are in the PWA, it means they probably uninstalled and reinstalled the app,
      // losing their local permission while keeping the DB record. We must prompt them!
      if (error || (count && count > 0 && !isStandalone())) {
        return;
      }

      // If we reach here: user is logged in, permission is default, not in cooldown, 
      // wants notifications, but has 0 devices. We MUST trigger the prompt!
      
      const delay = isStandalone() ? 3000 : 8000;
      
      setTimeout(() => {
        localStorage.setItem("push_onboarding_triggered", Date.now().toString());
        
        if (isIOS() && !isStandalone()) {
          window.dispatchEvent(new Event("trigger-pwa-install"));
        } else {
          window.dispatchEvent(new Event("trigger-soft-push"));
        }
      }, delay);
    };

    checkAndTrigger();
  }, [session]);
}
