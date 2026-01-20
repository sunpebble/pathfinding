/**
 * Weather Query Tool
 * LangChain tool for querying weather forecasts
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY || '';
const OPENWEATHERMAP_BASE_URL = 'https://api.openweathermap.org/data/3.0';

// In-memory cache (shared with routes)
const weatherCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchWeather(lat: number, lon: number): Promise<any> {
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
 * Weather query tool for LangChain agents
 */
export const weatherQueryTool = tool(
  async ({ latitude, longitude, date }) => {
    try {
      const forecast = await fetchWeather(latitude, longitude);

      // If date is provided, find the specific day's forecast
      if (date) {
        const targetDate = new Date(date).toDateString();
        const dailyForecast = forecast.daily?.find((day: any) => {
          const dayDate = new Date(day.dt * 1000).toDateString();
          return dayDate === targetDate;
        });

        if (dailyForecast) {
          return JSON.stringify({
            date,
            temp_min: dailyForecast.temp.min,
            temp_max: dailyForecast.temp.max,
            description: dailyForecast.weather?.[0]?.description || '未知',
            humidity: dailyForecast.humidity,
            wind_speed: dailyForecast.wind_speed,
            pop: dailyForecast.pop, // Probability of precipitation
          });
        }
      }

      // Return current weather if no date or date not found
      const current = forecast.current;
      return JSON.stringify({
        temp: current.temp,
        feels_like: current.feels_like,
        description: current.weather?.[0]?.description || '未知',
        humidity: current.humidity,
        wind_speed: current.wind_speed,
        daily_forecast: (forecast.daily || []).slice(0, 5).map((day: any) => ({
          date: new Date(day.dt * 1000).toLocaleDateString('zh-CN'),
          temp_min: day.temp.min,
          temp_max: day.temp.max,
          description: day.weather?.[0]?.description || '未知',
        })),
      });
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Weather service error',
      });
    }
  },
  {
    name: 'weather_query',
    description:
      '查询指定地点的天气预报。可以获取当前天气和未来几天的天气预报。',
    schema: z.object({
      latitude: z.number().min(-90).max(90).describe('纬度 (-90 到 90)'),
      longitude: z.number().min(-180).max(180).describe('经度 (-180 到 180)'),
      date: z
        .string()
        .optional()
        .describe('查询日期 (YYYY-MM-DD 格式)，不填则返回当前和未来几天的天气'),
    }),
  }
);
