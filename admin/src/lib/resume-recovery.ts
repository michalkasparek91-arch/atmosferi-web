import type { QueryClient } from "@tanstack/react-query";

/**
 * Detect when the app returns to the foreground after a long absence (e.g. user
 * switched from mobile Chrome to the PWA, or backgrounded the PWA for >30s).
 * In-flight fetches may have been parked by the browser; we force-invalidate
 * all active queries so fresh requests fire and any stuck skeleton states clear.
 */
export function installResumeRecovery(queryClient: QueryClient) {
  if (typeof document === "undefined") return () => {};

  let lastHiddenAt = 0;
  const STALE_AFTER_MS = 30_000;

  const recover = (reason: string) => {
    console.log(`[ResumeRecovery] Refetching active queries (reason: ${reason})`);
    queryClient.invalidateQueries({ refetchType: "active" });
    // Nudge auth refresh without blocking
    import("@/integrations/supabase/client")
      .then(({ supabase }) => supabase.auth.getSession())
      .catch(() => {});
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      lastHiddenAt = Date.now();
    } else if (document.visibilityState === "visible") {
      const awayFor = lastHiddenAt ? Date.now() - lastHiddenAt : 0;
      if (awayFor > STALE_AFTER_MS) {
        recover(`visible-after-${Math.round(awayFor / 1000)}s`);
      }
    }
  };

  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) recover("bfcache-restore");
  };

  const onOnline = () => recover("online");

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("online", onOnline);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("online", onOnline);
  };
}
