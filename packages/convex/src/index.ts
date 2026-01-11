/**
 * @pathfinding/convex - Shared Convex Client
 * Re-exports Convex API and client utilities for use across the monorepo
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../_generated/api.js';

// Re-export generated API
export { api };
export { internal } from '../_generated/api.js';

// Re-export types
export type { Doc, Id } from '../_generated/dataModel.js';

// Environment-aware client factory
export function createConvexClient(url?: string): ConvexHttpClient {
  const convexUrl =
    url || process.env.CONVEX_URL || process.env.CONVEX_SELF_HOSTED_URL;

  if (!convexUrl) {
    throw new Error(
      'Missing Convex URL. Set CONVEX_URL or CONVEX_SELF_HOSTED_URL environment variable.'
    );
  }

  return new ConvexHttpClient(convexUrl);
}

// Default client for server-side usage
export const convex = createConvexClient();
