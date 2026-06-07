import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ReactNode, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { safeGoBack } from "@/utils/navigation";

interface DetailLayoutProps {
  title: string;
  children: ReactNode;
  /** Optional element rendered in the right slot (e.g. share button) */
  rightAction?: ReactNode;
  /** Use 'back' for ← Zpět (default) or 'close' for X */
  closeMode?: "back" | "close";
}

const DetailLayout = ({ title, children, rightAction, closeMode = "back" }: DetailLayoutProps) => {
  const navigate = useNavigate();
  const [isEntering, setIsEntering] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  // Slide-in animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsEntering(false));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Edge-swipe gesture handler
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Only activate on left-edge swipe (first 24px)
    if (touch.clientX <= 24) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Cancel if vertical scroll dominates
    if (deltaY > Math.abs(deltaX)) {
      touchStartRef.current = null;
      setSwipeProgress(0);
      return;
    }

    if (deltaX > 0) {
      setSwipeProgress(Math.min(deltaX / 200, 1));
    }
  };

  const handleTouchEnd = () => {
    if (swipeProgress > 0.4) {
      safeGoBack(navigate);
    }
    touchStartRef.current = null;
    setSwipeProgress(0);
  };

  return (
    <div
      className={cn(
        "h-[100dvh] flex flex-col bg-background transition-transform duration-200 ease-out",
        isEntering && "translate-x-[30%] opacity-0",
        !isEntering && "translate-x-0 opacity-100"
      )}
      style={swipeProgress > 0 ? { transform: `translateX(${swipeProgress * 100}%)`, opacity: 1 - swipeProgress * 0.3 } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Native-style navigation bar */}
      <header className="sticky top-0 z-50 bg-background border-b border-border/50 shadow-sm">
        <div className="grid grid-cols-3 items-center h-[60px] px-3">
          {/* Left: Back / Close */}
          <div className="flex justify-start">
            <button
              onClick={() => safeGoBack(navigate)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-1 -ml-1 px-3 rounded-full active:bg-muted"
            >
              {closeMode === "close" ? (
                <span className="text-base leading-none">✕</span>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  <span>Zpět</span>
                </>
              )}
            </button>
          </div>

          {/* Center: Title */}
          <div className="flex justify-center">
            <h1 className="text-sm font-semibold text-foreground truncate text-center">
              {title}
            </h1>
          </div>

          {/* Right: Optional action */}
          <div className="flex justify-end">
            {rightAction ?? <div className="w-4" />}
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>
    </div>
  );
};

export default DetailLayout;
