import type {
  Itinerary,
  ItineraryDay,
  ItineraryWithStats,
} from '@pathfinding/types';
import type { Id } from '../../../../convex/_generated/dataModel';
import type {CreateItineraryInput} from '@/services/itineraryService';
import { create } from 'zustand';
import {
  
  itineraryService
} from '@/services/itineraryService';

interface ItineraryState {
  // Data
  itineraries: ItineraryWithStats[];
  currentItinerary: (Itinerary & { days: ItineraryDay[] }) | null;
  currentUserId: Id<'users'> | null;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isCreating: boolean;
  isUpdating: boolean;

  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;

  // Error
  error: string | null;

  // Undo/redo stack (for US5)
  undoStack: unknown[];
  redoStack: unknown[];

  // Actions
  setCurrentUserId: (userId: Id<'users'> | null) => void;
  fetchItineraries: (userId: Id<'users'>) => Promise<void>;
  fetchMoreItineraries: (userId: Id<'users'>) => Promise<void>;
  refreshItineraries: (userId: Id<'users'>) => Promise<void>;
  createItinerary: (
    input: CreateItineraryInput
  ) => Promise<{ id: string } | null>;
  setItineraries: (itineraries: ItineraryWithStats[]) => void;
  appendItineraries: (itineraries: ItineraryWithStats[]) => void;
  setCurrentItinerary: (
    itinerary: (Itinerary & { days: ItineraryDay[] }) | null
  ) => void;
  addItinerary: (itinerary: ItineraryWithStats) => void;
  updateItinerary: (id: string, updates: Partial<Itinerary>) => void;
  removeItinerary: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setCreating: (isCreating: boolean) => void;
  setUpdating: (isUpdating: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (page: number, totalCount: number) => void;
  reset: () => void;

  // Detail page actions
  fetchItineraryById: (id: string) => Promise<void>;
  deleteItinerary: (id: string) => Promise<void>;
  clearCurrentItinerary: () => void;

  // Undo/redo actions (for US5)
  pushUndo: (action: unknown) => void;
  undo: () => unknown | null;
  redo: () => unknown | null;
  clearHistory: () => void;
}

const initialState = {
  itineraries: [] as ItineraryWithStats[],
  currentItinerary: null,
  currentUserId: null,
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  isCreating: false,
  isUpdating: false,
  page: 1,
  pageSize: 20,
  totalCount: 0,
  hasMore: true,
  error: null,
  undoStack: [] as unknown[],
  redoStack: [] as unknown[],
};

/**
 * Helper to convert Convex result to ItineraryWithStats
 */
function toItineraryWithStats(data: unknown): ItineraryWithStats {
  const item = data as Record<string, unknown>;
  return {
    id: String(item.id || item._id),
    userId: String(item.userId),
    title: String(item.title || ''),
    cityId: String(item.cityId),
    startDate: String(item.startDate || ''),
    endDate: String(item.endDate || ''),
    visibility: (item.visibility as 'private' | 'public') || 'private',
    coverImageUrl: item.coverImageUrl as string | undefined,
    cityName: item.cityName as string | undefined,
    dayCount: (item.dayCount as number) || 0,
    itemCount: (item.itemCount as number) || 0,
    createdAt: item.createdAt as number | undefined,
  };
}

/**
 * Zustand store for itinerary state management
 */
export const useItineraryStore = create<ItineraryState>()((set, get) => ({
  ...initialState,

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  fetchItineraries: async (userId: Id<'users'>) => {
    set({ isLoading: true, error: null, currentUserId: userId });
    try {
      const result = await itineraryService.list({
        userId,
        page: 1,
        pageSize: get().pageSize,
      });
      set({
        itineraries: result.data.map(toItineraryWithStats),
        page: 1,
        totalCount: result.meta.totalCount,
        hasMore: result.meta.page < result.meta.totalPages,
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchMoreItineraries: async (userId: Id<'users'>) => {
    const { hasMore, isLoadingMore, page, pageSize } = get();
    if (!hasMore || isLoadingMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const result = await itineraryService.list({
        userId,
        page: page + 1,
        pageSize,
      });
      set((state) => ({
        itineraries: [
          ...state.itineraries,
          ...result.data.map(toItineraryWithStats),
        ],
        page: page + 1,
        hasMore: result.meta.page < result.meta.totalPages,
        isLoadingMore: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoadingMore: false });
    }
  },

  refreshItineraries: async (userId: Id<'users'>) => {
    set({ isRefreshing: true, error: null });
    try {
      const result = await itineraryService.list({
        userId,
        page: 1,
        pageSize: get().pageSize,
      });
      set({
        itineraries: result.data.map(toItineraryWithStats),
        page: 1,
        totalCount: result.meta.totalCount,
        hasMore: result.meta.page < result.meta.totalPages,
        isRefreshing: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isRefreshing: false });
    }
  },

  createItinerary: async (input: CreateItineraryInput) => {
    set({ isCreating: true, error: null });
    try {
      const result = await itineraryService.create(input);
      // Refresh the list to get the full itinerary data
      const userId = get().currentUserId;
      if (userId) {
        const listResult = await itineraryService.list({
          userId,
          page: 1,
          pageSize: get().pageSize,
        });
        set({
          itineraries: listResult.data.map(toItineraryWithStats),
          totalCount: listResult.meta.totalCount,
          isCreating: false,
        });
      } else {
        set({ isCreating: false });
      }
      return { id: String(result) };
    } catch (err) {
      set({ error: (err as Error).message, isCreating: false });
      return null;
    }
  },

  setItineraries: (itineraries) =>
    set({
      itineraries,
      hasMore: itineraries.length === get().pageSize,
    }),

  appendItineraries: (itineraries) =>
    set((state) => ({
      itineraries: [...state.itineraries, ...itineraries],
      hasMore: itineraries.length === state.pageSize,
    })),

  setCurrentItinerary: (itinerary) => set({ currentItinerary: itinerary }),

  addItinerary: (itinerary) =>
    set((state) => ({
      itineraries: [itinerary, ...state.itineraries],
      totalCount: state.totalCount + 1,
    })),

  updateItinerary: (id, updates) =>
    set((state) => ({
      itineraries: state.itineraries.map((it) =>
        it.id === id ? { ...it, ...updates } : it
      ),
      currentItinerary:
        state.currentItinerary?.id === id
          ? { ...state.currentItinerary, ...updates }
          : state.currentItinerary,
    })),

  removeItinerary: (id) =>
    set((state) => ({
      itineraries: state.itineraries.filter((it) => it.id !== id),
      totalCount: state.totalCount - 1,
      currentItinerary:
        state.currentItinerary?.id === id ? null : state.currentItinerary,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setCreating: (isCreating) => set({ isCreating }),
  setUpdating: (isUpdating) => set({ isUpdating }),
  setError: (error) => set({ error }),

  setPagination: (page, totalCount) =>
    set({
      page,
      totalCount,
      hasMore: page * get().pageSize < totalCount,
    }),

  reset: () => set(initialState),

  // Detail page actions
  fetchItineraryById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await itineraryService.getById(id);
      set({ currentItinerary: result, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  deleteItinerary: async (id: string) => {
    const userId = get().currentUserId;
    set({ isUpdating: true, error: null });
    try {
      await itineraryService.delete(id, userId ? String(userId) : undefined);
      set((state) => ({
        itineraries: state.itineraries.filter((it) => it.id !== id),
        totalCount: state.totalCount - 1,
        currentItinerary:
          state.currentItinerary?.id === id ? null : state.currentItinerary,
        isUpdating: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isUpdating: false });
    }
  },

  clearCurrentItinerary: () => set({ currentItinerary: null }),

  // Undo/redo implementation
  pushUndo: (action) =>
    set((state) => ({
      undoStack: [...state.undoStack, action],
      redoStack: [], // Clear redo stack on new action
    })),

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const action = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
    });
    return action;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const action = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, action],
    });
    return action;
  },

  clearHistory: () =>
    set({
      undoStack: [],
      redoStack: [],
    }),
}));
