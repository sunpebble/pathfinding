import {
  ConvexProvider as ConvexClientProvider,
  ConvexReactClient,
} from 'convex/react';
import Constants from 'expo-constants';
import React from 'react';

// Get Convex URL from environment
const CONVEX_URL =
  Constants.expoConfig?.extra?.convexUrl || process.env.EXPO_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.warn('Missing CONVEX_URL environment variable');
}

// Create Convex client
const convex = new ConvexReactClient(CONVEX_URL || '');

/**
 * Convex provider for real-time data subscriptions
 */
export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider client={convex}>{children}</ConvexClientProvider>
  );
}

// Export the client for direct access if needed
export { convex };
