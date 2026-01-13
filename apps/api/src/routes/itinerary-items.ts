import type { UpdateItineraryItemInput } from '../services/itineraryItemService';
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

  const data = await ItineraryItemService.listByDay(dayId, accessToken);
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

    const item = await ItineraryItemService.create(
      { ...input, dayId },
      accessToken
    );

    return c.json(
      {
        data: item,
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

    // Build sanitized input with proper typing, filtering out null values
    const sanitizedInput: UpdateItineraryItemInput = {};

    if (input.orderIndex !== undefined && input.orderIndex !== null) {
      sanitizedInput.orderIndex = input.orderIndex;
    }
    if (input.startTime !== undefined && input.startTime !== null) {
      sanitizedInput.startTime = input.startTime;
    }
    if (input.endTime !== undefined && input.endTime !== null) {
      sanitizedInput.endTime = input.endTime;
    }
    if (input.transportMode !== undefined && input.transportMode !== null) {
      sanitizedInput.transportMode = input.transportMode;
    }
    if (input.notes !== undefined && input.notes !== null) {
      sanitizedInput.notes = input.notes;
    }

    const item = await ItineraryItemService.update(
      itemId,
      sanitizedInput,
      accessToken
    );

    return c.json({
      data: item,
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
    const input = c.req.valid('json');
    const accessToken = c.get('accessToken');

    // Reorder each item to its new position
    const results = [];
    for (let i = 0; i < input.itemIds.length; i++) {
      await ItineraryItemService.reorder(input.itemIds[i], i, accessToken);
      results.push({ itemId: input.itemIds[i], newIndex: i });
    }
    return c.json({ data: results });
  }
);
