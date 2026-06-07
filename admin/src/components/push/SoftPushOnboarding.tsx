import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { hapticTap } from "@/utils/haptics";
import { isMobile, getNotificationPermission, subscribeToPush, isIOS, isStandalone } from "@/lib/push-notifications";
import { supabase } from "@/integrations/supabase/client";

/**
 * High-impact, full-screen notification prompt shown immediately after sign-in/up in PWA mode.
 * Redesigned with a premium "Mossy Green" aesthetic matching the brand identity.
 */
interface SoftPushOnboardingProps {
  context?: string;
  onSubscribed?: () => void | Promise<void>;
}

export function SoftPushOnboarding({ context, onSubscribed }: SoftPushOnboardingProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  // Single resilient effect: polls for the trigger for 10 seconds after mount
  // This handles all timing scenarios — whether SIGNED_IN fires before or after mount
  useEffect(() => {
    let cancelled = false;

    const checkTrigger = () => {
      if (cancelled || visible) return false;
      
      const triggerValue = localStorage.getItem('push_onboarding_triggered');
      const dismissedAt = localStorage.getItem('push_notification_dismissed_at');
      
      // Cooldown check
      if (dismissedAt) {
        const timeSinceDismissal = Date.now() - parseInt(dismissedAt, 10);
        if (timeSinceDismissal < THREE_DAYS_MS) return false;
      }
      
      if (!triggerValue) return false;

      const triggerTime = parseInt(triggerValue, 10);
      const now = Date.now();
      if (now - triggerTime >= 3600000) {
        localStorage.removeItem('push_onboarding_triggered');
        return false;
      }

      // Apple Guard: redirect to PWA install instead of push prompt
      const isAppleRestricted = isIOS() && !isStandalone();
      if (isAppleRestricted) {
        console.log("[SoftPush] iOS Browser detected. Triggering PWA install instead.");
        window.dispatchEvent(new Event('trigger-pwa-install'));
        localStorage.removeItem('push_onboarding_triggered');
        return false;
      }

      const permission = getNotificationPermission();
      if (permission === 'default') {
        console.log("[SoftPush] Trigger found! Showing popup.");
        setVisible(true);
        window.dispatchEvent(new CustomEvent('soft-push-active', { detail: { active: true } }));
        return true; // Found it, stop polling
      }
      
      return false;
    };

    // Check immediately on mount
    if (checkTrigger()) return;

    // Poll every 500ms for up to 10 seconds (catches late SIGNED_IN triggers)
    const interval = setInterval(() => {
      if (checkTrigger()) {
        clearInterval(interval);
      }
    }, 500);

    // Also listen for direct event dispatch (belt-and-suspenders)
    const handleEvent = () => {
      if (checkTrigger()) {
        clearInterval(interval);
      }
    };
    window.addEventListener('trigger-soft-push', handleEvent);

    // Stop polling after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('trigger-soft-push', handleEvent);
    };
  }, [visible]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const success = await subscribeToPush(session.user.id);
        if (success) {
          window.dispatchEvent(new Event('push-permission-synced'));
        }
      }
      localStorage.removeItem('push_onboarding_triggered');
      setVisible(false);
      onSubscribed?.();
    } catch (error) {
      console.error("[SoftPush] Error enabling push:", error);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    localStorage.removeItem('push_onboarding_triggered');
    localStorage.setItem('push_notification_dismissed_at', Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  if (isMobile()) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[#1a2e1a] overflow-hidden animate-in fade-in duration-500">
         <div className="flex-1 relative flex flex-col items-center justify-center px-8">
           {/* Background decorative elements - Mossy theme blurs */}
           <div className="absolute top-[15%] left-[5%] w-72 h-72 bg-[#a6d16f]/5 rounded-full blur-[100px] animate-pulse" />
           <div className="absolute bottom-[25%] right-[5%] w-80 h-80 bg-[#a6d16f]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
           
           <div className="relative z-10 flex flex-col items-center text-center">
             {/* Center Symbol: Minimalist cutout Bell icon */}
             <div className="mb-12 animate-in zoom-in duration-1000">
               <Bell className="w-32 h-32 text-[#a6d16f] rotate-[15deg]" strokeWidth={1} />
             </div>
  
             <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-700 delay-300">
               <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-white leading-tight font-['TT_Norms_Pro']">
                 Nezmeškejte žádnou zprávu
               </h2>
               <p className="text-white/70 text-[18px] leading-relaxed font-medium max-w-sm mx-auto font-['TT_Norms_Pro']">
                 Budeme vás informovat o nových nabídkách a zprávách, i když nejste v aplikaci.
               </p>
             </div>
           </div>
         </div>
  
         {/* Bottom panel with pill-shaped actions */}
         <div className="p-8 pb-14 bg-gradient-to-t from-[#1a2e1a] via-[#1a2e1a] to-transparent pt-20">
           <div className="space-y-4 max-w-sm mx-auto animate-in slide-in-from-bottom-10 duration-700 delay-500">
             <Button
               className="w-full h-[68px] text-[18px] font-semibold rounded-full bg-[#a6d16f] hover:bg-[#b8e081] text-[#1a2e1a] shadow-2xl shadow-[#a6d16f]/20 active:scale-[0.98] transition-all haptic-feedback font-['TT_Norms_Pro']"
               onClick={() => { hapticTap(); handleEnable(); }}
               disabled={loading}
             >
               {loading ? "Povoluji..." : "Zapnout notifikace"}
             </Button>
             
             <button
               className="w-full py-4 text-[14px] font-medium text-white/50 hover:text-white transition-colors font-['TT_Norms_Pro']"
               onClick={() => { hapticTap(); handleDecline(); }}
               disabled={loading}
             >
               Možná později
             </button>
           </div>
         </div>
      </div>
    );
  }

  // Desktop Banner Version
  return (
    <div className="fixed bottom-6 right-6 z-[10000] w-[400px] bg-[#1a2e1a] rounded-[32px] shadow-2xl border border-white/10 p-6 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
      {/* Subtle background blob */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#a6d16f]/10 rounded-full blur-3xl -mr-16 -mt-16" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Bell className="w-8 h-8 text-[#a6d16f] rotate-[15deg]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="text-xl font-bold text-white leading-tight font-['TT_Norms_Pro'] tracking-tight">
              Nezmeškejte zprávu
            </h3>
            <p className="text-white/60 text-sm font-medium mt-1 font-['TT_Norms_Pro']">
              Upozorníme vás na nové nabídky a zprávy v prohlížeči.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="flex-1 h-12 text-[13px] font-semibold rounded-full bg-[#a6d16f] hover:bg-[#b8e081] text-[#1a2e1a] active:scale-[0.98] transition-all font-['TT_Norms_Pro']"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? "Povoluji..." : "Zapnout notifikace"}
          </Button>
          <button
            className="px-4 py-2 text-[11px] font-medium text-white/40 hover:text-white transition-colors font-['TT_Norms_Pro']"
            onClick={handleDecline}
            disabled={loading}
          >
            Později
          </button>
        </div>
      </div>
    </div>
  );
}
