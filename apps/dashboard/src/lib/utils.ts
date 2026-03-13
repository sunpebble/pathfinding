/**
 * Shared utility functions for the dashboard.
 *
 * @module
 */

import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 * Combines `clsx` (conditional class concatenation) with `twMerge`
 * (Tailwind-aware deduplication) so that later classes override
 * earlier ones when they target the same utility.
 *
 * @param inputs - Class values (strings, arrays, objects, etc.).
 * @returns A single merged class string.
 *
 * @example
 * ```ts
 * cn('px-2 py-1', isActive && 'bg-blue-500', 'px-4');
 * // => 'py-1 bg-blue-500 px-4'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object to a localized date-time string.
 *
 * Returns an empty string for invalid dates rather than throwing.
 *
 * @param date - ISO date string or Date instance.
 */
export function formatDateTime(date: string | Date): string {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }
  return parsedDate.toLocaleString();
}

/**
 * Extract the first 8 characters of an ID for display purposes.
 *
 * Useful for showing truncated UUIDs in the UI.
 *
 * @param id - Full identifier string (typically a UUID).
 * @returns The first 8 characters.
 */
export function shortId(id: string): string {
  return id.slice(0, 8);
}

/**
 * Validate and convert a string or number ID to a positive integer.
 *
 * @param value - The value to convert.
 * @returns The parsed positive integer.
 * @throws If the value is not a valid positive integer.
 */
export function toNumericId(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric ID: ${value}`);
  }

  return parsed;
}
