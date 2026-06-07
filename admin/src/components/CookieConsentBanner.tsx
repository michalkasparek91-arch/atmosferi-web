import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hasConsent,
  acceptAll,
  rejectOptional,
  saveCustomConsent,
  getConsent,
  syncConsentWithDatabase,
} from "@/lib/cookie-consent";

import { isStandalone } from "@/lib/push-notifications";

interface CookieConsentBannerProps {
  onOpenSettings?: () => void;
}

export const CookieConsentBanner = ({ onOpenSettings }: CookieConsentBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Suppress cookie consent in native app or PWA standalone context
    if (sessionStorage.getItem("isNativeApp") === "true" || isStandalone()) {
      setIsInitializing(false);
      return;
    }

    // Check if we are on a route where the banner is annoying (dashboard, admin, reset-password)
    const pathname = window.location.pathname;
    const isDashboardRoute = pathname.startsWith('/zakaznik') || pathname.startsWith('/remeslnik') || pathname.startsWith('/admin');
    const isResetPage = pathname === '/reset-password';
    
    if (isDashboardRoute || isResetPage) {
      setIsInitializing(false);
      return;
    }

    // Consent Mode defaults are now set in index.html (before GTM)
    // No need to call initializeConsentMode() here
    
    const init = async () => {
      // 1. Sync with database if logged in (The Cloud Sync Superpower)
      await syncConsentWithDatabase();
      
      // 2. Decide visibility
      if (!hasConsent()) {
        // Delay showing to ensure app is loaded
        const timerId = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timerId);
      }
      setIsInitializing(false);
    };

    init();
  }, []);

  const handleAcceptAll = async () => {
    await acceptAll();
    setIsVisible(false);
  };

  const handleRejectAll = async () => {
    await rejectOptional();
    setIsVisible(false);
  };

  const handleOpenSettings = () => {
    // Load current settings
    const consent = getConsent();
    if (consent) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    await saveCustomConsent(analytics, marketing);
    setShowSettings(false);
    setIsVisible(false);
  };

  const handleBackToMain = () => {
    setShowSettings(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Main Banner - Layer 1 */}
      <Dialog open={isVisible && !showSettings} onOpenChange={() => {}}>
        <DialogContent 
          className="p-0 gap-0 border-border/50 shadow-2xl bottom-0 top-auto translate-y-0 sm:top-[50%] sm:translate-y-[-50%] left-0 sm:left-[50%] translate-x-0 sm:translate-x-[-50%] w-full sm:max-w-[420px] rounded-t-[2.5rem] rounded-b-none sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom"
          hideCloseButton
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-label="Souhlas s cookies"
        >
          <div className="p-6 pb-5 text-center">
            {/* Friendly Icon */}
            <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center">
              <img src="/favicon-nobg.svg" alt="Zrobee" className="h-14 w-14" />
            </div>
            
            {/* Headline */}
            <DialogTitle className="text-xl font-semibold text-foreground mb-3">
              Aby Zrobee fungovalo jako po másle
            </DialogTitle>
            
            {/* Body */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Používáme cookies a podobné technologie, abychom vylepšili váš zážitek, 
              pamatovali si vaše přihlášení a ukázali vám relevantní řemeslníky. 
              Bez některých se web neobejde, jiné nám pomáhají růst.
            </p>
          </div>
          
          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {/* Primary CTA - Full width, prominent */}
            <Button 
              onClick={handleAcceptAll}
              className="w-full h-12 text-base font-semibold shadow-md cursor-pointer"
            >
              Povolit vše a pokračovat
            </Button>
            
            {/* Reject All - Equal prominence per GDPR */}
            <Button 
              variant="outline"
              onClick={handleRejectAll}
              className="w-full h-12 text-base font-medium cursor-pointer"
            >
              Pouze nezbytné
            </Button>
            
            {/* Settings - Tertiary link */}
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Nastavení preferencí
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog - Layer 2 */}
      <Dialog open={showSettings} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-[480px]"
          hideCloseButton
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Nastavení cookies
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Necessary Cookies */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Nezbytné</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Tyto cookies jsou nutné pro správné fungování webu, přihlášení a zabezpečení. 
                  Nelze je vypnout.
                </p>
              </div>
              <Switch checked={true} disabled className="opacity-50" />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Analytické</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Pomáhají nám pochopit, jak web používáte, abychom ho mohli vylepšovat 
                  (např. Google Analytics).
                </p>
              </div>
              <Switch 
                checked={analytics} 
                onCheckedChange={setAnalytics}
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Marketingové</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Umožňují vám zobrazovat relevantní reklamy a připomenout nedokončené zakázky 
                  (např. Facebook Pixel).
                </p>
              </div>
              <Switch 
                checked={marketing} 
                onCheckedChange={setMarketing}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              onClick={handleBackToMain}
              className="flex-1 text-muted-foreground rounded-full"
            >
              Zpět
            </Button>
            <Button 
              onClick={handleSaveSettings}
              className="flex-1"
            >
              Uložit nastavení
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Hook to open cookie settings from anywhere (e.g., footer)
export const useCookieSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return {
    isOpen,
    openSettings: () => setIsOpen(true),
    closeSettings: () => setIsOpen(false),
  };
};

// Standalone settings dialog for footer link
export const CookieSettingsDialog = ({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (open) {
      const consent = getConsent();
      if (consent) {
        setAnalytics(consent.analytics);
        setMarketing(consent.marketing);
      }
    }
  }, [open]);

  const handleSave = () => {
    saveCustomConsent(analytics, marketing);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-primary" />
            Nastavení cookies
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Necessary Cookies */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Nezbytné</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Tyto cookies jsou nutné pro správné fungování webu, přihlášení a zabezpečení. 
                Nelze je vypnout.
              </p>
            </div>
            <Switch checked={true} disabled className="opacity-50" />
          </div>

          {/* Analytics Cookies */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Analytické</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Pomáhají nám pochopit, jak web používáte, abychom ho mohli vylepšovat 
                (např. Google Analytics).
              </p>
            </div>
            <Switch 
              checked={analytics} 
              onCheckedChange={setAnalytics}
            />
          </div>

          {/* Marketing Cookies */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Marketingové</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Umožňují vám zobrazovat relevantní reklamy a připomenout nedokončené zakázky 
                (např. Facebook Pixel).
              </p>
            </div>
            <Switch 
              checked={marketing} 
              onCheckedChange={setMarketing}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Zrušit
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1"
          >
            Uložit nastavení
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CookieConsentBanner;
