import type { PaginatedResponse } from '@/types/api';
import { createApiClient } from './client';

const itinerariesClient = createApiClient('/api/itineraries');

type RawItineraryPoi = {
  id?: string | number | null;
  name?: string | null;
  category?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
} | null;

type RawItineraryItem = {
  id?: string | number | null;
  poi_id?: string | number | null;
  order_index?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  transport_mode?: string | null;
  notes?: string | null;
  poi?: RawItineraryPoi;
} | null;

type RawItineraryDay = {
  id?: string | number | null;
  day_number?: number | null;
  date?: string | null;
  items?: RawItineraryItem[] | null;
} | null;

type RawItinerary = {
  id?: string | number | null;
  user_id?: string | number | null;
  title?: string | null;
  name?: string | null;
  city_id?: string | number | null;
  city_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  visibility?: string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
  days?: RawItineraryDay[] | null;
} | null;

type RawCollaboratorUser = {
  id?: string | number | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
} | null;

type RawCollaborator = {
  id?: string | number | null;
  user_id?: string | number | null;
  role?: 'owner' | 'editor' | 'viewer' | null;
  status?: 'pending' | 'accepted' | 'rejected' | null;
  user?: RawCollaboratorUser;
} | null;

export interface ItineraryPoi {
  id: string;
  name: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
}

export interface ItineraryItem {
  id: string;
  poiId: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: string;
  notes?: string;
  poi: ItineraryPoi | null;
}

export interface ItineraryDay {
  id: string;
  dayNumber: number;
  date: string;
  items: ItineraryItem[];
}

export interface ItinerarySummary {
  id: string;
  userId?: string;
  title: string;
  cityId?: string;
  cityName?: string;
  startDate: string;
  endDate: string;
  visibility: string;
  coverImageUrl?: string;
  createdAt: string;
  days: ItineraryDay[];
  items: ItineraryItem[];
  daysCount: number;
}

export interface ItineraryCollaboratorUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}

export interface ItineraryCollaborator {
  id: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
  user: ItineraryCollaboratorUser | null;
}

export interface ItineraryDetail extends ItinerarySummary {
  collaborators: ItineraryCollaborator[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toId(value: string | number | null | undefined, fallback: string) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
}

function normalizePoi(rawPoi: RawItineraryPoi): ItineraryPoi | null {
  if (!isRecord(rawPoi) || typeof rawPoi.name !== 'string' || rawPoi.name.length === 0) {
    return null;
  }

  return {
    id: toId(rawPoi.id, rawPoi.name),
    name: rawPoi.name,
    category: rawPoi.category ?? undefined,
    address: rawPoi.address ?? undefined,
    latitude: rawPoi.latitude ?? undefined,
    longitude: rawPoi.longitude ?? undefined,
    rating: rawPoi.rating ?? undefined,
  };
}

function normalizeItem(
  rawItem: RawItineraryItem,
  dayId: string,
  index: number,
): ItineraryItem {
  const item = isRecord(rawItem) ? rawItem : {};

  return {
    id: toId(item.id, `${dayId}-item-${index}`),
    poiId: item.poi_id === null || item.poi_id === undefined ? '' : String(item.poi_id),
    orderIndex: item.order_index ?? index,
    startTime: item.start_time ?? undefined,
    endTime: item.end_time ?? undefined,
    transportMode: item.transport_mode ?? undefined,
    notes: item.notes ?? undefined,
    poi: normalizePoi(item.poi ?? null),
  };
}

function normalizeDay(rawDay: RawItineraryDay, index: number): ItineraryDay {
  const day = isRecord(rawDay) ? rawDay : {};
  const dayId = toId(day.id, `day-${index + 1}`);
  const items = toArray(day.items).map((item, itemIndex) => normalizeItem(item, dayId, itemIndex));

  return {
    id: dayId,
    dayNumber: day.day_number ?? index + 1,
    date: day.date ?? '',
    items,
  };
}

function normalizeItinerary(rawItinerary: RawItinerary): ItinerarySummary {
  const itinerary = isRecord(rawItinerary) ? rawItinerary : {};
  const days = toArray(itinerary.days).map((day, index) => normalizeDay(day, index));

  return {
    id: toId(itinerary.id, 'unknown-itinerary'),
    userId: itinerary.user_id === null || itinerary.user_id === undefined ? undefined : String(itinerary.user_id),
    title: itinerary.title ?? itinerary.name ?? 'Untitled itinerary',
    cityId: itinerary.city_id === null || itinerary.city_id === undefined ? undefined : String(itinerary.city_id),
    cityName: itinerary.city_name ?? undefined,
    startDate: itinerary.start_date ?? '',
    endDate: itinerary.end_date ?? itinerary.start_date ?? '',
    visibility: itinerary.visibility ?? 'private',
    coverImageUrl: itinerary.cover_image_url ?? undefined,
    createdAt: itinerary.created_at ?? '',
    days,
    items: days.flatMap(day => day.items),
    daysCount: days.length,
  };
}

function normalizeCollaboratorUser(
  rawUser: RawCollaboratorUser,
): ItineraryCollaboratorUser | null {
  if (!isRecord(rawUser)) {
    return null;
  }

  return {
    id: toId(rawUser.id, 'unknown-user'),
    email: rawUser.email ?? undefined,
    name: rawUser.name ?? undefined,
    image: rawUser.image ?? undefined,
  };
}

function normalizeCollaborator(
  rawCollaborator: RawCollaborator,
): ItineraryCollaborator {
  const collaborator = isRecord(rawCollaborator) ? rawCollaborator : {};

  return {
    id: toId(collaborator.id, 'unknown-collaborator'),
    userId: toId(collaborator.user_id, collaborator.user?.id ? String(collaborator.user.id) : 'unknown-user'),
    role: collaborator.role ?? 'viewer',
    status: collaborator.status ?? 'accepted',
    user: normalizeCollaboratorUser(collaborator.user ?? null),
  };
}

export function normalizeItinerariesResponse(
  response: PaginatedResponse<RawItinerary>,
): PaginatedResponse<ItinerarySummary> {
  const data = isRecord(response) ? toArray(response.data) : [];

  return {
    ...response,
    data: data.map(normalizeItinerary),
  };
}

export function normalizeItineraryResponse(response: { data: RawItinerary }) {
  return {
    data: normalizeItinerary(response.data),
  };
}

export function normalizeCollaboratorsResponse(response: { data: RawCollaborator[] }) {
  const data = isRecord(response) ? toArray(response.data) : [];

  return {
    data: data.map(normalizeCollaborator),
  };
}

export function getItineraries(query?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
  return itinerariesClient.get<PaginatedResponse<RawItinerary>>(`/${suffix}`);
}

export function getItinerary(id: string | number) {
  return itinerariesClient.get<{ data: RawItinerary }>(`/${id}`);
}

function toNumericId(value: string | number) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric ID: ${value}`);
  }

  return parsed;
}

export interface CreateItineraryItemInput {
  poiId: string | number;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: string;
  notes?: string;
}

export interface UpdateItineraryItemInput {
  poiId?: string | number;
  orderIndex?: number;
  startTime?: string;
  endTime?: string;
  transportMode?: string;
  notes?: string;
}

export function createItineraryItem(
  itineraryId: string | number,
  dayId: string | number,
  input: CreateItineraryItemInput,
) {
  return itinerariesClient.post<{ data: { id: string | number } }>(
    `/${toNumericId(itineraryId)}/days/${toNumericId(dayId)}/items`,
    {
      poiId: toNumericId(input.poiId),
      orderIndex: input.orderIndex,
      startTime: input.startTime,
      endTime: input.endTime,
      transportMode: input.transportMode,
      notes: input.notes,
    },
  );
}

export function updateItineraryItem(
  itineraryId: string | number,
  dayId: string | number,
  itemId: string | number,
  input: UpdateItineraryItemInput,
) {
  return itinerariesClient.patch<{ data: RawItinerary }>(
    `/${toNumericId(itineraryId)}/days/${toNumericId(dayId)}/items/${toNumericId(itemId)}`,
    {
      poiId: input.poiId === undefined ? undefined : toNumericId(input.poiId),
      orderIndex: input.orderIndex,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      transportMode: input.transportMode,
      notes: input.notes ?? null,
    },
  );
}

export function reorderItineraryItems(
  itineraryId: string | number,
  dayId: string | number,
  itemIds: Array<string | number>,
) {
  return itinerariesClient.patch<{ data: RawItinerary }>(
    `/${toNumericId(itineraryId)}/days/${toNumericId(dayId)}/items/reorder`,
    {
      itemIds: itemIds.map(toNumericId),
    },
  );
}

export function removeItineraryItem(
  itineraryId: string | number,
  dayId: string | number,
  itemId: string | number,
) {
  return itinerariesClient.delete<{ success: boolean; data?: RawItinerary }>(
    `/${toNumericId(itineraryId)}/days/${toNumericId(dayId)}/items/${toNumericId(itemId)}`,
  );
}
