/**
 * @pathfinding/convex - Shared Convex Client
 * Re-exports Convex API and client utilities for use across the monorepo
 * Now references the unified /convex directory at project root
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api.js';

// Re-export generated API
export { api };
export { internal } from '../../../convex/_generated/api.js';

// Re-export types
export type {
  Doc,
  Id,
  TableNames,
} from '../../../convex/_generated/dataModel.js';

// Environment-aware client factory
export function createConvexClient(url?: string): ConvexHttpClient {
  const convexUrl
    = url || process.env.CONVEX_URL || process.env.CONVEX_SELF_HOSTED_URL;

  if (!convexUrl) {
    throw new Error(
      'Missing Convex URL. Set CONVEX_URL or CONVEX_SELF_HOSTED_URL environment variable.',
    );
  }

  return new ConvexHttpClient(convexUrl);
}

// Lazy singleton for default client
let _convex: ConvexHttpClient | null = null;

/**
 * Get or create the default Convex client
 * Uses lazy initialization to allow env vars to be loaded first
 */
export function getConvex(): ConvexHttpClient {
  if (!_convex) {
    _convex = createConvexClient();
  }
  return _convex;
}

// For backwards compatibility - use getConvex() for lazy init
// The ConvexHttpClient methods already have proper typing
export const convex = {
  get query() {
    return getConvex().query.bind(getConvex());
  },
  get mutation() {
    return getConvex().mutation.bind(getConvex());
  },
  get action() {
    return getConvex().action.bind(getConvex());
  },
};
