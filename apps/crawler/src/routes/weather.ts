/**
 * Weather API Routes
 * Endpoints for weather forecasts and recommendations
 */

import type { Context } from 'hono';
import { Hono } from 'hono';
import { Errors } from '../middleware/error-handler.js';
import { getWeatherService } from '../services/weather.service.js';

export const weatherRouter = new Hono();

/**
 * GET /api/weather/forecast
 * Get weather forecast for a location
 * Query params: lat, lon, force_refresh
 */
weatherRouter.get('/forecast', async (c: Context) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));
  const forceRefresh = c.req.query('force_refresh') === 'true';

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw Errors.badRequest('Valid lat and lon query parameters are required');
  }

  if (lat < -90 || lat > 90) {
    throw Errors.badRequest('Latitude must be between -90 and 90');
  }

  if (lon < -180 || lon > 180) {
    throw Errors.badRequest('Longitude must be between -180 and 180');
  }

  const weatherService = getWeatherService();
  const forecast = await weatherService.getWeatherForecast(lat, lon, {
    forceRefresh,
  });

  if (!forecast) {
    throw Errors.serviceUnavailable('Weather service is currently unavailable');
  }

  return c.json({
    data: forecast,
    cached: !forceRefresh && forecast.fetchedAt < Date.now() - 60000,
  });
});

/**
 * GET /api/weather/daily
 * Get daily weather for a date range
 * Query params: lat, lon, start_date, end_date
 */
weatherRouter.get('/daily', async (c: Context) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw Errors.badRequest('Valid lat and lon query parameters are required');
  }

  if (!startDate || !endDate) {
    throw Errors.badRequest('start_date and end_date query parameters are required');
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw Errors.badRequest('Dates must be in YYYY-MM-DD format');
  }

  const weatherService = getWeatherService();
  const dailyWeather = await weatherService.getWeatherForDateRange(
    lat,
    lon,
    startDate,
    endDate
  );

  return c.json({
    data: dailyWeather,
    date_range: {
      start: startDate,
      end: endDate,
    },
    count: dailyWeather.length,
  });
});

/**
 * GET /api/weather/recommendations
 * Get weather-based recommendations (clothing, activities)
 * Query params: lat, lon, date (optional, defaults to today)
 */
weatherRouter.get('/recommendations', async (c: Context) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));
  const date = c.req.query('date');

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw Errors.badRequest('Valid lat and lon query parameters are required');
  }

  const weatherService = getWeatherService();
  const forecast = await weatherService.getWeatherForecast(lat, lon);

  if (!forecast || forecast.daily.length === 0) {
    throw Errors.serviceUnavailable('Weather data is not available');
  }

  let targetWeather = forecast.daily[0]; // Default to today

  if (date) {
    const found = forecast.daily.find((d) => d.date === date);
    if (found) {
      targetWeather = found;
    } else {
      throw Errors.badRequest(
        `Weather data for ${date} is not available. Available dates: ${forecast.daily.map((d) => d.date).join(', ')}`
      );
    }
  }

  const recommendation = weatherService.getWeatherRecommendation(targetWeather);

  return c.json({
    data: {
      weather: targetWeather,
      recommendation,
    },
  });
});

/**
 * GET /api/weather/itinerary/:guideId
 * Get weather forecast for an itinerary's dates and location
 * Uses the first POI's coordinates as the location
 */
weatherRouter.get('/itinerary/:guideId', async (c: Context) => {
  const guideId = c.req.param('guideId');
  const { api, convex } = await import('../lib/convex.js');
  const { Id } = await import('../lib/convex.js');

  // Fetch the guide
  const guide = await convex.query(api.travelGuides.getById, {
    id: guideId as any,
  });

  if (!guide) {
    throw Errors.notFound('Guide');
  }

  // Get coordinates from the first POI
  let lat: number | null = null;
  let lon: number | null = null;

  if (guide.aiDays && guide.aiDays.length > 0) {
    for (const day of guide.aiDays) {
      for (const poi of day.pois) {
        if (poi.latitude && poi.longitude && poi.latitude !== 0 && poi.longitude !== 0) {
          lat = poi.latitude;
          lon = poi.longitude;
          break;
        }
      }
      if (lat && lon) break;
    }
  }

  if (!lat || !lon) {
    throw Errors.badRequest(
      'Guide does not have valid POI coordinates for weather lookup'
    );
  }

  const weatherService = getWeatherService();
  const forecast = await weatherService.getWeatherForecast(lat, lon);

  if (!forecast) {
    throw Errors.serviceUnavailable('Weather service is currently unavailable');
  }

  // Get recommendations for each day
  const recommendations = weatherService.getWeatherRecommendations(forecast.daily);

  // Map weather to itinerary days if available
  const dayCount = guide.aiDays?.length || 0;
  const itineraryWeather = forecast.daily.slice(0, Math.max(dayCount, 7)).map((weather, index) => ({
    dayNumber: index + 1,
    weather,
    recommendation: recommendations[index],
  }));

  return c.json({
    data: {
      guide_id: guideId,
      location: {
        latitude: lat,
        longitude: lon,
      },
      timezone: forecast.timezone,
      alerts: forecast.alerts,
      days: itineraryWeather,
    },
  });
});

/**
 * GET /api/weather/alerts
 * Get weather alerts for a location
 * Query params: lat, lon
 */
weatherRouter.get('/alerts', async (c: Context) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw Errors.badRequest('Valid lat and lon query parameters are required');
  }

  const weatherService = getWeatherService();
  const forecast = await weatherService.getWeatherForecast(lat, lon);

  if (!forecast) {
    throw Errors.serviceUnavailable('Weather service is currently unavailable');
  }

  return c.json({
    data: {
      alerts: forecast.alerts,
      count: forecast.alerts.length,
      has_severe: forecast.alerts.some(
        (a) => a.severity === 'severe' || a.severity === 'extreme'
      ),
    },
  });
});

/**
 * GET /api/weather/stats
 * Get weather service statistics
 */
weatherRouter.get('/stats', async (c: Context) => {
  const weatherService = getWeatherService();
  const stats = weatherService.getCacheStats();

  return c.json({
    data: {
      ...stats,
      api_configured: !!process.env.OPENWEATHERMAP_API_KEY,
    },
  });
});

/**
 * POST /api/weather/cache/clear
 * Clear weather cache
 */
weatherRouter.post('/cache/clear', async (c: Context) => {
  const weatherService = getWeatherService();
  weatherService.clearCache();

  return c.json({
    success: true,
    message: 'Weather cache cleared',
  });
});
