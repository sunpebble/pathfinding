import type {
  Itinerary,
  ItineraryDay,
  ItineraryItem,
  TransportMode,
} from '@pathfinding/types';
import { useCallback, useEffect, useState } from 'react';
import { itineraryService } from '@/services/itineraryService';

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
 * Itinerary state with items
 */
interface ItineraryState {
  itinerary: (Itinerary & { days: ItineraryDay[] }) | null;
  items: Record<string, ItineraryItem[]>; // dayId -> items
  isLoading: boolean;
  error: string | null;
}

/**
 * useItinerary hook for managing a single itinerary with its items
 */
export function useItinerary(itineraryId: string | undefined) {
  const [state, setState] = useState<ItineraryState>({
    itinerary: null,
    items: {},
    isLoading: false,
    error: null,
  });

  /**
   * Fetch itinerary details
   */
  const fetchItinerary = useCallback(async () => {
    if (!itineraryId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const itinerary = await itineraryService.getById(itineraryId);
      setState((prev) => ({
        ...prev,
        itinerary,
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: (err as Error).message,
        isLoading: false,
      }));
    }
  }, [itineraryId]);

  /**
   * Fetch items for a specific day
   */
  const fetchDayItems = useCallback(
    async (dayId: string) => {
      if (!itineraryId) return;

      try {
        const items = await itineraryService.getItems(itineraryId, dayId);
        setState((prev) => ({
          ...prev,
          items: {
            ...prev.items,
            [dayId]: items,
          },
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: (err as Error).message,
        }));
      }
    },
    [itineraryId]
  );

  /**
   * Fetch items for all days
   */
  const fetchAllItems = useCallback(async () => {
    if (!state.itinerary?.days) return;

    const itemsMap: Record<string, ItineraryItem[]> = {};

    await Promise.all(
      state.itinerary.days.map(async (day) => {
        try {
          const items = await itineraryService.getItems(
            state.itinerary!.id,
            day.id
          );
          itemsMap[day.id] = items;
        } catch {
          itemsMap[day.id] = [];
        }
      })
    );

    setState((prev) => ({
      ...prev,
      items: itemsMap,
    }));
  }, [state.itinerary]);

  /**
   * Add item to a day
   */
  const addItem = useCallback(
    async (
      dayId: string,
      input: {
        poiId?: string;
        startTime?: string;
        endTime?: string;
        notes?: string;
        transportMode?: TransportMode;
        transportMinutes?: number;
      }
    ): Promise<{ item: ItineraryItem; conflicts: TimeConflict[] }> => {
      if (!itineraryId) {
        throw new Error('No itinerary selected');
      }

      const result = await itineraryService.addItem(itineraryId, dayId, input);

      // Update local state
      const newItem = result.item as ItineraryItem;
      setState((prev) => ({
        ...prev,
        items: {
          ...prev.items,
          [dayId]: [...(prev.items[dayId] || []), newItem],
        },
      }));

      return { item: newItem, conflicts: result.conflicts };
    },
    [itineraryId]
  );

  /**
   * Update an item
   */
  const updateItem = useCallback(
    async (
      dayId: string,
      itemId: string,
      input: {
        poiId?: string;
        startTime?: string | null;
        endTime?: string | null;
        notes?: string;
        transportMode?: TransportMode;
        transportMinutes?: number | null;
      }
    ): Promise<{ item: ItineraryItem; conflicts: TimeConflict[] }> => {
      if (!itineraryId) {
        throw new Error('No itinerary selected');
      }

      const result = await itineraryService.updateItem(
        itineraryId,
        dayId,
        itemId,
        input
      );

      // Update local state
      const updatedItem = result.item as ItineraryItem;
      setState((prev) => ({
        ...prev,
        items: {
          ...prev.items,
          [dayId]: (prev.items[dayId] || []).map((item) =>
            item.id === itemId ? updatedItem : item
          ),
        },
      }));

      return { item: updatedItem, conflicts: result.conflicts };
    },
    [itineraryId]
  );

  /**
   * Delete an item
   */
  const deleteItem = useCallback(
    async (dayId: string, itemId: string): Promise<void> => {
      if (!itineraryId) {
        throw new Error('No itinerary selected');
      }

      await itineraryService.deleteItem(itineraryId, dayId, itemId);

      // Update local state
      setState((prev) => ({
        ...prev,
        items: {
          ...prev.items,
          [dayId]: (prev.items[dayId] || []).filter(
            (item) => item.id !== itemId
          ),
        },
      }));
    },
    [itineraryId]
  );

  /**
   * Reorder items in a day
   */
  const reorderItems = useCallback(
    async (dayId: string, itemIds: string[]): Promise<void> => {
      if (!itineraryId) {
        throw new Error('No itinerary selected');
      }

      const reorderedItems = await itineraryService.reorderItems(
        itineraryId,
        dayId,
        itemIds
      );

      // Update local state
      setState((prev) => ({
        ...prev,
        items: {
          ...prev.items,
          [dayId]: reorderedItems,
        },
      }));
    },
    [itineraryId]
  );

  // Fetch itinerary on mount or when ID changes
  useEffect(() => {
    fetchItinerary();
  }, [fetchItinerary]);

  // Fetch all items when itinerary is loaded
  useEffect(() => {
    if (state.itinerary) {
      fetchAllItems();
    }
  }, [state.itinerary, fetchAllItems]);

  return {
    itinerary: state.itinerary,
    items: state.items,
    isLoading: state.isLoading,
    error: state.error,
    fetchItinerary,
    fetchDayItems,
    fetchAllItems,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
  };
}
