import { useEffect } from "react";
import { X, Share, MoreVertical, Download, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstallPrompt } from "@/hooks/use-pwa-install-prompt";
import chromeInstallIcon from "@/assets/chrome-install-icon.png";

interface AddToHomeScreenProps {
  onDismissed?: () => void;
  /** Force the prompt visible immediately (e.g. from landing page button) */
  forceVisible?: boolean;
  /** Ignore the 3-day cooldown (for dashboard one-time prompts) */
  ignoreCooldown?: boolean;
}

const AddToHomeScreen = ({ onDismissed, forceVisible = false, ignoreCooldown = false }: AddToHomeScreenProps) => {
  const { visible, dismissed, isIOSDevice, isDesktopDevice, canNativePrompt, promptInstall, dismiss } = usePwaInstallPrompt(ignoreCooldown);


  const isShown = forceVisible || visible;

  // Signal parent when prompt won't show or has been dismissed
  useEffect(() => {
    if (dismissed) {
      onDismissed?.();
    }
  }, [dismissed, onDismissed]);

  // If after 5s the prompt still isn't visible (and not forced), signal parent
  useEffect(() => {
    if (forceVisible) return;
    if (visible) return;
    const timer = setTimeout(() => {
      onDismissed?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible, forceVisible, onDismissed]);

  // Auto-trigger native prompt when forced and available
  useEffect(() => {
    if (forceVisible && canNativePrompt) {
      promptInstall();
    }
  }, [forceVisible, canNativePrompt, promptInstall]);

  const handleDismiss = () => {
    dismiss();
    onDismissed?.();
  };

  const handleInstall = async () => {
    if (canNativePrompt) {
      await promptInstall();
    }
    onDismissed?.();
  };

  if (!isShown) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] p-4 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-md rounded-2xl bg-card border border-border shadow-xl p-5 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Zavřít"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo + Title */}
        <div className="flex items-center gap-3 mb-3">
          <img src="/favicon.svg" alt="Zrobee" className="w-10 h-10 rounded-xl" />
          <h3 className="text-sm font-semibold text-foreground">
            Nainstalujte si Zrobee jako aplikaci
          </h3>
        </div>

        {/* Instructions or native install */}
        {isIOSDevice ? (
          <>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Klepněte na ikonu{" "}
              <Share className="inline h-3.5 w-3.5 -mt-0.5 text-primary" />{" "}
              <span className="font-medium">Sdílet</span> a vyberte{" "}
              <span className="font-medium">Přidat na plochu</span>.
            </p>
            <Button onClick={handleDismiss} className="w-full rounded-full" size="sm">
              Rozumím
            </Button>
          </>
        ) : canNativePrompt ? (
          <>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Nainstalujte si aplikaci pro rychlejší přístup a offline režim.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleDismiss} variant="outline" className="flex-1 rounded-full" size="sm">
                Později
              </Button>
              <Button onClick={handleInstall} className="flex-1 rounded-full gap-1.5" size="sm">
                <Download className="h-3.5 w-3.5" />
                Nainstalovat
              </Button>
            </div>
          </>
        ) : isDesktopDevice ? (
          <>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              V adresním řádku prohlížeče Chrome klikněte na ikonu instalace:
            </p>
            <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 mb-4">
              <img src={chromeInstallIcon} alt="Install icon" className="w-8 h-8 object-contain" />
              <span className="text-xs text-foreground font-medium">
                Klikněte na „Install Zrobee" v pravém horním rohu prohlížeče
              </span>
            </div>
            <Button onClick={handleDismiss} className="w-full rounded-full" size="sm">
              Rozumím
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Klepněte na{" "}
              <MoreVertical className="inline h-3.5 w-3.5 -mt-0.5 text-primary" />{" "}
              <span className="font-medium">menu</span> a vyberte{" "}
              <span className="font-medium">Přidat na domovskou obrazovku</span>.
            </p>
            <Button onClick={handleDismiss} className="w-full rounded-full" size="sm">
              Rozumím
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AddToHomeScreen;
