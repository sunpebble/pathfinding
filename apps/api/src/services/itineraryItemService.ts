import type { ItineraryItem, Poi, TransportMode } from '@pathfinding/types';
import type {
  CreateItineraryItemInput,
  ReorderItemsInput,
  UpdateItineraryItemInput,
} from '../models/itineraryItem.ts';
import { getSupabaseClient } from '../lib/supabase.ts';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.ts';

/**
 * ItineraryItem database row type
 */
interface ItineraryItemRow {
  id: string;
  day_id: string;
  poi_id: string | null;
  order_index: number;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  transport_mode: TransportMode;
  transport_minutes: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * POI database row type for joins
 */
interface PoiRow {
  id: string;
  name: string;
  name_en: string | null;
  category: string;
  address: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  rating_count: number;
  price_level: number | null;
  image_urls: string[] | null;
}

/**
 * Convert database row to API response
 */
function toItineraryItemResponse(
  row: ItineraryItemRow,
  poi?: PoiRow
): ItineraryItem {
  return {
    id: row.id,
    dayId: row.day_id,
    poiId: row.poi_id || undefined,
    orderIndex: row.order_index,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    notes: row.notes || undefined,
    transportMode: row.transport_mode,
    transportMinutes: row.transport_minutes || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    poi: poi
      ? {
          id: poi.id,
          name: poi.name,
          nameEn: poi.name_en || undefined,
          category: poi.category as Poi['category'],
          cityId: '', // Not needed in response
          address: poi.address || undefined,
          latitude: poi.latitude,
          longitude: poi.longitude,
          rating: poi.rating || undefined,
          ratingCount: poi.rating_count,
          priceLevel: poi.price_level || undefined,
          imageUrls: poi.image_urls || undefined,
          source: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : undefined,
  };
}

/**
 * Parse time string (HH:mm) to minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap
 */
function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

/**
 * Time conflict information
 */
interface TimeConflict {
  itemId: string;
  startTime: string;
  endTime: string;
  poiName?: string;
}

/**
 * Itinerary Item service for CRUD operations
 */
export const ItineraryItemService = {
  /**
   * Create a new item in a day
   */
  async create(
    dayId: string,
    input: CreateItineraryItemInput,
    accessToken: string
  ): Promise<{ item: ItineraryItem; conflicts: TimeConflict[] }> {
    const supabase = getSupabaseClient(accessToken);

    // Verify day exists and get itinerary info
    const { data: day, error: dayError } = await supabase
      .from('itinerary_days')
      .select('id, itinerary_id')
      .eq('id', dayId)
      .single();

    if (dayError || !day) {
      throw new NotFoundError('Day not found');
    }

    // Get max order index for this day
    const { data: maxOrder } = await supabase
      .from('itinerary_items')
      .select('order_index')
      .eq('day_id', dayId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const orderIndex = input.orderIndex ?? (maxOrder?.order_index ?? -1) + 1;

    // Check for time conflicts if start/end time provided
    let conflicts: TimeConflict[] = [];
    if (input.startTime && input.endTime) {
      const { data: existingItems } = await supabase
        .from('itinerary_items')
        .select('id, start_time, end_time, poi:pois(name)')
        .eq('day_id', dayId)
        .not('start_time', 'is', null)
        .not('end_time', 'is', null);

      if (existingItems) {
        conflicts = existingItems
          .filter((item) =>
            timesOverlap(
              input.startTime!,
              input.endTime!,
              item.start_time!,
              item.end_time!
            )
          )
          .map((item) => ({
            itemId: item.id,
            startTime: item.start_time!,
            endTime: item.end_time!,
            poiName: (item.poi as { name: string } | null)?.name,
          }));
      }
    }

    // Create the item
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({
        day_id: dayId,
        poi_id: input.poiId || null,
        order_index: orderIndex,
        start_time: input.startTime || null,
        end_time: input.endTime || null,
        notes: input.notes || null,
        transport_mode: input.transportMode || 'walking',
        transport_minutes: input.transportMinutes || null,
      })
      .select('*, poi:pois(*)')
      .single();

    if (error) {
      throw error;
    }

    const item = toItineraryItemResponse(
      data as ItineraryItemRow,
      data.poi as PoiRow | undefined
    );

    return { item, conflicts };
  },

  /**
   * List items for a day
   */
  async list(dayId: string, accessToken: string): Promise<ItineraryItem[]> {
    const supabase = getSupabaseClient(accessToken);

    const { data, error } = await supabase
      .from('itinerary_items')
      .select('*, poi:pois(*)')
      .eq('day_id', dayId)
      .order('order_index');

    if (error) {
      throw error;
    }

    return (data as (ItineraryItemRow & { poi: PoiRow | null })[]).map((row) =>
      toItineraryItemResponse(row, row.poi || undefined)
    );
  },

  /**
   * Get item by ID
   */
  async getById(itemId: string, accessToken: string): Promise<ItineraryItem> {
    const supabase = getSupabaseClient(accessToken);

    const { data, error } = await supabase
      .from('itinerary_items')
      .select('*, poi:pois(*)')
      .eq('id', itemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Item not found');
      }
      throw error;
    }

    return toItineraryItemResponse(
      data as ItineraryItemRow,
      (data as { poi: PoiRow | null }).poi || undefined
    );
  },

  /**
   * Update an item
   */
  async update(
    itemId: string,
    input: UpdateItineraryItemInput,
    accessToken: string
  ): Promise<{ item: ItineraryItem; conflicts: TimeConflict[] }> {
    const supabase = getSupabaseClient(accessToken);

    // Get existing item
    const { data: existing, error: existingError } = await supabase
      .from('itinerary_items')
      .select('id, day_id, start_time, end_time')
      .eq('id', itemId)
      .single();

    if (existingError || !existing) {
      throw new NotFoundError('Item not found');
    }

    // Check for time conflicts
    let conflicts: TimeConflict[] = [];
    const startTime =
      input.startTime !== undefined ? input.startTime : existing.start_time;
    const endTime =
      input.endTime !== undefined ? input.endTime : existing.end_time;

    if (startTime && endTime) {
      const { data: existingItems } = await supabase
        .from('itinerary_items')
        .select('id, start_time, end_time, poi:pois(name)')
        .eq('day_id', existing.day_id)
        .neq('id', itemId)
        .not('start_time', 'is', null)
        .not('end_time', 'is', null);

      if (existingItems) {
        conflicts = existingItems
          .filter((item) =>
            timesOverlap(startTime, endTime, item.start_time!, item.end_time!)
          )
          .map((item) => ({
            itemId: item.id,
            startTime: item.start_time!,
            endTime: item.end_time!,
            poiName: (item.poi as { name: string } | null)?.name,
          }));
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (input.poiId !== undefined) updateData.poi_id = input.poiId;
    if (input.orderIndex !== undefined)
      updateData.order_index = input.orderIndex;
    if (input.startTime !== undefined) updateData.start_time = input.startTime;
    if (input.endTime !== undefined) updateData.end_time = input.endTime;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.transportMode !== undefined)
      updateData.transport_mode = input.transportMode;
    if (input.transportMinutes !== undefined)
      updateData.transport_minutes = input.transportMinutes;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('itinerary_items')
      .update(updateData)
      .eq('id', itemId)
      .select('*, poi:pois(*)')
      .single();

    if (error) {
      throw error;
    }

    const item = toItineraryItemResponse(
      data as ItineraryItemRow,
      (data as { poi: PoiRow | null }).poi || undefined
    );

    return { item, conflicts };
  },

  /**
   * Delete an item
   */
  async delete(itemId: string, accessToken: string): Promise<void> {
    const supabase = getSupabaseClient(accessToken);

    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      throw error;
    }
  },

  /**
   * Reorder items within a day
   */
  async reorder(
    dayId: string,
    input: ReorderItemsInput,
    accessToken: string
  ): Promise<ItineraryItem[]> {
    const supabase = getSupabaseClient(accessToken);

    // Verify all items belong to the day
    const { data: existingItems, error: verifyError } = await supabase
      .from('itinerary_items')
      .select('id')
      .eq('day_id', dayId);

    if (verifyError) {
      throw verifyError;
    }

    const existingIds = new Set(existingItems?.map((i) => i.id) || []);
    const invalidIds = input.itemIds.filter((id) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      throw new ValidationError(
        `Items not in this day: ${invalidIds.join(', ')}`
      );
    }

    // Update order indices
    const updates = input.itemIds.map((id, index) =>
      supabase
        .from('itinerary_items')
        .update({ order_index: index, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    await Promise.all(updates);

    // Return updated list
    return this.list(dayId, accessToken);
  },
};
