import { Hono } from 'hono';

// Placeholder routes - will be implemented in Phase 4 (US2)
export const _itineraryItemsRoutes = new Hono();

// Get items for a day
itineraryItemsRoutes.get('/:itineraryId/days/:dayId/items', async (c) => {
  // TODO: T075 - Implement list day items
  return c.json({ data: [] });
});

// Add item to day
itineraryItemsRoutes.post('/:itineraryId/days/:dayId/items', async (c) => {
  // TODO: T074 - Implement create item
  return c.json({ error: 'Not implemented' }, 501);
});

// Update item
itineraryItemsRoutes.patch(
  '/:itineraryId/days/:dayId/items/:itemId',
  async (c) => {
    // TODO: T113 - Implement update item
    return c.json({ error: 'Not implemented' }, 501);
  }
);

// Delete item
itineraryItemsRoutes.delete(
  '/:itineraryId/days/:dayId/items/:itemId',
  async (c) => {
    // TODO: T114 - Implement delete item
    return c.json({ error: 'Not implemented' }, 501);
  }
);

// Reorder items within a day
itineraryItemsRoutes.post(
  '/:itineraryId/days/:dayId/items/reorder',
  async (c) => {
    // TODO: T115 - Implement reorder items
    return c.json({ error: 'Not implemented' }, 501);
  }
);
