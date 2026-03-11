import type { PaginatedResponse, Poi } from '@/types/api';
import { createApiClient } from './client';

const poisClient = createApiClient('/api/pois');
const guidesClient = createApiClient('/api/guides');

export function getPois(query?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
  return poisClient.get<PaginatedResponse<Poi>>(`/${suffix}`);
}

export function getPoi(id: string | number) {
  return poisClient.get<{ data: Poi }>(`/${id}`);
}

export function searchPois(query?: Record<string, string | number | undefined>) {
  return getPois(query);
}

export interface UpdateGuidePoiCoordinatesInput {
  dayNumber: number;
  poiIndex: number;
  latitude: number;
  longitude: number;
  verifiedBy?: string;
}

export function updateGuidePoiCoordinates(
  guideId: string | number,
  input: UpdateGuidePoiCoordinatesInput,
) {
  return guidesClient.patch<{ success: boolean }>(`/${guideId}/poi-coordinates`, input);
}
