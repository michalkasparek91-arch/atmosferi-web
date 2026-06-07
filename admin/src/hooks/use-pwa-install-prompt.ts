import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa_install_dismissed_at";
const COOLDOWN_DAYS = 2;
const PROMPT_CAPTURE_EVENT = "beforeinstallprompt-captured";
const PWA_INSTALLED_EVENT = "pwa-installed";
const SERVICE_WORKER_READY_TIMEOUT = 4000;
const INSTALL_PROMPT_TIMEOUT = 6000;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isSafari = () => /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios/i.test(navigator.userAgent);
const isChrome = () => /chrome|chromium|crios/i.test(navigator.userAgent);
const isDesktop = () => !isIOS() && !isAndroid();
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;
const isPreviewHost = () =>
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");
const isPromptCapableBrowser = () => {
  const ua = navigator.userAgent;
  // Edge Chromium uses 'Edg/', Chrome uses 'Chrome/', Opera uses 'OPR/'
  return /chrome|chromium|crios|edg\/|edge\/|opr\/|samsungbrowser/i.test(ua) && !isIOS();
};

// Module-level capture so the event is never lost
let savedPromptEvent: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    console.log("[PWA] beforeinstallprompt event captured and prevented default");
    // Stash the event so it can be triggered later.
    savedPromptEvent = e as BeforeInstallPromptEvent;
    
    // Dispatch a custom event to notify any active hooks
    window.dispatchEvent(new CustomEvent(PROMPT_CAPTURE_EVENT));
  });

  window.addEventListener("appinstalled", () => {
    console.log("[PWA] App successfully installed event received");
    savedPromptEvent = null;
    window.dispatchEvent(new CustomEvent(PWA_INSTALLED_EVENT));
  });
}

async function waitForServiceWorkerReady(timeoutMs = SERVICE_WORKER_READY_TIMEOUT): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    return await Promise.race<boolean>([
      navigator.serviceWorker.ready.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ]);
  } catch {
    return false;
  }
}

/**
 * Fire the native install prompt using the module-level saved event.
 * Returns { success: true } if the native prompt was shown.
 * If no event is available but the browser likely supports it (not iOS),
 * waits up to `timeoutMs` for the beforeinstallprompt event before giving up.
 */
async function triggerInstall(timeoutMs = INSTALL_PROMPT_TIMEOUT): Promise<{ success: boolean }> {
  // 1. Try the already-captured event
  if (savedPromptEvent) {
    return firePrompt(savedPromptEvent);
  }

  // 2. Native prompt is not available in these contexts
  if (isStandalone()) {
    console.log("[PWA] triggerInstall: app already installed");
    return { success: false };
  }

  if (isIOS()) {
    console.log("[PWA] triggerInstall: iOS detected, no native prompt available");
    return { success: false };
  }

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  if (isInIframe || isPreviewHost()) {
    console.log("[PWA] triggerInstall: preview/iframe context cannot show native prompt");
    return { success: false };
  }

  if (!isPromptCapableBrowser()) {
    console.log("[PWA] triggerInstall: browser does not support beforeinstallprompt");
    return { success: false };
  }

  const swReady = await waitForServiceWorkerReady();
  console.log("[PWA] triggerInstall: service worker ready:", swReady);

  if (savedPromptEvent) {
    return firePrompt(savedPromptEvent);
  }

  // 3. Wait for the event to arrive (e.g. timing gap on Android Chrome)
  console.log("[PWA] triggerInstall: waiting for beforeinstallprompt event…");
  return new Promise<{ success: boolean }>((resolve) => {
    const onCapture = () => {
      cleanup();
      if (savedPromptEvent) {
        firePrompt(savedPromptEvent).then(resolve);
      } else {
        resolve({ success: false });
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      if (savedPromptEvent) {
        firePrompt(savedPromptEvent).then(resolve);
        return;
      }
      console.log("[PWA] triggerInstall: timed out waiting for event");
      resolve({ success: false });
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener(PROMPT_CAPTURE_EVENT, onCapture);
    };

    window.addEventListener(PROMPT_CAPTURE_EVENT, onCapture);
  });
}

async function firePrompt(event: BeforeInstallPromptEvent): Promise<{ success: boolean }> {
  console.log("[PWA] Triggering native prompt…");
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    console.log("[PWA] Install prompt outcome:", outcome);
    // Always null out — the event object is consumed after .prompt() regardless of outcome.
    // The global listener will re-capture a fresh beforeinstallprompt event if the user dismissed.
    savedPromptEvent = null;
    return { success: true };
  } catch (err) {
    console.error("[PWA] Error during native prompt:", err);
    // Event may be consumed after an error; clear it
    savedPromptEvent = null;
    return { success: false };
  }
}

export { triggerInstall };

export function usePwaInstallPrompt(ignoreCooldown = false) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(savedPromptEvent);

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hasShown = useRef(false);

  useEffect(() => {
    if (isStandalone()) {
      console.log("[PWA] Already in standalone mode, skipping logic");
      return;
    }

    // --- Deep Diagnostics ---
    const swActive = !!navigator.serviceWorker?.controller;
    const isSecure = window.isSecureContext;
    const manifestLink = document.querySelector('link[rel="manifest"]');
    console.log(`[PWA-Deep] SW Active: ${swActive}, Secure: ${isSecure}, Manifest: ${!!manifestLink}`);
    if (manifestLink) console.log(`[PWA-Deep] Manifest href: ${manifestLink.getAttribute('href')}`);
    // ------------------------

    // Check cooldown (skip if ignoreCooldown is true)
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && !ignoreCooldown) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) {
        console.log("[PWA] Cooldown active, hiding prompt");
        return;
      }
    }


    // Initialize from stashed event if available
    if (savedPromptEvent) {
      console.log("[PWA] Hook initializing with stashed prompt event");
      setDeferredPrompt(savedPromptEvent);
    }
    
    const handler = (e: Event) => {
      e.preventDefault();
      console.log("[PWA] beforeinstallprompt handler triggered in hook");
      savedPromptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(savedPromptEvent);
      if (!hasShown.current) {
        hasShown.current = true;
        setTimeout(() => setVisible(true), 3000);
      }
    };

    const handleCustomCapture = () => {
      if (savedPromptEvent) {
        console.log("[PWA] Hook updated from custom capture event");
        setDeferredPrompt(savedPromptEvent);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener(PROMPT_CAPTURE_EVENT as any, handleCustomCapture);

    // Show prompt after delay (for auto-show in dashboards)
    if (!hasShown.current) {
      // If it's iOS/Android-manual or already have a prompt, show after delay
      if (savedPromptEvent || isIOS() || isDesktop()) {
        hasShown.current = true;
        const timer = setTimeout(() => {
          console.log("[PWA] Auto-showing prompt after delay");
          setVisible(true);
        }, 3000);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("beforeinstallprompt", handler);
          window.removeEventListener(PROMPT_CAPTURE_EVENT as any, handleCustomCapture);
        };
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener(PROMPT_CAPTURE_EVENT as any, handleCustomCapture);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    // Always check the fresh module-level event, not just React state
    const event = savedPromptEvent || deferredPrompt;
    if (!event) {
      console.warn("[PWA] promptInstall called but no event available");
      return;
    }
    const result = await firePrompt(event);
    if (result.success) {
      setVisible(false);
      setDismissed(true);
      // Sync React state with module-level
      setDeferredPrompt(savedPromptEvent);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
    setDismissed(true);
  }, []);

  return {
    visible,
    dismissed,
    isIOSDevice: isIOS(),
    isDesktopDevice: isDesktop(),
    isInstalled: isStandalone(),
    canNativePrompt: !!deferredPrompt || !!savedPromptEvent,

    promptInstall,
    dismiss,
  };
}
