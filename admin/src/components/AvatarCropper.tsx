import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface AvatarCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onCropComplete: (croppedFile: File) => void;
}

export function AvatarCropper({ open, onOpenChange, imageFile, onCropComplete }: AvatarCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const CANVAS_SIZE = 280;
  const OUTPUT_SIZE = 400; // Final cropped image size

  useEffect(() => {
    if (imageFile && open) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        // Calculate initial scale to fit the image
        const minScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
        setScale(minScale * 1.1); // Slightly larger than minimum
        setOffset({ x: 0, y: 0 });
      };
      img.src = URL.createObjectURL(imageFile);
    }
  }, [imageFile, open]);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawImage();
    }
  }, [image, scale, offset]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate image position
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const x = (CANVAS_SIZE - scaledWidth) / 2 + offset.x;
    const y = (CANVAS_SIZE - scaledHeight) / 2 + offset.y;

    // Draw the image
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    // Draw circular mask overlay
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleCrop = () => {
    if (!image) return;

    // Create output canvas
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Scale factor from preview to output
    const outputScale = OUTPUT_SIZE / CANVAS_SIZE;

    // Calculate image position in output canvas
    const scaledWidth = image.width * scale * outputScale;
    const scaledHeight = image.height * scale * outputScale;
    const x = (OUTPUT_SIZE - scaledWidth) / 2 + offset.x * outputScale;
    const y = (OUTPUT_SIZE - scaledHeight) / 2 + offset.y * outputScale;

    // Draw image
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    // Apply circular mask
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Convert to blob and create file
    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "avatar.webp", { type: "image/webp" });
          onCropComplete(file);
          onOpenChange(false);
        }
      },
      "image/webp",
      0.85
    );
  };

  const handleReset = () => {
    if (!image) return;
    const minScale = Math.max(CANVAS_SIZE / image.width, CANVAS_SIZE / image.height);
    setScale(minScale * 1.1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Upravit profilovou fotku</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* Canvas preview */}
          <div
            className="relative rounded-full overflow-hidden border-2 border-border cursor-move"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-3 w-full px-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[scale * 100]}
              min={10}
              max={300}
              step={5}
              onValueChange={([value]) => setScale(value / 100)}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Přetáhněte obrázek pro změnu pozice
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={handleCrop}>
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
