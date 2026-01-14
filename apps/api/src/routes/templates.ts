/**
 * Template Routes - API endpoints for itinerary templates
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  CreateCategorySchema,
  CreateFromTemplateSchema,
  CreateTemplateSchema,
  SaveAsTemplateSchema,
  SavedTemplateListQuerySchema,
  TemplateListQuerySchema,
  TemplateSearchQuerySchema,
  UpdateCategorySchema,
  UpdateTemplateSchema,
  UserTemplateListQuerySchema,
} from '../models/template';
import { TemplateService } from '../services/templateService';

interface Variables {
  userId: string;
  accessToken: string;
}

// ============================================
// Public Routes (no auth required)
// ============================================

export const publicTemplateRoutes = new Hono();

/**
 * GET /templates/categories - List all template categories
 */
publicTemplateRoutes.get('/categories', async (c) => {
  const categories = await TemplateService.listCategories();

  return c.json({
    success: true,
    data: categories,
  });
});

/**
 * GET /templates/public - List public templates
 */
publicTemplateRoutes.get(
  '/public',
  zValidator('query', TemplateListQuerySchema),
  async (c) => {
    const query = c.req.valid('query');

    const { data, total } = await TemplateService.listPublic({
      categoryId: query.categoryId,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
    });

    return c.json({
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }
);

/**
 * GET /templates/search - Search templates
 */
publicTemplateRoutes.get(
  '/search',
  zValidator('query', TemplateSearchQuerySchema),
  async (c) => {
    const query = c.req.valid('query');

    const { data, total } = await TemplateService.search({
      query: query.query,
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }
);

/**
 * GET /templates/recommended - Get recommended templates
 */
publicTemplateRoutes.get('/recommended', async (c) => {
  const limit = c.req.query('limit');
  const templates = await TemplateService.getRecommended(
    limit ? parseInt(limit, 10) : undefined
  );

  return c.json({
    success: true,
    data: templates,
  });
});

/**
 * GET /templates/:id - Get template by ID (public view)
 */
publicTemplateRoutes.get('/:id', async (c) => {
  const templateId = c.req.param('id');

  const template = await TemplateService.getById(templateId);

  return c.json({
    success: true,
    data: template,
  });
});

// ============================================
// Protected Routes (auth required)
// ============================================

export const templateRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /templates/me - List user's own templates
 */
templateRoutes.get(
  '/me',
  zValidator('query', UserTemplateListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const { data, total } = await TemplateService.listUserTemplates(userId, {
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }
);

/**
 * GET /templates/saved - List user's saved templates
 */
templateRoutes.get(
  '/saved',
  zValidator('query', SavedTemplateListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const { data, total } = await TemplateService.listSavedTemplates(userId, {
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }
);

/**
 * GET /templates/:id/details - Get template with user interaction status
 */
templateRoutes.get('/:id/details', async (c) => {
  const userId = c.get('userId');
  const templateId = c.req.param('id');

  const template = await TemplateService.getById(templateId, userId);

  return c.json({
    success: true,
    data: template,
  });
});

/**
 * POST /templates - Create a new template
 */
templateRoutes.post(
  '/',
  zValidator('json', CreateTemplateSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    // TODO: Get user name from auth context or user service
    const userName = 'User';

    const result = await TemplateService.create(userId, userName, input);

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * PATCH /templates/:id - Update a template
 */
templateRoutes.patch(
  '/:id',
  zValidator('json', UpdateTemplateSchema),
  async (c) => {
    const userId = c.get('userId');
    const templateId = c.req.param('id');
    const input = c.req.valid('json');

    const template = await TemplateService.update(templateId, userId, input);

    return c.json({
      success: true,
      data: template,
    });
  }
);

/**
 * DELETE /templates/:id - Delete a template
 */
templateRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const templateId = c.req.param('id');

  await TemplateService.delete(templateId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /templates/:id/like - Toggle like on a template
 */
templateRoutes.post('/:id/like', async (c) => {
  const userId = c.get('userId');
  const templateId = c.req.param('id');

  const result = await TemplateService.toggleLike(templateId, userId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /templates/:id/save - Toggle save on a template
 */
templateRoutes.post('/:id/save', async (c) => {
  const userId = c.get('userId');
  const templateId = c.req.param('id');

  const result = await TemplateService.toggleSave(templateId, userId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /templates/:id/use - Create itinerary from template
 */
templateRoutes.post(
  '/:id/use',
  zValidator('json', CreateFromTemplateSchema),
  async (c) => {
    const userId = c.get('userId');
    const templateId = c.req.param('id');
    const input = c.req.valid('json');

    const result = await TemplateService.createItineraryFromTemplate(
      templateId,
      userId,
      input
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * POST /itineraries/:id/save-as-template - Save itinerary as template
 */
export const itineraryTemplateRoutes = new Hono<{ Variables: Variables }>();

itineraryTemplateRoutes.post(
  '/:id/save-as-template',
  zValidator('json', SaveAsTemplateSchema),
  async (c) => {
    const userId = c.get('userId');
    const itineraryId = c.req.param('id');
    const input = c.req.valid('json');

    const result = await TemplateService.saveItineraryAsTemplate(
      itineraryId,
      userId,
      input
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

// ============================================
// Admin Routes (for category management)
// ============================================

export const adminTemplateRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /admin/templates/categories - Create a category
 */
adminTemplateRoutes.post(
  '/categories',
  zValidator('json', CreateCategorySchema),
  async (c) => {
    const input = c.req.valid('json');

    const result = await TemplateService.createCategory(input);

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * PATCH /admin/templates/categories/:id - Update a category
 */
adminTemplateRoutes.patch(
  '/categories/:id',
  zValidator('json', UpdateCategorySchema),
  async (c) => {
    const categoryId = c.req.param('id');
    const input = c.req.valid('json');

    // Filter out null values
    const sanitizedInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== null && value !== undefined) {
        sanitizedInput[key] = value;
      }
    }

    const category = await TemplateService.updateCategory(
      categoryId,
      sanitizedInput as Parameters<typeof TemplateService.updateCategory>[1]
    );

    return c.json({
      success: true,
      data: category,
    });
  }
);
