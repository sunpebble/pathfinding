/**
 * Convex Client for AI Service
 * Provides connection to Convex database
 */

import { ConvexHttpClient } from 'convex/browser';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';

export const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * Check Convex connection by making a simple request
 */
export async function checkConnection(): Promise<boolean> {
  try {
    // Simple health check - just verify the URL is reachable
    const response = await fetch(`${CONVEX_URL}/version`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.error('Convex connection failed:', error);
    return false;
  }
}
