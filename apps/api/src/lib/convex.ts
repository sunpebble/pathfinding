/**
 * Convex Client Configuration for API
 * HTTP client for server-side operations
 */

import { api, convex } from '@pathfinding/convex';
import 'dotenv/config';

// Re-export for use in services
export { api, convex };

// Types from Convex
export type { Doc, Id } from '@pathfinding/convex';
