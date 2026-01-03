import type {
  CreateItineraryInput,
  Itinerary,
  ItineraryDay,
  ItineraryWithStats,
} from '@pathfinding/types';
import { create } from 'zustand';

interface ItineraryState {
  // Data
  itineraries: ItineraryWithStats[];
  currentItinerary: (Itinerary & { days: ItineraryDay[] }) | null;

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
  fetchItineraries: () => Promise<void>;
  fetchMoreItineraries: () => Promise<void>;
  refreshItineraries: () => Promise<void>;
  createItinerary: (input: CreateItineraryInput) => Promise<void>;
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
  isLoadingMore: false,
  isRefreshing: false,
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
 * Create mock itineraries for development
 */
function createMockItineraries(): ItineraryWithStats[] {
  return [
    {
      id: 'mock-1',
      userId: 'dev-user',
      cityId: 'tokyo',
      title: '东京5日游',
      startDate: '2026-02-01',
      endDate: '2026-02-05',
      visibility: 'private',
      coverImageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDays: 5,
      totalItems: 12,
      city: {
        id: 'tokyo',
        name: '东京',
        country: '日本',
        timezone: 'Asia/Tokyo',
        latitude: 35.6762,
        longitude: 139.6503,
        imageUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: 'mock-2',
      userId: 'dev-user',
      cityId: 'paris',
      title: '巴黎浪漫之旅',
      startDate: '2026-03-15',
      endDate: '2026-03-22',
      visibility: 'private',
      coverImageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDays: 8,
      totalItems: 20,
      city: {
        id: 'paris',
        name: '巴黎',
        country: '法国',
        timezone: 'Europe/Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        imageUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  ];
}

/**
 * Zustand store for itinerary state management
 */
export const useItineraryStore = create<ItineraryState>()((set, get) => ({
  ...initialState,

  fetchItineraries: async () => {
    set({ isLoading: true, error: null });
    try {
      // In development mode, use mock data
      if (__DEV__) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
        const mockData = createMockItineraries();
        set({
          itineraries: mockData,
          page: 1,
          totalCount: mockData.length,
          hasMore: false,
          isLoading: false,
        });
      }

      // Production: call API
      // const { data, meta } = await itineraryService.list({ page: 1, pageSize: get().pageSize });
      // set({ itineraries: data, page: 1, totalCount: meta.total, hasMore: meta.page < meta.totalPages });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMoreItineraries: async () => {
    const { hasMore, isLoadingMore } = get();
    if (!hasMore || isLoadingMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      // In development mode, no more data
      if (__DEV__) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        set({ hasMore: false, isLoadingMore: false });
      }

      // Production: call API for next page
      // const { data, meta } = await itineraryService.list({ page: page + 1, pageSize: get().pageSize });
      // set(state => ({
      //   itineraries: [...state.itineraries, ...data],
      //   page: page + 1,
      //   hasMore: meta.page < meta.totalPages,
      // }));
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isLoadingMore: false });
    }
  },

  refreshItineraries: async () => {
    set({ isRefreshing: true, error: null });
    try {
      if (__DEV__) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockData = createMockItineraries();
        set({
          itineraries: mockData,
          page: 1,
          totalCount: mockData.length,
          hasMore: false,
          isRefreshing: false,
        });
      }

      // Production: call API
      // const { data, meta } = await itineraryService.list({ page: 1, pageSize: get().pageSize });
      // set({ itineraries: data, page: 1, totalCount: meta.total, hasMore: meta.page < meta.totalPages });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isRefreshing: false });
    }
  },

  createItinerary: async (input: CreateItineraryInput) => {
    set({ isCreating: true, error: null });
    try {
      if (__DEV__) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const newItinerary: ItineraryWithStats = {
          id: `mock-${Date.now()}`,
          userId: 'dev-user',
          cityId: input.cityId,
          title: input.title,
          startDate:
            typeof input.startDate === 'string'
              ? input.startDate
              : input.startDate.toISOString().split('T')[0],
          endDate:
            typeof input.endDate === 'string'
              ? input.endDate
              : input.endDate.toISOString().split('T')[0],
          visibility: input.visibility || 'private',
          coverImageUrl: input.coverImageUrl || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalDays: 1,
          totalItems: 0,
          city: null as unknown as ItineraryWithStats['city'],
        };
        set((state) => ({
          itineraries: [newItinerary, ...state.itineraries],
          totalCount: state.totalCount + 1,
          isCreating: false,
        }));
      }

      // Production: call API
      // const data = await itineraryService.create(input);
      // set(state => ({ itineraries: [data, ...state.itineraries], totalCount: state.totalCount + 1 }));
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isCreating: false });
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
