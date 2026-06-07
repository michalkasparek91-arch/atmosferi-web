import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PwaInstallPointerProps {
  open: boolean;
}

export const PwaInstallPointer = ({ open }: PwaInstallPointerProps) => {
  const [deviceInfo, setDeviceInfo] = useState<{ isIOS: boolean; isSafari: boolean; isChrome: boolean }>({
    isIOS: false,
    isSafari: false,
    isChrome: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isChrome = /crios|chrome|chromium/i.test(ua);
    const isSafari = /safari/i.test(ua) && !isChrome;

    setDeviceInfo({ isIOS, isSafari, isChrome });
  }, []);

  if (!open || !deviceInfo.isIOS) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Safari Bottom Pointer */}
      {deviceInfo.isSafari && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold shadow-lg border border-white/20 whitespace-nowrap">
            Klikněte na ikonu sdílení dole
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,145,0,0.6)] border-2 border-white/40">
            <ArrowDown className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Chrome iOS Top Pointer */}
      {deviceInfo.isChrome && (
        <div className="absolute top-6 right-6 flex flex-col items-end gap-2 animate-pulse">
           <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold shadow-lg border border-white/20 whitespace-nowrap">
            Klikněte na menu vpravo nahoře
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,145,0,0.6)] border-2 border-white/40">
            <ArrowUpRight className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Global Pulsing Overlay (subtle) */}
      <div className="absolute inset-0 border-[4px] border-primary/20 animate-pulse rounded-3xl" />
    </div>
  );
};

export default PwaInstallPointer;
