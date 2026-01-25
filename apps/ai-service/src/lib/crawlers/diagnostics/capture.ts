/**
 * Diagnostic Capture Utilities
 * Captures raw page data before parsing for diagnosis
 */

import {
  navigateTo,
  takeSnapshot,
  listNetworkRequests,
  sleep,
  type NetworkRequest,
} from '../mcp-client.js';

/**
 * Complete diagnostic capture for a platform URL
 * Captures all raw data needed to diagnose extraction issues
 */
export interface DiagnosticCapture {
  platform: string;
  url: string;
  timestamp: number;

  // Raw acquisition data
  snapshot: string;
  networkRequests: NetworkRequest[];
  consoleMessages: string[];

  // Timing data
  navigationTime: number;
  contentLoadTime: number;
  contentStable: boolean;

  // Parsed results (filled later by caller)
  parseResult: import('../index.js').CrawlResult | null;
  parseErrors: string[];
}

/**
 * Wait for page content to stabilize (stop changing)
 * Replaces fixed sleep() with smart detection
 *
 * @param maxWait Maximum time to wait in ms (default: 10000)
 * @param stabilityWindow Time between checks in ms (default: 500)
 * @returns true if content stabilized, false if timed out
 */
export async function waitForContentStable(
  maxWait: number = 10000,
  stabilityWindow: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  let lastSnapshotLength = 0;
  let stableCount = 0;

  while (Date.now() - startTime < maxWait) {
    const snapshot = await takeSnapshot();
    const currentLength = snapshot.content.length;

    // Content is stable if two consecutive snapshots have same length
    // and content has reasonable size (> 1000 chars)
    if (currentLength === lastSnapshotLength && currentLength > 1000) {
      stableCount++;
      if (stableCount >= 2) {
        return true;
      }
    } else {
      stableCount = 0;
    }

    lastSnapshotLength = currentLength;
    await sleep(stabilityWindow);
  }

  return false;
}

/**
 * Capture raw page data for diagnosis
 * Navigates to URL, waits for stability, and captures all raw data
 *
 * @param platform Platform name (ctrip, mafengwo, etc.)
 * @param url URL to diagnose
 * @returns DiagnosticCapture with raw data (parseResult left null for caller)
 */
export async function captureForDiagnosis(
  platform: string,
  url: string
): Promise<DiagnosticCapture> {
  console.log(`[Diagnostic] Capturing: ${platform} - ${url}`);

  // Navigate and measure timing
  const navStart = Date.now();
  await navigateTo(url, { timeout: 30000 });
  const navigationTime = Date.now() - navStart;
  console.log(`[Diagnostic] Navigation: ${navigationTime}ms`);

  // Wait for content to stabilize
  const stabilityStart = Date.now();
  const contentStable = await waitForContentStable();
  const contentLoadTime = Date.now() - stabilityStart;
  console.log(
    `[Diagnostic] Content stable: ${contentStable}, load time: ${contentLoadTime}ms`
  );

  // Capture full snapshot
  const snapshot = await takeSnapshot({ verbose: true });
  console.log(`[Diagnostic] Snapshot: ${snapshot.content.length} chars`);

  // List network requests
  const networkRequests = await listNetworkRequests([
    'xhr',
    'fetch',
    'document',
  ]);
  console.log(`[Diagnostic] Network requests: ${networkRequests.length}`);

  return {
    platform,
    url,
    timestamp: Date.now(),
    snapshot: snapshot.content,
    networkRequests,
    consoleMessages: [], // Would require additional MCP call
    navigationTime,
    contentLoadTime,
    contentStable,
    parseResult: null,
    parseErrors: [],
  };
}
