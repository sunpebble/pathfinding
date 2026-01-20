/**
 * Agent API Routes
 * Endpoints for LangGraph agent interactions
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { chat, streamChat } from '../graphs/chat-agent.js';
import {
  getTravelPlanner,
  resumePlanningSession,
  startPlanningSession,
} from '../graphs/travel-planner.js';
import { getProvidersStatus } from '../lib/llm/index.js';
import {
  getPollerStatus,
  startEnrichmentPoller,
  stopEnrichmentPoller,
  triggerEnrichment,
} from '../services/enrichment-poller.js';

export const agentRouter = new Hono();

// ============================================
// Chat Agent Endpoints
// ============================================

/**
 * POST /chat - Send a message and get a response
 */
agentRouter.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, message, userId, context } = body;

    if (!sessionId || !message) {
      return c.json({ error: 'sessionId and message are required' }, 400);
    }

    const result = await chat({
      sessionId,
      message,
      userId,
      context,
    });

    return c.json({
      success: true,
      sessionId,
      response: result.response,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /chat/stream - Stream chat response via SSE
 */
agentRouter.post('/chat/stream', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, message, userId, context } = body;

    if (!sessionId || !message) {
      return c.json({ error: 'sessionId and message are required' }, 400);
    }

    return streamSSE(c, async (stream) => {
      try {
        const generator = streamChat({
          sessionId,
          message,
          userId,
          context,
        });

        for await (const chunk of generator) {
          await stream.writeSSE({
            event: chunk.type,
            data: JSON.stringify(chunk),
          });
        }
      } catch (error) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            error: error instanceof Error ? error.message : 'Stream error',
          }),
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream failed';
    return c.json({ error: message }, 500);
  }
});

// ============================================
// Enrichment Endpoints
// ============================================

/**
 * POST /enrich/:guideId - Manually trigger enrichment for a guide
 */
agentRouter.post('/enrich/:guideId', async (c) => {
  try {
    const guideId = c.req.param('guideId');

    if (!guideId) {
      return c.json({ error: 'guideId is required' }, 400);
    }

    const result = await triggerEnrichment(guideId);

    if (result.success) {
      return c.json({ success: true, guideId });
    }

    return c.json({ success: false, error: result.error }, 500);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Enrichment failed';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /enrich/poller/status - Get enrichment poller status
 */
agentRouter.get('/enrich/poller/status', (c) => {
  const status = getPollerStatus();
  return c.json({ data: status });
});

/**
 * POST /enrich/poller/start - Start the enrichment poller
 */
agentRouter.post('/enrich/poller/start', (c) => {
  startEnrichmentPoller();
  return c.json({ success: true, message: 'Enrichment poller started' });
});

/**
 * POST /enrich/poller/stop - Stop the enrichment poller
 */
agentRouter.post('/enrich/poller/stop', (c) => {
  stopEnrichmentPoller();
  return c.json({ success: true, message: 'Enrichment poller stopped' });
});

// ============================================
// Travel Planner Endpoints
// ============================================

/**
 * POST /plan/start - Start a new travel planning session
 */
agentRouter.post('/plan/start', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, message, userId } = body;

    if (!sessionId || !message) {
      return c.json({ error: 'sessionId and message are required' }, 400);
    }

    const result = await startPlanningSession({
      sessionId,
      message,
      userId,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Planning failed';
    return c.json({ error: msg }, 500);
  }
});

/**
 * POST /plan/:sessionId/feedback - Submit feedback for a planning session
 */
agentRouter.post('/plan/:sessionId/feedback', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    const { feedback } = body;

    if (!sessionId || !feedback) {
      return c.json({ error: 'sessionId and feedback are required' }, 400);
    }

    const result = await resumePlanningSession({
      sessionId,
      feedback,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Feedback failed';
    return c.json({ error: msg }, 500);
  }
});

/**
 * GET /plan/:sessionId/status - Get planning session status
 */
agentRouter.get('/plan/:sessionId/status', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const planner = getTravelPlanner();

    const state = await planner.getState({
      configurable: { thread_id: sessionId },
    });

    if (!state.values) {
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json({
      success: true,
      sessionId,
      currentStep: state.values.currentStep,
      destination: state.values.destination,
      duration: state.values.duration,
      hasDraftPlan: !!state.values.draftPlan,
      hasFinalPlan: !!state.values.finalPlan,
      waitingForFeedback: state.values.currentStep === 'draft_generated',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Status check failed';
    return c.json({ error: msg }, 500);
  }
});

/**
 * GET /plan/:sessionId/result - Get the final travel plan
 */
agentRouter.get('/plan/:sessionId/result', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const planner = getTravelPlanner();

    const state = await planner.getState({
      configurable: { thread_id: sessionId },
    });

    if (!state.values) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const plan =
      state.values.finalPlan ||
      state.values.refinedPlan ||
      state.values.draftPlan;

    if (!plan) {
      return c.json({ error: 'No plan available yet' }, 404);
    }

    return c.json({
      success: true,
      sessionId,
      plan,
      completed: state.values.currentStep === 'completed',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to get plan';
    return c.json({ error: msg }, 500);
  }
});

// ============================================
// Status Endpoints
// ============================================

/**
 * GET /status - Get agent service status
 */
agentRouter.get('/status', async (c) => {
  const providersStatus = await getProvidersStatus();
  const pollerStatus = getPollerStatus();

  return c.json({
    data: {
      llmProviders: providersStatus,
      enrichmentPoller: pollerStatus,
      timestamp: new Date().toISOString(),
    },
  });
});

export default agentRouter;
