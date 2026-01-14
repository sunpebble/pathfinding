import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  AddPackingItemSchema,
  BulkAddItemsSchema,
  CreatePackingListSchema,
  CreateTemplateFromListSchema,
  PackingListQuerySchema,
  TemplateQuerySchema,
  TripTypeSchema,
  UpdatePackingItemSchema,
  UpdatePackingListSchema,
} from '../models/packingList';
import { PackingListService } from '../services/packingListService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Public routes (no auth required)
export const publicPackingListRoutes = new Hono();

/**
 * GET /packing-lists/shared/:shareCode - Get a shared packing list by share code
 * No authentication required
 */
publicPackingListRoutes.get('/shared/:shareCode', async (c) => {
  const shareCode = c.req.param('shareCode');

  const list = await PackingListService.getByShareCode(shareCode);

  return c.json({
    success: true,
    data: list,
  });
});

/**
 * GET /packing-lists/templates/system - List system templates
 * No authentication required
 */
publicPackingListRoutes.get(
  '/templates/system',
  zValidator(
    'query',
    z.object({
      tripType: TripTypeSchema.optional(),
    })
  ),
  async (c) => {
    const { tripType } = c.req.valid('query');

    const templates = await PackingListService.listSystemTemplates(tripType);

    return c.json({
      success: true,
      data: templates,
    });
  }
);

/**
 * GET /packing-lists/templates/public - List public templates
 * No authentication required
 */
publicPackingListRoutes.get(
  '/templates/public',
  zValidator('query', TemplateQuerySchema),
  async (c) => {
    const query = c.req.valid('query');

    const { data, total } = await PackingListService.listPublicTemplates(query);

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
 * GET /packing-lists/templates/:id - Get template by ID
 * No authentication required
 */
publicPackingListRoutes.get('/templates/:id', async (c) => {
  const templateId = c.req.param('id');

  const template = await PackingListService.getTemplateById(templateId);

  return c.json({
    success: true,
    data: template,
  });
});

// Protected routes (auth required)
export const packingListRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Packing Lists
// ============================================

/**
 * GET /packing-lists - List user's packing lists with pagination
 */
packingListRoutes.get(
  '/',
  zValidator('query', PackingListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const query = c.req.valid('query');

    const { data, total } = await PackingListService.list(
      userId,
      query,
      accessToken
    );

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
 * POST /packing-lists - Create a new packing list
 */
packingListRoutes.post(
  '/',
  zValidator('json', CreatePackingListSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const input = c.req.valid('json');

    const list = await PackingListService.create(userId, input, accessToken);

    return c.json(
      {
        success: true,
        data: list,
      },
      201
    );
  }
);

/**
 * GET /packing-lists/:id - Get packing list by ID with all items
 */
packingListRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const listId = c.req.param('id');

  const list = await PackingListService.getById(listId, userId, accessToken);

  return c.json({
    success: true,
    data: list,
  });
});

/**
 * PATCH /packing-lists/:id - Update a packing list
 */
packingListRoutes.patch(
  '/:id',
  zValidator('json', UpdatePackingListSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const listId = c.req.param('id');
    const input = c.req.valid('json');

    const list = await PackingListService.update(
      listId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: list,
    });
  }
);

/**
 * DELETE /packing-lists/:id - Delete a packing list
 */
packingListRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const listId = c.req.param('id');

  await PackingListService.delete(listId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});

// ============================================
// Sharing
// ============================================

/**
 * POST /packing-lists/:id/share - Generate or regenerate share code
 */
packingListRoutes.post('/:id/share', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const listId = c.req.param('id');

  const shareCode = await PackingListService.generateShareCode(
    listId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: { shareCode },
  });
});

/**
 * POST /packing-lists/:id/share/users - Add a user to the shared list
 */
packingListRoutes.post(
  '/:id/share/users',
  zValidator(
    'json',
    z.object({
      userId: z.string().min(1, 'User ID is required'),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const listId = c.req.param('id');
    const { userId: sharedUserId } = c.req.valid('json');

    await PackingListService.addSharedUser(
      listId,
      userId,
      sharedUserId,
      accessToken
    );

    return c.json({
      success: true,
      data: null,
    });
  }
);

/**
 * DELETE /packing-lists/:id/share/users/:userId - Remove a user from the shared list
 */
packingListRoutes.delete('/:id/share/users/:sharedUserId', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const listId = c.req.param('id');
  const sharedUserId = c.req.param('sharedUserId');

  await PackingListService.removeSharedUser(
    listId,
    userId,
    sharedUserId,
    accessToken
  );

  return c.json({
    success: true,
    data: null,
  });
});

// ============================================
// Items
// ============================================

/**
 * POST /packing-lists/:id/items - Add an item to a packing list
 */
packingListRoutes.post(
  '/:id/items',
  zValidator('json', AddPackingItemSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const listId = c.req.param('id');
    const input = c.req.valid('json');

    const itemId = await PackingListService.addItem(
      listId,
      userId,
      input,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: { id: itemId },
      },
      201
    );
  }
);

/**
 * POST /packing-lists/:id/items/bulk - Bulk add items
 */
packingListRoutes.post(
  '/:id/items/bulk',
  zValidator('json', BulkAddItemsSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const listId = c.req.param('id');
    const input = c.req.valid('json');

    const itemIds = await PackingListService.addItemsBulk(
      listId,
      userId,
      input,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: { ids: itemIds },
      },
      201
    );
  }
);

/**
 * PATCH /packing-lists/:listId/items/:itemId - Update an item
 */
packingListRoutes.patch(
  '/:listId/items/:itemId',
  zValidator('json', UpdatePackingItemSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itemId = c.req.param('itemId');
    const input = c.req.valid('json');

    const item = await PackingListService.updateItem(
      itemId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: item,
    });
  }
);

/**
 * POST /packing-lists/:listId/items/:itemId/toggle - Toggle item packed status
 */
packingListRoutes.post('/:listId/items/:itemId/toggle', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itemId = c.req.param('itemId');

  const isPacked = await PackingListService.toggleItemPacked(
    itemId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: { isPacked },
  });
});

/**
 * DELETE /packing-lists/:listId/items/:itemId - Delete an item
 */
packingListRoutes.delete('/:listId/items/:itemId', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itemId = c.req.param('itemId');

  await PackingListService.deleteItem(itemId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});

// ============================================
// Templates (User)
// ============================================

/**
 * POST /packing-lists/:id/template - Create a template from an existing list
 */
packingListRoutes.post(
  '/:id/template',
  zValidator('json', CreateTemplateFromListSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const listId = c.req.param('id');
    const input = c.req.valid('json');

    const template = await PackingListService.createTemplateFromList(
      listId,
      userId,
      input,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: template,
      },
      201
    );
  }
);

/**
 * PATCH /packing-lists/templates/:id - Update a user template
 */
packingListRoutes.patch(
  '/templates/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(500).optional(),
      isPublic: z.boolean().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const templateId = c.req.param('id');
    const input = c.req.valid('json');

    const template = await PackingListService.updateTemplate(
      templateId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: template,
    });
  }
);

/**
 * DELETE /packing-lists/templates/:id - Delete a user template
 */
packingListRoutes.delete('/templates/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const templateId = c.req.param('id');

  await PackingListService.deleteTemplate(templateId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});
