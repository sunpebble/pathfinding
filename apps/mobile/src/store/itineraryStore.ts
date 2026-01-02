import { create } from "zustand";
import type { Itinerary, ItineraryWithStats, ItineraryDay } from "@pathfinding/types";

interface ItineraryState {
  // Data
  itineraries: ItineraryWithStats[];
  currentItinerary: (Itinerary & { days: ItineraryDay[] }) | null;

  // Loading states
  isLoading: boolean;
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
  setItineraries: (itineraries: ItineraryWithStats[]) => void;
  appendItineraries: (itineraries: ItineraryWithStats[]) => void;
  setCurrentItinerary: (itinerary: (Itinerary & { days: ItineraryDay[] }) | null) => void;
  addItinerary: (itinerary: ItineraryWithStats) => void;
  updateItinerary: (id: string, updates: Partial<Itinerary>) => void;
  removeItinerary: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setCreating: (isCreating: boolean) => void;
  setUpdating: (isUpdating: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (page: number, totalCount: number) => void;
  reset: () => void;

  // Undo/redo actions (for US5)
  pushUndo: (action: unknown) => void;
  undo: () => unknown | null;
  redo: () => unknown | null;
  clearHistory: () => void;
}

const initialState = {
  itineraries: [],
  currentItinerary: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  page: 1,
  pageSize: 20,
  totalCount: 0,
  hasMore: true,
  error: null,
  undoStack: [],
  redoStack: [],
};

/**
 * Zustand store for itinerary state management
 */
export const useItineraryStore = create<ItineraryState>()((set, get) => ({
  ...initialState,

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
      itineraries: state.itineraries.map((it) => (it.id === id ? { ...it, ...updates } : it)),
      currentItinerary:
        state.currentItinerary?.id === id
          ? { ...state.currentItinerary, ...updates }
          : state.currentItinerary,
    })),

  removeItinerary: (id) =>
    set((state) => ({
      itineraries: state.itineraries.filter((it) => it.id !== id),
      totalCount: state.totalCount - 1,
      currentItinerary: state.currentItinerary?.id === id ? null : state.currentItinerary,
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
