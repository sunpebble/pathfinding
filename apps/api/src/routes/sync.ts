import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { SyncPushRequestSchema, SyncQuerySchema } from '../models/sync';
import { SyncConflictError, SyncService } from '../services/syncService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const syncRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /sync - Sync offline changes
 *
 * Query params:
 *   - last_pulled_at: Last sync timestamp in milliseconds
 *
 * Request body:
 *   - changes: Object containing table changes (itineraries, itinerary_days, itinerary_items)
 *
 * Response:
 *   - changes: Server changes since last_pulled_at
 *   - timestamp: Current sync timestamp for next sync
 */
syncRoutes.post('/', zValidator('query', SyncQuerySchema), async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const query = c.req.valid('query');

  // Get request body (may be empty for pull-only sync)
  let pushRequest;
  try {
    const body = await c.req.text();
    if (body && body.trim()) {
      const parsed = JSON.parse(body);
      pushRequest = SyncPushRequestSchema.parse(parsed);
    }
  } catch {
    pushRequest = undefined;
  }

  try {
    const response = await SyncService.sync(
      userId,
      query.last_pulled_at,
      pushRequest,
      accessToken
    );

    return c.json({
      success: true,
      ...response,
    });
  } catch (error) {
    if (error instanceof SyncConflictError) {
      return c.json(error.toResponse(), 409);
    }
    throw error;
  }
});
