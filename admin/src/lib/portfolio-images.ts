export const PORTFOLIO_BUCKET = "visualization-portfolio";
export const MAX_PORTFOLIO_IMAGES = 30;
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
export type PortfolioImage = {
  full: string; thumb: string; alt: string; caption: string;
  width: number; height: number; bytes: number;
};
export type PortfolioProject = {
  id: string; title: string; location: string; project_year: number | null;
  category: string; description: string; credits: string; images: PortfolioImage[];
  published: boolean; created_at: string;
};
export async function preparePortfolioImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type))
    throw new Error("Použijte JPG, PNG, WebP nebo AVIF. HEIC a RAW nejprve exportujte do JPG.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Jeden vstupní obrázek může mít nejvýše 40 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error(`Soubor ${file.name} nelze otevřít. Zkuste jej znovu exportovat jako JPG nebo PNG.`);
  });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 80_000_000)
      throw new Error("Obrázek je příliš velký. Exportujte ho prosím do rozlišení nejvýše 80 Mpx.");
    async function render(maxSide: number, quality: number, maxBytes: number) {
      const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Prohlížeč nedokáže zpracovat obrázek.");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let blob: Blob | null = null;
      for (let q = quality; q >= 0.54; q -= 0.08) {
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", q));
        if (!blob) throw new Error("Komprese obrázku se nezdařila.");
        if (blob.size <= maxBytes) break;
      }
      if (!blob || blob.size > maxBytes || !["image/webp", "image/jpeg"].includes(blob.type))
        throw new Error("Obrázek nelze bezpečně zkomprimovat. Zkuste menší JPG nebo jiný prohlížeč.");
      return { blob, width: canvas.width, height: canvas.height, extension: blob.type === "image/webp" ? "webp" : "jpg" };
    }
    // Process sequentially: large architecture images must not exhaust memory.
    const full = await render(2560, 0.86, 5 * 1024 * 1024);
    const thumb = await render(1000, 0.78, 1024 * 1024);
    return { full, thumb };
  } finally { bitmap.close(); }
}
