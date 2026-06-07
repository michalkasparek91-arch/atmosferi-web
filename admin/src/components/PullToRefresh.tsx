import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  /** Minimum pull distance (px) to trigger refresh — default 70 */
  pullThreshold?: number;
  /** Maximum visual pull distance (px) — default 90 */
  maxPull?: number;
  className?: string;
}

/**
 * Wraps children with native-feeling pull-to-refresh behaviour.
 * Only activates when the user is already scrolled to the top of the container.
 * Uses passive DOM listeners to avoid React type namespace issues.
 */
export function PullToRefresh({
  onRefresh,
  children,
  pullThreshold = 70,
  maxPull = 90,
  className,
}: PullToRefreshProps) {
  const touchStartY = useRef(0);
  const isTouching = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  // Keep refs in sync so event handlers (added via DOM) can read latest values
  const syncRefs = useCallback(() => {
    isRefreshingRef.current = isRefreshing;
    pullDistanceRef.current = pullDistance;
  }, [isRefreshing, pullDistance]);
  
  useEffect(() => { syncRefs(); });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 2) return;
      isTouching.current = true;
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouching.current || isRefreshingRef.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Rubber-band damping
      const clamped = Math.min(delta * 0.5, maxPull);
      setPullDistance(clamped);
      pullDistanceRef.current = clamped;
      if (clamped > 5) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!isTouching.current) return;
      isTouching.current = false;
      const dist = pullDistanceRef.current;
      if (dist < pullThreshold) {
        setPullDistance(0);
        return;
      }
      setPullDistance(pullThreshold);
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [maxPull, pullThreshold, onRefresh]);

  const spinnerOpacity = Math.min(pullDistance / pullThreshold, 1);
  const spinnerScale = 0.5 + spinnerOpacity * 0.5;
  const rotation = isRefreshing ? undefined : (pullDistance / pullThreshold) * 180;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden"
        style={{
          height: `${pullDistance}px`,
          top: 0,
          transition: isRefreshing ? "height 0.15s ease" : "none",
        }}
      >
        <div
          style={{
            opacity: spinnerOpacity,
            transform: `scale(${spinnerScale})`,
            transition: "transform 0.1s ease",
          }}
        >
          <RefreshCw
            className={cn("h-6 w-6 text-primary", isRefreshing && "animate-spin")}
            style={rotation !== undefined ? { transform: `rotate(${rotation}deg)` } : undefined}
          />
        </div>
      </div>

      {/* Actual content, pushed down by pull distance */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? "transform 0.25s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
