import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Packing Lists - Smart Packing List Management
 */

// Validators
const tripTypeValidator = v.union(
  v.literal('leisure'),
  v.literal('business'),
  v.literal('adventure'),
  v.literal('beach'),
  v.literal('ski'),
  v.literal('city'),
  v.literal('hiking'),
  v.literal('other')
);

const categoryValidator = v.union(
  v.literal('clothing'),
  v.literal('toiletries'),
  v.literal('electronics'),
  v.literal('documents'),
  v.literal('medicine'),
  v.literal('accessories'),
  v.literal('gear'),
  v.literal('snacks'),
  v.literal('other')
);

const suggestedByValidator = v.union(
  v.literal('user'),
  v.literal('weather'),
  v.literal('activity'),
  v.literal('template'),
  v.literal('ai')
);

/**
 * Permission checking helpers
 */

// Check if user can view the packing list
async function checkViewPermission(
  ctx: QueryCtx | MutationCtx,
  listId: Id<'packingLists'>,
  userId: string
): Promise<boolean> {
  const list = await ctx.db.get(listId);
  if (!list) {
    throw new Error('Packing list not found');
  }

  // Owner can always view
  if (list.userId === userId) {
    return true;
  }

  // Check if list is public
  if (list.isPublic) {
    return true;
  }

  // Check if user is in sharedWith
  if (list.sharedWith?.includes(userId)) {
    return true;
  }

  throw new Error('You do not have access to this packing list');
}

// Check if user can edit the packing list
async function checkEditPermission(
  ctx: QueryCtx | MutationCtx,
  listId: Id<'packingLists'>,
  userId: string
): Promise<boolean> {
  const list = await ctx.db.get(listId);
  if (!list) {
    throw new Error('Packing list not found');
  }

  // Owner can always edit
  if (list.userId === userId) {
    return true;
  }

  // Shared users can edit
  if (list.sharedWith?.includes(userId)) {
    return true;
  }

  throw new Error('You do not have edit permissions for this packing list');
}

// Generate a unique share code
function createShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// Packing List Queries
// ============================================

// List packing lists for a user
export const listByUser = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const lists = await ctx.db
      .query('packingLists')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    const total = lists.length;
    const data = lists.slice(offset, offset + pageSize);

    // Enrich with item counts
    const enriched = await Promise.all(
      data.map(async (list) => {
        const items = await ctx.db
          .query('packingItems')
          .withIndex('by_list', (q) => q.eq('packingListId', list._id))
          .collect();

        const packedCount = items.filter((i) => i.isPacked).length;
        const totalItems = items.length;

        return {
          ...list,
          itemsCount: totalItems,
          packedCount,
          progress:
            totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0,
        };
      })
    );

    return { data: enriched, total };
  },
});

// Get packing list by ID with all items
export const getById = query({
  args: {
    id: v.id('packingLists'),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.id);
    if (!list) return null;

    // Check view permission if userId provided
    if (args.userId) {
      await checkViewPermission(ctx, args.id, args.userId);
    }

    // Get all items
    const items = await ctx.db
      .query('packingItems')
      .withIndex('by_list', (q) => q.eq('packingListId', args.id))
      .collect();

    // Group items by category
    const itemsByCategory: Record<string, typeof items> = {};
    for (const item of items) {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    }

    // Sort items within each category by orderIndex
    for (const category of Object.keys(itemsByCategory)) {
      itemsByCategory[category].sort((a, b) => a.orderIndex - b.orderIndex);
    }

    const packedCount = items.filter((i) => i.isPacked).length;
    const totalItems = items.length;

    // Get linked itinerary info if available
    let itinerary = null;
    if (list.itineraryId) {
      itinerary = await ctx.db.get(list.itineraryId);
    }

    return {
      ...list,
      items,
      itemsByCategory,
      itemsCount: totalItems,
      packedCount,
      progress:
        totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0,
      itinerary: itinerary
        ? {
            id: itinerary._id,
            title: itinerary.title,
            startDate: itinerary.startDate,
            endDate: itinerary.endDate,
          }
        : null,
    };
  },
});

// Get packing list by share code
export const getByShareCode = query({
  args: {
    shareCode: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query('packingLists')
      .withIndex('by_share_code', (q) => q.eq('shareCode', args.shareCode))
      .first();

    if (!list) return null;

    // Get all items
    const items = await ctx.db
      .query('packingItems')
      .withIndex('by_list', (q) => q.eq('packingListId', list._id))
      .collect();

    // Group items by category
    const itemsByCategory: Record<string, typeof items> = {};
    for (const item of items) {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    }

    // Sort items within each category by orderIndex
    for (const category of Object.keys(itemsByCategory)) {
      itemsByCategory[category].sort((a, b) => a.orderIndex - b.orderIndex);
    }

    const packedCount = items.filter((i) => i.isPacked).length;
    const totalItems = items.length;

    return {
      ...list,
      items,
      itemsByCategory,
      itemsCount: totalItems,
      packedCount,
      progress:
        totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0,
    };
  },
});

// ============================================
// Packing List Mutations
// ============================================

// Create a new packing list
export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    itineraryId: v.optional(v.id('itineraries')),
    destination: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    tripType: v.optional(tripTypeValidator),
    templateId: v.optional(v.id('packingTemplates')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the packing list
    const listId = await ctx.db.insert('packingLists', {
      userId: args.userId,
      title: args.title,
      itineraryId: args.itineraryId,
      destination: args.destination,
      startDate: args.startDate,
      endDate: args.endDate,
      tripType: args.tripType,
      templateId: args.templateId,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });

    // If a template was specified, copy items from it
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (template) {
        // Increment template usage count
        await ctx.db.patch(args.templateId, {
          usageCount: template.usageCount + 1,
          updatedAt: now,
        });

        // Add items from template
        let orderIndex = 0;
        for (const templateItem of template.items) {
          await ctx.db.insert('packingItems', {
            packingListId: listId,
            name: templateItem.name,
            category: templateItem.category as any,
            quantity: templateItem.quantity,
            isPacked: false,
            isEssential: templateItem.isEssential,
            suggestedBy: 'template',
            orderIndex: orderIndex++,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return listId;
  },
});

// Update a packing list
export const update = mutation({
  args: {
    id: v.id('packingLists'),
    userId: v.string(),
    title: v.optional(v.string()),
    destination: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    tripType: v.optional(tripTypeValidator),
    isPublic: v.optional(v.boolean()),
    weatherInfo: v.optional(
      v.object({
        avgTemp: v.optional(v.number()),
        condition: v.optional(v.string()),
        humidity: v.optional(v.number()),
        fetchedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.id, args.userId);

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Delete a packing list
export const remove = mutation({
  args: {
    id: v.id('packingLists'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error('Packing list not found');
    }

    // Only owner can delete
    if (list.userId !== args.userId) {
      throw new Error('Only the owner can delete this packing list');
    }

    // Delete all items
    const items = await ctx.db
      .query('packingItems')
      .withIndex('by_list', (q) => q.eq('packingListId', args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete the list
    await ctx.db.delete(args.id);
  },
});

// Generate or regenerate share code
export const generateShareCode = mutation({
  args: {
    id: v.id('packingLists'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error('Packing list not found');
    }

    if (list.userId !== args.userId) {
      throw new Error('Only the owner can generate share codes');
    }

    const shareCode = createShareCode();
    await ctx.db.patch(args.id, {
      shareCode,
      updatedAt: Date.now(),
    });

    return shareCode;
  },
});

// Add a user to the shared list
export const addSharedUser = mutation({
  args: {
    id: v.id('packingLists'),
    userId: v.string(),
    sharedUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error('Packing list not found');
    }

    if (list.userId !== args.userId) {
      throw new Error('Only the owner can share this list');
    }

    const currentShared = list.sharedWith ?? [];
    if (!currentShared.includes(args.sharedUserId)) {
      await ctx.db.patch(args.id, {
        sharedWith: [...currentShared, args.sharedUserId],
        updatedAt: Date.now(),
      });
    }
  },
});

// Remove a user from the shared list
export const removeSharedUser = mutation({
  args: {
    id: v.id('packingLists'),
    userId: v.string(),
    sharedUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error('Packing list not found');
    }

    if (list.userId !== args.userId) {
      throw new Error('Only the owner can manage sharing');
    }

    const currentShared = list.sharedWith ?? [];
    await ctx.db.patch(args.id, {
      sharedWith: currentShared.filter((id) => id !== args.sharedUserId),
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// Packing Items Mutations
// ============================================

// Add an item to a packing list
export const addItem = mutation({
  args: {
    packingListId: v.id('packingLists'),
    userId: v.string(),
    name: v.string(),
    category: categoryValidator,
    quantity: v.optional(v.number()),
    isEssential: v.optional(v.boolean()),
    suggestedBy: v.optional(suggestedByValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.packingListId, args.userId);

    // Get the current max orderIndex for this category
    const existingItems = await ctx.db
      .query('packingItems')
      .withIndex('by_list_category', (q) =>
        q.eq('packingListId', args.packingListId).eq('category', args.category)
      )
      .collect();

    const maxOrderIndex = existingItems.reduce(
      (max, item) => Math.max(max, item.orderIndex),
      -1
    );

    const now = Date.now();
    const itemId = await ctx.db.insert('packingItems', {
      packingListId: args.packingListId,
      name: args.name,
      category: args.category,
      quantity: args.quantity ?? 1,
      isPacked: false,
      isEssential: args.isEssential ?? false,
      suggestedBy: args.suggestedBy ?? 'user',
      notes: args.notes,
      orderIndex: maxOrderIndex + 1,
      createdAt: now,
      updatedAt: now,
    });

    // Update list's updatedAt
    await ctx.db.patch(args.packingListId, {
      updatedAt: now,
    });

    return itemId;
  },
});

// Update an item
export const updateItem = mutation({
  args: {
    id: v.id('packingItems'),
    userId: v.string(),
    name: v.optional(v.string()),
    category: v.optional(categoryValidator),
    quantity: v.optional(v.number()),
    isEssential: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error('Item not found');
    }

    await checkEditPermission(ctx, item.packingListId, args.userId);

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    const now = Date.now();
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now,
    });

    // Update list's updatedAt
    await ctx.db.patch(item.packingListId, {
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

// Toggle item packed status
export const toggleItemPacked = mutation({
  args: {
    id: v.id('packingItems'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error('Item not found');
    }

    await checkEditPermission(ctx, item.packingListId, args.userId);

    const now = Date.now();
    const newPackedStatus = !item.isPacked;

    await ctx.db.patch(args.id, {
      isPacked: newPackedStatus,
      packedAt: newPackedStatus ? now : undefined,
      packedBy: newPackedStatus ? args.userId : undefined,
      updatedAt: now,
    });

    // Update list's updatedAt
    await ctx.db.patch(item.packingListId, {
      updatedAt: now,
    });

    return newPackedStatus;
  },
});

// Delete an item
export const removeItem = mutation({
  args: {
    id: v.id('packingItems'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error('Item not found');
    }

    await checkEditPermission(ctx, item.packingListId, args.userId);

    await ctx.db.delete(args.id);

    // Update list's updatedAt
    await ctx.db.patch(item.packingListId, {
      updatedAt: Date.now(),
    });
  },
});

// Bulk add items (for AI/weather suggestions)
export const addItemsBulk = mutation({
  args: {
    packingListId: v.id('packingLists'),
    userId: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        category: categoryValidator,
        quantity: v.optional(v.number()),
        isEssential: v.optional(v.boolean()),
        suggestedBy: v.optional(suggestedByValidator),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.packingListId, args.userId);

    const now = Date.now();
    const addedIds: Id<'packingItems'>[] = [];

    // Group items by category and find max orderIndex for each
    const categoryMaxIndex: Record<string, number> = {};

    for (const newItem of args.items) {
      if (categoryMaxIndex[newItem.category] === undefined) {
        const existingItems = await ctx.db
          .query('packingItems')
          .withIndex('by_list_category', (q) =>
            q
              .eq('packingListId', args.packingListId)
              .eq('category', newItem.category)
          )
          .collect();

        categoryMaxIndex[newItem.category] = existingItems.reduce(
          (max, item) => Math.max(max, item.orderIndex),
          -1
        );
      }

      categoryMaxIndex[newItem.category]++;

      const itemId = await ctx.db.insert('packingItems', {
        packingListId: args.packingListId,
        name: newItem.name,
        category: newItem.category,
        quantity: newItem.quantity ?? 1,
        isPacked: false,
        isEssential: newItem.isEssential ?? false,
        suggestedBy: newItem.suggestedBy ?? 'user',
        notes: newItem.notes,
        orderIndex: categoryMaxIndex[newItem.category],
        createdAt: now,
        updatedAt: now,
      });

      addedIds.push(itemId);
    }

    // Update list's updatedAt
    await ctx.db.patch(args.packingListId, {
      updatedAt: now,
    });

    return addedIds;
  },
});

// ============================================
// Packing Templates Queries
// ============================================

// List system templates
export const listSystemTemplates = query({
  args: {
    tripType: v.optional(tripTypeValidator),
  },
  handler: async (ctx, args) => {
    let templates;

    if (args.tripType) {
      templates = await ctx.db
        .query('packingTemplates')
        .withIndex('by_trip_type', (q) => q.eq('tripType', args.tripType!))
        .filter((q) => q.eq(q.field('isSystem'), true))
        .collect();
    } else {
      templates = await ctx.db
        .query('packingTemplates')
        .withIndex('by_system', (q) => q.eq('isSystem', true))
        .collect();
    }

    return templates;
  },
});

// List public templates
export const listPublicTemplates = query({
  args: {
    tripType: v.optional(tripTypeValidator),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let templates;

    if (args.tripType) {
      templates = await ctx.db
        .query('packingTemplates')
        .withIndex('by_trip_type', (q) => q.eq('tripType', args.tripType!))
        .filter((q) => q.eq(q.field('isPublic'), true))
        .collect();
    } else {
      templates = await ctx.db
        .query('packingTemplates')
        .withIndex('by_public', (q) => q.eq('isPublic', true))
        .collect();
    }

    // Sort by usage count (popularity)
    templates.sort((a, b) => b.usageCount - a.usageCount);

    const total = templates.length;
    const data = templates.slice(offset, offset + pageSize);

    return { data, total };
  },
});

// Get template by ID
export const getTemplateById = query({
  args: {
    id: v.id('packingTemplates'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================
// Packing Templates Mutations
// ============================================

// Create a user template from an existing list
export const createTemplateFromList = mutation({
  args: {
    packingListId: v.id('packingLists'),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.packingListId);
    if (!list) {
      throw new Error('Packing list not found');
    }

    if (list.userId !== args.userId) {
      throw new Error('Only the owner can create a template from this list');
    }

    // Get all items from the list
    const items = await ctx.db
      .query('packingItems')
      .withIndex('by_list', (q) => q.eq('packingListId', args.packingListId))
      .collect();

    const now = Date.now();

    const templateId = await ctx.db.insert('packingTemplates', {
      name: args.name,
      description: args.description,
      tripType: list.tripType ?? 'other',
      items: items.map((item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        isEssential: item.isEssential,
      })),
      usageCount: 0,
      isSystem: false,
      createdBy: args.userId,
      isPublic: args.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

// Update a user template
export const updateTemplate = mutation({
  args: {
    id: v.id('packingTemplates'),
    userId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isSystem) {
      throw new Error('Cannot modify system templates');
    }

    if (template.createdBy !== args.userId) {
      throw new Error('Only the creator can modify this template');
    }

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Delete a user template
export const removeTemplate = mutation({
  args: {
    id: v.id('packingTemplates'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isSystem) {
      throw new Error('Cannot delete system templates');
    }

    if (template.createdBy !== args.userId) {
      throw new Error('Only the creator can delete this template');
    }

    await ctx.db.delete(args.id);
  },
});
