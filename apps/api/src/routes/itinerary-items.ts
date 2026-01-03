import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  CreateItineraryItemSchema,
  ReorderItemsSchema,
  UpdateItineraryItemSchema,
} from '../models/itineraryItem';
import { ItineraryItemService } from '../services/itineraryItemService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const itineraryItemsRoutes = new Hono<{ Variables: Variables }>();

/**
 * Get items for a day
 * GET /itineraries/:itineraryId/days/:dayId/items
 */
itineraryItemsRoutes.get('/:itineraryId/days/:dayId/items', async (c) => {
  const dayId = c.req.param('dayId');
  const accessToken = c.get('accessToken');

  const data = await ItineraryItemService.list(dayId, accessToken);
  return c.json({ data });
});

/**
 * Add item to day
 * POST /itineraries/:itineraryId/days/:dayId/items
 */
itineraryItemsRoutes.post(
  '/:itineraryId/days/:dayId/items',
  zValidator('json', CreateItineraryItemSchema),
  async (c) => {
    const dayId = c.req.param('dayId');
    const input = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const { item, conflicts } = await ItineraryItemService.create(
      dayId,
      input,
      accessToken
    );

    return c.json(
      {
        data: item,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      },
      201
    );
  }
);

/**
 * Get single item
 * GET /itineraries/:itineraryId/days/:dayId/items/:itemId
 */
itineraryItemsRoutes.get(
  '/:itineraryId/days/:dayId/items/:itemId',
  async (c) => {
    const itemId = c.req.param('itemId');
    const accessToken = c.get('accessToken');

    const data = await ItineraryItemService.getById(itemId, accessToken);
    return c.json({ data });
  }
);

/**
 * Update item
 * PATCH /itineraries/:itineraryId/days/:dayId/items/:itemId
 */
itineraryItemsRoutes.patch(
  '/:itineraryId/days/:dayId/items/:itemId',
  zValidator('json', UpdateItineraryItemSchema),
  async (c) => {
    const itemId = c.req.param('itemId');
    const input = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const { item, conflicts } = await ItineraryItemService.update(
      itemId,
      input,
      accessToken
    );

    return c.json({
      data: item,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    });
  }
);

/**
 * Delete item
 * DELETE /itineraries/:itineraryId/days/:dayId/items/:itemId
 */
itineraryItemsRoutes.delete(
  '/:itineraryId/days/:dayId/items/:itemId',
  async (c) => {
    const itemId = c.req.param('itemId');
    const accessToken = c.get('accessToken');

    await ItineraryItemService.delete(itemId, accessToken);
    return c.json({ success: true });
  }
);

/**
 * Reorder items within a day
 * POST /itineraries/:itineraryId/days/:dayId/items/reorder
 */
itineraryItemsRoutes.post(
  '/:itineraryId/days/:dayId/items/reorder',
  zValidator('json', ReorderItemsSchema),
  async (c) => {
    const dayId = c.req.param('dayId');
    const input = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const data = await ItineraryItemService.reorder(dayId, input, accessToken);
    return c.json({ data });
  }
);
