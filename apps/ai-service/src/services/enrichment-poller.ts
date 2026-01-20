/**
 * Enrichment Poller Service
 * Polls Convex for pending guides and triggers enrichment
 */

import { enrichGuide } from '../graphs/content-enricher.js';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const POLL_INTERVAL = Number.parseInt(
  process.env.ENRICHMENT_POLL_INTERVAL || '30000',
  10
);
const BATCH_SIZE = 5;

let isPolling = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fetch pending guides from Convex
 */
async function fetchPendingGuides(): Promise<any[]> {
  try {
    const response = await fetch(
      `${CONVEX_URL}/api/guides?enrichmentStatus=pending&limit=${BATCH_SIZE}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch pending guides: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.guides || data || [];
  } catch (error) {
    console.error('Error fetching pending guides:', error);
    return [];
  }
}

/**
 * Mark a guide as processing
 */
async function markAsProcessing(guideId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CONVEX_URL}/api/guides/${guideId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrichmentStatus: 'processing',
        enrichmentStartedAt: Date.now(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    return response.ok;
  } catch (error) {
    console.error(`Error marking guide ${guideId} as processing:`, error);
    return false;
  }
}

/**
 * Process a single poll cycle
 */
async function pollCycle(): Promise<void> {
  if (!isPolling) return;

  try {
    const pendingGuides = await fetchPendingGuides();

    if (pendingGuides.length > 0) {
      console.log(`📝 Found ${pendingGuides.length} pending guides to enrich`);

      for (const guide of pendingGuides) {
        if (!isPolling) break;

        // Mark as processing first
        const marked = await markAsProcessing(guide._id);
        if (!marked) {
          console.error(`Failed to mark guide ${guide._id} as processing`);
          continue;
        }

        console.log(`🔄 Enriching guide: ${guide.title || guide._id}`);

        try {
          const result = await enrichGuide({
            _id: guide._id,
            content: guide.content,
            title: guide.title,
            destinations: guide.destinations || [],
          });

          if (result.success) {
            console.log(`✅ Enriched guide: ${guide.title || guide._id}`);
          } else {
            console.error(
              `❌ Failed to enrich guide ${guide._id}: ${result.error}`
            );
          }
        } catch (error) {
          console.error(`❌ Error enriching guide ${guide._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Poll cycle error:', error);
  }

  // Schedule next poll
  if (isPolling) {
    pollTimer = setTimeout(pollCycle, POLL_INTERVAL);
  }
}

/**
 * Start the enrichment poller
 */
export function startEnrichmentPoller(): void {
  if (isPolling) {
    console.log('Enrichment poller already running');
    return;
  }

  isPolling = true;
  console.log(
    `🚀 Starting enrichment poller (interval: ${POLL_INTERVAL / 1000}s)`
  );

  // Start first poll immediately
  pollCycle();
}

/**
 * Stop the enrichment poller
 */
export function stopEnrichmentPoller(): void {
  isPolling = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  console.log('⏹️ Enrichment poller stopped');
}

/**
 * Get poller status
 */
export function getPollerStatus(): {
  running: boolean;
  interval: number;
} {
  return {
    running: isPolling,
    interval: POLL_INTERVAL,
  };
}

/**
 * Manually trigger enrichment for a specific guide
 */
export async function triggerEnrichment(
  guideId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch the guide
    const response = await fetch(`${CONVEX_URL}/api/guides/${guideId}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `Guide not found: ${response.status}` };
    }

    const guide = await response.json();

    // Mark as processing
    await markAsProcessing(guideId);

    // Run enrichment
    return enrichGuide({
      _id: guide._id,
      content: guide.content,
      title: guide.title,
      destinations: guide.destinations || [],
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Trigger failed',
    };
  }
}
