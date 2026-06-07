import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MobileLivePreviewProps {
  title: string;
  body: string;
  imageUrl?: string;
}

export function MobileLivePreview({ title, body, imageUrl }: MobileLivePreviewProps) {
  return (
    <div className="sticky top-6">
      <div className="flex items-center gap-2 mb-4 px-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <Label className="text-[10px] font-semibold tracking-widest text-muted-foreground opacity-60">Živý náhled zařízení</Label>
      </div>
      
      <div className="relative mx-auto w-full max-w-[280px] h-[580px] bg-slate-100 dark:bg-slate-800 rounded-[3rem] p-3 border-[6px] border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-200 dark:bg-slate-700 rounded-b-2xl z-20" />
        <div className="relative h-full w-full bg-[#1a1c1e] rounded-[2.2rem] overflow-hidden p-4 pt-10">
          <div className="flex justify-between px-2 mb-8 opacity-40 text-white text-[10px] font-semibold">
            <span>9:41</span>
            <div className="flex gap-1.5">
              <div className="w-3 h-2 bg-white rounded-sm" />
              <div className="w-3 h-2 bg-white rounded-sm" />
            </div>
          </div>

          <div className={cn(
            "transition-all duration-700 transform",
            (title || body) ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
          )}>
            <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-3.5 border border-white/10 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-lg">
                  <img src="/splash/splash_logo.svg" alt="" className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-white/40 tracking-[0.2em]">ZROBEE</span>
                    <span className="text-[10px] font-medium text-white/20">teď</span>
                  </div>
                  <p className="font-semibold text-[11px] text-white tracking-tight leading-tight truncate">{title || "Nadpis zprávy"}</p>
                  <p className="text-[10px] text-white/60 leading-tight mt-1 line-clamp-3">{body || "Zde se zobrazí náhled textu tak, jak ho uvidí uživatel..."}</p>
                </div>
              </div>
              {imageUrl && (
                <div className="mt-2.5 rounded-lg overflow-hidden border border-white/10 aspect-[2/1] bg-black/20">
                  <img src={imageUrl} alt="Push Notification Media" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 top-32 bg-gradient-to-t from-emerald-500/20 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
