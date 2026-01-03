import type {
  CreateItineraryInput,
  ItineraryListQuery,
  ItineraryResponse,
  ItineraryRow,
  UpdateItineraryInput,
} from '../models/itinerary.js';
import type {
  ItineraryDayResponse,
  ItineraryDayRow,
} from '../models/itineraryDay.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { toItineraryResponse } from '../models/itinerary.js';
import { toItineraryDayResponse } from '../models/itineraryDay.js';

/**
 * Calculate dates between start and end (inclusive)
 */
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Itinerary service for CRUD operations
 */
export const ItineraryService = {
  /**
   * Create a new itinerary with auto-generated days
   */
  async create(
    userId: string,
    input: CreateItineraryInput,
    accessToken: string
  ): Promise<ItineraryResponse> {
    const supabase = getSupabaseClient(accessToken);

    // Create the itinerary
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .insert({
        user_id: userId,
        title: input.title,
        city_id: input.cityId,
        start_date: input.startDate,
        end_date: input.endDate,
        visibility: input.visibility || 'private',
        cover_image_url: input.coverImageUrl || null,
      })
      .select()
      .single();

    if (itineraryError) {
      throw itineraryError;
    }

    // Generate days for the itinerary
    const dates = getDateRange(input.startDate, input.endDate);
    const daysToInsert = dates.map((date, index) => ({
      itinerary_id: itinerary.id,
      day_number: index + 1,
      date,
    }));

    const { error: daysError } = await supabase
      .from('itinerary_days')
      .insert(daysToInsert);

    if (daysError) {
      // Rollback: delete the itinerary if days creation fails
      await supabase.from('itineraries').delete().eq('id', itinerary.id);
      throw daysError;
    }

    const response = toItineraryResponse(itinerary as ItineraryRow);
    response.daysCount = dates.length;

    return response;
  },

  /**
   * List itineraries for a user with pagination
   */
  async list(
    userId: string,
    query: ItineraryListQuery,
    accessToken: string
  ): Promise<{ data: ItineraryResponse[]; total: number }> {
    const supabase = getSupabaseClient(accessToken);
    const { page, pageSize, sortBy, sortOrder } = query;

    // Get total count
    const { count, error: countError } = await supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      throw countError;
    }

    // Get paginated data
    const offset = (page - 1) * pageSize;
    const { data, error } = await supabase
      .from('itineraries')
      .select(
        `
        *,
        cities:city_id (name)
      `
      )
      .eq('user_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    const itineraries = (data || []).map(
      (row: ItineraryRow & { cities: { name: string } | null }) => {
        const response = toItineraryResponse(row);
        response.cityName = row.cities?.name;
        // Calculate days count
        const start = new Date(row.start_date);
        const end = new Date(row.end_date);
        response.daysCount =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;
        return response;
      }
    );

    return {
      data: itineraries,
      total: count || 0,
    };
  },

  /**
   * List public itineraries for community discovery
   * No authentication required - uses service role key
   */
  async listPublic(query: {
    cityId?: string;
    page: number;
    pageSize: number;
    sortBy: 'created_at' | 'copy_count';
  }): Promise<{ data: ItineraryResponse[]; total: number }> {
    const supabase = getSupabaseClient();
    const { cityId, page, pageSize, sortBy } = query;

    // Build query for public itineraries
    let dbQuery = supabase
      .from('itineraries')
      .select(
        `
        *,
        cities:city_id (name)
      `,
        { count: 'exact' }
      )
      .eq('visibility', 'public');

    if (cityId) {
      dbQuery = dbQuery.eq('city_id', cityId);
    }

    // Apply sorting and pagination
    // Note: copy_count is not a column, so we use created_at for now
    // TODO: Add copy_count as a computed column or use a view
    const effectiveSortBy = sortBy === 'copy_count' ? 'created_at' : sortBy;
    const offset = (page - 1) * pageSize;
    dbQuery = dbQuery
      .order(effectiveSortBy, { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      throw error;
    }

    const itineraries = (data || []).map(
      (row: ItineraryRow & { cities: { name: string } | null }) => {
        const response = toItineraryResponse(row);
        response.cityName = row.cities?.name;
        const start = new Date(row.start_date);
        const end = new Date(row.end_date);
        response.daysCount =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;
        return response;
      }
    );

    return {
      data: itineraries,
      total: count || 0,
    };
  },

  /**
   * Get a single itinerary by ID with days and items
   */
  async getById(
    itineraryId: string,
    userId: string,
    accessToken: string
  ): Promise<ItineraryResponse & { days: ItineraryDayResponse[] }> {
    const supabase = getSupabaseClient(accessToken);

    // Get itinerary with days and items
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select(
        `
        *,
        cities:city_id (name),
        itinerary_days (
          *,
          itinerary_items (
            *,
            pois:poi_id (id, name, category, address, latitude, longitude, rating)
          )
        )
      `
      )
      .eq('id', itineraryId)
      .single();

    if (itineraryError) {
      if (itineraryError.code === 'PGRST116') {
        throw new NotFoundError('Itinerary not found');
      }
      throw itineraryError;
    }

    // Check access (own itinerary or public)
    if (itinerary.user_id !== userId && itinerary.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    const response = toItineraryResponse(itinerary as ItineraryRow);
    response.cityName = itinerary.cities?.name;

    // Sort days by day_number and transform
    const days = (itinerary.itinerary_days || [])
      .sort(
        (a: ItineraryDayRow, b: ItineraryDayRow) => a.day_number - b.day_number
      )
      .map((day: ItineraryDayRow & { itinerary_items?: unknown[] }) => {
        const dayResponse = toItineraryDayResponse(day);
        dayResponse.items = day.itinerary_items || [];
        return dayResponse;
      });

    return {
      ...response,
      days,
    };
  },

  /**
   * Update an itinerary
   */
  async update(
    itineraryId: string,
    userId: string,
    input: UpdateItineraryInput,
    accessToken: string
  ): Promise<ItineraryResponse> {
    const supabase = getSupabaseClient(accessToken);

    // Build update object with snake_case
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.cityId !== undefined) updateData.city_id = input.cityId;
    if (input.startDate !== undefined) updateData.start_date = input.startDate;
    if (input.endDate !== undefined) updateData.end_date = input.endDate;
    if (input.visibility !== undefined)
      updateData.visibility = input.visibility;
    if (input.coverImageUrl !== undefined)
      updateData.cover_image_url = input.coverImageUrl;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('itineraries')
      .update(updateData)
      .eq('id', itineraryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Itinerary not found');
      }
      throw error;
    }

    return toItineraryResponse(data as ItineraryRow);
  },

  /**
   * Delete an itinerary
   */
  async delete(
    itineraryId: string,
    userId: string,
    accessToken: string
  ): Promise<void> {
    const supabase = getSupabaseClient(accessToken);

    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', itineraryId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  },

  /**
   * Copy an itinerary to user's collection
   */
  async copy(
    itineraryId: string,
    userId: string,
    newStartDate: string,
    accessToken: string
  ): Promise<ItineraryResponse> {
    const supabase = getSupabaseClient(accessToken);

    // Get original itinerary with days and items
    const { data: original, error: fetchError } = await supabase
      .from('itineraries')
      .select(
        `
        *,
        itinerary_days (
          *,
          itinerary_items (*)
        )
      `
      )
      .eq('id', itineraryId)
      .single();

    if (fetchError || !original) {
      throw new NotFoundError('Itinerary not found');
    }

    // Check if itinerary is public or belongs to user
    if (original.user_id !== userId && original.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    // Calculate new date range
    const originalStart = new Date(original.start_date);
    const originalEnd = new Date(original.end_date);
    const daysDiff = Math.ceil(
      (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const newStart = new Date(newStartDate);
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + daysDiff);

    // Create new itinerary
    const { data: newItinerary, error: createError } = await supabase
      .from('itineraries')
      .insert({
        user_id: userId,
        title: original.title,
        city_id: original.city_id,
        start_date: newStartDate,
        end_date: newEnd.toISOString().split('T')[0],
        visibility: 'private',
        cover_image_url: original.cover_image_url,
        copied_from_id: itineraryId,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Create days for new itinerary
    const newDates = getDateRange(
      newStartDate,
      newEnd.toISOString().split('T')[0]
    );
    const daysToInsert = newDates.map((date, index) => ({
      itinerary_id: newItinerary.id,
      day_number: index + 1,
      date,
    }));

    const { data: newDays, error: daysError } = await supabase
      .from('itinerary_days')
      .insert(daysToInsert)
      .select();

    if (daysError || !newDays) {
      // Rollback
      await supabase.from('itineraries').delete().eq('id', newItinerary.id);
      throw daysError || new Error('Failed to create days');
    }

    // Copy items from original days to new days
    const originalDays = (original.itinerary_days || []).sort(
      (a: ItineraryDayRow, b: ItineraryDayRow) => a.day_number - b.day_number
    );

    for (let i = 0; i < originalDays.length && i < newDays.length; i++) {
      const originalDay = originalDays[i] as ItineraryDayRow & {
        itinerary_items?: Array<{
          poi_id: string | null;
          order_index: number;
          start_time: string | null;
          end_time: string | null;
          notes: string | null;
          transport_mode: string;
          transport_minutes: number | null;
        }>;
      };
      const newDay = newDays[i];

      if (
        originalDay.itinerary_items &&
        originalDay.itinerary_items.length > 0
      ) {
        const itemsToInsert = originalDay.itinerary_items.map((item) => ({
          day_id: newDay.id,
          poi_id: item.poi_id,
          order_index: item.order_index,
          start_time: item.start_time,
          end_time: item.end_time,
          notes: item.notes,
          transport_mode: item.transport_mode,
          transport_minutes: item.transport_minutes,
        }));

        await supabase.from('itinerary_items').insert(itemsToInsert);
      }
    }

    const response = toItineraryResponse(newItinerary as ItineraryRow);
    response.daysCount = newDates.length;

    return response;
  },
};
