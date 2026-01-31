/**
 * Weather API Routes
 * Endpoints for weather forecasts using OpenWeatherMap
 */

import { Hono } from 'hono';

export const weatherRouter = new Hono();

// OpenWeatherMap configuration
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY || '';
const OPENWEATHERMAP_BASE_URL = 'https://api.openweathermap.org/data/3.0';

interface WeatherAlert {
  severity: string;
  event?: string;
  description?: string;
}

interface DailyForecast {
  dt: number;
  temp: { min: number; max: number };
  humidity?: number;
  wind_speed?: number;
  weather?: Array<{ description?: string }>;
  pop?: number;
}

interface CurrentWeather {
  temp: number;
  humidity?: number;
  wind_speed?: number;
  weather?: Array<{ description?: string }>;
}

interface WeatherData {
  current?: CurrentWeather;
  daily?: DailyForecast[];
  alerts?: WeatherAlert[];
  cached?: boolean;
}

// In-memory cache
const weatherCache = new Map<
  string,
  { data: WeatherData; timestamp: number }
>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get weather from OpenWeatherMap
 */
async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  if (!OPENWEATHERMAP_API_KEY) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const url = `${OPENWEATHERMAP_BASE_URL}/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&lang=zh_cn`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.status}`);
  }

  const data = await response.json();
  weatherCache.set(cacheKey, { data, timestamp: Date.now() });

  return { ...data, cached: false };
}

/**
 * Validate coordinates
 */
function validateCoords(lat: number, lon: number): string | null {
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return 'Valid lat and lon query parameters are required';
  }
  if (lat < -90 || lat > 90) {
    return 'Latitude must be between -90 and 90';
  }
  if (lon < -180 || lon > 180) {
    return 'Longitude must be between -180 and 180';
  }
  return null;
}

// Get weather forecast
weatherRouter.get('/forecast', async (c) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));

  const error = validateCoords(lat, lon);
  if (error) {
    return c.json({ error }, 400);
  }

  try {
    const forecast = await fetchWeather(lat, lon);
    return c.json({ data: forecast });
  }
  catch (err) {
    const message
      = err instanceof Error ? err.message : 'Weather service unavailable';
    return c.json({ error: message }, 503);
  }
});

// Get daily weather
weatherRouter.get('/daily', async (c) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));

  const error = validateCoords(lat, lon);
  if (error) {
    return c.json({ error }, 400);
  }

  try {
    const forecast = await fetchWeather(lat, lon);
    return c.json({
      data: forecast.daily || [],
      count: (forecast.daily || []).length,
    });
  }
  catch (err) {
    const message
      = err instanceof Error ? err.message : 'Weather service unavailable';
    return c.json({ error: message }, 503);
  }
});

// Get weather alerts
weatherRouter.get('/alerts', async (c) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));

  const error = validateCoords(lat, lon);
  if (error) {
    return c.json({ error }, 400);
  }

  try {
    const forecast = await fetchWeather(lat, lon);
    const alerts = forecast.alerts || [];
    return c.json({
      data: {
        alerts,
        count: alerts.length,
        has_severe: alerts.some(
          (a: WeatherAlert) =>
            a.severity === 'severe' || a.severity === 'extreme',
        ),
      },
    });
  }
  catch (err) {
    const message
      = err instanceof Error ? err.message : 'Weather service unavailable';
    return c.json({ error: message }, 503);
  }
});

// Get recommendations based on weather
weatherRouter.get('/recommendations', async (c) => {
  const lat = Number(c.req.query('lat'));
  const lon = Number(c.req.query('lon'));

  const error = validateCoords(lat, lon);
  if (error) {
    return c.json({ error }, 400);
  }

  try {
    const forecast = await fetchWeather(lat, lon);
    const current = forecast.current;

    if (!current) {
      return c.json({ error: 'Weather data unavailable' }, 503);
    }

    // Generate recommendations
    const temp = current.temp;
    const description = current.weather?.[0]?.description || '';

    const recommendations = {
      clothing: [] as string[],
      activities: [] as string[],
      precautions: [] as string[],
    };

    // Clothing
    if (temp < 5) {
      recommendations.clothing.push('厚外套', '围巾', '手套', '保暖内衣');
    }
    else if (temp < 15) {
      recommendations.clothing.push('外套', '长裤', '薄毛衣');
    }
    else if (temp < 25) {
      recommendations.clothing.push('薄外套', '长袖衬衫');
    }
    else {
      recommendations.clothing.push('短袖', '短裤', '凉鞋');
    }

    // Rain check
    if (description.includes('雨') || description.includes('rain')) {
      recommendations.clothing.push('雨伞', '防水外套');
      recommendations.precautions.push('建议携带雨具');
    }

    // Activities
    if (description.includes('晴') || description.includes('clear')) {
      recommendations.activities.push('户外观光', '拍照', '徒步');
    }
    else if (description.includes('阴') || description.includes('cloud')) {
      recommendations.activities.push('室内景点', '博物馆', '购物');
    }

    return c.json({
      data: {
        weather: {
          temp,
          description,
          humidity: current.humidity,
          wind_speed: current.wind_speed,
        },
        recommendations,
      },
    });
  }
  catch (err) {
    const message
      = err instanceof Error ? err.message : 'Weather service unavailable';
    return c.json({ error: message }, 503);
  }
});

// Cache stats
weatherRouter.get('/stats', async (c) => {
  return c.json({
    data: {
      cache_size: weatherCache.size,
      api_configured: !!OPENWEATHERMAP_API_KEY,
      cache_ttl_minutes: CACHE_TTL_MS / 60000,
    },
  });
});

// Clear cache
weatherRouter.post('/cache/clear', async (c) => {
  weatherCache.clear();
  return c.json({ success: true, message: 'Weather cache cleared' });
});

export default weatherRouter;
