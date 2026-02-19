"use client";

import { useAuthToken } from "@convex-dev/auth/react";

/**
 * Custom hook for accessing authentication state
 * Wraps useAuthToken to provide isAuthenticated and isLoading
 */
export function useAuth() {
  const token = useAuthToken();

  return {
    isAuthenticated: token !== null,
    isLoading: token === undefined,
  };
}
