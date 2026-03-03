import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a localized date time string
 */
export function formatDateTime(date: string | Date): string {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }
  return parsedDate.toLocaleString();
}

/**
 * Format a short ID from a UUID
 */
export function shortId(id: string): string {
  return id.slice(0, 8);
}
