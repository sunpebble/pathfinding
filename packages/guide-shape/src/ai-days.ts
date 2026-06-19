import type { DayItinerary } from '@pathfinding/database';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function recordFromJson(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function arrayFromRecord(record: Record<string, unknown>, keys: string[]): unknown[] | null {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

/** Read the day number of an aiDays entry (day_number / dayNumber / day) — D13 unified 3-key reader. */
export function aiDayNumber(day: Record<string, unknown>): number | null {
  const value = day.day_number ?? day.dayNumber ?? day.day;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Derive schema-shaped dayItineraries from an aiDays blob — the single source of
 * truth (D13). A day is kept when it has a valid day number; a POI is kept only
 * when it has a string name and finite latitude/longitude. title falls back to theme.
 */
export function aiDaysToDayItineraries(aiDays: unknown[]): DayItinerary[] {
  const itineraries: DayItinerary[] = [];

  for (const day of aiDays) {
    if (!isRecord(day)) {
      continue;
    }
    const dayNumber = aiDayNumber(day);
    if (dayNumber === null) {
      continue;
    }

    const title = typeof day.title === 'string'
      ? day.title
      : typeof day.theme === 'string'
        ? day.theme
        : undefined;
    const pois = (Array.isArray(day.pois) ? day.pois : [])
      .filter(isRecord)
      .filter(poi =>
        typeof poi.name === 'string'
        && typeof poi.latitude === 'number' && Number.isFinite(poi.latitude)
        && typeof poi.longitude === 'number' && Number.isFinite(poi.longitude),
      )
      .map(poi => ({
        name: poi.name as string,
        lat: poi.latitude as number,
        lng: poi.longitude as number,
        ...(typeof poi.type === 'string' ? { category: poi.type } : {}),
      }));

    itineraries.push({ day: dayNumber, ...(title ? { title } : {}), pois });
  }

  return itineraries;
}

/** Pick the authored aiDays blob: enrichedData.aiDays, then ai_days, then a caller fallback. */
export function resolveAiDays(
  enrichedData: Record<string, unknown>,
  fallback: unknown,
): unknown[] | null {
  return (
    arrayFromRecord(enrichedData, ['aiDays', 'ai_days'])
    ?? (Array.isArray(fallback) ? fallback : null)
  );
}
