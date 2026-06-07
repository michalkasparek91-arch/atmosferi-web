import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import tomasImg from "../assets/testimonial-tomas.webp";
import martinImg from "../assets/testimonial-martin.webp";
import petraImg from "../assets/testimonial-petra.webp";
import janaImg from "../assets/testimonial-jana.webp";
import davidImg from "../assets/testimonial-david.webp";

const testimonials = [
  {
    name: "Tomáš K.",
    location: "Praha",
    rating: 5,
    text: "Potřeboval jsem opravdu naléhavě elektrikáře. Přes Zrobee jsem měl tři nabídky do hodiny. Vynikající služba, stačilo pár kliknutí a za dva dny bylo vše vyřešeno.",
    image: tomasImg,
  },
  {
    name: "Martin T.",
    location: "Brno",
    rating: 5,
    text: "Hledal jsem někoho na přestavbu koupelny. Do pár minut jsem dostal nabídky od ověřených řemeslníků. Výsledek předčil moje očekávání!",
    image: martinImg,
  },
  {
    name: "Petra Š.",
    location: "Ostrava",
    rating: 5,
    text: "Zrobee mi ušetřilo spoustu času. Zadala jsem poptávku na zahradníka, vybrala nabídku a vše bylo hotové. Bez stresu a zbytečných telefonátů.",
    image: petraImg,
  },
  {
    name: "Jana N.",
    location: "Olomouc",
    rating: 5,
    text: "Skvělá platforma! Potřebovala jsem malíře pokojů a do hodiny jsem měla tři nabídky. Vše proběhlo hladce a profesionálně.",
    image: janaImg,
  },
  {
    name: "David R.",
    location: "Plzeň",
    rating: 5,
    text: "Používám Zrobee pravidelně pro různé práce kolem domu. Vždy najdu spolehlivého řemeslníka za rozumnou cenu. Doporučuji všem!",
    image: davidImg,
  },
];

const MOBILE_CARD_WIDTH_PERCENT = 65;
const DESKTOP_CARD_WIDTH_PERCENT = 62;
const GAP_PX = 16;

// Extracted outside to prevent remounting on state changes
const TestimonialCard = ({ index, variant, current }: { index: number; variant: "primary" | "dark"; current: number }) => {
  const t = testimonials[index];
  const isPrimary = variant === "primary";
  const isPast = index < current;

  return (
    <div
      className="rounded-2xl p-6 md:p-8 min-h-[420px] md:min-h-[500px] flex flex-col justify-between transition-all duration-500 select-none"
      style={{
        backgroundColor: isPrimary ? 'hsl(var(--primary))' : 'hsl(var(--dark-green))',
        transform: isPast ? 'scale(0.85)' : 'scale(1)',
        opacity: isPast ? 0.5 : 1,
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img
              src={t.image}
              alt={t.name}
              loading="lazy"
              decoding="async"
              width={96}
              height={96}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${isPrimary ? "fill-primary-foreground text-primary-foreground" : "fill-white/80 text-white/80"}`} />
            ))}
          </div>
        </div>
        <p className={`text-base leading-relaxed font-normal mb-6 ${isPrimary ? "text-primary-foreground/90" : "text-white/80"}`}>
          "{t.text}"
        </p>
      </div>
      <div>
        <p className={`text-base font-bold ${isPrimary ? "text-primary-foreground" : "text-white"}`}>
          {t.name}
        </p>
        <p className={`text-sm ${isPrimary ? "text-primary-foreground/60" : "text-white/60"}`}>
          {t.location}
        </p>
      </div>
    </div>
  );
};

const TestimonialsSection = () => {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxIndex = testimonials.length - 1;

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
    // vertical → do nothing, let browser scroll
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
      {testimonials.map((_, index) => (
        <div
          key={index}
          className="flex-shrink-0"
          style={{ width: `${cardWidthPercent}%` }}
        >
          <TestimonialCard index={index} variant={index % 2 === 0 ? "primary" : "dark"} current={current} />
        </div>
      ))}
    </div>
  );

  return (
    <section className="py-16 md:py-24 pl-4 md:pl-8 lg:pl-[150px] pr-0 md:pr-8 lg:pr-[150px] bg-background">
      <div>
        {/* Mobile */}
        <div className="md:hidden pr-4">
          <div className="mb-6">
            <h2 className="text-3xl uppercase leading-[1.05] tracking-tight text-foreground font-extrablack mb-4">
              Slova našich<br />zákazníků
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} aria-label="Předchozí recenze" className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={handleNext} aria-label="Další recenze" className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div
            ref={containerRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}
            {...carouselHandlers}
          >
            {renderCards(MOBILE_CARD_WIDTH_PERCENT)}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:grid md:grid-cols-[420px_1fr] gap-10 items-start">
          <div className="pr-4 md:pr-8">
            <h2 className="text-5xl lg:text-6xl uppercase leading-[1.05] tracking-tight text-foreground font-extrablack mb-6">
              Slova našich<br />zákazníků
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} aria-label="Předchozí recenze" className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={handleNext} aria-label="Další recenze" className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors">
                <ChevronRight className="h-5 w-5" />
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
};

export default TestimonialsSection;
