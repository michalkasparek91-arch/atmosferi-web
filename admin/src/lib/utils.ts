import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a unique ID (UUID v4 style).
 * Uses crypto.randomUUID() if available (modern browsers),
 * or falls back to a pseudo-random implementation for older browsers (e.g., Samsung Internet < 17).
 */
export const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
/**
 * Generates a URL-friendly slug from a string.
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Anonymizes a full name (e.g., "Michal Kasparek" -> "Michal K.")
 */
export function formatAnonymizedName(fullName: string | null | undefined): string {
  if (!fullName) return "Zákazník";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}
