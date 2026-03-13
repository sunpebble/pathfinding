import type { Poi } from './poi';
import type { TransportMode } from './transport';

// Re-export TransportMode for backward compatibility
export type { TransportMode } from './transport';

/**
 * ItineraryItem entity - single activity/POI on a day (matches Convex schema)
 */
export interface ItineraryItem {
  id: string;
  dayId: string;
  poiId?: string;
  orderIndex: number;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  notes?: string;
  transportMode?: TransportMode;
  transportMinutes?: number;
  // Populated relation
  poi?: Partial<Poi> | null;
}

/**
 * ItineraryItem input for creating a new item
 */
export interface CreateItineraryItemInput {
  dayId: string;
  poiId?: string;
  orderIndex?: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
  transportMode?: TransportMode;
  transportMinutes?: number;
}

/**
 * ItineraryItem update input for partial updates
 */
export interface UpdateItineraryItemInput {
  poiId?: string;
  orderIndex?: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
  transportMode?: TransportMode;
  transportMinutes?: number;
}

/**
 * Reorder request for drag-and-drop
 */
export interface ReorderItemsRequest {
  itemId: string;
  newOrderIndex: number;
  targetDayId?: string; // For moving between days
}

/**
 * Batch reorder request
 */
export interface BatchReorderRequest {
  dayId: string;
  itemIds: string[]; // New order of item IDs
}
