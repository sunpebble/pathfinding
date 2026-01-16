import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Chat - AI Travel Assistant Sessions and Messages
 */

const roleValidator = v.union(
  v.literal('user'),
  v.literal('assistant'),
  v.literal('system')
);

const metadataValidator = v.optional(
  v.object({
    pois: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          description: v.optional(v.string()),
          latitude: v.optional(v.number()),
          longitude: v.optional(v.number()),
          address: v.optional(v.string()),
          rating: v.optional(v.number()),
          priceInfo: v.optional(v.string()),
        })
      )
    ),
    itineraryChanges: v.optional(
      v.array(
        v.object({
          action: v.string(),
          dayNumber: v.optional(v.number()),
          poiName: v.optional(v.string()),
          details: v.optional(v.string()),
        })
      )
    ),
    quickActions: v.optional(
      v.array(
        v.object({
          label: v.string(),
          action: v.string(),
          payload: v.optional(v.string()),
        })
      )
    ),
    sources: v.optional(v.array(v.string())),
  })
);

// ============================================
// Chat Sessions
// ============================================

// List chat sessions for a user
export const listSessions = query({
  args: {
    userId: v.string(),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let sessions;
    if (args.includeArchived) {
      sessions = await ctx.db
        .query('chatSessions')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .order('desc')
        .take(limit);
    } else {
      sessions = await ctx.db
        .query('chatSessions')
        .withIndex('by_user_archived', (q) =>
          q.eq('userId', args.userId).eq('isArchived', false)
        )
        .order('desc')
        .take(limit);
    }

    return sessions;
  },
});

// Get a single chat session by ID
export const getSession = query({
  args: { id: v.id('chatSessions') },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    // Optionally fetch linked itinerary/guide info
    let itinerary = null;
    let guide = null;

    if (session.itineraryId) {
      itinerary = await ctx.db.get(session.itineraryId);
    }
    if (session.guideId) {
      guide = await ctx.db.get(session.guideId);
    }

    return {
      ...session,
      itinerary: itinerary
        ? { id: itinerary._id, title: itinerary.title }
        : null,
      guide: guide ? { id: guide._id, title: guide.title } : null,
    };
  },
});

// Create a new chat session
export const createSession = mutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
    itineraryId: v.optional(v.id('itineraries')),
    guideId: v.optional(v.id('travelGuides')),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const title = args.title || '新对话';

    const sessionId = await ctx.db.insert('chatSessions', {
      userId: args.userId,
      title,
      itineraryId: args.itineraryId,
      guideId: args.guideId,
      context: args.context,
      messageCount: 0,
      lastMessageAt: now,
      isArchived: false,
      createdAt: now,
    });

    return sessionId;
  },
});

// Update a chat session
export const updateSession = mutation({
  args: {
    id: v.id('chatSessions'),
    title: v.optional(v.string()),
    context: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

// Delete a chat session and all its messages
export const deleteSession = mutation({
  args: { id: v.id('chatSessions') },
  handler: async (ctx, args) => {
    // Delete all messages in the session
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_session', (q) => q.eq('sessionId', args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the session
    await ctx.db.delete(args.id);
  },
});

// ============================================
// Chat Messages
// ============================================

// List messages for a session
export const listMessages = query({
  args: {
    sessionId: v.id('chatSessions'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const result = await ctx.db
      .query('chatMessages')
      .withIndex('by_session_created', (q) => q.eq('sessionId', args.sessionId))
      .order('asc')
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    return {
      messages: result.page,
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// Get recent messages for context (for AI)
export const getRecentMessages = query({
  args: {
    sessionId: v.id('chatSessions'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_session_created', (q) => q.eq('sessionId', args.sessionId))
      .order('desc')
      .take(limit);

    // Return in chronological order
    return messages.reverse();
  },
});

// Add a message to a session
export const addMessage = mutation({
  args: {
    sessionId: v.id('chatSessions'),
    role: roleValidator,
    content: v.string(),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Insert the message
    const messageId = await ctx.db.insert('chatMessages', {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
      createdAt: now,
    });

    // Update session stats
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        lastMessageAt: now,
      });

      // Auto-generate title from first user message if title is default
      if (
        session.title === '新对话' &&
        args.role === 'user' &&
        session.messageCount === 0
      ) {
        const newTitle =
          args.content.slice(0, 30) + (args.content.length > 30 ? '...' : '');
        await ctx.db.patch(args.sessionId, { title: newTitle });
      }
    }

    return messageId;
  },
});

// Add a user message and return the session for context
export const sendMessage = mutation({
  args: {
    sessionId: v.id('chatSessions'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Insert user message
    const messageId = await ctx.db.insert('chatMessages', {
      sessionId: args.sessionId,
      role: 'user',
      content: args.content,
      createdAt: now,
    });

    // Update session
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        lastMessageAt: now,
      });

      // Auto-generate title from first user message
      if (session.title === '新对话' && session.messageCount === 0) {
        const newTitle =
          args.content.slice(0, 30) + (args.content.length > 30 ? '...' : '');
        await ctx.db.patch(args.sessionId, { title: newTitle });
      }
    }

    // Get recent messages for context
    const recentMessages = await ctx.db
      .query('chatMessages')
      .withIndex('by_session_created', (q) => q.eq('sessionId', args.sessionId))
      .order('desc')
      .take(10);

    // Get linked itinerary if any
    let itineraryContext = null;
    if (session?.itineraryId) {
      const itinerary = await ctx.db.get(session.itineraryId);
      if (itinerary) {
        // Get itinerary days and items for context
        const days = await ctx.db
          .query('itineraryDays')
          .withIndex('by_itinerary', (q) =>
            q.eq('itineraryId', session.itineraryId!)
          )
          .collect();

        itineraryContext = {
          title: itinerary.title,
          startDate: itinerary.startDate,
          endDate: itinerary.endDate,
          daysCount: days.length,
        };
      }
    }

    // Get linked guide if any
    let guideContext = null;
    if (session?.guideId) {
      const guide = await ctx.db.get(session.guideId);
      if (guide) {
        guideContext = {
          title: guide.title,
          destinations: guide.destinations,
          aiSummary: guide.aiSummary,
        };
      }
    }

    return {
      messageId,
      sessionId: args.sessionId,
      recentMessages: recentMessages.reverse(),
      itineraryContext,
      guideContext,
      sessionContext: session?.context,
    };
  },
});

// Save assistant response
export const saveAssistantResponse = mutation({
  args: {
    sessionId: v.id('chatSessions'),
    content: v.string(),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const messageId = await ctx.db.insert('chatMessages', {
      sessionId: args.sessionId,
      role: 'assistant',
      content: args.content,
      metadata: args.metadata,
      createdAt: now,
    });

    // Update session
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        lastMessageAt: now,
      });
    }

    return messageId;
  },
});

// Get session with full context for AI processing
export const getSessionWithContext = query({
  args: { sessionId: v.id('chatSessions') },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Get recent messages
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_session_created', (q) => q.eq('sessionId', args.sessionId))
      .order('desc')
      .take(20);

    // Get linked itinerary details
    let itinerary = null;
    if (session.itineraryId) {
      const it = await ctx.db.get(session.itineraryId);
      if (it) {
        const days = await ctx.db
          .query('itineraryDays')
          .withIndex('by_itinerary', (q) =>
            q.eq('itineraryId', session.itineraryId!)
          )
          .collect();

        // Get items for each day
        const daysWithItems = await Promise.all(
          days.map(async (day) => {
            const items = await ctx.db
              .query('itineraryItems')
              .withIndex('by_day', (q) => q.eq('dayId', day._id))
              .collect();

            const itemsWithPoi = await Promise.all(
              items.map(async (item) => {
                const poi = await ctx.db.get(item.poiId);
                return {
                  ...item,
                  poiName: poi?.name,
                  poiCategory: poi?.category,
                };
              })
            );

            return {
              dayNumber: day.dayNumber,
              date: day.date,
              items: itemsWithPoi,
            };
          })
        );

        const city = await ctx.db.get(it.cityId);

        itinerary = {
          id: it._id,
          title: it.title,
          cityName: city?.name,
          startDate: it.startDate,
          endDate: it.endDate,
          days: daysWithItems,
        };
      }
    }

    // Get linked guide details
    let guide = null;
    if (session.guideId) {
      const g = await ctx.db.get(session.guideId);
      if (g) {
        guide = {
          id: g._id,
          title: g.title,
          destinations: g.destinations,
          aiSummary: g.aiSummary,
          aiTips: g.aiTips,
          aiBestTime: g.aiBestTime,
          aiDuration: g.aiDuration,
          aiBudget: g.aiBudget,
          aiDays: g.aiDays,
        };
      }
    }

    return {
      session,
      messages: messages.reverse(),
      itinerary,
      guide,
    };
  },
});

// Clear all messages in a session (start fresh)
export const clearMessages = mutation({
  args: { sessionId: v.id('chatSessions') },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.patch(args.sessionId, {
      messageCount: 0,
      lastMessageAt: Date.now(),
    });
  },
});
