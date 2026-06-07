import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  isIOS,
  isStandalone,
} from "@/lib/push-notifications";

const PWA_SYNC_STORAGE_KEY = "pwa_push_synced";

/**
 * Hook that subscribes to push notifications if permission was already granted
 * but no subscription exists yet (e.g. user cleared browser data).
 * Also handles:
 * - Auto-subscribe after PWA installation (appinstalled event)
 * - Post-login sync (re-subscribe on sign-in if permission is already granted)
 * - PWA upgrade (force re-subscribe in standalone mode)
 */
export function usePushNotificationPrompt() {
  const hasRun = useRef(false);

  useEffect(() => {
    const syncExistingPermission = async (trigger: string) => {
      if (hasRun.current && trigger === "mount") return;
      if (trigger === "mount") hasRun.current = true;

      if (!isPushSupported()) return;

      const permission = getNotificationPermission();
      // Only auto-subscribe if already granted (don't prompt)
      if (permission !== "granted") return;

      if (isIOS() && !isStandalone()) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Check user profile preference — Source of Truth
      // If user manually disabled push in settings, we MUST NOT auto-sync.
      // We only sync if true or null (new user with granted browser permission).
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_notifications')
        .eq('id', session.user.id)
        .single();
      
      const killKey = `push_disabled_${session.user.id}`;
      if ((profile && profile.push_notifications === false) || localStorage.getItem(killKey) === 'true') {
        console.log("[PushSync] Sync skipped (user explicitly disabled push in DB or local kill-switch is ON)");
        return;
      }

      try {
        await subscribeToPush(session.user.id, false, true);
        console.log("[PushSync] Synced push subscription (trigger:", trigger + ")");
      } catch (error) {
        console.log("[PushSync] Error syncing:", error);
      }
    };

    const upgradePwaSubscription = async () => {
      if (!isStandalone() || !isPushSupported()) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userSyncKey = `${PWA_SYNC_STORAGE_KEY}_${session.user.id}`;
      const alreadySynced = sessionStorage.getItem(userSyncKey) || localStorage.getItem(userSyncKey);
      if (alreadySynced) return;

      // 2. Double-check profile preference before standalone upgrade
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_notifications')
        .eq('id', session.user.id)
        .single();
      
      if (profile && profile.push_notifications === false) return;

      try {
        console.log("[PushSync] Upgrading to PWA subscription...");
        const success = await subscribeToPush(session.user.id, true, true);
        if (success) {
          localStorage.setItem(userSyncKey, "true");
          sessionStorage.setItem(userSyncKey, "true");
        }
      } catch (error) {
        console.error("[PushSync] PWA upgrade failed:", error);
      }
    };

    // Initial sync on mount
    syncExistingPermission("mount");
    upgradePwaSubscription();

    // Auto-subscribe immediately after PWA installation
    const handleInstall = () => {
      console.log("[PushSync] App installed event — syncing push");
      syncExistingPermission("appinstalled");
    };

    window.addEventListener("pwa-installed", handleInstall);
    window.addEventListener("appinstalled", handleInstall);

    return () => {
      window.removeEventListener("pwa-installed", handleInstall);
      window.removeEventListener("appinstalled", handleInstall);
    };
  }, []);
}
