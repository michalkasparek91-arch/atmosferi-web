/**
 * Compresses an image file to reduce size while maintaining quality
 * @param file - The original image file
 * @param maxWidth - Maximum width in pixels (default: 1200)
 * @param maxHeight - Maximum height in pixels (default: 1200)
 * @param quality - Image quality 0-1 (default: 0.6)
 * @param format - Output format: 'webp' or 'jpeg' (default: 'webp')
 * @returns Promise<File> - Compressed image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.6,
  format: 'webp' | 'jpeg' = 'webp'
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip non-image files
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn('Could not get canvas context, falling back to original');
            resolve(file);
            return;
          }

          // Draw image with white background (for transparent PNGs)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
          const extension = format === 'webp' ? '.webp' : '.jpg';
          const newFileName = file.name.replace(/\.[^/.]+$/, extension);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                console.warn('Could not compress image blob, falling back to original');
                resolve(file);
                return;
              }

              // Create new file with appropriate extension
              const compressedFile = new File([blob], newFileName, {
                type: mimeType,
                lastModified: Date.now(),
              });

              console.log(
                `Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (${format})`
              );

              resolve(compressedFile);
            },
            mimeType,
            quality
          );
        } catch (err) {
          console.error('Compression error, falling back to original:', err);
          resolve(file);
        }
      };

      img.onerror = () => {
        console.warn('Image load error, falling back to original file');
        resolve(file);
      };
    };

    reader.onerror = () => {
      console.warn('File reader error, falling back to original file');
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compresses multiple images
 */
export async function compressImages(files: File[], format: 'webp' | 'jpeg' = 'webp'): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, 1200, 1200, 0.6, format)));
}

/**
 * Compress image for background/card use (optimized for smaller display sizes)
 */
export async function compressBackgroundImage(file: File): Promise<File> {
  return compressImage(file, 640, 320, 0.55, 'webp');
}

/**
 * Compress job posting photos - balanced quality for job listings
 * 1200x1200px, quality 0.6
 */
export async function compressJobPhoto(file: File): Promise<File> {
  return compressImage(file, 1200, 1200, 0.6, 'webp');
}

/**
 * Compress job posting photos (multiple)
 */
export async function compressJobPhotos(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressJobPhoto(file)));
}

/**
 * Compress progress/in-progress work photos - smaller size for status updates
 * 1024x1024px, quality 0.55
 */
export async function compressProgressPhoto(file: File): Promise<File> {
  return compressImage(file, 1024, 1024, 0.55, 'webp');
}

/**
 * Compress progress photos (multiple)
 */
export async function compressProgressPhotos(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressProgressPhoto(file)));
}

/**
 * Compress offer/portfolio photos - good quality for showcasing work
 * 1024x1024px, quality 0.6
 */
export async function compressOfferPhoto(file: File): Promise<File> {
  return compressImage(file, 1024, 1024, 0.6, 'webp');
}

/**
 * Compress offer photos (multiple)
 */
export async function compressOfferPhotos(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressOfferPhoto(file)));
}

/**
 * Compress job completion photos - slightly higher quality for final documentation
 * 1200x1200px, quality 0.65
 */
export async function compressCompletionPhoto(file: File): Promise<File> {
  return compressImage(file, 1200, 1200, 0.65, 'webp');
}

/**
 * Compress completion photos (multiple)
 */
export async function compressCompletionPhotos(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressCompletionPhoto(file)));
}

/**
 * Compress profile/portfolio photos - good quality for professional presentation
 * 1280x1280px, quality 0.6
 */
export async function compressProfilePhoto(file: File): Promise<File> {
  return compressImage(file, 1280, 1280, 0.6, 'webp');
}

/**
 * Compress profile photos (multiple)
 */
export async function compressProfilePhotos(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressProfilePhoto(file)));
}

/**
 * Compress verification documents - higher quality for legibility
 * 1920x1920px, quality 0.85
 */
export async function compressVerificationDocument(file: File): Promise<File> {
  return compressImage(file, 1920, 1920, 0.85, 'webp');
}
