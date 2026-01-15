import { z } from 'zod';

/**
 * TableChanges schema for a single table's changes
 */
export const TableChangesSchema = z.object({
  created: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  updated: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  deleted: z.array(z.string().uuid()).optional().default([]),
});

/**
 * Sync push request schema
 */
export const SyncPushRequestSchema = z.object({
  changes: z
    .object({
      itineraries: TableChangesSchema.optional(),
      itinerary_days: TableChangesSchema.optional(),
      itinerary_items: TableChangesSchema.optional(),
    })
    .optional(),
});

/**
 * Sync query parameters schema
 */
export const SyncQuerySchema = z.object({
  last_pulled_at: z.coerce.number().int().min(0).optional(),
});

// Type definitions
export interface TableChanges<T = Record<string, unknown>> {
  created: T[];
  updated: T[];
  deleted: string[];
}

export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;
export type SyncQuery = z.infer<typeof SyncQuerySchema>;

export interface SyncPullResponse {
  changes: {
    itineraries: TableChanges;
    itinerary_days: TableChanges;
    itinerary_items: TableChanges;
    pois: TableChanges;
    cities: TableChanges;
  };
  timestamp: number;
}

export interface SyncConflict {
  table: string;
  id: string;
  clientUpdatedAt: number;
  serverUpdatedAt: number;
  serverData: Record<string, unknown>;
}
