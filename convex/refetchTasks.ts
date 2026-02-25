import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

/**
 * Content Refetch Tasks
 * Manages async tasks for fetching complete content when truncation is detected
 */

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

// ============================================================
// Queries
// ============================================================

// Get pending tasks ready for processing
export const getPendingTasks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const now = Date.now();

    // Get pending tasks that are ready (no nextRetryAt or nextRetryAt <= now)
    const tasks = await ctx.db
      .query("refetchTasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(limit * 2);

    // Filter by nextRetryAt
    const readyTasks = tasks.filter(
      (t) => !t.nextRetryAt || t.nextRetryAt <= now,
    );

    return readyTasks.slice(0, limit);
  },
});

// Get task by guide ID
export const getByGuideId = query({
  args: { guideId: v.id("travelGuides") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("refetchTasks")
      .withIndex("by_guide", (q) => q.eq("guideId", args.guideId))
      .first();
  },
});

// List tasks with filters
export const list = query({
  args: {
    status: v.optional(statusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.status) {
      return await ctx.db
        .query("refetchTasks")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("refetchTasks").order("desc").take(limit);
  },
});

// Get task statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("refetchTasks").collect();

    const stats = {
      total: allTasks.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    for (const task of allTasks) {
      stats[task.status]++;
    }

    return stats;
  },
});

// ============================================================
// Mutations
// ============================================================

// Create a new refetch task
export const create = mutation({
  args: {
    guideId: v.id("travelGuides"),
    sourceUrl: v.string(),
    sourceExternalId: v.string(),
    sourcePlatform: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if task already exists for this guide
    const existing = await ctx.db
      .query("refetchTasks")
      .withIndex("by_guide", (q) => q.eq("guideId", args.guideId))
      .first();

    if (existing) {
      // If completed or failed, we can create a new one
      if (existing.status === "completed" || existing.status === "failed") {
        await ctx.db.delete(existing._id);
      } else {
        // Task already pending or running
        return { id: existing._id, action: "existing" as const };
      }
    }

    const id = await ctx.db.insert("refetchTasks", {
      guideId: args.guideId,
      sourceUrl: args.sourceUrl,
      sourceExternalId: args.sourceExternalId,
      sourcePlatform: args.sourcePlatform,
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    });

    return { id, action: "created" as const };
  },
});

// Mark task as running
export const markRunning = mutation({
  args: { id: v.id("refetchTasks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "running",
      startedAt: Date.now(),
    });
  },
});

// Mark task as completed
export const markCompleted = mutation({
  args: { id: v.id("refetchTasks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: Date.now(),
      lastError: undefined,
    });
  },
});

// Mark task as failed with retry logic
export const markFailed = mutation({
  args: {
    id: v.id("refetchTasks"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return;

    const newRetryCount = task.retryCount + 1;
    const shouldRetry = newRetryCount < task.maxRetries;

    if (shouldRetry) {
      // Exponential backoff: 1min, 5min, 30min
      const delayMs = Math.min(
        60000 * 5 ** (newRetryCount - 1),
        30 * 60 * 1000,
      );
      const nextRetryAt = Date.now() + delayMs;

      await ctx.db.patch(args.id, {
        status: "pending",
        retryCount: newRetryCount,
        lastError: args.error,
        nextRetryAt,
      });
    } else {
      // Max retries reached
      await ctx.db.patch(args.id, {
        status: "failed",
        retryCount: newRetryCount,
        lastError: args.error,
        completedAt: Date.now(),
      });
    }

    return { retried: shouldRetry, retryCount: newRetryCount };
  },
});

// Delete a task
export const remove = mutation({
  args: { id: v.id("refetchTasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Batch delete completed tasks
export const cleanupCompleted = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanDays || 7) * 24 * 60 * 60 * 1000;

    const tasks = await ctx.db
      .query("refetchTasks")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    let deleted = 0;
    for (const task of tasks) {
      if (task.completedAt && task.completedAt < cutoff) {
        await ctx.db.delete(task._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

// ============================================================
// Internal Functions (for scheduled jobs)
// ============================================================

// Internal query to get pending tasks for processing
export const getPendingTasksInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const now = Date.now();

    const tasks = await ctx.db
      .query("refetchTasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(limit * 2);

    return tasks
      .filter((t) => !t.nextRetryAt || t.nextRetryAt <= now)
      .slice(0, limit);
  },
});

// Internal mutation to process refetch queue
export const processRefetchQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get pending tasks ready for processing
    // Rate limit: process max 5 tasks per interval to avoid overwhelming platforms
    const tasks = await ctx.db
      .query("refetchTasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(5);

    const readyTasks = tasks.filter(
      (t) => !t.nextRetryAt || t.nextRetryAt <= now,
    );

    if (readyTasks.length === 0) {
      return { processed: 0, message: "No pending tasks" };
    }

    // Group tasks by platform for rate limiting
    const tasksByPlatform = new Map<string, typeof readyTasks>();
    for (const task of readyTasks) {
      const platform = task.sourcePlatform;
      if (!tasksByPlatform.has(platform)) {
        tasksByPlatform.set(platform, []);
      }
      tasksByPlatform.get(platform)!.push(task);
    }

    // Apply per-platform rate limit: max 2 concurrent tasks per platform
    const tasksToProcess: typeof readyTasks = [];
    for (const [_platform, platformTasks] of tasksByPlatform) {
      tasksToProcess.push(...platformTasks.slice(0, 2));
    }

    // Mark tasks as running (actual crawling happens in external service)
    for (const task of tasksToProcess) {
      await ctx.db.patch(task._id, {
        status: "running",
        startedAt: Date.now(),
      });
    }

    return {
      processed: tasksToProcess.length,
      taskIds: tasksToProcess.map((t) => t._id),
      platformDistribution: Object.fromEntries(
        Array.from(tasksByPlatform.entries()).map(([p, t]) => [p, t.length]),
      ),
      message: `Marked ${tasksToProcess.length} tasks as running`,
    };
  },
});

// Internal mutation to cleanup old completed tasks
export const cleanupCompletedInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

    const tasks = await ctx.db
      .query("refetchTasks")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    let deleted = 0;
    for (const task of tasks) {
      if (task.completedAt && task.completedAt < cutoff) {
        await ctx.db.delete(task._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

// ============================================================
// Refetch Result Merge
// ============================================================

// Completeness level calculation (duplicated from travelGuides for internal use)
const MIN_CONTENT_LENGTH = 200;
const MIN_CONTENT_LENGTH_COMPLETE = 500;

const TRUNCATION_PATTERNS = [
  /\.{3}$/,
  /…$/,
  /\[查看更多\]$/,
  /\[展开全文\]$/,
  /\[阅读全文\]$/,
  /查看更多$/,
  /展开全文$/,
];

function isContentTruncated(content: string): boolean {
  return TRUNCATION_PATTERNS.some((pattern) => pattern.test(content));
}

function calculateCompletenessLevel(input: {
  title?: string;
  content?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  authorName?: string;
  destinations?: string[];
  contentTruncated?: boolean;
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;
}): "complete" | "usable" | "incomplete" {
  const {
    title,
    content,
    coverImageUrl,
    imageUrls,
    authorName,
    destinations,
    contentTruncated,
    likesCount,
    savesCount,
    commentsCount,
    viewsCount,
    qualityScore,
  } = input;

  const isTruncated =
    contentTruncated || (content ? isContentTruncated(content) : false);
  const hasImages = !!(coverImageUrl || (imageUrls && imageUrls.length > 0));
  const hasTitle = !!(title && title.trim().length > 0);
  const hasAuthor = !!(authorName && authorName.trim().length > 0);
  const hasDestinations = !!(destinations && destinations.length > 0);
  const contentLength = content?.length ?? 0;

  const hasAllCounts =
    likesCount !== undefined &&
    savesCount !== undefined &&
    commentsCount !== undefined &&
    viewsCount !== undefined;
  const hasQualityScore = qualityScore !== undefined;

  if (
    hasTitle &&
    hasImages &&
    hasAuthor &&
    hasDestinations &&
    hasAllCounts &&
    hasQualityScore &&
    contentLength >= MIN_CONTENT_LENGTH_COMPLETE &&
    !isTruncated
  ) {
    return "complete";
  }

  if (hasTitle && contentLength >= MIN_CONTENT_LENGTH && hasImages) {
    return "usable";
  }

  return "incomplete";
}

// Merge refetch result into original guide
export const mergeRefetchResult = mutation({
  args: {
    taskId: v.id("refetchTasks"),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    title: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const guide = await ctx.db.get(task.guideId);
    if (!guide) {
      // Guide was deleted, mark task as completed
      await ctx.db.patch(args.taskId, {
        status: "completed",
        completedAt: Date.now(),
        lastError: "Guide not found - may have been deleted",
      });
      return { success: false, reason: "guide_deleted" };
    }

    // Check if new content is still truncated
    const contentTruncated = isContentTruncated(args.content);

    // Merge data - prefer new data if provided
    const updatedData: Record<string, unknown> = {
      content: args.content,
      contentTruncated,
      crawledAt: Date.now(),
    };

    if (args.contentHtml) {
      updatedData.contentHtml = args.contentHtml;
    }

    if (args.title && !guide.title) {
      updatedData.title = args.title;
    }

    if (args.imageUrls && args.imageUrls.length > 0) {
      // Merge image URLs, avoiding duplicates
      const existingUrls = new Set(guide.imageUrls || []);
      const newUrls = args.imageUrls.filter((url) => !existingUrls.has(url));
      if (newUrls.length > 0) {
        updatedData.imageUrls = [...(guide.imageUrls || []), ...newUrls];
      }

      // Set cover image if missing
      if (!guide.coverImageUrl && args.imageUrls[0]) {
        updatedData.coverImageUrl = args.imageUrls[0];
      }
    }

    // Recalculate completeness level
    const newCompletenessLevel = calculateCompletenessLevel({
      title: (updatedData.title as string) || guide.title,
      content: args.content,
      coverImageUrl:
        (updatedData.coverImageUrl as string) || guide.coverImageUrl,
      imageUrls: (updatedData.imageUrls as string[]) || guide.imageUrls,
      authorName: guide.authorName,
      destinations: guide.destinations,
      contentTruncated,
      likesCount: guide.likesCount,
      savesCount: guide.savesCount,
      commentsCount: guide.commentsCount,
      viewsCount: guide.viewsCount,
      qualityScore: guide.qualityScore,
    });

    updatedData.completenessLevel = newCompletenessLevel;

    // Update guide
    await ctx.db.patch(task.guideId, updatedData);

    // Mark task as completed
    await ctx.db.patch(args.taskId, {
      status: "completed",
      completedAt: Date.now(),
      lastError: undefined,
    });

    return {
      success: true,
      guideId: task.guideId,
      previousCompletenessLevel: guide.completenessLevel,
      newCompletenessLevel,
      contentLengthBefore: guide.content?.length || 0,
      contentLengthAfter: args.content.length,
      stillTruncated: contentTruncated,
    };
  },
});
