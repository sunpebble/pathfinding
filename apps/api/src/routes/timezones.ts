import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { api, convex } from '../lib/convex';

interface Variables {
  userId: string;
  accessToken: string;
}

export const timezonesRoutes = new Hono<{ Variables: Variables }>();

/**
 * Get all cities (for timezone selection)
 * GET /timezones/cities
 */
timezonesRoutes.get('/cities', async (c) => {
  const cities = await convex.query(api.cities.list, {});
  return c.json({ data: cities });
});

/**
 * Search cities by name
 * GET /timezones/cities/search?q=tokyo
 */
timezonesRoutes.get(
  '/cities/search',
  zValidator(
    'query',
    z.object({
      q: z.string().min(1, 'Search query is required'),
    })
  ),
  async (c) => {
    const { q } = c.req.valid('query');
    const cities = await convex.query(api.cities.searchByName, { name: q });
    return c.json({ data: cities });
  }
);

/**
 * Get city by ID with timezone info
 * GET /timezones/cities/:id
 */
timezonesRoutes.get('/cities/:id', async (c) => {
  const cityId = c.req.param('id');
  const city = await convex.query(api.cities.getTimezoneInfo, { id: cityId as any });

  if (!city) {
    return c.json({ error: 'City not found' }, 404);
  }

  return c.json({ data: city });
});

/**
 * Get user's timezone settings
 * GET /timezones/settings
 */
timezonesRoutes.get('/settings', async (c) => {
  const userId = c.get('userId');
  const settings = await convex.query(api.timezones.getUserSettings, { userId });
  return c.json({ data: settings });
});

/**
 * Update user's timezone settings
 * PUT /timezones/settings
 */
timezonesRoutes.put(
  '/settings',
  zValidator(
    'json',
    z.object({
      homeTimezone: z.string(),
      homeCityId: z.string().optional(),
      displayFormat: z.enum(['12h', '24h']),
      showSeconds: z.boolean(),
      autoDetect: z.boolean(),
      savedClocks: z.array(
        z.object({
          cityId: z.string(),
          label: z.string().optional(),
          sortOrder: z.number(),
        })
      ),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const id = await convex.mutation(api.timezones.upsertUserSettings, {
      userId,
      ...body,
      homeCityId: body.homeCityId as any,
      savedClocks: body.savedClocks.map((clock) => ({
        ...clock,
        cityId: clock.cityId as any,
      })),
    });

    return c.json({ data: { id } });
  }
);

/**
 * Update home timezone only
 * PATCH /timezones/settings/home
 */
timezonesRoutes.patch(
  '/settings/home',
  zValidator(
    'json',
    z.object({
      homeTimezone: z.string(),
      homeCityId: z.string().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const id = await convex.mutation(api.timezones.updateHomeTimezone, {
      userId,
      homeTimezone: body.homeTimezone,
      homeCityId: body.homeCityId as any,
    });

    return c.json({ data: { id } });
  }
);

/**
 * Update display format
 * PATCH /timezones/settings/display
 */
timezonesRoutes.patch(
  '/settings/display',
  zValidator(
    'json',
    z.object({
      displayFormat: z.enum(['12h', '24h']),
      showSeconds: z.boolean().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const id = await convex.mutation(api.timezones.updateDisplayFormat, {
      userId,
      ...body,
    });

    return c.json({ data: { id } });
  }
);

/**
 * Get user's world clock with full city details
 * GET /timezones/world-clock
 */
timezonesRoutes.get('/world-clock', async (c) => {
  const userId = c.get('userId');
  const worldClock = await convex.query(api.timezones.getWorldClock, { userId });
  return c.json({ data: worldClock });
});

/**
 * Add a city to world clock
 * POST /timezones/world-clock/cities
 */
timezonesRoutes.post(
  '/world-clock/cities',
  zValidator(
    'json',
    z.object({
      cityId: z.string(),
      label: z.string().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const id = await convex.mutation(api.timezones.addSavedClock, {
      userId,
      cityId: body.cityId as any,
      label: body.label,
    });

    return c.json({ data: { id } });
  }
);

/**
 * Remove a city from world clock
 * DELETE /timezones/world-clock/cities/:cityId
 */
timezonesRoutes.delete('/world-clock/cities/:cityId', async (c) => {
  const userId = c.get('userId');
  const cityId = c.req.param('cityId');

  const id = await convex.mutation(api.timezones.removeSavedClock, {
    userId,
    cityId: cityId as any,
  });

  return c.json({ data: { id } });
});

/**
 * Update a saved clock's label
 * PATCH /timezones/world-clock/cities/:cityId
 */
timezonesRoutes.patch(
  '/world-clock/cities/:cityId',
  zValidator(
    'json',
    z.object({
      label: z.string().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const cityId = c.req.param('cityId');
    const body = c.req.valid('json');

    const id = await convex.mutation(api.timezones.updateSavedClockLabel, {
      userId,
      cityId: cityId as any,
      label: body.label,
    });

    return c.json({ data: { id } });
  }
);

/**
 * Reorder world clock cities
 * PUT /timezones/world-clock/order
 */
timezonesRoutes.put(
  '/world-clock/order',
  zValidator(
    'json',
    z.object({
      orderedCityIds: z.array(z.string()),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const id = await convex.mutation(api.timezones.reorderSavedClocks, {
      userId,
      orderedCityIds: body.orderedCityIds as any[],
    });

    return c.json({ data: { id } });
  }
);

/**
 * Convert time between timezones
 * GET /timezones/convert?from=Asia/Shanghai&to=America/New_York&time=2024-01-15T10:00:00
 */
timezonesRoutes.get(
  '/convert',
  zValidator(
    'query',
    z.object({
      from: z.string(),
      to: z.string(),
      time: z.string().optional(), // ISO 8601 format, defaults to now
    })
  ),
  async (c) => {
    const { from, to, time } = c.req.valid('query');

    // Parse the input time or use current time
    const inputDate = time ? new Date(time) : new Date();

    // Format in source timezone
    const sourceFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: from,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Format in target timezone
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: to,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Get timezone offsets
    const getOffset = (tz: string, date: Date): number => {
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
      return (tzDate.getTime() - utcDate.getTime()) / 60000; // in minutes
    };

    const fromOffset = getOffset(from, inputDate);
    const toOffset = getOffset(to, inputDate);
    const diffMinutes = toOffset - fromOffset;

    const diffHours = Math.floor(Math.abs(diffMinutes) / 60);
    const diffMins = Math.abs(diffMinutes) % 60;
    const isAhead = diffMinutes >= 0;

    const sign = isAhead ? '+' : '-';
    const formatted = diffMins > 0
      ? `${sign}${diffHours}:${diffMins.toString().padStart(2, '0')}`
      : `${sign}${diffHours}:00`;

    return c.json({
      data: {
        sourceTime: sourceFormatter.format(inputDate),
        sourceTimezone: from,
        targetTime: targetFormatter.format(inputDate),
        targetTimezone: to,
        difference: {
          hours: diffHours,
          minutes: diffMins,
          isAhead,
          formatted,
          totalMinutes: diffMinutes,
        },
      },
    });
  }
);

/**
 * Get current time in multiple timezones
 * POST /timezones/current
 */
timezonesRoutes.post(
  '/current',
  zValidator(
    'json',
    z.object({
      timezones: z.array(z.string()),
      format: z.enum(['12h', '24h']).optional().default('24h'),
    })
  ),
  async (c) => {
    const { timezones, format } = c.req.valid('json');
    const now = new Date();

    const results = timezones.map((tz) => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: format === '12h',
        });

        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

        return {
          timezone: tz,
          time: formatter.format(now),
          date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
          hour: getPart('hour'),
          minute: getPart('minute'),
          second: getPart('second'),
          dayPeriod: format === '12h' ? getPart('dayPeriod') : undefined,
        };
      } catch {
        return {
          timezone: tz,
          error: 'Invalid timezone',
        };
      }
    });

    return c.json({ data: results });
  }
);
