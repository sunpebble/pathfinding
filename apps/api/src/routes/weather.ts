/**
 * Weather Routes
 * API endpoints for weather forecasts, alerts, and recommendations
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { WeatherService } from '../services/weatherService';

export const weatherRoutes = new Hono();

// Validation schemas
const CoordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

const ForecastQuerySchema = CoordinatesSchema.extend({
  force_refresh: z.enum(['true', 'false']).optional(),
});

const DailyQuerySchema = CoordinatesSchema.extend({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const RecommendationsQuerySchema = CoordinatesSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * GET /weather/forecast
 * Get weather forecast for a location
 */
weatherRoutes.get(
  '/forecast',
  zValidator('query', ForecastQuerySchema),
  async (c) => {
    const { lat, lon, force_refresh } = c.req.valid('query');

    try {
      const forecast = await WeatherService.getForecast(
        lat,
        lon,
        force_refresh === 'true'
      );

      if (!forecast) {
        return c.json(
          { error: 'Weather service is currently unavailable' },
          503
        );
      }

      return c.json({
        data: forecast,
        cached: forecast.fetchedAt < Date.now() - 60000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /weather/daily
 * Get daily weather for a date range
 */
weatherRoutes.get(
  '/daily',
  zValidator('query', DailyQuerySchema),
  async (c) => {
    const { lat, lon, start_date, end_date } = c.req.valid('query');

    // Validate date range (max 14 days for weather forecast)
    const start = new Date(start_date);
    const end = new Date(end_date);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 0) {
      return c.json({ error: 'end_date must be after start_date' }, 400);
    }

    if (daysDiff > 14) {
      return c.json(
        { error: 'Date range cannot exceed 14 days for weather forecasts' },
        400
      );
    }

    try {
      const dailyWeather = await WeatherService.getDailyWeather(
        lat,
        lon,
        start_date,
        end_date
      );

      return c.json({
        data: dailyWeather,
        date_range: {
          start: start_date,
          end: end_date,
        },
        count: dailyWeather.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /weather/recommendations
 * Get weather-based recommendations (clothing, activities)
 */
weatherRoutes.get(
  '/recommendations',
  zValidator('query', RecommendationsQuerySchema),
  async (c) => {
    const { lat, lon, date } = c.req.valid('query');

    try {
      const result = await WeatherService.getRecommendations(lat, lon, date);

      if (!result) {
        return c.json(
          { error: 'Weather recommendations are not available' },
          503
        );
      }

      return c.json({ data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /weather/alerts
 * Get weather alerts for a location
 */
weatherRoutes.get(
  '/alerts',
  zValidator('query', CoordinatesSchema),
  async (c) => {
    const { lat, lon } = c.req.valid('query');

    try {
      const result = await WeatherService.getAlerts(lat, lon);

      if (!result) {
        return c.json(
          { error: 'Weather alerts are not available' },
          503
        );
      }

      return c.json({ data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /weather/itinerary/:guideId
 * Get weather forecast for an itinerary's dates and location
 */
weatherRoutes.get('/itinerary/:guideId', async (c) => {
  const guideId = c.req.param('guideId');

  if (!guideId) {
    return c.json({ error: 'Guide ID is required' }, 400);
  }

  try {
    const result = await WeatherService.getItineraryWeather(guideId);

    if (!result) {
      return c.json(
        { error: 'Weather data for this itinerary is not available' },
        404
      );
    }

    return c.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

export default weatherRoutes;
