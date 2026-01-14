/**
 * Local Events Routes
 * API endpoints for destination events and festivals
 */

import { Hono } from 'hono';
import { LocalEventsService } from '../services/localEventsService';
import type {
  CreateEventInput,
  UpdateEventInput,
  EventType,
  EventStatus,
  ReminderType,
} from '../services/localEventsService';

// ============================================
// Public Routes (no auth required)
// ============================================

export const publicEventsRoutes = new Hono();

/**
 * List events for a city
 * GET /v1/events?cityId=xxx&eventType=festival&status=upcoming
 */
publicEventsRoutes.get('/', async (c) => {
  const cityId = c.req.query('city_id') || c.req.query('cityId');
  const eventType = c.req.query('event_type') || c.req.query('eventType');
  const status = c.req.query('status');
  const startDate = c.req.query('start_date') || c.req.query('startDate');
  const endDate = c.req.query('end_date') || c.req.query('endDate');
  const page = Number.parseInt(c.req.query('page') || '1');
  const pageSize = Number.parseInt(c.req.query('page_size') || c.req.query('pageSize') || '20');

  if (!cityId) {
    return c.json({ error: 'city_id is required' }, 400);
  }

  const result = await LocalEventsService.listByCity({
    cityId,
    eventType: eventType as EventType | undefined,
    status: status as EventStatus | undefined,
    startDate,
    endDate,
    page,
    pageSize,
  });

  return c.json(result);
});

/**
 * Get upcoming events for a city
 * GET /v1/events/upcoming?cityId=xxx&limit=10
 */
publicEventsRoutes.get('/upcoming', async (c) => {
  const cityId = c.req.query('city_id') || c.req.query('cityId');
  const limit = c.req.query('limit')
    ? Number.parseInt(c.req.query('limit')!)
    : undefined;

  if (!cityId) {
    return c.json({ error: 'city_id is required' }, 400);
  }

  const events = await LocalEventsService.listUpcoming(cityId, limit);

  return c.json({ data: events });
});

/**
 * Get ongoing events for a city
 * GET /v1/events/ongoing?cityId=xxx&limit=10
 */
publicEventsRoutes.get('/ongoing', async (c) => {
  const cityId = c.req.query('city_id') || c.req.query('cityId');
  const limit = c.req.query('limit')
    ? Number.parseInt(c.req.query('limit')!)
    : undefined;

  if (!cityId) {
    return c.json({ error: 'city_id is required' }, 400);
  }

  const events = await LocalEventsService.listOngoing(cityId, limit);

  return c.json({ data: events });
});

/**
 * Get featured events for a city
 * GET /v1/events/featured?cityId=xxx&limit=5
 */
publicEventsRoutes.get('/featured', async (c) => {
  const cityId = c.req.query('city_id') || c.req.query('cityId');
  const limit = c.req.query('limit')
    ? Number.parseInt(c.req.query('limit')!)
    : undefined;

  if (!cityId) {
    return c.json({ error: 'city_id is required' }, 400);
  }

  const events = await LocalEventsService.listFeatured(cityId, limit);

  return c.json({ data: events });
});

/**
 * Get events for a date range (calendar view)
 * GET /v1/events/calendar?cityId=xxx&startDate=2024-01-01&endDate=2024-01-31
 */
publicEventsRoutes.get('/calendar', async (c) => {
  const cityId = c.req.query('city_id') || c.req.query('cityId');
  const startDate = c.req.query('start_date') || c.req.query('startDate');
  const endDate = c.req.query('end_date') || c.req.query('endDate');

  if (!cityId || !startDate || !endDate) {
    return c.json(
      { error: 'city_id, start_date, and end_date are required' },
      400
    );
  }

  const events = await LocalEventsService.listByDateRange(
    cityId,
    startDate,
    endDate
  );

  return c.json({ data: events });
});

/**
 * Search events
 * GET /v1/events/search?q=春节&cityId=xxx
 */
publicEventsRoutes.get('/search', async (c) => {
  const query = c.req.query('q') || c.req.query('query');
  const cityId = c.req.query('city_id') || c.req.query('cityId');
  const limit = c.req.query('limit')
    ? Number.parseInt(c.req.query('limit')!)
    : undefined;

  if (!query) {
    return c.json({ error: 'q is required' }, 400);
  }

  const events = await LocalEventsService.search(query, cityId, limit);

  return c.json({ data: events });
});

/**
 * Get recurring events (annual festivals)
 * GET /v1/events/recurring?cityId=xxx
 */
publicEventsRoutes.get('/recurring', async (c) => {
  const cityId = c.req.query('city_id') || c.req.query('cityId');
  const limit = c.req.query('limit')
    ? Number.parseInt(c.req.query('limit')!)
    : undefined;

  if (!cityId) {
    return c.json({ error: 'city_id is required' }, 400);
  }

  const events = await LocalEventsService.listRecurring(cityId, limit);

  return c.json({ data: events });
});

/**
 * Get event by ID
 * GET /v1/events/:id
 */
publicEventsRoutes.get('/:id', async (c) => {
  const eventId = c.req.param('id');

  const event = await LocalEventsService.getById(eventId);

  // Increment view count (fire and forget)
  LocalEventsService.incrementViewCount(eventId).catch(() => {});

  return c.json({ data: event });
});

// ============================================
// Protected Routes (auth required)
// ============================================

export const eventsRoutes = new Hono<{
  Variables: {
    userId: string;
    accessToken: string;
  };
}>();

/**
 * Create a new event (admin only in production)
 * POST /v1/events
 */
eventsRoutes.post('/', async (c) => {
  const body = await c.req.json<CreateEventInput>();

  // Validate required fields
  if (
    !body.name ||
    !body.description ||
    !body.cityId ||
    !body.eventType ||
    !body.startDate ||
    !body.endDate
  ) {
    return c.json(
      {
        error:
          'name, description, cityId, eventType, startDate, and endDate are required',
      },
      400
    );
  }

  const eventId = await LocalEventsService.create(body);

  return c.json({ id: eventId }, 201);
});

/**
 * Update an event
 * PATCH /v1/events/:id
 */
eventsRoutes.patch('/:id', async (c) => {
  const eventId = c.req.param('id');
  const body = await c.req.json<UpdateEventInput>();

  const updated = await LocalEventsService.update(eventId, body);

  return c.json({ data: updated });
});

/**
 * Delete an event
 * DELETE /v1/events/:id
 */
eventsRoutes.delete('/:id', async (c) => {
  const eventId = c.req.param('id');

  await LocalEventsService.delete(eventId);

  return c.json({ success: true });
});

// ============================================
// Favorites Routes
// ============================================

/**
 * Add event to favorites
 * POST /v1/events/:id/favorite
 */
eventsRoutes.post('/:id/favorite', async (c) => {
  const userId = c.get('userId');
  const eventId = c.req.param('id');
  const body = await c.req.json<{ notes?: string }>().catch(() => ({}));

  const favoriteId = await LocalEventsService.addFavorite(
    userId,
    eventId,
    body.notes
  );

  return c.json({ id: favoriteId }, 201);
});

/**
 * Remove event from favorites
 * DELETE /v1/events/:id/favorite
 */
eventsRoutes.delete('/:id/favorite', async (c) => {
  const userId = c.get('userId');
  const eventId = c.req.param('id');

  await LocalEventsService.removeFavorite(userId, eventId);

  return c.json({ success: true });
});

/**
 * Check if event is favorited
 * GET /v1/events/:id/favorite
 */
eventsRoutes.get('/:id/favorite', async (c) => {
  const userId = c.get('userId');
  const eventId = c.req.param('id');

  const isFavorited = await LocalEventsService.isFavorited(userId, eventId);

  return c.json({ is_favorited: isFavorited });
});

/**
 * List user's favorite events
 * GET /v1/events/favorites
 */
eventsRoutes.get('/me/favorites', async (c) => {
  const userId = c.get('userId');
  const page = Number.parseInt(c.req.query('page') || '1');
  const pageSize = Number.parseInt(c.req.query('page_size') || c.req.query('pageSize') || '20');

  const result = await LocalEventsService.listFavorites(userId, page, pageSize);

  return c.json(result);
});

// ============================================
// Reminders Routes
// ============================================

/**
 * Create event reminder
 * POST /v1/events/:id/reminder
 */
eventsRoutes.post('/:id/reminder', async (c) => {
  const userId = c.get('userId');
  const eventId = c.req.param('id');
  const body = await c.req.json<{
    reminder_type?: ReminderType;
    reminderType?: ReminderType;
    reminder_time?: number;
    reminderTime?: number;
    minutes_before?: number;
    minutesBefore?: number;
    message?: string;
  }>();

  const reminderType = body.reminder_type || body.reminderType;
  const reminderTime = body.reminder_time || body.reminderTime;
  const minutesBefore = body.minutes_before || body.minutesBefore;

  if (!reminderType || !reminderTime) {
    return c.json(
      { error: 'reminder_type and reminder_time are required' },
      400
    );
  }

  const reminderId = await LocalEventsService.createReminder(userId, {
    eventId,
    reminderType,
    reminderTime,
    minutesBefore,
    message: body.message,
  });

  return c.json({ id: reminderId }, 201);
});

/**
 * Delete event reminder
 * DELETE /v1/reminders/:id
 */
eventsRoutes.delete('/reminders/:id', async (c) => {
  const reminderId = c.req.param('id');

  await LocalEventsService.deleteReminder(reminderId);

  return c.json({ success: true });
});

/**
 * List user's event reminders
 * GET /v1/events/me/reminders
 */
eventsRoutes.get('/me/reminders', async (c) => {
  const userId = c.get('userId');
  const includeTriggered = c.req.query('include_triggered') === 'true';

  const reminders = await LocalEventsService.listReminders(
    userId,
    includeTriggered
  );

  return c.json({ data: reminders });
});

/**
 * Mark reminder as read
 * PATCH /v1/reminders/:id/read
 */
eventsRoutes.patch('/reminders/:id/read', async (c) => {
  const reminderId = c.req.param('id');

  await LocalEventsService.markReminderRead(reminderId);

  return c.json({ success: true });
});
