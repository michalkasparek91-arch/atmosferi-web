import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * PWAUpdater component handles service worker registration and 
 * automatically updates the app when a new version is available.
 * Only active in production (not in iframes or preview hosts).
 */
export const PWAUpdater = () => {
  useEffect(() => {
    let updateInterval: number | null = null;
    let cancelled = false;

    // Skip registration in iframe/preview as they are not supported by service workers
    const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    const isPreviewHost =
      window.location.hostname.includes('id-preview--') ||
      window.location.hostname.includes('lovableproject.com');

    if (isInIframe || isPreviewHost) {
      console.log('[PWA] Skipping SW registration in iframe/preview context');
      return;
    }

    console.log('[PWA] Domain:', window.location.hostname, '- Registering SW');

    import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return;

      const update = registerSW({
        onNeedRefresh() {
          console.log('[PWA] New version detected, auto-updating in 2s...');
          toast.info("Aktualizuji aplikaci…", {
            description: "Nová verze bude za chvíli připravena.",
            duration: 3000,
          });
          // Auto-apply the update after a short delay (extended to prevent consent loops)
          setTimeout(() => {
            void update(true);
          }, 5000);
        },
        onRegistered(r) {
          console.log('SW Registered');
          if (r) {
            updateInterval = window.setInterval(() => {
              void r.update();
            }, 15 * 60 * 1000);
          }
        },
        onRegisterError(error) {
          console.error('SW registration error', error);
        },
      });
    }).catch(() => {
      // PWA register not available
    });

    return () => {
      cancelled = true;
      if (updateInterval) {
        window.clearInterval(updateInterval);
      }
    };
  }, []);

  return null;
};

export default PWAUpdater;
