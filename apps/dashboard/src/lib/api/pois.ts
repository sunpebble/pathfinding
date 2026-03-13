/**
 * POI API client (authenticated).
 *
 * Provides access to the dashboard's `/api/pois` and `/api/guides`
 * proxy routes for querying and updating points of interest.
 *
 * @module
 */

import type { PaginatedResponse, Poi } from '@/types/api';
import { createApiClient } from './client';

const poisClient = createApiClient('/api/pois');
const guidesClient = createApiClient('/api/guides');

/**
 * Build a query string suffix from a flat params object.
 *
 * @returns A string like `?key=value&…` or empty string if no params.
 */
function buildQuerySuffix(query?: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.size > 0 ? `?${searchParams.toString()}` : '';
}

/**
 * List POIs with optional filter/pagination parameters.
 *
 * @param query - Key-value pairs appended as query string params.
 */
export function getPois(query?: Record<string, string | number | undefined>): Promise<PaginatedResponse<Poi>> {
  return poisClient.get<PaginatedResponse<Poi>>(`/${buildQuerySuffix(query)}`);
}

/**
 * Fetch a single POI by ID.
 *
 * @param id - POI identifier.
 */
export function getPoi(id: string | number): Promise<{ data: Poi }> {
  return poisClient.get<{ data: Poi }>(`/${id}`);
}

/**
 * Search POIs with optional filter parameters.
 *
 * Currently delegates to {@link getPois}; exists as a semantic alias
 * in case the search endpoint diverges in the future.
 *
 * @param query - Key-value pairs appended as query string params.
 */
export function searchPois(query?: Record<string, string | number | undefined>): Promise<PaginatedResponse<Poi>> {
  return getPois(query);
}

/** Input for updating a guide POI's coordinates. */
export interface UpdateGuidePoiCoordinatesInput {
  dayNumber: number;
  poiIndex: number;
  latitude: number;
  longitude: number;
  verifiedBy?: string;
}

/**
 * Update the geo-coordinates of a POI within a travel guide.
 *
 * @param guideId - The guide containing the POI.
 * @param input - New coordinates and verification metadata.
 */
export function updateGuidePoiCoordinates(
  guideId: string | number,
  input: UpdateGuidePoiCoordinatesInput,
): Promise<{ success: boolean }> {
  return guidesClient.patch<{ success: boolean }>(`/${guideId}/poi-coordinates`, input);
}
