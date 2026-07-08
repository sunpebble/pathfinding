/**
 * POI API client (authenticated).
 *
 * Provides access to the dashboard's `/api/pois` proxy route for
 * querying points of interest.
 *
 * @module
 */

import type { PaginatedResponse, Poi } from '@/types/api';
import { createApiClient } from './client';

const poisClient = createApiClient('/api/pois');

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
