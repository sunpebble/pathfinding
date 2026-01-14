/**
 * Chat Routes - AI Travel Assistant API
 * Endpoints for managing chat sessions and messages with the AI assistant
 */

import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { api, convex } from '../lib/convex.js';
import { getChatService } from '../services/chat.service.js';

export const chatRouter = new Hono();

// Request schemas
const createSessionSchema = z.object({
  userId: z.string().min(1),
  title: z.string().optional(),
  itineraryId: z.string().optional(),
  guideId: z.string().optional(),
  context: z.string().optional(),
});

const sendMessageSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

const chatQuerySchema = z.object({
  message: z.string().min(1).max(5000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional(),
  context: z
    .object({
      itinerary: z
        .object({
          title: z.string(),
          cityName: z.string().optional(),
          startDate: z.string(),
          endDate: z.string(),
          days: z
            .array(
              z.object({
                dayNumber: z.number(),
                date: z.string(),
                items: z.array(
                  z.object({
                    poiName: z.string().optional(),
                    poiCategory: z.string().optional(),
                    startTime: z.string().optional(),
                    endTime: z.string().optional(),
                    notes: z.string().optional(),
                  })
                ),
              })
            )
            .optional(),
        })
        .optional(),
      guide: z
        .object({
          title: z.string().optional(),
          destinations: z.array(z.string()).optional(),
          aiSummary: z.string().optional(),
          aiTips: z.array(z.string()).optional(),
          aiBestTime: z.string().optional(),
          aiDuration: z.string().optional(),
          aiBudget: z.string().optional(),
        })
        .optional(),
      sessionContext: z.string().optional(),
      preferences: z
        .object({
          language: z.string().optional(),
          travelStyle: z.string().optional(),
          budget: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

// Health check for chat service
chatRouter.get('/health', async (c: Context) => {
  const chatService = getChatService();
  const isHealthy = await chatService.healthCheck();

  return c.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'AI Chat Assistant',
      timestamp: new Date().toISOString(),
    },
    isHealthy ? 200 : 503
  );
});

// Direct chat endpoint (stateless)
chatRouter.post(
  '/query',
  zValidator('json', chatQuerySchema),
  async (c: Context) => {
    const { message, history, context } = await c.req.json();
    const chatService = getChatService();

    try {
      const response = await chatService.chat(message, history || [], context);
      return c.json({
        success: true,
        data: response,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Chat query failed';
      return c.json({ success: false, error: errorMessage }, 500);
    }
  }
);

// Get recommendations
chatRouter.post('/recommendations', async (c: Context) => {
  const body = await c.req.json();
  const { query, context } = body;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  const chatService = getChatService();

  try {
    const response = await chatService.getRecommendations(query, context);
    return c.json({
      success: true,
      data: response,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Recommendation failed';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Get travel tips
chatRouter.post('/tips', async (c: Context) => {
  const body = await c.req.json();
  const { topic, context } = body;

  if (!topic) {
    return c.json({ success: false, error: 'Topic is required' }, 400);
  }

  const chatService = getChatService();

  try {
    const response = await chatService.getTips(topic, context);
    return c.json({
      success: true,
      data: response,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Tips fetch failed';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Suggest itinerary changes
chatRouter.post('/suggest-changes', async (c: Context) => {
  const body = await c.req.json();
  const { request, context } = body;

  if (!request) {
    return c.json({ success: false, error: 'Request is required' }, 400);
  }

  if (!context?.itinerary) {
    return c.json(
      { success: false, error: 'Itinerary context is required' },
      400
    );
  }

  const chatService = getChatService();

  try {
    const response = await chatService.suggestItineraryChanges(request, context);
    return c.json({
      success: true,
      data: response,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Suggestion failed';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// ============================================
// Session-based Chat (Persisted)
// ============================================

// List chat sessions for a user
chatRouter.get('/sessions', async (c: Context) => {
  const userId = c.req.query('userId');
  const includeArchived = c.req.query('includeArchived') === 'true';
  const limit = Number.parseInt(c.req.query('limit') || '20', 10);

  if (!userId) {
    return c.json({ success: false, error: 'userId is required' }, 400);
  }

  try {
    const sessions = await convex.query(api.chat.listSessions, {
      userId,
      includeArchived,
      limit,
    });

    return c.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to fetch sessions';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Create a new chat session
chatRouter.post(
  '/sessions',
  zValidator('json', createSessionSchema),
  async (c: Context) => {
    const { userId, title, itineraryId, guideId, context } = await c.req.json();

    try {
      const sessionId = await convex.mutation(api.chat.createSession, {
        userId,
        title,
        itineraryId: itineraryId as any,
        guideId: guideId as any,
        context,
      });

      // Fetch the created session
      const session = await convex.query(api.chat.getSession, { id: sessionId });

      return c.json({
        success: true,
        data: session,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create session';
      return c.json({ success: false, error: errorMessage }, 500);
    }
  }
);

// Get a single session with details
chatRouter.get('/sessions/:id', async (c: Context) => {
  const sessionId = c.req.param('id');

  try {
    const session = await convex.query(api.chat.getSession, {
      id: sessionId as any,
    });

    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    return c.json({
      success: true,
      data: session,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to fetch session';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Update a session (title, archive status)
chatRouter.patch('/sessions/:id', async (c: Context) => {
  const sessionId = c.req.param('id');
  const body = await c.req.json();
  const { title, context, isArchived } = body;

  try {
    const session = await convex.mutation(api.chat.updateSession, {
      id: sessionId as any,
      title,
      context,
      isArchived,
    });

    return c.json({
      success: true,
      data: session,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to update session';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Delete a session
chatRouter.delete('/sessions/:id', async (c: Context) => {
  const sessionId = c.req.param('id');

  try {
    await convex.mutation(api.chat.deleteSession, {
      id: sessionId as any,
    });

    return c.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to delete session';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Get messages for a session
chatRouter.get('/sessions/:id/messages', async (c: Context) => {
  const sessionId = c.req.param('id');
  const limit = Number.parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  try {
    const result = await convex.query(api.chat.listMessages, {
      sessionId: sessionId as any,
      limit,
      cursor,
    });

    return c.json({
      success: true,
      data: result.messages,
      cursor: result.cursor,
      isDone: result.isDone,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to fetch messages';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Send a message and get AI response
chatRouter.post(
  '/sessions/:id/messages',
  zValidator('json', z.object({ content: z.string().min(1).max(5000) })),
  async (c: Context) => {
    const sessionId = c.req.param('id');
    const { content } = await c.req.json();

    try {
      // Send user message and get context
      const sendResult = await convex.mutation(api.chat.sendMessage, {
        sessionId: sessionId as any,
        content,
      });

      // Build context for AI
      const chatContext: {
        itinerary?: {
          title: string;
          cityName?: string;
          startDate: string;
          endDate: string;
          daysCount?: number;
        };
        guide?: {
          title?: string;
          destinations?: string[];
          aiSummary?: string;
        };
        sessionContext?: string;
      } = {};

      if (sendResult.itineraryContext) {
        chatContext.itinerary = sendResult.itineraryContext;
      }
      if (sendResult.guideContext) {
        chatContext.guide = sendResult.guideContext;
      }
      if (sendResult.sessionContext) {
        chatContext.sessionContext = sendResult.sessionContext;
      }

      // Convert recent messages to chat format
      const history = sendResult.recentMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Generate AI response
      const chatService = getChatService();
      const aiResponse = await chatService.chat(content, history, chatContext);

      // Save AI response
      await convex.mutation(api.chat.saveAssistantResponse, {
        sessionId: sessionId as any,
        content: aiResponse.content,
        metadata: aiResponse.metadata,
      });

      return c.json({
        success: true,
        data: {
          userMessageId: sendResult.messageId,
          response: aiResponse,
        },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message';
      return c.json({ success: false, error: errorMessage }, 500);
    }
  }
);

// Clear all messages in a session
chatRouter.delete('/sessions/:id/messages', async (c: Context) => {
  const sessionId = c.req.param('id');

  try {
    await convex.mutation(api.chat.clearMessages, {
      sessionId: sessionId as any,
    });

    return c.json({
      success: true,
      message: 'Messages cleared',
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to clear messages';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default chatRouter;
