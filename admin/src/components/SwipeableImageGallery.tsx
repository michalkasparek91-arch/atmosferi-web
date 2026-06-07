import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SwipeableImageGalleryProps {
  images: string[];
  onImageClick?: (index: number) => void;
  className?: string;
  showDots?: boolean;
  showArrows?: boolean;
}

export const SwipeableImageGallery = ({
  images,
  onImageClick,
  className = "",
  showDots = true,
  showArrows = true,
}: SwipeableImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    // Limit the drag to prevent over-scrolling
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const maxDrag = containerWidth * 0.5;
    const clampedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    setTranslateX(clampedDiff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const diff = currentX.current - startX.current;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff < 0 && currentIndex < images.length - 1) {
        // Swipe left - next image
        setCurrentIndex(prev => prev + 1);
      } else if (diff > 0 && currentIndex > 0) {
        // Swipe right - previous image
        setCurrentIndex(prev => prev - 1);
      }
    }
    
    setTranslateX(0);
  };

  const goToPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
  };

  if (images.length === 0) return null;

  // Single image - no sliding
  if (images.length === 1) {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        <img
          src={images[0]}
          alt=""
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => onImageClick?.(0)}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="w-full h-full flex-shrink-0"
            onClick={() => onImageClick?.(index)}
          >
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover cursor-pointer"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <div className="absolute bottom-3 left-3 flex gap-1">
            {showDots && images.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  currentIndex === i ? "bg-primary" : "bg-primary/40"
                }`}
              />
            ))}
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={goToPrev}
              className="flex h-10 w-10 rounded-full bg-primary items-center justify-center hover:bg-primary-hover transition-colors"
            >
              <svg className="h-5 w-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <button
              onClick={goToNext}
              className="flex h-10 w-10 rounded-full bg-primary items-center justify-center hover:bg-primary-hover transition-colors"
            >
              <svg className="h-5 w-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </>
      )}

      {/* Dots indicator (when arrows hidden) */}
      {showDots && !showArrows && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                currentIndex === i ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageLightbox = ({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  // Reset index when opening
  useState(() => {
    if (open) setCurrentIndex(initialIndex);
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const diff = currentX.current - startX.current;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff < 0 && currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (diff > 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
    
    setTranslateX(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
        <div
          className="relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex h-full"
            style={{
              transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {images.map((image, index) => (
              <div key={index} className="w-full flex-shrink-0 flex items-center justify-center">
                <img
                  src={image}
                  alt=""
                  className="w-full h-auto max-h-[80vh] object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              <button
                onClick={() => setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
