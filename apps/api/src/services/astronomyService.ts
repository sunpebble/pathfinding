/**
 * Astronomy Service
 * Proxy service that forwards requests to the Crawler API astronomy endpoints
 */

import type {
  AstronomicalEvent,
  AstronomyData,
  MoonPhase,
  StargazingSpot,
  SunTimes,
} from '@pathfinding/types';

// Crawler API base URL
const CRAWLER_API_URL = process.env.CRAWLER_API_URL || 'http://localhost:3001';

/**
 * Fetch helper with error handling
 */
async function fetchFromCrawler<T>(path: string): Promise<T> {
  const response = await fetch(`${CRAWLER_API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  const result = await response.json();
  return result.data as T;
}

/**
 * Astronomy Service
 */
export const AstronomyService = {
  /**
   * Get sun times for a specific location and date
   */
  async getSunTimes(
    latitude: number,
    longitude: number,
    date?: string,
    timezone?: string
  ): Promise<SunTimes> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
    });

    if (date) params.append('date', date);
    if (timezone) params.append('timezone', timezone);

    return fetchFromCrawler<SunTimes>(`/api/astronomy/sun-times?${params}`);
  },

  /**
   * Get sun times for a date range
   */
  async getSunTimesRange(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
    timezone?: string
  ): Promise<SunTimes[]> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      startDate,
      endDate,
    });

    if (timezone) params.append('timezone', timezone);

    return fetchFromCrawler<SunTimes[]>(`/api/astronomy/sun-times/range?${params}`);
  },

  /**
   * Get moon phase for a specific date
   */
  async getMoonPhase(date?: string): Promise<MoonPhase> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const queryString = params.toString();
    return fetchFromCrawler<MoonPhase>(
      `/api/astronomy/moon-phase${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get moon phases for a date range
   */
  async getMoonPhases(startDate: string, endDate: string): Promise<MoonPhase[]> {
    const params = new URLSearchParams({ startDate, endDate });
    return fetchFromCrawler<MoonPhase[]>(`/api/astronomy/moon-phases?${params}`);
  },

  /**
   * Get astronomical events
   */
  async getEvents(
    startDate?: string,
    endDate?: string,
    types?: string[]
  ): Promise<AstronomicalEvent[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (types && types.length > 0) params.append('types', types.join(','));

    const queryString = params.toString();
    return fetchFromCrawler<AstronomicalEvent[]>(
      `/api/astronomy/events${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get stargazing spots near a location
   */
  async getStargazingSpots(
    latitude: number,
    longitude: number,
    radiusKm?: number,
    limit?: number
  ): Promise<StargazingSpot[]> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
    });

    if (radiusKm) params.append('radiusKm', radiusKm.toString());
    if (limit) params.append('limit', limit.toString());

    return fetchFromCrawler<StargazingSpot[]>(`/api/astronomy/stargazing-spots?${params}`);
  },

  /**
   * Get combined astronomy data
   */
  async getCombinedData(
    latitude: number,
    longitude: number,
    date?: string,
    timezone?: string,
    includeEvents?: boolean,
    includeSpots?: boolean
  ): Promise<AstronomyData> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
    });

    if (date) params.append('date', date);
    if (timezone) params.append('timezone', timezone);
    if (includeEvents !== undefined) params.append('includeEvents', includeEvents.toString());
    if (includeSpots !== undefined) params.append('includeSpots', includeSpots.toString());

    return fetchFromCrawler<AstronomyData>(`/api/astronomy/combined?${params}`);
  },
};
