import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  BusinessHoursSchema,
  BestVisitTimeSchema,
  HolidayHoursSchema,
  BusinessHoursReminderSchema,
} from '../models/poi';
import { businessHoursService } from '../services/businessHoursService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const businessHoursRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// POI Business Hours Endpoints
// ============================================

/**
 * GET /pois/:poiId/business-hours - Get POI with business hours and open status
 */
businessHoursRoutes.get('/:poiId/business-hours', async (c) => {
  const poiId = c.req.param('poiId');
  const timezone = c.req.query('timezone');

  try {
    const result = await businessHoursService.getPoiWithBusinessHours(
      poiId,
      timezone
    );

    if (!result) {
      return c.json(
        {
          success: false,
          error: { message: 'POI not found' },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: result,
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
 * PUT /pois/:poiId/business-hours - Update POI business hours
 */
businessHoursRoutes.put(
  '/:poiId/business-hours',
  zValidator('json', BusinessHoursSchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const businessHours = c.req.valid('json');

    try {
      const result = await businessHoursService.updateBusinessHours(
        poiId,
        businessHours
      );

      return c.json({
        success: true,
        data: result,
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
  }
);

/**
 * PUT /pois/:poiId/best-visit-time - Update POI best visit time recommendations
 */
businessHoursRoutes.put(
  '/:poiId/best-visit-time',
  zValidator('json', BestVisitTimeSchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const bestVisitTime = c.req.valid('json');

    try {
      const result = await businessHoursService.updateBestVisitTime(
        poiId,
        bestVisitTime
      );

      return c.json({
        success: true,
        data: result,
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
  }
);

// ============================================
// Holiday Hours Endpoints
// ============================================

/**
 * GET /pois/:poiId/holiday-hours - Get holiday hours for a POI
 */
businessHoursRoutes.get('/:poiId/holiday-hours', async (c) => {
  const poiId = c.req.param('poiId');
  const includeExpired = c.req.query('includeExpired') === 'true';

  try {
    const result = await businessHoursService.getHolidayHours(
      poiId,
      includeExpired
    );

    return c.json({
      success: true,
      data: result,
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
 * POST /pois/:poiId/holiday-hours - Create holiday hours for a POI
 */
businessHoursRoutes.post(
  '/:poiId/holiday-hours',
  zValidator('json', HolidayHoursSchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const holidayHours = c.req.valid('json');

    try {
      const result = await businessHoursService.createHolidayHours(
        poiId,
        holidayHours
      );

      return c.json(
        {
          success: true,
          data: result,
        },
        201
      );
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
  }
);

/**
 * PUT /holiday-hours/:id - Update holiday hours
 */
businessHoursRoutes.put(
  '/holiday-hours/:id',
  zValidator('json', HolidayHoursSchema.partial()),
  async (c) => {
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    try {
      const result = await businessHoursService.updateHolidayHours(id, updates);

      return c.json({
        success: true,
        data: result,
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
  }
);

/**
 * DELETE /holiday-hours/:id - Delete holiday hours
 */
businessHoursRoutes.delete('/holiday-hours/:id', async (c) => {
  const id = c.req.param('id');

  try {
    await businessHoursService.deleteHolidayHours(id);

    return c.json({
      success: true,
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

// ============================================
// Business Hours Reminder Endpoints
// ============================================

/**
 * GET /reminders/business-hours - Get user's business hours reminders
 */
businessHoursRoutes.get('/reminders/business-hours', async (c) => {
  const userId = c.get('userId');
  const includeTriggered = c.req.query('includeTriggered') === 'true';

  try {
    const result = await businessHoursService.getUserReminders(
      userId,
      includeTriggered
    );

    return c.json({
      success: true,
      data: result,
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
 * POST /reminders/business-hours - Create a business hours reminder
 */
businessHoursRoutes.post(
  '/reminders/business-hours',
  zValidator('json', BusinessHoursReminderSchema),
  async (c) => {
    const userId = c.get('userId');
    const reminder = c.req.valid('json');

    try {
      const result = await businessHoursService.createReminder(userId, reminder);

      return c.json(
        {
          success: true,
          data: result,
        },
        201
      );
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
  }
);

/**
 * DELETE /reminders/business-hours/:id - Delete a business hours reminder
 */
businessHoursRoutes.delete('/reminders/business-hours/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  try {
    await businessHoursService.deleteReminder(userId, id);

    return c.json({
      success: true,
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

/**
 * DELETE /pois/:poiId/reminders/business-hours - Delete all business hours reminders for a POI
 */
businessHoursRoutes.delete('/:poiId/reminders/business-hours', async (c) => {
  const userId = c.get('userId');
  const poiId = c.req.param('poiId');

  try {
    const deletedCount = await businessHoursService.deletePoiReminders(
      userId,
      poiId
    );

    return c.json({
      success: true,
      data: { deletedCount },
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

// ============================================
// Batch Endpoints
// ============================================

/**
 * POST /pois/batch/business-hours - Get business hours for multiple POIs
 */
businessHoursRoutes.post(
  '/batch/business-hours',
  zValidator(
    'json',
    z.object({
      poiIds: z.array(z.string()).max(50),
    })
  ),
  async (c) => {
    const { poiIds } = c.req.valid('json');

    try {
      const result = await businessHoursService.getBatchBusinessHours(poiIds);

      return c.json({
        success: true,
        data: result,
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
  }
);

/**
 * POST /pois/:poiId/check-open-status - Check if POI is open at a specific time
 */
businessHoursRoutes.post(
  '/:poiId/check-open-status',
  zValidator(
    'json',
    z.object({
      timestamp: z.number().optional(), // Unix timestamp, defaults to now
      timezone: z.string().optional(),
    })
  ),
  async (c) => {
    const poiId = c.req.param('poiId');
    const { timestamp, timezone } = c.req.valid('json');

    try {
      const result = await businessHoursService.checkOpenStatus(
        poiId,
        timestamp,
        timezone
      );

      if (!result) {
        return c.json(
          {
            success: false,
            error: { message: 'POI not found' },
          },
          404
        );
      }

      return c.json({
        success: true,
        data: result,
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
  }
);
