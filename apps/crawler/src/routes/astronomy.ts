/**
 * Astronomy Routes
 * API endpoints for sunrise/sunset times, moon phases, and astronomical events
 */

import type { Context } from 'hono';
import { Hono } from 'hono';
import { createLogger } from '../lib/logger.js';
import { getAstronomyService } from '../services/astronomy.service.js';

const logger = createLogger('AstronomyRoutes');

export const astronomyRouter = new Hono();

/**
 * GET /astronomy/sun-times
 * Get sunrise/sunset and related times for a location and date
 *
 * Query params:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - date: ISO date string (optional, defaults to today)
 * - timezone: IANA timezone (optional, auto-detected)
 */
astronomyRouter.get('/sun-times', async (c: Context) => {
  const lat = c.req.query('lat');
  const lng = c.req.query('lng');
  const date = c.req.query('date');
  const timezone = c.req.query('timezone');

  if (!lat || !lng) {
    return c.json({ error: 'Missing required parameters: lat, lng' }, 400);
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return c.json({ error: 'Invalid latitude or longitude' }, 400);
  }

  if (latitude < -90 || latitude > 90) {
    return c.json({ error: 'Latitude must be between -90 and 90' }, 400);
  }

  if (longitude < -180 || longitude > 180) {
    return c.json({ error: 'Longitude must be between -180 and 180' }, 400);
  }

  try {
    const service = getAstronomyService();
    const sunTimes = service.getSunTimes({
      latitude,
      longitude,
      date,
      timezone,
    });

    logger.info('Sun times calculated', {
      latitude,
      longitude,
      date: sunTimes.date,
    });

    return c.json({ data: sunTimes });
  } catch (error) {
    logger.error('Failed to calculate sun times', error as Error);
    return c.json({ error: 'Failed to calculate sun times' }, 500);
  }
});

/**
 * GET /astronomy/sun-times/range
 * Get sunrise/sunset times for a date range
 *
 * Query params:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - timezone: IANA timezone (optional)
 */
astronomyRouter.get('/sun-times/range', async (c: Context) => {
  const lat = c.req.query('lat');
  const lng = c.req.query('lng');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const timezone = c.req.query('timezone');

  if (!lat || !lng || !startDate || !endDate) {
    return c.json(
      { error: 'Missing required parameters: lat, lng, startDate, endDate' },
      400
    );
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return c.json({ error: 'Invalid latitude or longitude' }, 400);
  }

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
    const service = getAstronomyService();
    const sunTimesRange = service.getSunTimesRange({
      latitude,
      longitude,
      startDate,
      endDate,
      timezone,
    });

    logger.info('Sun times range calculated', {
      latitude,
      longitude,
      days: sunTimesRange.length,
    });

    return c.json({ data: sunTimesRange });
  } catch (error) {
    logger.error('Failed to calculate sun times range', error as Error);
    return c.json({ error: 'Failed to calculate sun times range' }, 500);
  }
});

/**
 * GET /astronomy/moon-phase
 * Get moon phase for a specific date
 *
 * Query params:
 * - date: ISO date string (optional, defaults to today)
 */
astronomyRouter.get('/moon-phase', async (c: Context) => {
  const date = c.req.query('date');

  try {
    const service = getAstronomyService();
    const moonPhase = service.getMoonPhase(date);

    return c.json({ data: moonPhase });
  } catch (error) {
    logger.error('Failed to calculate moon phase', error as Error);
    return c.json({ error: 'Failed to calculate moon phase' }, 500);
  }
});

/**
 * GET /astronomy/moon-phases
 * Get moon phases for a date range
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 */
astronomyRouter.get('/moon-phases', async (c: Context) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!startDate || !endDate) {
    return c.json(
      { error: 'Missing required parameters: startDate, endDate' },
      400
    );
  }

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
    const service = getAstronomyService();
    const moonPhases = service.getMoonPhases(startDate, endDate);

    return c.json({ data: moonPhases });
  } catch (error) {
    logger.error('Failed to calculate moon phases', error as Error);
    return c.json({ error: 'Failed to calculate moon phases' }, 500);
  }
});

/**
 * GET /astronomy/events
 * Get upcoming astronomical events
 *
 * Query params:
 * - startDate: ISO date string (optional, defaults to today)
 * - endDate: ISO date string (optional, defaults to 1 year from start)
 * - types: comma-separated event types (optional)
 */
astronomyRouter.get('/events', async (c: Context) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const typesParam = c.req.query('types');

  const types = typesParam
    ? (typesParam.split(',') as ReturnType<typeof getAstronomyService>['getAstronomicalEvents'] extends (
        ...args: infer A
      ) => infer R
        ? A[2]
        : never)
    : undefined;

  try {
    const service = getAstronomyService();
    const events = service.getAstronomicalEvents(startDate, endDate, types);

    logger.info('Astronomical events retrieved', { count: events.length });

    return c.json({ data: events });
  } catch (error) {
    logger.error('Failed to get astronomical events', error as Error);
    return c.json({ error: 'Failed to get astronomical events' }, 500);
  }
});

/**
 * GET /astronomy/stargazing-spots
 * Get stargazing spots near a location
 *
 * Query params:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - radiusKm: search radius in km (optional, default 100)
 * - limit: max results (optional, default 10)
 */
astronomyRouter.get('/stargazing-spots', async (c: Context) => {
  const lat = c.req.query('lat');
  const lng = c.req.query('lng');
  const radiusKmParam = c.req.query('radiusKm');
  const limitParam = c.req.query('limit');

  if (!lat || !lng) {
    return c.json({ error: 'Missing required parameters: lat, lng' }, 400);
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return c.json({ error: 'Invalid latitude or longitude' }, 400);
  }

  const radiusKm = radiusKmParam ? Number.parseFloat(radiusKmParam) : 100;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;

  try {
    const service = getAstronomyService();
    const spots = service.getStargazingSpots(latitude, longitude, radiusKm, limit);

    logger.info('Stargazing spots retrieved', {
      latitude,
      longitude,
      radiusKm,
      count: spots.length,
    });

    return c.json({ data: spots });
  } catch (error) {
    logger.error('Failed to get stargazing spots', error as Error);
    return c.json({ error: 'Failed to get stargazing spots' }, 500);
  }
});

/**
 * GET /astronomy/combined
 * Get combined astronomy data for a location and date
 * Includes sun times, moon phase, upcoming events, and nearby stargazing spots
 *
 * Query params:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - date: ISO date string (optional, defaults to today)
 * - timezone: IANA timezone (optional)
 * - includeEvents: whether to include events (optional, default true)
 * - includeSpots: whether to include stargazing spots (optional, default true)
 */
astronomyRouter.get('/combined', async (c: Context) => {
  const lat = c.req.query('lat');
  const lng = c.req.query('lng');
  const date = c.req.query('date');
  const timezone = c.req.query('timezone');
  const includeEvents = c.req.query('includeEvents') !== 'false';
  const includeSpots = c.req.query('includeSpots') !== 'false';

  if (!lat || !lng) {
    return c.json({ error: 'Missing required parameters: lat, lng' }, 400);
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return c.json({ error: 'Invalid latitude or longitude' }, 400);
  }

  try {
    const service = getAstronomyService();

    const sunTimes = service.getSunTimes({
      latitude,
      longitude,
      date,
      timezone,
    });

    const moonPhase = service.getMoonPhase(date);

    const result: Record<string, unknown> = {
      sunTimes,
      moonPhase,
    };

    if (includeEvents) {
      // Get events for the next 30 days
      const eventStartDate = date || new Date().toISOString().split('T')[0];
      const eventEnd = new Date(eventStartDate);
      eventEnd.setDate(eventEnd.getDate() + 30);
      result.upcomingEvents = service.getAstronomicalEvents(
        eventStartDate,
        eventEnd.toISOString().split('T')[0]
      );
    }

    if (includeSpots) {
      result.nearbyStargazingSpots = service.getStargazingSpots(
        latitude,
        longitude,
        200,
        5
      );
    }

    logger.info('Combined astronomy data retrieved', {
      latitude,
      longitude,
      date: sunTimes.date,
    });

    return c.json({ data: result });
  } catch (error) {
    logger.error('Failed to get combined astronomy data', error as Error);
    return c.json({ error: 'Failed to get combined astronomy data' }, 500);
  }
});

export default astronomyRouter;
