import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Collaborator Presence - Real-time collaboration tracking
 * Handles online status, cursor positions, and selection states
 */

// Predefined colors for collaborators
const COLLABORATOR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky Blue
];

/**
 * Get an available color for a new collaborator
 */
async function getAvailableColor(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>
): Promise<string> {
  const existingPresences = await ctx.db
    .query('collaboratorPresence')
    .withIndex('by_itinerary', (q) => q.eq('itineraryId', itineraryId))
    .collect();

  const usedColors = new Set(existingPresences.map((p) => p.color));

  for (const color of COLLABORATOR_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  // If all colors are used, return a random one
  return COLLABORATOR_COLORS[
    Math.floor(Math.random() * COLLABORATOR_COLORS.length)
  ];
}

/**
 * Check if user has access to the itinerary
 */
async function checkAccess(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>,
  userId: string
): Promise<boolean> {
  const itinerary = await ctx.db.get(itineraryId);
  if (!itinerary) return false;

  // Owner has access
  if (itinerary.userId === userId) return true;

  // Check collaborator access
  const collab = await ctx.db
    .query('itineraryCollaborators')
    .withIndex('by_itinerary_user', (q) =>
      q.eq('itineraryId', itineraryId).eq('userId', userId)
    )
    .first();

  return collab !== null;
}

// ============================================
// Queries
// ============================================

/**
 * Get all online collaborators for an itinerary
 */
export const getOnlineCollaborators = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    // Get all presence records for this itinerary
    const presences = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Filter to only online users (active in last 30 seconds)
    const thirtySecondsAgo = Date.now() - 30000;
    const onlinePresences = presences.filter(
      (p) => p.isOnline && p.lastActiveAt > thirtySecondsAgo
    );

    return onlinePresences;
  },
});

/**
 * Get presence for a specific user in an itinerary
 */
export const getUserPresence = query({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();
  },
});

/**
 * Get all collaborators with their presence status
 */
export const getCollaboratorsWithPresence = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    // Get itinerary to include owner
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) return [];

    // Get all collaborators
    const collaborators = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Get all presence records
    const presences = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    const presenceMap = new Map(presences.map((p) => [p.userId, p]));
    const thirtySecondsAgo = Date.now() - 30000;

    // Build result including owner
    const result = [];

    // Add owner
    const ownerPresence = presenceMap.get(itinerary.userId);
    result.push({
      userId: itinerary.userId,
      role: 'owner' as const,
      isOnline: ownerPresence
        ? ownerPresence.isOnline &&
          ownerPresence.lastActiveAt > thirtySecondsAgo
        : false,
      presence: ownerPresence || null,
    });

    // Add collaborators
    for (const collab of collaborators) {
      if (collab.userId === itinerary.userId) continue; // Skip owner
      const presence = presenceMap.get(collab.userId);
      result.push({
        userId: collab.userId,
        role: collab.role,
        isOnline: presence
          ? presence.isOnline && presence.lastActiveAt > thirtySecondsAgo
          : false,
        presence: presence || null,
      });
    }

    return result;
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Join a collaborative editing session
 */
export const joinSession = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check access
    const hasAccess = await checkAccess(ctx, args.itineraryId, args.userId);
    if (!hasAccess) {
      throw new Error('You do not have access to this itinerary');
    }

    // Check if presence record already exists
    const existing = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (existing) {
      // Update existing presence
      await ctx.db.patch(existing._id, {
        isOnline: true,
        lastActiveAt: Date.now(),
        displayName: args.displayName ?? existing.displayName,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
      });
      return existing._id;
    }

    // Create new presence record
    const color = await getAvailableColor(ctx, args.itineraryId);
    return await ctx.db.insert('collaboratorPresence', {
      userId: args.userId,
      itineraryId: args.itineraryId,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      color,
      lastActiveAt: Date.now(),
      isOnline: true,
    });
  },
});

/**
 * Leave a collaborative editing session
 */
export const leaveSession = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (presence) {
      await ctx.db.patch(presence._id, {
        isOnline: false,
        lastActiveAt: Date.now(),
        currentDayId: undefined,
        currentItemId: undefined,
        cursorPosition: undefined,
        selectedElements: undefined,
      });
    }
  },
});

/**
 * Update presence heartbeat (keep-alive)
 */
export const heartbeat = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (presence) {
      await ctx.db.patch(presence._id, {
        lastActiveAt: Date.now(),
        isOnline: true,
      });
    }
  },
});

/**
 * Update cursor position
 */
export const updateCursor = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    currentDayId: v.optional(v.id('itineraryDays')),
    currentItemId: v.optional(v.id('itineraryItems')),
    cursorPosition: v.optional(
      v.object({
        field: v.string(),
        offset: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (presence) {
      await ctx.db.patch(presence._id, {
        lastActiveAt: Date.now(),
        currentDayId: args.currentDayId,
        currentItemId: args.currentItemId,
        cursorPosition: args.cursorPosition,
      });
    }
  },
});

/**
 * Update selection state
 */
export const updateSelection = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    selectedElements: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal('day'), v.literal('item'), v.literal('poi')),
          id: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (presence) {
      await ctx.db.patch(presence._id, {
        lastActiveAt: Date.now(),
        selectedElements: args.selectedElements,
      });
    }
  },
});

/**
 * Clean up stale presence records (users who haven't sent heartbeat)
 * This should be called periodically by a scheduled function
 */
export const cleanupStalePresences = mutation({
  args: {
    itineraryId: v.id('itineraries'),
  },
  handler: async (ctx, args) => {
    const presences = await ctx.db
      .query('collaboratorPresence')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    const oneMinuteAgo = Date.now() - 60000;
    let cleanedCount = 0;

    for (const presence of presences) {
      if (presence.isOnline && presence.lastActiveAt < oneMinuteAgo) {
        await ctx.db.patch(presence._id, {
          isOnline: false,
          currentDayId: undefined,
          currentItemId: undefined,
          cursorPosition: undefined,
          selectedElements: undefined,
        });
        cleanedCount++;
      }
    }

    return { cleanedCount };
  },
});
