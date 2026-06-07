import React, { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { Bell, X, Zap, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandalone, getNotificationPermission, subscribeToPush } from "@/lib/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export function PushOnboarding() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkEligibility = async () => {
      // 1. Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      setUserId(session.user.id);

      // 2. Check if already dismissed recently
      const lastDismissed = localStorage.getItem("push_prompt_dismissed");
      if (lastDismissed) {
        const dismissedDate = new Date(lastDismissed);
        const now = new Date();
        const diffDays = (now.getTime() - dismissedDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 7) return; // Only show once every 7 days if dismissed
      }

      // 3. Check if standalone (PWA) and permission is default
      if (isStandalone() && getNotificationPermission() === "default") {
        // Delay slightly to not interrupt initial load
        setTimeout(() => setOpen(true), 2000);
      }
    };

    checkEligibility();
  }, []);

  const handleEnable = async () => {
    if (!userId) return;
    
    try {
      await subscribeToPush(userId);
      setOpen(false);
    } catch (error) {
      console.error("[Push] Error from onboarding prompt:", error);
      // If they deny it, the native prompt handles the state
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("push_prompt_dismissed", new Date().toISOString());
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]" />
        <Drawer.Content className="bg-white dark:bg-slate-900 flex flex-col rounded-t-[32px] h-auto mt-24 fixed bottom-0 left-0 right-0 z-[101] outline-none max-w-lg mx-auto">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-t-[32px] flex-1">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 mb-8" />
            
            <div className="max-w-md mx-auto px-4 pb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Bell className="w-8 h-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white border-4 border-white dark:border-slate-900">
                    <Zap className="w-3 h-3 fill-current" />
                  </div>
                </div>
              </div>

              <Drawer.Title className="text-2xl font-black text-center mb-2 tracking-tight">
                Zůstaňte v obraze
              </Drawer.Title>
              
              <Drawer.Description className="text-slate-500 dark:text-slate-400 text-center mb-8 text-[15px] leading-relaxed">
                Dostávejte upozornění na <strong>nové zprávy</strong> a <strong>zakázky</strong>, i když zrovna nejste v aplikaci.
              </Drawer.Description>

              <div className="space-y-4 mb-4">
                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="text-[13px] font-medium leading-tight">
                    Okamžitá upozornění na zprávy od {window.location.pathname.includes('remeslnik') ? 'zákazníků' : 'řemeslníků'}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-[13px] font-medium leading-tight">
                    Aktualizace stavu vašich poptávek a nabídek
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <Button 
                  onClick={handleEnable}
                  className="w-full h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm shadow-sm active:scale-95 transition-all"
                >
                  Povolit notifikace
                </Button>
                <button 
                  onClick={handleDismiss}
                  className="w-full h-12 text-slate-400 dark:text-slate-500 font-bold text-xs hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Vypnout navždy
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-6 px-4">
                Nastavení oznámení můžete kdykoliv změnit v profilu aplikace.
              </p>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
