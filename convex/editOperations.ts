import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { editOperationChangesValidator } from '../packages/convex-client/src/validators/index.js';
import { mutation, query } from './_generated/server';

/**
 * Edit Operations - Conflict Resolution and Operation Tracking
 * Handles optimistic concurrency control for collaborative editing
 */

// Operation type validators
const operationTypeValidator = v.union(
  v.literal('create'),
  v.literal('update'),
  v.literal('delete'),
  v.literal('reorder'),
);

const targetTypeValidator = v.union(
  v.literal('itinerary'),
  v.literal('day'),
  v.literal('item'),
);

const _statusValidator = v.union(
  v.literal('pending'),
  v.literal('applied'),
  v.literal('conflicted'),
  v.literal('rejected'),
);

const resolutionValidator = v.union(
  v.literal('accept_mine'),
  v.literal('accept_theirs'),
  v.literal('merge'),
);

/**
 * Get the current version for a target
 */
async function getCurrentVersion(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>,
  targetType: string,
  targetId: string,
): Promise<number> {
  const lastOperation = await ctx.db
    .query('editOperations')
    .withIndex('by_itinerary_timestamp', q =>
      q.eq('itineraryId', itineraryId))
    .order('desc')
    .filter(q =>
      q.and(
        q.eq(q.field('targetType'), targetType),
        q.eq(q.field('targetId'), targetId),
        q.eq(q.field('status'), 'applied'),
      ),
    )
    .first();

  return lastOperation ? lastOperation.version + 1 : 1;
}

/**
 * Check for conflicting operations
 */
async function checkForConflicts(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>,
  targetType: string,
  targetId: string,
  baseVersion: number,
  excludeUserId: string,
): Promise<boolean> {
  const conflictingOps = await ctx.db
    .query('editOperations')
    .withIndex('by_itinerary_timestamp', q =>
      q.eq('itineraryId', itineraryId))
    .filter(q =>
      q.and(
        q.eq(q.field('targetType'), targetType),
        q.eq(q.field('targetId'), targetId),
        q.gte(q.field('version'), baseVersion),
        q.neq(q.field('userId'), excludeUserId),
        q.eq(q.field('status'), 'applied'),
      ),
    )
    .collect();

  return conflictingOps.length > 0;
}

// ============================================
// Queries
// ============================================

/**
 * Get recent operations for an itinerary
 */
export const getRecentOperations = query({
  args: {
    itineraryId: v.id('itineraries'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const operations = await ctx.db
      .query('editOperations')
      .withIndex('by_itinerary_timestamp', q =>
        q.eq('itineraryId', args.itineraryId))
      .order('desc')
      .take(limit);

    return operations;
  },
});

/**
 * Get pending operations for conflict resolution
 */
export const getPendingOperations = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('editOperations')
      .withIndex('by_itinerary_status', q =>
        q.eq('itineraryId', args.itineraryId).eq('status', 'pending'))
      .collect();
  },
});

/**
 * Get conflicted operations that need resolution
 */
export const getConflictedOperations = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('editOperations')
      .withIndex('by_itinerary_status', q =>
        q.eq('itineraryId', args.itineraryId).eq('status', 'conflicted'))
      .collect();
  },
});

/**
 * Get operations by user
 */
export const getOperationsByUser = query({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const operations = await ctx.db
      .query('editOperations')
      .withIndex('by_itinerary_timestamp', q =>
        q.eq('itineraryId', args.itineraryId))
      .order('desc')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .take(limit);

    return operations;
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Record a new edit operation
 */
export const recordOperation = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    operationType: operationTypeValidator,
    targetType: targetTypeValidator,
    targetId: v.string(),
    changes: editOperationChangesValidator,
    baseVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const baseVersion = args.baseVersion ?? 0;

    // Check for conflicts
    const hasConflict = await checkForConflicts(
      ctx,
      args.itineraryId,
      args.targetType,
      args.targetId,
      baseVersion,
      args.userId,
    );

    // Get the next version
    const nextVersion = await getCurrentVersion(
      ctx,
      args.itineraryId,
      args.targetType,
      args.targetId,
    );

    // Determine initial status
    const status = hasConflict ? 'conflicted' : 'pending';

    const operationId = await ctx.db.insert('editOperations', {
      itineraryId: args.itineraryId,
      userId: args.userId,
      operationType: args.operationType,
      targetType: args.targetType,
      targetId: args.targetId,
      changes: args.changes,
      timestamp: now,
      version: nextVersion,
      status,
    });

    return {
      operationId,
      hasConflict,
      version: nextVersion,
    };
  },
});

/**
 * Apply a pending operation
 */
export const applyOperation = mutation({
  args: {
    operationId: v.id('editOperations'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    if (operation.status !== 'pending') {
      throw new Error(
        `Cannot apply operation with status: ${operation.status}`,
      );
    }

    await ctx.db.patch(args.operationId, {
      status: 'applied',
    });

    return { success: true };
  },
});

/**
 * Reject an operation
 */
export const rejectOperation = mutation({
  args: {
    operationId: v.id('editOperations'),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    await ctx.db.patch(args.operationId, {
      status: 'rejected',
    });

    return { success: true };
  },
});

/**
 * Resolve a conflicted operation
 */
export const resolveConflict = mutation({
  args: {
    operationId: v.id('editOperations'),
    userId: v.string(),
    resolution: resolutionValidator,
  },
  handler: async (ctx, args) => {
    const operation = await ctx.db.get(args.operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    if (operation.status !== 'conflicted') {
      throw new Error('Operation is not in conflicted state');
    }

    const now = Date.now();
    const newStatus
      = args.resolution === 'accept_theirs' ? 'rejected' : 'applied';

    await ctx.db.patch(args.operationId, {
      status: newStatus,
      conflictResolution: {
        resolvedBy: args.userId,
        resolvedAt: now,
        resolution: args.resolution,
      },
    });

    return { success: true, finalStatus: newStatus };
  },
});

/**
 * Clean up old operations (keep last N days)
 */
export const cleanupOldOperations = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    daysToKeep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysToKeep = args.daysToKeep ?? 7;
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    const oldOperations = await ctx.db
      .query('editOperations')
      .withIndex('by_itinerary_timestamp', q =>
        q.eq('itineraryId', args.itineraryId))
      .filter(q => q.lt(q.field('timestamp'), cutoffTime))
      .collect();

    let deletedCount = 0;
    for (const op of oldOperations) {
      // Only delete applied or rejected operations
      if (op.status === 'applied' || op.status === 'rejected') {
        await ctx.db.delete(op._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
