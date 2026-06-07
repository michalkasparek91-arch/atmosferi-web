import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Defer PWA install prompt capture to after first paint
setTimeout(() => import("./hooks/use-pwa-install-prompt"), 0);

// 1. "Self-Healing" mechanism for PWAs: Catch ChunkLoadError and hydration failures
if (typeof window !== 'undefined') {
  const handleFatalError = (error: any) => {
    try {
      const errorMsg = error?.message || "";
      const isChunkError = errorMsg.includes("Loading chunk") || errorMsg.includes("LinkError");
      
      const lastRefresh = sessionStorage.getItem('last_auto_refresh');
      const now = Date.now();
      
      if (isChunkError && (!lastRefresh || now - parseInt(lastRefresh) > 10000)) {
        console.error("[PWA] ChunkLoadError detected. Refreshing...");
        sessionStorage.setItem('last_auto_refresh', now.toString());
        window.location.reload();
      }
    } catch (e) {}
  };

  window.addEventListener('error', (e) => handleFatalError(e.error));
  window.addEventListener('unhandledrejection', (e) => handleFatalError(e.reason));
}

// 2. Apply saved theme on initial load.
try {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (e) {}

// Sync system tray (theme-color) with active manual theme class
if (typeof window !== 'undefined') {
  const updateThemeColor = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? '#141414' : '#FAFAFA';
    
    // We update all theme-color meta tags to force the current active theme
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    metaTags.forEach(tag => {
      tag.setAttribute('content', color);
    });
  };

  updateThemeColor();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        updateThemeColor();
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true });
}


// 3. Fast-path redirect for returning users: skip landing page entirely
try {
  if (window.location.pathname === '/' && !window.location.hash.includes('access_token')) {
    const sessionData = localStorage.getItem('sb-uminqrrkflgldlfeaypn-auth-token');
    if (sessionData) {
      const hasPendingJob = sessionStorage.getItem('pendingJobSubmit') || sessionStorage.getItem('pendingJobData');
      if (!hasPendingJob) {
        const searchParams = new URLSearchParams(window.location.search);
        const urlRedirect = searchParams.get("redirect");
        const postAuthRedirect = urlRedirect || localStorage.getItem('postAuthRedirect') || sessionStorage.getItem('postAuthRedirect');
        
        if (postAuthRedirect) {
          localStorage.removeItem('postAuthRedirect');
          sessionStorage.removeItem('postAuthRedirect');
          
          if (urlRedirect) {
            searchParams.delete("redirect");
            const newUrl = window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "") + window.location.hash;
            window.history.replaceState({}, '', newUrl);
          } else {
            window.history.replaceState({}, '', postAuthRedirect);
          }
        } else {
          const lastRole = localStorage.getItem('last_role');
          const targetPath = lastRole === 'worker' ? '/remeslnik/hledej' : '/zakaznik/nova-zakazka';
          window.history.replaceState({}, '', targetPath);
        }
      }
    }
  }
} catch (e) {}



createRoot(document.getElementById("root")!).render(<App />);
