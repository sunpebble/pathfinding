/**
 * Enrichment Poller Service
 * Polls Convex for pending guides and triggers enrichment
 */

import { enrichGuide } from '../graphs/content-enricher.js';
import { loggers } from '../lib/logger.js';

interface PendingGuide {
  _id: string;
  title?: string;
  content?: string;
  destinations?: string[];
}

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const POLL_INTERVAL = Number.parseInt(
  process.env.ENRICHMENT_POLL_INTERVAL || '30000',
  10,
);
const BATCH_SIZE = 5;

let isPolling = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fetch pending guides from Convex
 */
async function fetchPendingGuides(): Promise<PendingGuide[]> {
  try {
    const response = await fetch(
      `${CONVEX_URL}/api/guides?enrichmentStatus=pending&limit=${BATCH_SIZE}`,
      {
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      loggers.convex.error(
        { status: response.status },
        'Failed to fetch pending guides',
      );
      return [];
    }

    const data = await response.json();
    return data.guides || data || [];
  }
  catch (error) {
    loggers.convex.error({ error }, 'Error fetching pending guides');
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
  }
  catch (error) {
    loggers.convex.error(
      { error, guideId },
      'Error marking guide as processing',
    );
    return false;
  }
}

/**
 * Process a single poll cycle
 */
async function pollCycle(): Promise<void> {
  if (!isPolling)
    return;

  try {
    const pendingGuides = await fetchPendingGuides();

    if (pendingGuides.length > 0) {
      loggers.convex.info(
        { count: pendingGuides.length },
        'Found pending guides to enrich',
      );

      for (const guide of pendingGuides) {
        if (!isPolling)
          break;

        // Mark as processing first
        const marked = await markAsProcessing(guide._id);
        if (!marked) {
          loggers.convex.error(
            { guideId: guide._id },
            'Failed to mark guide as processing',
          );
          continue;
        }

        loggers.convex.info(
          { guideId: guide._id, title: guide.title },
          'Enriching guide',
        );

        try {
          const result = await enrichGuide({
            _id: guide._id,
            content: guide.content || '',
            title: guide.title || '',
            destinations: guide.destinations || [],
          });

          if (result.success) {
            loggers.convex.info(
              { guideId: guide._id, title: guide.title },
              'Enriched guide successfully',
            );
          }
          else {
            loggers.convex.error(
              { guideId: guide._id, error: result.error },
              'Failed to enrich guide',
            );
          }
        }
        catch (error) {
          loggers.convex.error(
            { guideId: guide._id, error },
            'Error enriching guide',
          );
        }
      }
    }
  }
  catch (error) {
    loggers.convex.error({ error }, 'Poll cycle error');
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
    loggers.convex.info('Enrichment poller already running');
    return;
  }

  isPolling = true;
  loggers.convex.info(
    { intervalSeconds: POLL_INTERVAL / 1000 },
    'Starting enrichment poller',
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
  loggers.convex.info('Enrichment poller stopped');
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
  guideId: string,
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
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Trigger failed',
    };
  }
}
