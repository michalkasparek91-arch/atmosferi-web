import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WorkerCardItem from "../WorkerCardItem";

interface LocalWorkersSliderProps {
  workers: any[];
  categoryName: string;
  cityName: string;
}

const MOBILE_CARD_WIDTH_PERCENT = 85;
const DESKTOP_CARD_WIDTH_PERCENT = 45;
const GAP_PX = 16;

export default function LocalWorkersSlider({ workers, categoryName, cityName }: LocalWorkersSliderProps) {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!workers || workers.length === 0) return null;

  const maxIndex = workers.length - 1;

  const animateTo = useCallback((next: number) => {
    if (isAnimating) return;
    const clamped = Math.max(0, Math.min(maxIndex, next));
    setIsAnimating(true);
    setCurrent(clamped);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, maxIndex]);

  const handlePrev = () => animateTo(current - 1);
  const handleNext = () => animateTo(current + 1);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    directionLocked.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null || startY === null) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (directionLocked.current === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      directionLocked.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (directionLocked.current === 'horizontal') {
      setIsDragging(true);
      setDragOffset(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX === null) return;
    if (directionLocked.current === 'horizontal') {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? handleNext() : handlePrev();
      }
    }
    setStartX(null);
    setStartY(null);
    directionLocked.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    e.preventDefault();
    setStartX(e.clientX);
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startX === null) return;
    e.preventDefault();
    setIsDragging(true);
    setDragOffset(e.clientX - startX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (startX === null) return;
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? handleNext() : handlePrev();
    }
    setStartX(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleMouseLeave = () => {
    if (startX !== null) {
      setStartX(null);
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  const carouselHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
  };

  const renderCards = (cardWidthPercent: number) => (
    <div
      className={`flex ${isDragging ? '' : 'transition-transform duration-500'} ease-out`}
      style={{
        gap: `${GAP_PX}px`,
        transform: `translateX(calc(-${current} * (${cardWidthPercent}% + ${GAP_PX}px) + ${dragOffset}px))`,
      }}
    >
      {workers.map((worker, index) => (
        <div
          key={worker.id}
          className="flex-shrink-0"
          style={{ width: `${cardWidthPercent}%` }}
        >
          <WorkerCardItem 
            worker={worker} 
            categoryName={categoryName} 
            cityName={cityName} 
            variant={index % 2 === 0 ? "primary" : "dark"} 
            isPast={index < current} 
          />
        </div>
      ))}
    </div>
  );

  return (
    <section className="py-16 md:py-24 pl-4 md:pl-8 lg:pl-16 xl:pl-[150px] pr-0 md:pr-8 xl:pr-[150px] bg-background w-full overflow-hidden">
      <div>
        {/* Mobile */}
        <div className="md:hidden pr-4">
          <div className="mb-8">
            <h2 className="text-3xl uppercase leading-[1.05] tracking-tight text-foreground font-extrablack mb-6">
              Místní<br />Odborníci
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} aria-label="Předchozí odborník" className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors shadow-lg">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={handleNext} aria-label="Další odborník" className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors shadow-lg">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div
            ref={containerRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing select-none pb-4"
            style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}
            {...carouselHandlers}
          >
            {renderCards(MOBILE_CARD_WIDTH_PERCENT)}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:grid md:grid-cols-[400px_1fr] gap-10 items-start">
          <div className="pr-4 md:pr-8 pt-8">
            <h2 className="text-5xl lg:text-6xl uppercase leading-[1.05] tracking-tight text-foreground font-extrablack mb-8">
              Místní<br />Odborníci
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Zadejte poptávku a my ji do několika minut rozešleme ověřeným profesionálům ve vašem okolí.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={handlePrev} aria-label="Předchozí odborník" className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors shadow-sm">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={handleNext} aria-label="Další odborník" className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors shadow-sm">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div
            className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}
            {...carouselHandlers}
          >
            {renderCards(DESKTOP_CARD_WIDTH_PERCENT)}
          </div>
        </div>
      </div>
    </section>
  );
}
