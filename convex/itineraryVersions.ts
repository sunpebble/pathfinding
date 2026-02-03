import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Itinerary Versions - Version History Management
 * Provides automatic versioning, comparison, and restoration functionality
 */

// Validator for snapshot days
const snapshotDayValidator = v.object({
  dayNumber: v.number(),
  date: v.string(),
  items: v.array(
    v.object({
      poiId: v.id('pois'),
      orderIndex: v.number(),
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      transportMode: v.union(
        v.literal('walking'),
        v.literal('driving'),
        v.literal('transit'),
        v.literal('cycling'),
        v.literal('taxi'),
      ),
      notes: v.optional(v.string()),
    }),
  ),
});

const visibilityValidator = v.union(
  v.literal('private'),
  v.literal('team'),
  v.literal('public'),
);

const _snapshotValidator = v.object({
  title: v.string(),
  cityId: v.id('cities'),
  startDate: v.string(),
  endDate: v.string(),
  visibility: visibilityValidator,
  coverImageUrl: v.optional(v.string()),
  days: v.array(snapshotDayValidator),
});

const _changesCountValidator = v.object({
  daysAdded: v.number(),
  daysRemoved: v.number(),
  itemsAdded: v.number(),
  itemsRemoved: v.number(),
  itemsModified: v.number(),
});

/**
 * Check if user has permission to access itinerary versions
 */
async function checkVersionAccess(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>,
  userId: string,
): Promise<boolean> {
  const itinerary = await ctx.db.get(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Check if user is the owner
  if (itinerary.userId === userId) {
    return true;
  }

  // Check if user is a collaborator with edit permissions
  const collab = await ctx.db
    .query('itineraryCollaborators')
    .withIndex('by_itinerary_user', q =>
      q.eq('itineraryId', itineraryId).eq('userId', userId))
    .first();

  if (!collab) {
    throw new Error('You do not have access to this itinerary');
  }

  return true;
}

/**
 * Get the next version number for an itinerary
 */
async function getNextVersionNumber(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>,
): Promise<number> {
  const versions = await ctx.db
    .query('itineraryVersions')
    .withIndex('by_itinerary', q => q.eq('itineraryId', itineraryId))
    .collect();

  if (versions.length === 0) {
    return 1;
  }

  return Math.max(...versions.map(v => v.versionNumber)) + 1;
}

/**
 * Create a snapshot of the current itinerary state
 */
async function createItinerarySnapshot(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>,
) {
  const itinerary = await ctx.db.get(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Get all days
  const days = await ctx.db
    .query('itineraryDays')
    .withIndex('by_itinerary', q => q.eq('itineraryId', itineraryId))
    .collect();

  days.sort((a, b) => a.dayNumber - b.dayNumber);

  // Get all items for all days
  const daysWithItems = await Promise.all(
    days.map(async (day) => {
      const items = await ctx.db
        .query('itineraryItems')
        .withIndex('by_day', q => q.eq('dayId', day._id))
        .collect();

      items.sort((a, b) => a.orderIndex - b.orderIndex);

      return {
        dayNumber: day.dayNumber,
        date: day.date,
        items: items.map(item => ({
          poiId: item.poiId,
          orderIndex: item.orderIndex,
          startTime: item.startTime,
          endTime: item.endTime,
          transportMode: item.transportMode,
          notes: item.notes,
        })),
      };
    }),
  );

  return {
    title: itinerary.title,
    cityId: itinerary.cityId,
    startDate: itinerary.startDate,
    endDate: itinerary.endDate,
    visibility: itinerary.visibility,
    coverImageUrl: itinerary.coverImageUrl,
    days: daysWithItems,
  };
}

/**
 * Calculate changes between two snapshots
 */
function calculateChanges(
  oldSnapshot: {
    days: Array<{
      dayNumber: number;
      items: Array<{ poiId: Id<'pois'>; orderIndex: number }>;
    }>;
  },
  newSnapshot: {
    days: Array<{
      dayNumber: number;
      items: Array<{ poiId: Id<'pois'>; orderIndex: number }>;
    }>;
  },
) {
  const oldDayNumbers = new Set(oldSnapshot.days.map(d => d.dayNumber));
  const newDayNumbers = new Set(newSnapshot.days.map(d => d.dayNumber));

  let daysAdded = 0;
  let daysRemoved = 0;
  let itemsAdded = 0;
  let itemsRemoved = 0;
  const itemsModified = 0;

  // Count added and removed days
  for (const dayNum of newDayNumbers) {
    if (!oldDayNumbers.has(dayNum)) {
      daysAdded++;
    }
  }
  for (const dayNum of oldDayNumbers) {
    if (!newDayNumbers.has(dayNum)) {
      daysRemoved++;
    }
  }

  // Count item changes
  const oldItemsByDay = new Map<number, Set<string>>();
  const newItemsByDay = new Map<number, Set<string>>();

  for (const day of oldSnapshot.days) {
    oldItemsByDay.set(
      day.dayNumber,
      new Set(day.items.map(i => `${i.poiId}:${i.orderIndex}`)),
    );
  }
  for (const day of newSnapshot.days) {
    newItemsByDay.set(
      day.dayNumber,
      new Set(day.items.map(i => `${i.poiId}:${i.orderIndex}`)),
    );
  }

  // Compare items in matching days
  for (const dayNum of oldDayNumbers) {
    if (newDayNumbers.has(dayNum)) {
      const oldItems = oldItemsByDay.get(dayNum) || new Set();
      const newItems = newItemsByDay.get(dayNum) || new Set();

      for (const item of newItems) {
        if (!oldItems.has(item)) {
          itemsAdded++;
        }
      }
      for (const item of oldItems) {
        if (!newItems.has(item)) {
          itemsRemoved++;
        }
      }
    }
  }

  // Items in added days
  for (const dayNum of newDayNumbers) {
    if (!oldDayNumbers.has(dayNum)) {
      const newDay = newSnapshot.days.find(d => d.dayNumber === dayNum);
      if (newDay) {
        itemsAdded += newDay.items.length;
      }
    }
  }

  // Items in removed days
  for (const dayNum of oldDayNumbers) {
    if (!newDayNumbers.has(dayNum)) {
      const oldDay = oldSnapshot.days.find(d => d.dayNumber === dayNum);
      if (oldDay) {
        itemsRemoved += oldDay.items.length;
      }
    }
  }

  return {
    daysAdded,
    daysRemoved,
    itemsAdded,
    itemsRemoved,
    itemsModified,
  };
}

/**
 * Generate a summary of changes
 */
function generateChangesSummary(changes: {
  daysAdded: number;
  daysRemoved: number;
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
}): string {
  const parts: string[] = [];

  if (changes.daysAdded > 0) {
    parts.push(`新增 ${changes.daysAdded} 天`);
  }
  if (changes.daysRemoved > 0) {
    parts.push(`删除 ${changes.daysRemoved} 天`);
  }
  if (changes.itemsAdded > 0) {
    parts.push(`新增 ${changes.itemsAdded} 个景点`);
  }
  if (changes.itemsRemoved > 0) {
    parts.push(`删除 ${changes.itemsRemoved} 个景点`);
  }
  if (changes.itemsModified > 0) {
    parts.push(`修改 ${changes.itemsModified} 个景点`);
  }

  return parts.length > 0 ? parts.join('，') : '无变更';
}

// ============================================
// Queries
// ============================================

/**
 * List version history for an itinerary
 */
export const listByItinerary = query({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkVersionAccess(ctx, args.itineraryId, args.userId);

    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const versions = await ctx.db
      .query('itineraryVersions')
      .withIndex('by_itinerary', q => q.eq('itineraryId', args.itineraryId))
      .order('desc')
      .collect();

    const total = versions.length;
    const data = versions.slice(offset, offset + pageSize);

    // Enrich with user info (could be extended)
    const enriched = data.map(version => ({
      id: version._id,
      itineraryId: version.itineraryId,
      versionNumber: version.versionNumber,
      versionNote: version.versionNote,
      changesSummary: version.changesSummary,
      changesCount: version.changesCount,
      createdAt: version.createdAt,
      // Snapshot metadata (not full data for list)
      snapshotMeta: {
        title: version.snapshot.title,
        daysCount: version.snapshot.days.length,
        itemsCount: version.snapshot.days.reduce(
          (acc, day) => acc + day.items.length,
          0,
        ),
      },
    }));

    return { data: enriched, total };
  },
});

/**
 * Get a specific version with full snapshot
 */
export const getById = query({
  args: {
    versionId: v.id('itineraryVersions'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      return null;
    }

    await checkVersionAccess(ctx, version.itineraryId, args.userId);

    // Enrich POI data in the snapshot
    const enrichedDays = await Promise.all(
      version.snapshot.days.map(async (day) => {
        const enrichedItems = await Promise.all(
          day.items.map(async (item) => {
            const poi = await ctx.db.get(item.poiId);
            return {
              ...item,
              poi: poi
                ? {
                    id: poi._id,
                    name: poi.name,
                    category: poi.category,
                    address: poi.address,
                    latitude: poi.latitude,
                    longitude: poi.longitude,
                  }
                : null,
            };
          }),
        );
        return {
          ...day,
          items: enrichedItems,
        };
      }),
    );

    // Get city name
    const city = await ctx.db.get(version.snapshot.cityId);

    return {
      ...version,
      snapshot: {
        ...version.snapshot,
        cityName: city?.name,
        days: enrichedDays,
      },
    };
  },
});

/**
 * Compare two versions
 */
export const compare = query({
  args: {
    versionId1: v.id('itineraryVersions'),
    versionId2: v.id('itineraryVersions'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const version1 = await ctx.db.get(args.versionId1);
    const version2 = await ctx.db.get(args.versionId2);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    if (version1.itineraryId !== version2.itineraryId) {
      throw new Error('Versions must belong to the same itinerary');
    }

    await checkVersionAccess(ctx, version1.itineraryId, args.userId);

    // Calculate differences
    const older
      = version1.versionNumber < version2.versionNumber ? version1 : version2;
    const newer
      = version1.versionNumber < version2.versionNumber ? version2 : version1;

    const changes = calculateChanges(older.snapshot, newer.snapshot);

    // Build detailed diff
    const daysDiff: Array<{
      dayNumber: number;
      status: 'added' | 'removed' | 'modified' | 'unchanged';
      olderItemCount: number;
      newerItemCount: number;
    }> = [];

    const allDayNumbers = new Set([
      ...older.snapshot.days.map(d => d.dayNumber),
      ...newer.snapshot.days.map(d => d.dayNumber),
    ]);

    for (const dayNum of Array.from(allDayNumbers).sort((a, b) => a - b)) {
      const olderDay = older.snapshot.days.find(d => d.dayNumber === dayNum);
      const newerDay = newer.snapshot.days.find(d => d.dayNumber === dayNum);

      let status: 'added' | 'removed' | 'modified' | 'unchanged';
      if (!olderDay && newerDay) {
        status = 'added';
      }
      else if (olderDay && !newerDay) {
        status = 'removed';
      }
      else if (olderDay && newerDay) {
        const olderItems = JSON.stringify(olderDay.items);
        const newerItems = JSON.stringify(newerDay.items);
        status = olderItems === newerItems ? 'unchanged' : 'modified';
      }
      else {
        continue;
      }

      daysDiff.push({
        dayNumber: dayNum,
        status,
        olderItemCount: olderDay?.items.length ?? 0,
        newerItemCount: newerDay?.items.length ?? 0,
      });
    }

    return {
      olderVersion: {
        id: older._id,
        versionNumber: older.versionNumber,
        createdAt: older.createdAt,
        title: older.snapshot.title,
      },
      newerVersion: {
        id: newer._id,
        versionNumber: newer.versionNumber,
        createdAt: newer.createdAt,
        title: newer.snapshot.title,
      },
      changes,
      changesSummary: generateChangesSummary(changes),
      daysDiff,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Create a new version (auto-save current state)
 */
export const create = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    versionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkVersionAccess(ctx, args.itineraryId, args.userId);

    const snapshot = await createItinerarySnapshot(ctx, args.itineraryId);
    const versionNumber = await getNextVersionNumber(ctx, args.itineraryId);

    // Get previous version for comparison
    let changesCount;
    let changesSummary;

    if (versionNumber > 1) {
      const prevVersion = await ctx.db
        .query('itineraryVersions')
        .withIndex('by_itinerary_version', q =>
          q
            .eq('itineraryId', args.itineraryId)
            .eq('versionNumber', versionNumber - 1))
        .first();

      if (prevVersion) {
        changesCount = calculateChanges(prevVersion.snapshot, snapshot);
        changesSummary = generateChangesSummary(changesCount);
      }
    }

    const versionId = await ctx.db.insert('itineraryVersions', {
      itineraryId: args.itineraryId,
      userId: args.userId,
      versionNumber,
      versionNote: args.versionNote,
      snapshot,
      changesCount,
      changesSummary,
      createdAt: Date.now(),
    });

    return { id: versionId, versionNumber };
  },
});

/**
 * Update version note
 */
export const updateNote = mutation({
  args: {
    versionId: v.id('itineraryVersions'),
    userId: v.string(),
    versionNote: v.string(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    await checkVersionAccess(ctx, version.itineraryId, args.userId);

    await ctx.db.patch(args.versionId, {
      versionNote: args.versionNote,
    });

    return await ctx.db.get(args.versionId);
  },
});

/**
 * Restore itinerary to a specific version
 */
export const restore = mutation({
  args: {
    versionId: v.id('itineraryVersions'),
    userId: v.string(),
    createBackup: v.optional(v.boolean()), // Default true: create a version of current state before restore
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    await checkVersionAccess(ctx, version.itineraryId, args.userId);

    const createBackup = args.createBackup ?? true;

    // Optionally create a backup of current state
    if (createBackup) {
      const currentSnapshot = await createItinerarySnapshot(
        ctx,
        version.itineraryId,
      );
      const backupVersionNumber = await getNextVersionNumber(
        ctx,
        version.itineraryId,
      );

      await ctx.db.insert('itineraryVersions', {
        itineraryId: version.itineraryId,
        userId: args.userId,
        versionNumber: backupVersionNumber,
        versionNote: `恢复到版本 ${version.versionNumber} 前的自动备份`,
        snapshot: currentSnapshot,
        createdAt: Date.now(),
      });
    }

    // Restore the itinerary
    const snapshot = version.snapshot;

    // Update itinerary basic info
    await ctx.db.patch(version.itineraryId, {
      title: snapshot.title,
      cityId: snapshot.cityId,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      visibility: snapshot.visibility,
      coverImageUrl: snapshot.coverImageUrl,
    });

    // Delete existing days and items
    const existingDays = await ctx.db
      .query('itineraryDays')
      .withIndex('by_itinerary', q =>
        q.eq('itineraryId', version.itineraryId))
      .collect();

    for (const day of existingDays) {
      const items = await ctx.db
        .query('itineraryItems')
        .withIndex('by_day', q => q.eq('dayId', day._id))
        .collect();

      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      await ctx.db.delete(day._id);
    }

    // Recreate days and items from snapshot
    for (const snapshotDay of snapshot.days) {
      const dayId = await ctx.db.insert('itineraryDays', {
        itineraryId: version.itineraryId,
        dayNumber: snapshotDay.dayNumber,
        date: snapshotDay.date,
      });

      for (const item of snapshotDay.items) {
        await ctx.db.insert('itineraryItems', {
          dayId,
          poiId: item.poiId,
          orderIndex: item.orderIndex,
          startTime: item.startTime,
          endTime: item.endTime,
          transportMode: item.transportMode,
          notes: item.notes,
        });
      }
    }

    return { success: true, restoredToVersion: version.versionNumber };
  },
});

/**
 * Delete a specific version
 */
export const remove = mutation({
  args: {
    versionId: v.id('itineraryVersions'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    await checkVersionAccess(ctx, version.itineraryId, args.userId);

    // Don't allow deleting the only version
    const allVersions = await ctx.db
      .query('itineraryVersions')
      .withIndex('by_itinerary', q =>
        q.eq('itineraryId', version.itineraryId))
      .collect();

    if (allVersions.length <= 1) {
      throw new Error('Cannot delete the only remaining version');
    }

    await ctx.db.delete(args.versionId);

    return { success: true };
  },
});

/**
 * Clean up old versions (keep only the most recent N versions)
 */
export const cleanup = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    keepCount: v.optional(v.number()), // Default 10
  },
  handler: async (ctx, args) => {
    await checkVersionAccess(ctx, args.itineraryId, args.userId);

    const keepCount = args.keepCount ?? 10;

    const versions = await ctx.db
      .query('itineraryVersions')
      .withIndex('by_itinerary', q => q.eq('itineraryId', args.itineraryId))
      .order('desc')
      .collect();

    if (versions.length <= keepCount) {
      return { deleted: 0, remaining: versions.length };
    }

    const toDelete = versions.slice(keepCount);
    for (const version of toDelete) {
      await ctx.db.delete(version._id);
    }

    return { deleted: toDelete.length, remaining: keepCount };
  },
});

/**
 * Get version count for an itinerary
 */
export const getVersionCount = query({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkVersionAccess(ctx, args.itineraryId, args.userId);

    const versions = await ctx.db
      .query('itineraryVersions')
      .withIndex('by_itinerary', q => q.eq('itineraryId', args.itineraryId))
      .collect();

    return {
      count: versions.length,
      latestVersion:
        versions.length > 0
          ? Math.max(...versions.map(v => v.versionNumber))
          : 0,
    };
  },
});
