/**
 * POI Ticket Routes
 * API endpoints for ticket information and reminders
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  CreateTicketReminderSchema,
  CreateTicketSchema,
  TicketTypeSchema,
  UpdateTicketReminderSchema,
  UpdateTicketSchema,
} from '../models/ticket';
import { TicketService } from '../services/ticketService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const ticketRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// POI Ticket Endpoints
// ============================================

/**
 * List tickets for a POI
 * GET /pois/:poiId/tickets?activeOnly=true
 */
ticketRoutes.get(
  '/:poiId/tickets',
  zValidator(
    'query',
    z.object({
      activeOnly: z.coerce.boolean().optional().default(true),
    })
  ),
  async (c) => {
    const poiId = c.req.param('poiId');
    const { activeOnly } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await TicketService.listByPoi(poiId, activeOnly, accessToken);
    return c.json({ data });
  }
);

/**
 * Get ticket price range for a POI
 * GET /pois/:poiId/tickets/price-range
 */
ticketRoutes.get('/:poiId/tickets/price-range', async (c) => {
  const poiId = c.req.param('poiId');
  const accessToken = c.get('accessToken');

  const data = await TicketService.getPriceRange(poiId, accessToken);
  return c.json({ data });
});

/**
 * Get recommended tickets for a POI
 * GET /pois/:poiId/tickets/recommended?limit=5
 */
ticketRoutes.get(
  '/:poiId/tickets/recommended',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(20).optional().default(5),
    })
  ),
  async (c) => {
    const poiId = c.req.param('poiId');
    const { limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await TicketService.getRecommended(poiId, limit, accessToken);
    return c.json({ data });
  }
);

/**
 * Get a single ticket by ID
 * GET /tickets/:ticketId
 */
ticketRoutes.get('/tickets/:ticketId', async (c) => {
  const ticketId = c.req.param('ticketId');
  const accessToken = c.get('accessToken');

  const data = await TicketService.getTicketById(ticketId, accessToken);
  return c.json({ data });
});

/**
 * Create a new ticket for a POI
 * POST /pois/:poiId/tickets
 */
ticketRoutes.post(
  '/:poiId/tickets',
  zValidator('json', CreateTicketSchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const body = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const data = await TicketService.createTicket(poiId, body, accessToken);
    return c.json({ data }, 201);
  }
);

/**
 * Bulk create tickets for a POI
 * POST /pois/:poiId/tickets/bulk
 */
ticketRoutes.post(
  '/:poiId/tickets/bulk',
  zValidator(
    'json',
    z.object({
      tickets: z.array(CreateTicketSchema).min(1).max(50),
    })
  ),
  async (c) => {
    const poiId = c.req.param('poiId');
    const { tickets } = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const ids = await TicketService.bulkCreateTickets(poiId, tickets, accessToken);
    return c.json({ data: { ids, count: ids.length } }, 201);
  }
);

/**
 * Update a ticket
 * PATCH /tickets/:ticketId
 */
ticketRoutes.patch(
  '/tickets/:ticketId',
  zValidator('json', UpdateTicketSchema),
  async (c) => {
    const ticketId = c.req.param('ticketId');
    const body = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const data = await TicketService.updateTicket(ticketId, body, accessToken);
    return c.json({ data });
  }
);

/**
 * Delete a ticket
 * DELETE /tickets/:ticketId
 */
ticketRoutes.delete('/tickets/:ticketId', async (c) => {
  const ticketId = c.req.param('ticketId');
  const accessToken = c.get('accessToken');

  await TicketService.deleteTicket(ticketId, accessToken);
  return c.json({ success: true });
});

// ============================================
// Ticket Reminder Endpoints
// ============================================

export const ticketReminderRoutes = new Hono<{ Variables: Variables }>();

/**
 * List reminders for the current user
 * GET /ticket-reminders?includeTriggered=false&limit=50
 */
ticketReminderRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      includeTriggered: z.coerce.boolean().optional().default(false),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { includeTriggered, limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await TicketService.listUserReminders(
      userId,
      includeTriggered,
      limit,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Get upcoming reminders (next N days)
 * GET /ticket-reminders/upcoming?days=7
 */
ticketReminderRoutes.get(
  '/upcoming',
  zValidator(
    'query',
    z.object({
      days: z.coerce.number().int().min(1).max(30).optional().default(7),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { days } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await TicketService.getUpcomingReminders(userId, days, accessToken);
    return c.json({ data });
  }
);

/**
 * Get unread reminder count
 * GET /ticket-reminders/unread-count
 */
ticketReminderRoutes.get('/unread-count', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  const count = await TicketService.getUnreadCount(userId, accessToken);
  return c.json({ data: { count } });
});

/**
 * Get a single reminder by ID
 * GET /ticket-reminders/:reminderId
 */
ticketReminderRoutes.get('/:reminderId', async (c) => {
  const reminderId = c.req.param('reminderId');
  const accessToken = c.get('accessToken');

  const data = await TicketService.getReminderById(reminderId, accessToken);
  return c.json({ data });
});

/**
 * Create a new reminder
 * POST /ticket-reminders
 */
ticketReminderRoutes.post(
  '/',
  zValidator('json', CreateTicketReminderSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const data = await TicketService.createReminder(userId, body, accessToken);
    return c.json({ data }, 201);
  }
);

/**
 * Update a reminder
 * PATCH /ticket-reminders/:reminderId
 */
ticketReminderRoutes.patch(
  '/:reminderId',
  zValidator('json', UpdateTicketReminderSchema),
  async (c) => {
    const reminderId = c.req.param('reminderId');
    const body = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const data = await TicketService.updateReminder(reminderId, body, accessToken);
    return c.json({ data });
  }
);

/**
 * Mark a reminder as read
 * POST /ticket-reminders/:reminderId/read
 */
ticketReminderRoutes.post('/:reminderId/read', async (c) => {
  const reminderId = c.req.param('reminderId');
  const accessToken = c.get('accessToken');

  const data = await TicketService.markReminderRead(reminderId, accessToken);
  return c.json({ data });
});

/**
 * Mark all reminders as read
 * POST /ticket-reminders/read-all
 */
ticketReminderRoutes.post('/read-all', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  const count = await TicketService.markAllRemindersRead(userId, accessToken);
  return c.json({ data: { markedCount: count } });
});

/**
 * Delete a reminder
 * DELETE /ticket-reminders/:reminderId
 */
ticketReminderRoutes.delete('/:reminderId', async (c) => {
  const reminderId = c.req.param('reminderId');
  const accessToken = c.get('accessToken');

  await TicketService.deleteReminder(reminderId, accessToken);
  return c.json({ success: true });
});
