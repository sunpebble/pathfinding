import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SyncConflict,
  SyncPullResponse,
  SyncPushRequest,
  TableChanges,
} from '../models/sync';
import { getSupabaseClient } from '../lib/supabase';

/**
 * Custom error class for sync conflicts
 */
export class SyncConflictError extends Error {
  conflicts: SyncConflict[];
  rejectedIds: Record<string, string[]>;

  constructor(
    conflicts: SyncConflict[],
    rejectedIds: Record<string, string[]>
  ) {
    super('Sync conflict detected');
    this.name = 'SyncConflictError';
    this.conflicts = conflicts;
    this.rejectedIds = rejectedIds;
  }

  toResponse() {
    return {
      error: 'SYNC_CONFLICT',
      message: `${this.conflicts.length} conflict(s) detected`,
      conflicts: this.conflicts,
      rejectedIds: this.rejectedIds,
    };
  }
}

/**
 * Field mapping from camelCase (API) to snake_case (DB)
 */
const CAMEL_TO_SNAKE: Record<string, string> = {
  id: 'id',
  userId: 'user_id',
  cityId: 'city_id',
  startDate: 'start_date',
  endDate: 'end_date',
  coverImageUrl: 'cover_image_url',
  copiedFromId: 'copied_from_id',
  visibility: 'visibility',
  title: 'title',
  itineraryId: 'itinerary_id',
  dayNumber: 'day_number',
  date: 'date',
  dayId: 'day_id',
  poiId: 'poi_id',
  orderIndex: 'order_index',
  startTime: 'start_time',
  endTime: 'end_time',
  notes: 'notes',
  transportMode: 'transport_mode',
  transportMinutes: 'transport_minutes',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * Field mapping from snake_case (DB) to camelCase (API)
 */
const SNAKE_TO_CAMEL: Record<string, string> = {
  id: 'id',
  user_id: 'userId',
  city_id: 'cityId',
  start_date: 'startDate',
  end_date: 'endDate',
  cover_image_url: 'coverImageUrl',
  copied_from_id: 'copiedFromId',
  visibility: 'visibility',
  title: 'title',
  itinerary_id: 'itineraryId',
  day_number: 'dayNumber',
  date: 'date',
  day_id: 'dayId',
  poi_id: 'poiId',
  order_index: 'orderIndex',
  start_time: 'startTime',
  end_time: 'endTime',
  notes: 'notes',
  transport_mode: 'transportMode',
  transport_minutes: 'transportMinutes',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  name: 'name',
  name_en: 'nameEn',
  category: 'category',
  address: 'address',
  latitude: 'latitude',
  longitude: 'longitude',
  rating: 'rating',
  rating_count: 'ratingCount',
  price_level: 'priceLevel',
  business_hours: 'businessHours',
  phone: 'phone',
  image_urls: 'imageUrls',
  timezone: 'timezone',
  country_code: 'countryCode',
};

/**
 * Sync Service for handling offline synchronization
 */
export const SyncService = {
  /**
   * Main sync handler - processes push and returns pull
   */
  async sync(
    userId: string,
    lastPulledAt: number | undefined,
    pushRequest: SyncPushRequest | undefined,
    _accessToken: string
  ): Promise<SyncPullResponse> {
    const supabase = getSupabaseClient();
    const syncTimestamp = Date.now();
    const conflicts: SyncConflict[] = [];

    // Step 1: Process push changes (if any)
    if (pushRequest?.changes) {
      await this.processPushChanges(
        supabase,
        userId,
        pushRequest.changes,
        lastPulledAt,
        conflicts
      );
    }

    // If conflicts detected, throw error
    if (conflicts.length > 0) {
      const rejectedIds = this.groupConflictsByTable(conflicts);
      throw new SyncConflictError(conflicts, rejectedIds);
    }

    // Step 2: Pull server changes since lastPulledAt
    const pullResponse = await this.pullChanges(
      supabase,
      userId,
      lastPulledAt,
      syncTimestamp
    );

    return pullResponse;
  },

  /**
   * Process client push changes
   */
  async processPushChanges(
    supabase: SupabaseClient,
    userId: string,
    changes: NonNullable<SyncPushRequest['changes']>,
    lastPulledAt: number | undefined,
    conflicts: SyncConflict[]
  ): Promise<void> {
    // Process tables in dependency order
    const tableOrder = [
      'itineraries',
      'itinerary_days',
      'itinerary_items',
    ] as const;

    for (const tableName of tableOrder) {
      const tableChanges = changes[tableName];
      if (!tableChanges) continue;

      await this.processTableChanges(
        supabase,
        userId,
        tableName,
        tableChanges,
        lastPulledAt,
        conflicts
      );
    }
  },

  /**
   * Process changes for a single table
   */
  async processTableChanges(
    supabase: SupabaseClient,
    userId: string,
    tableName: string,
    changes: { created?: unknown[]; updated?: unknown[]; deleted?: string[] },
    lastPulledAt: number | undefined,
    conflicts: SyncConflict[]
  ): Promise<void> {
    // Process created records
    if (changes.created?.length) {
      await this.processCreatedRecords(
        supabase,
        userId,
        tableName,
        changes.created
      );
    }

    // Process updated records with conflict detection
    if (changes.updated?.length) {
      await this.processUpdatedRecords(
        supabase,
        userId,
        tableName,
        changes.updated,
        lastPulledAt,
        conflicts
      );
    }

    // Process deleted records
    if (changes.deleted?.length) {
      await this.processDeletedRecords(
        supabase,
        userId,
        tableName,
        changes.deleted
      );
    }
  },

  /**
   * Insert new records from client
   */
  async processCreatedRecords(
    supabase: SupabaseClient,
    userId: string,
    tableName: string,
    records: unknown[]
  ): Promise<void> {
    for (const record of records) {
      const dbRecord = this.transformToDbRecord(
        tableName,
        record as Record<string, unknown>,
        userId
      );

      // Use upsert to handle potential duplicate IDs
      const { error } = await supabase
        .from(tableName)
        .upsert(dbRecord, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error(`Sync insert error for ${tableName}:`, error);
      }
    }
  },

  /**
   * Update records with conflict detection
   */
  async processUpdatedRecords(
    supabase: SupabaseClient,
    userId: string,
    tableName: string,
    records: unknown[],
    lastPulledAt: number | undefined,
    conflicts: SyncConflict[]
  ): Promise<void> {
    for (const record of records) {
      const rec = record as Record<string, unknown>;
      const id = rec.id as string;
      const clientUpdatedAt = rec.updatedAt
        ? new Date(rec.updatedAt as string).getTime()
        : Date.now();

      // Fetch current server record
      const { data: serverRecord, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        // Record doesn't exist - treat as create
        await this.processCreatedRecords(supabase, userId, tableName, [record]);
        continue;
      }

      // Check for conflict: server record modified after client's last pull
      const serverUpdatedAt = new Date(serverRecord.updated_at).getTime();

      if (lastPulledAt && serverUpdatedAt > lastPulledAt) {
        // Conflict detected
        conflicts.push({
          table: tableName,
          id,
          clientUpdatedAt,
          serverUpdatedAt,
          serverData: this.transformToApiRecord(tableName, serverRecord),
        });
        continue;
      }

      // No conflict - apply update
      const dbRecord = this.transformToDbRecord(tableName, rec, userId);
      delete dbRecord.id; // Don't update ID

      const { error } = await supabase
        .from(tableName)
        .update(dbRecord)
        .eq('id', id);

      if (error) {
        console.error(`Sync update error for ${tableName}:`, error);
      }
    }
  },

  /**
   * Delete records
   */
  async processDeletedRecords(
    supabase: SupabaseClient,
    userId: string,
    tableName: string,
    ids: string[]
  ): Promise<void> {
    for (const id of ids) {
      // Verify ownership before delete
      const ownershipVerified = await this.verifyOwnership(
        supabase,
        userId,
        tableName,
        id
      );

      if (!ownershipVerified) {
        console.warn(
          `Sync delete blocked - ownership check failed for ${tableName}:${id}`
        );
        continue;
      }

      const { error } = await supabase.from(tableName).delete().eq('id', id);

      if (error) {
        console.error(`Sync delete error for ${tableName}:`, error);
      }
    }
  },

  /**
   * Pull changes from server since lastPulledAt
   */
  async pullChanges(
    supabase: SupabaseClient,
    userId: string,
    lastPulledAt: number | undefined,
    syncTimestamp: number
  ): Promise<SyncPullResponse> {
    const lastPulledDate = lastPulledAt
      ? new Date(lastPulledAt).toISOString()
      : new Date(0).toISOString();

    // Pull itineraries
    const itinerariesChanges = await this.pullTableChanges(
      supabase,
      'itineraries',
      lastPulledDate,
      { user_id: userId }
    );

    // Get user's itinerary IDs for filtering child tables
    const { data: userItineraries } = await supabase
      .from('itineraries')
      .select('id')
      .eq('user_id', userId);

    const itineraryIds = (userItineraries || []).map(
      (i: { id: string }) => i.id
    );

    // Pull itinerary_days for user's itineraries
    const daysChanges = await this.pullTableChanges(
      supabase,
      'itinerary_days',
      lastPulledDate,
      { itinerary_id: itineraryIds }
    );

    // Get day IDs for filtering items
    const { data: userDays } = await supabase
      .from('itinerary_days')
      .select('id')
      .in('itinerary_id', itineraryIds.length > 0 ? itineraryIds : ['']);

    const dayIds = (userDays || []).map((d: { id: string }) => d.id);

    // Pull itinerary_items
    const itemsChanges = await this.pullTableChanges(
      supabase,
      'itinerary_items',
      lastPulledDate,
      { day_id: dayIds }
    );

    // Pull referenced POIs (read-only)
    const poiIds = this.extractPoiIds(itemsChanges);
    const poisChanges = await this.pullReferencedData(
      supabase,
      'pois',
      poiIds,
      lastPulledDate
    );

    // Pull referenced Cities (read-only)
    const cityIds = this.extractCityIds(itinerariesChanges);
    const citiesChanges = await this.pullReferencedData(
      supabase,
      'cities',
      cityIds,
      lastPulledDate
    );

    return {
      changes: {
        itineraries: itinerariesChanges,
        itinerary_days: daysChanges,
        itinerary_items: itemsChanges,
        pois: poisChanges,
        cities: citiesChanges,
      },
      timestamp: syncTimestamp,
    };
  },

  /**
   * Pull changes for a single table
   */
  async pullTableChanges(
    supabase: SupabaseClient,
    tableName: string,
    lastPulledDate: string,
    filter: Record<string, string | string[]>
  ): Promise<TableChanges> {
    let query = supabase
      .from(tableName)
      .select('*')
      .gt('updated_at', lastPulledDate);

    // Apply filters
    for (const [key, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return { created: [], updated: [], deleted: [] };
        }
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Pull error for ${tableName}:`, error);
      return { created: [], updated: [], deleted: [] };
    }

    // Separate created vs updated based on created_at vs updated_at
    const created: Record<string, unknown>[] = [];
    const updated: Record<string, unknown>[] = [];

    for (const record of data || []) {
      const apiRecord = this.transformToApiRecord(tableName, record);
      const createdAt = new Date(record.created_at).getTime();
      const lastPulled = new Date(lastPulledDate).getTime();

      if (createdAt > lastPulled) {
        created.push(apiRecord);
      } else {
        updated.push(apiRecord);
      }
    }

    // Note: For soft-delete support, would need a deleted_at column
    return { created, updated, deleted: [] };
  },

  /**
   * Pull reference data (POIs, Cities) - read only
   */
  async pullReferencedData(
    supabase: SupabaseClient,
    tableName: string,
    ids: string[],
    _lastPulledDate: string
  ): Promise<TableChanges> {
    if (ids.length === 0) {
      return { created: [], updated: [], deleted: [] };
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .in('id', ids);

    if (error) {
      return { created: [], updated: [], deleted: [] };
    }

    // All reference data treated as updates for simplicity
    const updated = (data || []).map((record: Record<string, unknown>) =>
      this.transformToApiRecord(tableName, record)
    );

    return { created: [], updated, deleted: [] };
  },

  /**
   * Verify ownership of a record before modification
   */
  async verifyOwnership(
    supabase: SupabaseClient,
    userId: string,
    tableName: string,
    recordId: string
  ): Promise<boolean> {
    if (tableName === 'itineraries') {
      const { data } = await supabase
        .from('itineraries')
        .select('user_id')
        .eq('id', recordId)
        .single();
      return data?.user_id === userId;
    }

    if (tableName === 'itinerary_days') {
      const { data } = await supabase
        .from('itinerary_days')
        .select('itinerary:itineraries(user_id)')
        .eq('id', recordId)
        .single();
      const itinerary = (
        data as unknown as { itinerary: { user_id: string } | null } | null
      )?.itinerary;
      return itinerary?.user_id === userId;
    }

    if (tableName === 'itinerary_items') {
      const { data } = await supabase
        .from('itinerary_items')
        .select('day:itinerary_days(itinerary:itineraries(user_id))')
        .eq('id', recordId)
        .single();
      const day = (
        data as unknown as {
          day: { itinerary: { user_id: string } | null } | null;
        } | null
      )?.day;
      return day?.itinerary?.user_id === userId;
    }

    return false;
  },

  /**
   * Transform camelCase API record to snake_case DB record
   */
  transformToDbRecord(
    tableName: string,
    record: Record<string, unknown>,
    userId: string
  ): Record<string, unknown> {
    const dbRecord: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      const dbKey = CAMEL_TO_SNAKE[key] || key;
      dbRecord[dbKey] = value;
    }

    // Ensure user_id is set for itineraries
    if (tableName === 'itineraries') {
      dbRecord.user_id = userId;
    }

    // Set updated_at
    dbRecord.updated_at = new Date().toISOString();

    return dbRecord;
  },

  /**
   * Transform snake_case DB record to camelCase API record
   */
  transformToApiRecord(
    _tableName: string,
    record: Record<string, unknown>
  ): Record<string, unknown> {
    const apiRecord: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      const apiKey = SNAKE_TO_CAMEL[key] || key;
      apiRecord[apiKey] = value;
    }

    return apiRecord;
  },

  /**
   * Extract POI IDs from items changes
   */
  extractPoiIds(itemsChanges: TableChanges): string[] {
    const ids = new Set<string>();

    for (const item of [...itemsChanges.created, ...itemsChanges.updated]) {
      const poiId = (item as Record<string, unknown>).poiId as
        | string
        | undefined;
      if (poiId) ids.add(poiId);
    }

    return Array.from(ids);
  },

  /**
   * Extract City IDs from itineraries changes
   */
  extractCityIds(itinerariesChanges: TableChanges): string[] {
    const ids = new Set<string>();

    for (const itinerary of [
      ...itinerariesChanges.created,
      ...itinerariesChanges.updated,
    ]) {
      const cityId = (itinerary as Record<string, unknown>).cityId as
        | string
        | undefined;
      if (cityId) ids.add(cityId);
    }

    return Array.from(ids);
  },

  /**
   * Group conflicts by table for error response
   */
  groupConflictsByTable(conflicts: SyncConflict[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    for (const conflict of conflicts) {
      if (!grouped[conflict.table]) {
        grouped[conflict.table] = [];
      }
      grouped[conflict.table].push(conflict.id);
    }

    return grouped;
  },
};
