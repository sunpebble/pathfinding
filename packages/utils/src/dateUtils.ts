/**
 * Date utilities for timezone handling and formatting
 */

/**
 * Convert a date to a specific timezone
 *
 * @warning This returns a Date whose UTC values don't match the timezone.
 * The local time values approximate the target timezone.
 * For accurate timezone handling, use Temporal API or date-fns-tz.
 */
export function toTimezone(date: Date | string, timezone: string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(d).map(p => [p.type, p.value]),
  );
  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`,
  );
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time as HH:mm
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Parse time string (HH:mm) to hours and minutes.
 * Returns null for invalid input instead of silently falling back to 00:00.
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match)
    return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59)
    return null;
  return { hours, minutes };
}

/**
 * Combine date and time string into a Date object
 */
export function combineDateAndTime(
  date: Date | string,
  timeStr: string,
  timezone?: string,
): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parsed = parseTime(timeStr);
  const hours = parsed?.hours ?? 0;
  const minutes = parsed?.minutes ?? 0;

  const result = new Date(d);
  result.setHours(hours, minutes, 0, 0);

  if (timezone) {
    // Adjust for timezone if specified
    const utcDate = new Date(
      result.toLocaleString('en-US', { timeZone: 'UTC' }),
    );
    const tzDate = new Date(
      result.toLocaleString('en-US', { timeZone: timezone }),
    );
    const diff = utcDate.getTime() - tzDate.getTime();
    return new Date(result.getTime() + diff);
  }

  return result;
}

/**
 * Get number of days between two dates (inclusive).
 * Uses UTC-based calculation to avoid DST issues.
 */
export function getDaysBetween(
  startDate: Date | string,
  endDate: Date | string,
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / 86_400_000) + 1;
}

/**
 * Generate an array of dates between start and end (inclusive)
 */
export function getDateRange(
  startDate: Date | string,
  endDate: Date | string,
): Date[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (start > end)
    return [];

  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string,
): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  return d >= start && d <= end;
}

/**
 * Get relative time description (e.g., "2 days ago")
 */
export function getRelativeTime(
  date: Date | string,
  locale: 'zh' | 'en' = 'zh',
  now: Date = new Date(),
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0) {
    return locale === 'zh' ? '即将' : 'upcoming';
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (locale === 'zh') {
    if (diffMins < 1)
      return '刚刚';
    if (diffMins < 60)
      return `${diffMins}分钟前`;
    if (diffHours < 24)
      return `${diffHours}小时前`;
    if (diffDays < 7)
      return `${diffDays}天前`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365)
      return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  }
  else {
    if (diffMins < 1)
      return 'just now';
    if (diffMins < 60)
      return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours}h ago`;
    if (diffDays < 7)
      return `${diffDays}d ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365)
      return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }
}

/**
 * Format date for display with localization
 */
export function formatLocalizedDate(
  date: Date | string,
  locale: 'zh' | 'en' = 'en',
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Check for invalid date
    if (Number.isNaN(d.getTime())) {
      return typeof date === 'string' ? date : 'Invalid Date';
    }
    const localeStr = locale === 'zh' ? 'zh-CN' : 'en-US';
    return d.toLocaleDateString(localeStr, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    });
  }
  catch {
    return typeof date === 'string' ? date : 'Invalid Date';
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale: 'zh' | 'en' = 'en',
): string {
  const localeStr = locale === 'zh' ? 'zh-CN' : 'en-US';
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const shortOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (start.getTime() === end.getTime()) {
    return start.toLocaleDateString(localeStr, {
      ...shortOptions,
      year: 'numeric',
    });
  }

  return `${start.toLocaleDateString(localeStr, shortOptions)} - ${end.toLocaleDateString(localeStr, { ...shortOptions, year: 'numeric' })}`;
}
