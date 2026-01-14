/**
 * Astronomy Routes
 * API endpoints for sunrise/sunset times, moon phases, and astronomical events
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { AstronomyService } from '../services/astronomyService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const astronomyRoutes = new Hono<{ Variables: Variables }>();

// Validation schemas
const CoordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

const SunTimesQuerySchema = CoordinatesSchema.extend({
  date: DateSchema,
  timezone: z.string().optional(),
});

const SunTimesRangeQuerySchema = CoordinatesSchema.extend({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().optional(),
});

const MoonPhaseQuerySchema = z.object({
  date: DateSchema,
});

const MoonPhasesRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const EventsQuerySchema = z.object({
  startDate: DateSchema,
  endDate: DateSchema,
  types: z.string().optional(), // comma-separated
});

const StargazingSpotsQuerySchema = CoordinatesSchema.extend({
  radiusKm: z.coerce.number().min(1).max(500).optional().default(100),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const CombinedQuerySchema = CoordinatesSchema.extend({
  date: DateSchema,
  timezone: z.string().optional(),
  includeEvents: z.enum(['true', 'false']).optional().default('true'),
  includeSpots: z.enum(['true', 'false']).optional().default('true'),
});

/**
 * GET /astronomy/sun-times
 * Get sunrise/sunset and related times for a location and date
 */
astronomyRoutes.get(
  '/sun-times',
  zValidator('query', SunTimesQuerySchema),
  async (c) => {
    const { lat, lng, date, timezone } = c.req.valid('query');

    try {
      const sunTimes = await AstronomyService.getSunTimes(lat, lng, date, timezone);
      return c.json({ data: sunTimes });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /astronomy/sun-times/range
 * Get sunrise/sunset times for a date range
 */
astronomyRoutes.get(
  '/sun-times/range',
  zValidator('query', SunTimesRangeQuerySchema),
  async (c) => {
    const { lat, lng, startDate, endDate, timezone } = c.req.valid('query');

    // Validate date range (max 90 days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 0) {
      return c.json({ error: 'endDate must be after startDate' }, 400);
    }

    if (daysDiff > 90) {
      return c.json({ error: 'Date range cannot exceed 90 days' }, 400);
    }

    try {
      const sunTimesRange = await AstronomyService.getSunTimesRange(
        lat,
        lng,
        startDate,
        endDate,
        timezone
      );
      return c.json({ data: sunTimesRange });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /astronomy/moon-phase
 * Get moon phase for a specific date
 */
astronomyRoutes.get(
  '/moon-phase',
  zValidator('query', MoonPhaseQuerySchema),
  async (c) => {
    const { date } = c.req.valid('query');

    try {
      const moonPhase = await AstronomyService.getMoonPhase(date);
      return c.json({ data: moonPhase });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /astronomy/moon-phases
 * Get moon phases for a date range
 */
astronomyRoutes.get(
  '/moon-phases',
  zValidator('query', MoonPhasesRangeQuerySchema),
  async (c) => {
    const { startDate, endDate } = c.req.valid('query');

    // Validate date range (max 90 days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 0) {
      return c.json({ error: 'endDate must be after startDate' }, 400);
    }

    if (daysDiff > 90) {
      return c.json({ error: 'Date range cannot exceed 90 days' }, 400);
    }

    try {
      const moonPhases = await AstronomyService.getMoonPhases(startDate, endDate);
      return c.json({ data: moonPhases });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /astronomy/events
 * Get upcoming astronomical events
 */
astronomyRoutes.get(
  '/events',
  zValidator('query', EventsQuerySchema),
  async (c) => {
    const { startDate, endDate, types } = c.req.valid('query');

    try {
      const typesArray = types ? types.split(',') : undefined;
      const events = await AstronomyService.getEvents(startDate, endDate, typesArray);
      return c.json({ data: events });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /astronomy/stargazing-spots
 * Get stargazing spots near a location
 */
astronomyRoutes.get(
  '/stargazing-spots',
  zValidator('query', StargazingSpotsQuerySchema),
  async (c) => {
    const { lat, lng, radiusKm, limit } = c.req.valid('query');

    try {
      const spots = await AstronomyService.getStargazingSpots(lat, lng, radiusKm, limit);
      return c.json({ data: spots });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /astronomy/combined
 * Get combined astronomy data for a location
 */
astronomyRoutes.get(
  '/combined',
  zValidator('query', CombinedQuerySchema),
  async (c) => {
    const { lat, lng, date, timezone, includeEvents, includeSpots } = c.req.valid('query');

    try {
      const data = await AstronomyService.getCombinedData(
        lat,
        lng,
        date,
        timezone,
        includeEvents === 'true',
        includeSpots === 'true'
      );
      return c.json({ data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

export default astronomyRoutes;
