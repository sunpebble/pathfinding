import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { CreateReminderSchema, UpdateReminderSchema } from '../models/reminder';
import { reminderService } from '../services/reminderService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const remindersRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /items/:itemId/reminders - Create or update reminder for an item
 */
remindersRoutes.post(
  '/items/:itemId/reminders',
  zValidator('json', CreateReminderSchema.omit({ itemId: true })),
  async (c) => {
    const userId = c.get('userId');
    const itemId = c.req.param('itemId');
    const body = c.req.valid('json');

    try {
      const reminder = await reminderService.schedule(userId, {
        itemId,
        minutesBefore: body.minutesBefore,
      });

      return c.json({
        success: true,
        data: reminder,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json(
        {
          success: false,
          error: { message },
        },
        message.includes('not found') ? 404 : 400
      );
    }
  }
);

/**
 * GET /items/:itemId/reminders - Get reminder for an item
 */
remindersRoutes.get('/items/:itemId/reminders', async (c) => {
  const userId = c.get('userId');
  const itemId = c.req.param('itemId');

  try {
    const reminder = await reminderService.getByItemId(userId, itemId);

    if (!reminder) {
      return c.json({
        success: true,
        data: null,
      });
    }

    return c.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        success: false,
        error: { message },
      },
      500
    );
  }
});

/**
 * DELETE /items/:itemId/reminders - Delete reminder for an item
 */
remindersRoutes.delete('/items/:itemId/reminders', async (c) => {
  const userId = c.get('userId');
  const itemId = c.req.param('itemId');

  try {
    const reminder = await reminderService.getByItemId(userId, itemId);
    if (!reminder) {
      return c.json(
        {
          success: false,
          error: { message: 'Reminder not found' },
        },
        404
      );
    }

    await reminderService.delete(userId, reminder.id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        success: false,
        error: { message },
      },
      500
    );
  }
});

/**
 * PATCH /reminders/:id - Update a reminder
 */
remindersRoutes.patch(
  '/reminders/:id',
  zValidator('json', UpdateReminderSchema),
  async (c) => {
    const userId = c.get('userId');
    const reminderId = c.req.param('id');
    const body = c.req.valid('json');

    try {
      const reminder = await reminderService.update(userId, reminderId, body);

      return c.json({
        success: true,
        data: reminder,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json(
        {
          success: false,
          error: { message },
        },
        message.includes('not found') ? 404 : 400
      );
    }
  }
);

/**
 * GET /reminders - List all reminders for current user
 */
remindersRoutes.get('/reminders', async (c) => {
  const userId = c.get('userId');

  try {
    const reminders = await reminderService.listForUser(userId);

    return c.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        success: false,
        error: { message },
      },
      500
    );
  }
});
