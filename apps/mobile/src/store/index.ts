import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * App-wide settings and state
 */
interface AppState {
  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Language
  locale: "zh" | "en";
  setLocale: (locale: "zh" | "en") => void;

  // Network status
  isOnline: boolean;
  setIsOnline: (isOnline: boolean) => void;

  // Sync status
  isSyncing: boolean;
  lastSyncAt: number | null;
  setIsSyncing: (isSyncing: boolean) => void;
  setLastSyncAt: (timestamp: number) => void;
}

/**
 * App store with persistence
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),

      // Language
      locale: "zh",
      setLocale: (locale) => set({ locale }),

      // Network (not persisted)
      isOnline: true,
      setIsOnline: (isOnline) => set({ isOnline }),

      // Sync (not persisted)
      isSyncing: false,
      lastSyncAt: null,
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
      }),
    }
  )
);

/**
 * Auth store (separate from app store for security)
 */
interface AuthState {
  userId: string | null;
  userEmail: string | null;
  setUser: (userId: string | null, email: string | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  userEmail: null,
  setUser: (userId, userEmail) => set({ userId, userEmail }),
  clearUser: () => set({ userId: null, userEmail: null }),
}));
