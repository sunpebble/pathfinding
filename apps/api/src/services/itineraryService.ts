import type {
  CreateItineraryInput,
  ItineraryListQuery,
  ItineraryResponse,
  ItineraryRow,
  UpdateItineraryInput,
} from '../models/itinerary.ts';
import type {
  ItineraryDayResponse,
  ItineraryDayRow,
} from '../models/itineraryDay.ts';
import { getSupabaseClient } from '../lib/supabase.ts';
import { NotFoundError } from '../middleware/errorHandler.ts';
import { toItineraryResponse } from '../models/itinerary.ts';
import { toItineraryDayResponse } from '../models/itineraryDay.ts';

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
        // Sort items by order_index
        dayResponse.items = (day.itinerary_items || []).sort(
          (a: { order_index: number }, b: { order_index: number }) =>
            a.order_index - b.order_index
        );
        return dayResponse;
      });

    return {
      ...response,
      daysCount: days.length,
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

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.cityId !== undefined) updateData.city_id = input.cityId;
    if (input.visibility !== undefined)
      updateData.visibility = input.visibility;
    if (input.coverImageUrl !== undefined)
      updateData.cover_image_url = input.coverImageUrl;

    // Handle date changes (would need to regenerate days)
    if (input.startDate !== undefined || input.endDate !== undefined) {
      // Get current itinerary to check dates
      const { data: current, error: currentError } = await supabase
        .from('itineraries')
        .select('start_date, end_date')
        .eq('id', itineraryId)
        .eq('user_id', userId)
        .single();

      if (currentError) {
        if (currentError.code === 'PGRST116') {
          throw new NotFoundError('Itinerary not found');
        }
        throw currentError;
      }

      const newStartDate = input.startDate || current.start_date;
      const newEndDate = input.endDate || current.end_date;

      // Validate date range
      if (new Date(newStartDate) > new Date(newEndDate)) {
        throw new Error('End date must be on or after start date');
      }

      updateData.start_date = newStartDate;
      updateData.end_date = newEndDate;

      // TODO: Handle day regeneration when dates change
      // This is complex and should preserve existing items where possible
    }

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
   * List public itineraries for discovery (community)
   */
  async listPublic(
    query: {
      cityId?: string;
      page: number;
      pageSize: number;
      sortBy?: 'created_at' | 'copy_count';
    },
    accessToken: string
  ): Promise<{
    data: (ItineraryResponse & { authorName?: string; copyCount?: number })[];
    total: number;
  }> {
    const supabase = getSupabaseClient(accessToken);
    const { cityId, page, pageSize, sortBy = 'created_at' } = query;

    // Build base query
    let countQuery = supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .eq('visibility', 'public');

    let dataQuery = supabase
      .from('itineraries')
      .select(
        `
        *,
        cities:city_id (name),
        users:user_id (id, display_name)
      `
      )
      .eq('visibility', 'public');

    // Filter by city if provided
    if (cityId) {
      countQuery = countQuery.eq('city_id', cityId);
      dataQuery = dataQuery.eq('city_id', cityId);
    }

    // Get total count
    const { count, error: countError } = await countQuery;
    if (countError) {
      throw countError;
    }

    // Order by sort field
    const orderField = sortBy === 'copy_count' ? 'copy_count' : 'created_at';
    dataQuery = dataQuery.order(orderField, { ascending: false });

    // Pagination
    const offset = (page - 1) * pageSize;
    dataQuery = dataQuery.range(offset, offset + pageSize - 1);

    const { data, error } = await dataQuery;
    if (error) {
      throw error;
    }

    const itineraries = (data || []).map(
      (
        row: ItineraryRow & {
          cities: { name: string } | null;
          users: { id: string; display_name: string | null } | null;
        }
      ) => {
        const response = toItineraryResponse(row);
        response.cityName = row.cities?.name;
        // Calculate days count
        const start = new Date(row.start_date);
        const end = new Date(row.end_date);
        response.daysCount =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;
        return {
          ...response,
          authorName: row.users?.display_name || '匿名用户',
          copyCount: row.copy_count || 0,
        };
      }
    );

    return {
      data: itineraries,
      total: count || 0,
    };
  },

  /**
   * Copy an itinerary to the current user's collection
   */
  async copy(
    sourceItineraryId: string,
    userId: string,
    newStartDate: string,
    accessToken: string
  ): Promise<ItineraryResponse> {
    const supabase = getSupabaseClient(accessToken);

    // Get the source itinerary with all days and items
    const { data: source, error: sourceError } = await supabase
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
      .eq('id', sourceItineraryId)
      .single();

    if (sourceError) {
      if (sourceError.code === 'PGRST116') {
        throw new NotFoundError('Itinerary not found');
      }
      throw sourceError;
    }

    // Check if source is public or owned by user
    if (source.user_id !== userId && source.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    // Calculate date offset
    const originalStart = new Date(source.start_date);
    const newStart = new Date(newStartDate);
    const dayOffset = Math.round(
      (newStart.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate new end date
    const originalEnd = new Date(source.end_date);
    const newEnd = new Date(originalEnd);
    newEnd.setDate(newEnd.getDate() + dayOffset);
    const newEndDate = newEnd.toISOString().split('T')[0];

    // Create new itinerary
    const { data: newItinerary, error: createError } = await supabase
      .from('itineraries')
      .insert({
        user_id: userId,
        title: `${source.title} (副本)`,
        city_id: source.city_id,
        start_date: newStartDate,
        end_date: newEndDate,
        visibility: 'private',
        cover_image_url: source.cover_image_url,
        copied_from_id: sourceItineraryId,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Sort source days by day_number
    const sortedDays = (source.itinerary_days || []).sort(
      (a: ItineraryDayRow, b: ItineraryDayRow) => a.day_number - b.day_number
    );

    // Create days with adjusted dates
    const newDays = sortedDays.map(
      (day: ItineraryDayRow & { itinerary_items?: unknown[] }) => {
        const originalDayDate = new Date(day.date);
        const newDayDate = new Date(originalDayDate);
        newDayDate.setDate(newDayDate.getDate() + dayOffset);

        return {
          itinerary_id: newItinerary.id,
          day_number: day.day_number,
          date: newDayDate.toISOString().split('T')[0],
          _sourceItems: day.itinerary_items || [],
        };
      }
    );

    // Insert new days
    const daysToInsert = newDays.map(
      ({ _sourceItems, ...day }: { _sourceItems: unknown[] }) => day
    );

    const { data: insertedDays, error: daysError } = await supabase
      .from('itinerary_days')
      .insert(daysToInsert)
      .select();

    if (daysError) {
      // Rollback
      await supabase.from('itineraries').delete().eq('id', newItinerary.id);
      throw daysError;
    }

    // Map old day IDs to new day IDs
    const dayIdMap = new Map<number, string>();
    insertedDays.forEach((day: { id: string; day_number: number }) => {
      dayIdMap.set(day.day_number, day.id);
    });

    // Copy items for each day
    const itemsToInsert: Record<string, unknown>[] = [];
    newDays.forEach((day: { day_number: number; _sourceItems: unknown[] }) => {
      const newDayId = dayIdMap.get(day.day_number);
      if (!newDayId) return;

      (day._sourceItems || []).forEach(
        (item: {
          poi_id: string | null;
          start_time: string | null;
          end_time: string | null;
          notes: string | null;
          transport_mode: string | null;
          transport_minutes: number | null;
          order_index: number;
        }) => {
          itemsToInsert.push({
            day_id: newDayId,
            poi_id: item.poi_id,
            start_time: item.start_time,
            end_time: item.end_time,
            notes: item.notes,
            transport_mode: item.transport_mode,
            transport_minutes: item.transport_minutes,
            order_index: item.order_index,
          });
        }
      );
    });

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('itinerary_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback
        await supabase.from('itineraries').delete().eq('id', newItinerary.id);
        throw itemsError;
      }
    }

    // Increment copy count on source itinerary
    await supabase.rpc('increment_copy_count', {
      itinerary_id: sourceItineraryId,
    });

    const response = toItineraryResponse(newItinerary as ItineraryRow);
    response.daysCount = sortedDays.length;

    return response;
  },
};
