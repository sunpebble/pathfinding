import type { Poi } from "./poi";

/**
 * Transport mode enum for travel between items
 */
export type TransportMode = "walking" | "driving" | "transit" | "cycling" | "taxi";

/**
 * ItineraryItem entity - single activity/POI on a day
 */
export interface ItineraryItem {
  id: string;
  dayId: string;
  poiId?: string;
  orderIndex: number;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  notes?: string;
  transportMode: TransportMode;
  transportMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
  // Populated relation
  poi?: Poi;
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
