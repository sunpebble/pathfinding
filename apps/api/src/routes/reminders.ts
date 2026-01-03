import { zValidator } from 'npm:@hono/zod-validator';
import { Hono } from 'npm:hono';
import { authMiddleware } from '../middleware/auth.ts';
import {
  CreateReminderSchema,
  UpdateReminderSchema,
} from '../models/reminder.ts';
import { reminderService } from '../services/reminderService.ts';

const reminders = new Hono();

// Apply auth middleware to all routes
reminders.use('/*', authMiddleware);

/**
 * POST /items/:itemId/reminders - Create or update reminder for an item
 */
reminders.post(
  '/items/:itemId/reminders',
  zValidator('json', CreateReminderSchema.omit({ itemId: true })),
  async (c) => {
    const user = c.get('user');
    const itemId = c.req.param('itemId');
    const body = c.req.valid('json');

    try {
      const reminder = await reminderService.schedule(user.id, {
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
reminders.get('/items/:itemId/reminders', async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('itemId');

  try {
    const reminder = await reminderService.getByItemId(user.id, itemId);

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
reminders.delete('/items/:itemId/reminders', async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('itemId');

  try {
    const reminder = await reminderService.getByItemId(user.id, itemId);
    if (!reminder) {
      return c.json(
        {
          success: false,
          error: { message: 'Reminder not found' },
        },
        404
      );
    }

    await reminderService.cancel(user.id, reminder.id);

    return c.json({
      success: true,
      data: null,
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
 * GET /reminders - List all user reminders
 */
reminders.get('/reminders', async (c) => {
  const user = c.get('user');

  try {
    const allReminders = await reminderService.listByUser(user.id);

    return c.json({
      success: true,
      data: allReminders,
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
 * PATCH /reminders/:id - Update a specific reminder
 */
reminders.patch(
  '/reminders/:id',
  zValidator('json', UpdateReminderSchema),
  async (c) => {
    const user = c.get('user');
    const reminderId = c.req.param('id');
    const body = c.req.valid('json');

    try {
      const reminder = await reminderService.update(user.id, reminderId, body);

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
 * DELETE /reminders/:id - Delete a specific reminder
 */
reminders.delete('/reminders/:id', async (c) => {
  const user = c.get('user');
  const reminderId = c.req.param('id');

  try {
    await reminderService.cancel(user.id, reminderId);

    return c.json({
      success: true,
      data: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      {
        success: false,
        error: { message },
      },
      message.includes('not found') ? 404 : 500
    );
  }
});

export default reminders;
