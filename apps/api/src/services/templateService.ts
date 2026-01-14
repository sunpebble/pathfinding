/**
 * Template Service - Convex Implementation
 * CRUD operations for itinerary templates
 */

import type { Id } from '../lib/convex';
import type {
  CreateFromTemplateInput,
  CreateTemplateInput,
  SaveAsTemplateInput,
  UpdateTemplateInput,
} from '../models/template';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface TemplateListQuery {
  categoryId?: string;
  page: number;
  pageSize: number;
  sortBy: 'popular' | 'newest' | 'most_used';
}

export interface TemplateSearchQuery {
  query: string;
  page: number;
  pageSize: number;
}

export interface UserTemplateListQuery {
  page: number;
  pageSize: number;
}

/**
 * Template service for CRUD operations
 */
export const TemplateService = {
  // ============================================
  // Categories
  // ============================================

  /**
   * List all active template categories
   */
  async listCategories() {
    const categories = await convex.query(api.itineraryTemplates.listCategories, {});
    return categories;
  },

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string) {
    const category = await convex.query(api.itineraryTemplates.getCategoryById, {
      id: categoryId as Id<'templateCategories'>,
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  },

  /**
   * Create a new category (admin only)
   */
  async createCategory(input: {
    name: string;
    nameEn?: string;
    icon: string;
    description?: string;
    sortOrder: number;
  }) {
    const categoryId = await convex.mutation(api.itineraryTemplates.createCategory, input);
    return { id: categoryId };
  },

  /**
   * Update a category
   */
  async updateCategory(
    categoryId: string,
    input: {
      name?: string;
      nameEn?: string;
      icon?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) {
    const category = await convex.mutation(api.itineraryTemplates.updateCategory, {
      id: categoryId as Id<'templateCategories'>,
      ...input,
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  },

  // ============================================
  // Public Templates
  // ============================================

  /**
   * List public templates with optional filters
   */
  async listPublic(query: TemplateListQuery) {
    const result = await convex.query(api.itineraryTemplates.listPublicTemplates, {
      categoryId: query.categoryId as Id<'templateCategories'> | undefined,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
    });

    return result;
  },

  /**
   * Search templates
   */
  async search(query: TemplateSearchQuery) {
    const result = await convex.query(api.itineraryTemplates.searchTemplates, {
      query: query.query,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Get recommended templates
   */
  async getRecommended(limit?: number) {
    const templates = await convex.query(api.itineraryTemplates.getRecommendedTemplates, {
      limit,
    });

    return templates;
  },

  /**
   * Get template by ID
   */
  async getById(templateId: string, userId?: string) {
    const template = await convex.query(api.itineraryTemplates.getTemplateWithUserStatus, {
      id: templateId as Id<'itineraryTemplates'>,
      userId,
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Increment view count (fire and forget)
    convex.mutation(api.itineraryTemplates.incrementViewCount, {
      id: templateId as Id<'itineraryTemplates'>,
    }).catch(() => {
      // Ignore errors for view count
    });

    return template;
  },

  // ============================================
  // User Templates
  // ============================================

  /**
   * List user's own templates
   */
  async listUserTemplates(userId: string, query: UserTemplateListQuery) {
    const result = await convex.query(api.itineraryTemplates.listUserTemplates, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * List user's saved templates
   */
  async listSavedTemplates(userId: string, query: UserTemplateListQuery) {
    const result = await convex.query(api.itineraryTemplates.listSavedTemplates, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Create a new template
   */
  async create(userId: string, userName: string, input: CreateTemplateInput) {
    const templateId = await convex.mutation(api.itineraryTemplates.createTemplate, {
      ...input,
      categoryId: input.categoryId as Id<'templateCategories'>,
      templateType: 'user',
      creatorId: userId,
      creatorName: userName,
    });

    return { id: templateId };
  },

  /**
   * Update a template
   */
  async update(templateId: string, userId: string, input: UpdateTemplateInput) {
    // Filter out null values
    const sanitizedInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== null && value !== undefined) {
        sanitizedInput[key] = value;
      }
    }

    // Handle categoryId conversion
    if (sanitizedInput.categoryId) {
      sanitizedInput.categoryId = sanitizedInput.categoryId as Id<'templateCategories'>;
    }

    const template = await convex.mutation(api.itineraryTemplates.updateTemplate, {
      id: templateId as Id<'itineraryTemplates'>,
      userId,
      ...sanitizedInput,
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    return template;
  },

  /**
   * Delete a template
   */
  async delete(templateId: string, userId: string) {
    await convex.mutation(api.itineraryTemplates.deleteTemplate, {
      id: templateId as Id<'itineraryTemplates'>,
      userId,
    });
  },

  // ============================================
  // Interactions
  // ============================================

  /**
   * Toggle like on a template
   */
  async toggleLike(templateId: string, userId: string) {
    const result = await convex.mutation(api.itineraryTemplates.toggleLike, {
      templateId: templateId as Id<'itineraryTemplates'>,
      userId,
    });

    return result;
  },

  /**
   * Toggle save on a template
   */
  async toggleSave(templateId: string, userId: string) {
    const result = await convex.mutation(api.itineraryTemplates.toggleSave, {
      templateId: templateId as Id<'itineraryTemplates'>,
      userId,
    });

    return result;
  },

  // ============================================
  // Template Usage
  // ============================================

  /**
   * Create an itinerary from a template
   */
  async createItineraryFromTemplate(
    templateId: string,
    userId: string,
    input: CreateFromTemplateInput
  ) {
    const itineraryId = await convex.mutation(
      api.itineraryTemplates.createItineraryFromTemplate,
      {
        templateId: templateId as Id<'itineraryTemplates'>,
        userId,
        title: input.title,
        cityId: input.cityId as Id<'cities'>,
        startDate: input.startDate,
        endDate: input.endDate,
      }
    );

    return { id: itineraryId };
  },

  /**
   * Save an existing itinerary as a template
   */
  async saveItineraryAsTemplate(
    itineraryId: string,
    userId: string,
    input: SaveAsTemplateInput
  ) {
    const templateId = await convex.mutation(
      api.itineraryTemplates.saveItineraryAsTemplate,
      {
        itineraryId: itineraryId as Id<'itineraries'>,
        userId,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId as Id<'templateCategories'>,
        tags: input.tags,
        visibility: input.visibility,
      }
    );

    return { id: templateId };
  },
};
