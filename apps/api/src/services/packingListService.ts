/**
 * Packing List Service - Convex Implementation
 * CRUD operations for smart packing lists
 */

import type { Id } from '../lib/convex';
import type {
  AddPackingItemInput,
  BulkAddItemsInput,
  CreatePackingListInput,
  CreateTemplateFromListInput,
  PackingListQuery,
  TemplateQuery,
  UpdatePackingItemInput,
  UpdatePackingListInput,
  WeatherInfo,
} from '../models/packingList';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

/**
 * Packing List service for CRUD operations
 */
export const PackingListService = {
  // ============================================
  // Packing Lists
  // ============================================

  /**
   * Create a new packing list
   */
  async create(
    userId: string,
    input: CreatePackingListInput,
    _accessToken: string
  ) {
    const listId = await convex.mutation(api.packingLists.create, {
      userId,
      title: input.title,
      itineraryId: input.itineraryId as Id<'itineraries'> | undefined,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      tripType: input.tripType,
      templateId: input.templateId as Id<'packingTemplates'> | undefined,
    });

    // Fetch the created list
    const list = await convex.query(api.packingLists.getById, {
      id: listId,
      userId,
    });

    return list;
  },

  /**
   * List packing lists for a user with pagination
   */
  async list(userId: string, query: PackingListQuery, _accessToken: string) {
    const result = await convex.query(api.packingLists.listByUser, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Get a single packing list by ID with all items
   */
  async getById(listId: string, userId: string, _accessToken: string) {
    const list = await convex.query(api.packingLists.getById, {
      id: listId as Id<'packingLists'>,
      userId,
    });

    if (!list) {
      throw new NotFoundError('Packing list not found');
    }

    return list;
  },

  /**
   * Get a packing list by share code (no auth required)
   */
  async getByShareCode(shareCode: string) {
    const list = await convex.query(api.packingLists.getByShareCode, {
      shareCode,
    });

    if (!list) {
      throw new NotFoundError('Packing list not found');
    }

    return list;
  },

  /**
   * Update a packing list
   */
  async update(
    listId: string,
    userId: string,
    input: UpdatePackingListInput,
    _accessToken: string
  ) {
    const updatedList = await convex.mutation(api.packingLists.update, {
      id: listId as Id<'packingLists'>,
      userId,
      title: input.title ?? undefined,
      destination: input.destination ?? undefined,
      startDate: input.startDate ?? undefined,
      endDate: input.endDate ?? undefined,
      tripType: input.tripType ?? undefined,
      isPublic: input.isPublic,
      weatherInfo: input.weatherInfo as WeatherInfo | undefined,
    });

    return updatedList;
  },

  /**
   * Delete a packing list
   */
  async delete(listId: string, userId: string, _accessToken: string) {
    await convex.mutation(api.packingLists.remove, {
      id: listId as Id<'packingLists'>,
      userId,
    });
  },

  /**
   * Generate or regenerate a share code
   */
  async generateShareCode(listId: string, userId: string, _accessToken: string) {
    const shareCode = await convex.mutation(api.packingLists.generateShareCode, {
      id: listId as Id<'packingLists'>,
      userId,
    });

    return shareCode;
  },

  /**
   * Add a user to the shared list
   */
  async addSharedUser(
    listId: string,
    userId: string,
    sharedUserId: string,
    _accessToken: string
  ) {
    await convex.mutation(api.packingLists.addSharedUser, {
      id: listId as Id<'packingLists'>,
      userId,
      sharedUserId,
    });
  },

  /**
   * Remove a user from the shared list
   */
  async removeSharedUser(
    listId: string,
    userId: string,
    sharedUserId: string,
    _accessToken: string
  ) {
    await convex.mutation(api.packingLists.removeSharedUser, {
      id: listId as Id<'packingLists'>,
      userId,
      sharedUserId,
    });
  },

  // ============================================
  // Packing Items
  // ============================================

  /**
   * Add an item to a packing list
   */
  async addItem(
    listId: string,
    userId: string,
    input: AddPackingItemInput,
    _accessToken: string
  ) {
    const itemId = await convex.mutation(api.packingLists.addItem, {
      packingListId: listId as Id<'packingLists'>,
      userId,
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      isEssential: input.isEssential,
      suggestedBy: input.suggestedBy,
      notes: input.notes,
    });

    return itemId;
  },

  /**
   * Update an item
   */
  async updateItem(
    itemId: string,
    userId: string,
    input: UpdatePackingItemInput,
    _accessToken: string
  ) {
    const updatedItem = await convex.mutation(api.packingLists.updateItem, {
      id: itemId as Id<'packingItems'>,
      userId,
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      isEssential: input.isEssential,
      notes: input.notes ?? undefined,
    });

    return updatedItem;
  },

  /**
   * Toggle item packed status
   */
  async toggleItemPacked(itemId: string, userId: string, _accessToken: string) {
    const newStatus = await convex.mutation(api.packingLists.toggleItemPacked, {
      id: itemId as Id<'packingItems'>,
      userId,
    });

    return newStatus;
  },

  /**
   * Delete an item
   */
  async deleteItem(itemId: string, userId: string, _accessToken: string) {
    await convex.mutation(api.packingLists.removeItem, {
      id: itemId as Id<'packingItems'>,
      userId,
    });
  },

  /**
   * Bulk add items (for AI/weather suggestions)
   */
  async addItemsBulk(
    listId: string,
    userId: string,
    input: BulkAddItemsInput,
    _accessToken: string
  ) {
    const itemIds = await convex.mutation(api.packingLists.addItemsBulk, {
      packingListId: listId as Id<'packingLists'>,
      userId,
      items: input.items.map((item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        isEssential: item.isEssential,
        suggestedBy: item.suggestedBy,
        notes: item.notes,
      })),
    });

    return itemIds;
  },

  // ============================================
  // Templates
  // ============================================

  /**
   * List system templates
   */
  async listSystemTemplates(tripType?: string) {
    const templates = await convex.query(api.packingLists.listSystemTemplates, {
      tripType: tripType as any,
    });

    return templates;
  },

  /**
   * List public templates with pagination
   */
  async listPublicTemplates(query: TemplateQuery) {
    const result = await convex.query(api.packingLists.listPublicTemplates, {
      tripType: query.tripType,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string) {
    const template = await convex.query(api.packingLists.getTemplateById, {
      id: templateId as Id<'packingTemplates'>,
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    return template;
  },

  /**
   * Create a template from an existing list
   */
  async createTemplateFromList(
    listId: string,
    userId: string,
    input: CreateTemplateFromListInput,
    _accessToken: string
  ) {
    const templateId = await convex.mutation(api.packingLists.createTemplateFromList, {
      packingListId: listId as Id<'packingLists'>,
      userId,
      name: input.name,
      description: input.description,
      isPublic: input.isPublic,
    });

    // Fetch the created template
    const template = await convex.query(api.packingLists.getTemplateById, {
      id: templateId,
    });

    return template;
  },

  /**
   * Update a user template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    input: { name?: string; description?: string; isPublic?: boolean },
    _accessToken: string
  ) {
    const updatedTemplate = await convex.mutation(api.packingLists.updateTemplate, {
      id: templateId as Id<'packingTemplates'>,
      userId,
      name: input.name,
      description: input.description,
      isPublic: input.isPublic,
    });

    return updatedTemplate;
  },

  /**
   * Delete a user template
   */
  async deleteTemplate(templateId: string, userId: string, _accessToken: string) {
    await convex.mutation(api.packingLists.removeTemplate, {
      id: templateId as Id<'packingTemplates'>,
      userId,
    });
  },
};
