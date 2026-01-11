import type { BlogPostWithStats } from '@pathfinding/types';
import { create } from 'zustand';
import { blogService } from '@/services/blogService';

interface BlogState {
  // Data
  currentBlogPost: BlogPostWithStats | null;

  // Loading states
  isLoading: boolean;
  isTogglingLike: boolean;

  // Error
  error: string | null;

  // Actions
  fetchBlogPost: (id: string) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  clearCurrentPost: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentBlogPost: null,
  isLoading: false,
  isTogglingLike: false,
  error: null,
};

/**
 * Zustand store for blog post state management
 */
export const useBlogStore = create<BlogState>()((set, get) => ({
  ...initialState,

  fetchBlogPost: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await blogService.getById(id);
      set({ currentBlogPost: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  toggleLike: async (id: string) => {
    const { currentBlogPost } = get();
    if (!currentBlogPost) return;

    set({ isTogglingLike: true, error: null });
    try {
      const { isLiked, likeCount } = await blogService.toggleLike(id);
      set({
        currentBlogPost: {
          ...currentBlogPost,
          isLiked,
          likeCount,
        },
        isTogglingLike: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isTogglingLike: false });
    }
  },

  clearCurrentPost: () => set({ currentBlogPost: null, error: null }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
