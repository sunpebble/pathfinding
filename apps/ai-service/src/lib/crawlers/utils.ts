/**
 * Crawler Utility Functions
 * Shared utilities for browser automation
 */

import type { BrowserClient } from './clients/index.js';

/**
 * Helper function for delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for page content to stabilize (stop changing)
 *
 * @param client - Browser client instance
 * @param maxWait Maximum time to wait in ms (default: 10000)
 * @param stabilityWindow Time between checks in ms (default: 500)
 * @returns true if content stabilized, false if timed out
 */
export async function waitForContentStable(
  client: BrowserClient,
  maxWait: number = 10000,
  stabilityWindow: number = 500,
): Promise<boolean> {
  const startTime = Date.now();
  let lastSnapshotLength = 0;
  let stableCount = 0;

  while (Date.now() - startTime < maxWait) {
    const snapshot = await client.takeSnapshot();
    const currentLength = snapshot.content.length;

    // Content is stable if two consecutive snapshots have same length
    // and content has reasonable size (> 1000 chars)
    if (currentLength === lastSnapshotLength && currentLength > 1000) {
      stableCount++;
      if (stableCount >= 2) {
        return true;
      }
    }
    else {
      stableCount = 0;
    }

    lastSnapshotLength = currentLength;
    await sleep(stabilityWindow);
  }

  return false;
}
