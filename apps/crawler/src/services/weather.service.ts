/**
 * Weather Service
 * Integrates with OpenWeatherMap API for weather forecasts
 * Includes caching and clothing/activity recommendations
 */

import { api, convex } from '../lib/convex.js';

// OpenWeatherMap API configuration
const OPENWEATHERMAP_API_URL = 'https://api.openweathermap.org/data/3.0/onecall';
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY || '';

// Cache TTL: 1 hour for weather data
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Weather condition codes from OpenWeatherMap
 * https://openweathermap.org/weather-conditions
 */
export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'fog'
  | 'haze'
  | 'dust'
  | 'smoke';

export interface DailyWeather {
  date: string; // ISO date string YYYY-MM-DD
  timestamp: number; // Unix timestamp
  condition: WeatherCondition;
  conditionDescription: string;
  icon: string;
  tempMin: number; // Celsius
  tempMax: number; // Celsius
  tempMorning: number;
  tempDay: number;
  tempEvening: number;
  tempNight: number;
  feelsLikeDay: number;
  humidity: number; // Percentage
  windSpeed: number; // m/s
  windDirection: number; // Degrees
  precipitation: number; // mm
  precipitationProbability: number; // 0-1
  uvIndex: number;
  sunrise: number; // Unix timestamp
  sunset: number; // Unix timestamp
  cloudiness: number; // Percentage
  pressure: number; // hPa
}

export interface WeatherAlert {
  event: string;
  sender: string;
  start: number; // Unix timestamp
  end: number; // Unix timestamp
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffset: number;
  current?: DailyWeather;
  daily: DailyWeather[];
  alerts: WeatherAlert[];
  fetchedAt: number;
}

export interface ClothingSuggestion {
  category: string;
  items: string[];
  reason: string;
}

export interface ActivitySuitability {
  activity: string;
  suitability: 'excellent' | 'good' | 'fair' | 'poor';
  reason: string;
  icon: string;
}

export interface WeatherRecommendation {
  date: string;
  clothing: ClothingSuggestion[];
  activities: ActivitySuitability[];
  tips: string[];
}

/**
 * Map OpenWeatherMap condition ID to our condition type
 */
function mapConditionId(id: number): WeatherCondition {
  if (id >= 200 && id < 300) return 'thunderstorm';
  if (id >= 300 && id < 400) return 'drizzle';
  if (id >= 500 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id === 701) return 'mist';
  if (id === 711) return 'smoke';
  if (id === 721) return 'haze';
  if (id === 731 || id === 761) return 'dust';
  if (id === 741) return 'fog';
  if (id >= 801) return 'clouds';
  return 'clear';
}

/**
 * Map severity from alert tags
 */
function mapAlertSeverity(
  tags?: string[]
): 'minor' | 'moderate' | 'severe' | 'extreme' {
  if (!tags || tags.length === 0) return 'minor';
  const tagStr = tags.join(' ').toLowerCase();
  if (tagStr.includes('extreme') || tagStr.includes('emergency')) return 'extreme';
  if (tagStr.includes('severe') || tagStr.includes('warning')) return 'severe';
  if (tagStr.includes('moderate') || tagStr.includes('watch')) return 'moderate';
  return 'minor';
}

/**
 * Generate clothing suggestions based on weather
 */
function generateClothingSuggestions(weather: DailyWeather): ClothingSuggestion[] {
  const suggestions: ClothingSuggestion[] = [];
  const avgTemp = (weather.tempMin + weather.tempMax) / 2;

  // Temperature-based clothing
  if (avgTemp < 5) {
    suggestions.push({
      category: '保暖外套',
      items: ['羽绒服', '厚毛衣', '保暖内衣', '围巾', '手套', '帽子'],
      reason: `气温较低(${weather.tempMin.toFixed(0)}-${weather.tempMax.toFixed(0)}°C)，需要做好保暖`,
    });
  } else if (avgTemp < 15) {
    suggestions.push({
      category: '外套',
      items: ['夹克', '风衣', '薄毛衣', '长裤'],
      reason: `气温适中偏凉(${weather.tempMin.toFixed(0)}-${weather.tempMax.toFixed(0)}°C)，建议穿着外套`,
    });
  } else if (avgTemp < 25) {
    suggestions.push({
      category: '轻便服装',
      items: ['T恤', '衬衫', '薄外套', '长裤或短裤'],
      reason: `气温舒适(${weather.tempMin.toFixed(0)}-${weather.tempMax.toFixed(0)}°C)，穿着轻便即可`,
    });
  } else {
    suggestions.push({
      category: '夏季服装',
      items: ['短袖', '短裤', '裙子', '凉鞋'],
      reason: `气温较高(${weather.tempMin.toFixed(0)}-${weather.tempMax.toFixed(0)}°C)，建议穿着清凉`,
    });
  }

  // Rain gear
  if (
    weather.precipitationProbability > 0.3 ||
    weather.condition === 'rain' ||
    weather.condition === 'drizzle' ||
    weather.condition === 'thunderstorm'
  ) {
    suggestions.push({
      category: '雨具',
      items: ['雨伞', '雨衣', '防水鞋'],
      reason: `降水概率${(weather.precipitationProbability * 100).toFixed(0)}%，��议携带雨具`,
    });
  }

  // Sun protection
  if (weather.uvIndex >= 6 || weather.condition === 'clear') {
    suggestions.push({
      category: '防晒用品',
      items: ['防晒霜', '太阳镜', '遮阳帽'],
      reason: `紫外线指数${weather.uvIndex.toFixed(1)}，注意防晒`,
    });
  }

  // Wind protection
  if (weather.windSpeed > 8) {
    suggestions.push({
      category: '防风装备',
      items: ['防风外套', '围巾'],
      reason: `风速较大(${weather.windSpeed.toFixed(1)}m/s)，注意防风`,
    });
  }

  return suggestions;
}

/**
 * Generate activity suitability based on weather
 */
function generateActivitySuitability(weather: DailyWeather): ActivitySuitability[] {
  const activities: ActivitySuitability[] = [];
  const avgTemp = (weather.tempMin + weather.tempMax) / 2;
  const isRainy =
    weather.condition === 'rain' ||
    weather.condition === 'drizzle' ||
    weather.condition === 'thunderstorm';
  const isSnowy = weather.condition === 'snow';
  const isClear = weather.condition === 'clear' || weather.condition === 'clouds';

  // Outdoor sightseeing
  if (isClear && avgTemp >= 10 && avgTemp <= 28 && weather.windSpeed < 10) {
    activities.push({
      activity: '户外观光',
      suitability: 'excellent',
      reason: '天气晴好，非常适���户外游览',
      icon: 'sun.max',
    });
  } else if (!isRainy && !isSnowy && avgTemp >= 5 && avgTemp <= 32) {
    activities.push({
      activity: '户外观光',
      suitability: 'good',
      reason: '天气尚可，适合户外活动',
      icon: 'cloud.sun',
    });
  } else if (isRainy) {
    activities.push({
      activity: '户外观光',
      suitability: 'poor',
      reason: '有降雨，不太适合户外活动',
      icon: 'cloud.rain',
    });
  } else {
    activities.push({
      activity: '户外观光',
      suitability: 'fair',
      reason: '天气条件一般，可酌情安排',
      icon: 'cloud',
    });
  }

  // Photography
  if (isClear && weather.uvIndex < 8) {
    activities.push({
      activity: '摄影',
      suitability: 'excellent',
      reason: '光线条件好，适合拍照',
      icon: 'camera',
    });
  } else if (!isRainy) {
    activities.push({
      activity: '摄影',
      suitability: 'good',
      reason: '光线条件尚可',
      icon: 'camera',
    });
  } else {
    activities.push({
      activity: '摄影',
      suitability: 'fair',
      reason: '光线较暗，可能需要调整相机设置',
      icon: 'camera',
    });
  }

  // Hiking
  if (isClear && avgTemp >= 10 && avgTemp <= 25 && weather.windSpeed < 8) {
    activities.push({
      activity: '徒步/登山',
      suitability: 'excellent',
      reason: '天气适宜，非常适合徒步',
      icon: 'figure.hiking',
    });
  } else if (!isRainy && !isSnowy && avgTemp >= 5 && avgTemp <= 30) {
    activities.push({
      activity: '徒步/登山',
      suitability: 'good',
      reason: '天气条件可以接受',
      icon: 'figure.hiking',
    });
  } else {
    activities.push({
      activity: '徒步/登山',
      suitability: 'poor',
      reason: '天气不佳，建议改期或选择室内活动',
      icon: 'figure.hiking',
    });
  }

  // Indoor activities
  if (isRainy || isSnowy || avgTemp < 5 || avgTemp > 35) {
    activities.push({
      activity: '室内活动',
      suitability: 'excellent',
      reason: '天气不适合户外，推荐室内活动',
      icon: 'building.2',
    });
  } else {
    activities.push({
      activity: '室内活动',
      suitability: 'good',
      reason: '可作为备选方案',
      icon: 'building.2',
    });
  }

  // Beach/Water activities
  if (avgTemp >= 25 && isClear && weather.windSpeed < 6) {
    activities.push({
      activity: '海滩/水上活动',
      suitability: 'excellent',
      reason: '天气炎热晴朗，适合水上活动',
      icon: 'beach.umbrella',
    });
  } else if (avgTemp >= 20 && !isRainy) {
    activities.push({
      activity: '海滩/水上活动',
      suitability: 'fair',
      reason: '温度稍低，可酌情考虑',
      icon: 'beach.umbrella',
    });
  }

  return activities;
}

/**
 * Generate weather tips
 */
function generateWeatherTips(weather: DailyWeather): string[] {
  const tips: string[] = [];
  const avgTemp = (weather.tempMin + weather.tempMax) / 2;

  // Temperature tips
  if (weather.tempMax - weather.tempMin > 10) {
    tips.push(`早晚温差大(${weather.tempMin.toFixed(0)}°C-${weather.tempMax.toFixed(0)}°C)，建议带一件外套`);
  }

  // UV tips
  if (weather.uvIndex >= 8) {
    tips.push(`紫外线很强(指数${weather.uvIndex.toFixed(1)})，请做好防晒措施`);
  } else if (weather.uvIndex >= 6) {
    tips.push(`紫外线较强(指数${weather.uvIndex.toFixed(1)})，建议涂抹防晒霜`);
  }

  // Rain tips
  if (weather.precipitationProbability > 0.5) {
    tips.push(`降雨概率较高(${(weather.precipitationProbability * 100).toFixed(0)}%)，请携带雨具`);
  }

  // Wind tips
  if (weather.windSpeed > 10) {
    tips.push(`风力较大(${weather.windSpeed.toFixed(1)}m/s)，户外活动请注意安全`);
  }

  // Humidity tips
  if (weather.humidity > 80 && avgTemp > 25) {
    tips.push(`湿度较高(${weather.humidity}%)，体感会比较闷热`);
  } else if (weather.humidity < 30) {
    tips.push(`空气干燥(湿度${weather.humidity}%)，注意补充水分`);
  }

  // Sunrise/sunset tips
  const sunriseTime = new Date(weather.sunrise * 1000);
  const sunsetTime = new Date(weather.sunset * 1000);
  tips.push(
    `日出${sunriseTime.getHours().toString().padStart(2, '0')}:${sunriseTime.getMinutes().toString().padStart(2, '0')}，日落${sunsetTime.getHours().toString().padStart(2, '0')}:${sunsetTime.getMinutes().toString().padStart(2, '0')}`
  );

  return tips;
}

/**
 * Weather Service class
 */
export class WeatherService {
  private memoryCache = new Map<
    string,
    { data: WeatherForecast; timestamp: number }
  >();

  /**
   * Generate cache key from coordinates
   */
  private getCacheKey(lat: number, lon: number): string {
    // Round to 2 decimal places for cache key (about 1km precision)
    return `${lat.toFixed(2)},${lon.toFixed(2)}`;
  }

  /**
   * Check memory cache
   */
  private getFromMemoryCache(key: string): WeatherForecast | null {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set memory cache
   */
  private setMemoryCache(key: string, data: WeatherForecast): void {
    this.memoryCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Fetch weather from OpenWeatherMap API
   */
  private async fetchFromApi(
    lat: number,
    lon: number
  ): Promise<WeatherForecast | null> {
    if (!OPENWEATHERMAP_API_KEY) {
      console.error('OpenWeatherMap API key not configured');
      return null;
    }

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        appid: OPENWEATHERMAP_API_KEY,
        units: 'metric',
        lang: 'zh_cn',
        exclude: 'minutely,hourly', // We only need current and daily
      });

      const response = await fetch(`${OPENWEATHERMAP_API_URL}?${params}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error(`OpenWeatherMap API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Transform API response to our format
      const forecast: WeatherForecast = {
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        timezoneOffset: data.timezone_offset,
        daily: (data.daily || []).map((day: any) => {
          const date = new Date(day.dt * 1000);
          return {
            date: date.toISOString().split('T')[0],
            timestamp: day.dt,
            condition: mapConditionId(day.weather?.[0]?.id || 800),
            conditionDescription: day.weather?.[0]?.description || '',
            icon: day.weather?.[0]?.icon || '01d',
            tempMin: day.temp?.min || 0,
            tempMax: day.temp?.max || 0,
            tempMorning: day.temp?.morn || 0,
            tempDay: day.temp?.day || 0,
            tempEvening: day.temp?.eve || 0,
            tempNight: day.temp?.night || 0,
            feelsLikeDay: day.feels_like?.day || 0,
            humidity: day.humidity || 0,
            windSpeed: day.wind_speed || 0,
            windDirection: day.wind_deg || 0,
            precipitation: day.rain || day.snow || 0,
            precipitationProbability: day.pop || 0,
            uvIndex: day.uvi || 0,
            sunrise: day.sunrise || 0,
            sunset: day.sunset || 0,
            cloudiness: day.clouds || 0,
            pressure: day.pressure || 0,
          } as DailyWeather;
        }),
        alerts: (data.alerts || []).map((alert: any) => ({
          event: alert.event || '',
          sender: alert.sender_name || '',
          start: alert.start || 0,
          end: alert.end || 0,
          description: alert.description || '',
          severity: mapAlertSeverity(alert.tags),
        })),
        fetchedAt: Date.now(),
      };

      // Set current weather from first daily entry if available
      if (forecast.daily.length > 0) {
        forecast.current = forecast.daily[0];
      }

      return forecast;
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      return null;
    }
  }

  /**
   * Get weather forecast for a location
   */
  async getWeatherForecast(
    lat: number,
    lon: number,
    options?: { forceRefresh?: boolean }
  ): Promise<WeatherForecast | null> {
    const cacheKey = this.getCacheKey(lat, lon);

    // Check memory cache first
    if (!options?.forceRefresh) {
      const memoryCached = this.getFromMemoryCache(cacheKey);
      if (memoryCached) {
        return memoryCached;
      }

      // Check Convex cache
      try {
        const dbCached = await convex.query(api.weatherCache.get, {
          latitude: lat,
          longitude: lon,
        });

        if (dbCached && Date.now() - dbCached.fetchedAt < CACHE_TTL_MS) {
          const forecast = dbCached.data as WeatherForecast;
          this.setMemoryCache(cacheKey, forecast);
          return forecast;
        }
      } catch (error) {
        console.warn('Failed to check weather cache:', error);
      }
    }

    // Fetch from API
    const forecast = await this.fetchFromApi(lat, lon);

    if (forecast) {
      // Update caches
      this.setMemoryCache(cacheKey, forecast);

      try {
        await convex.mutation(api.weatherCache.upsert, {
          latitude: lat,
          longitude: lon,
          data: forecast as any,
          fetchedAt: forecast.fetchedAt,
        });
      } catch (error) {
        console.warn('Failed to cache weather data:', error);
      }
    }

    return forecast;
  }

  /**
   * Get weather for a specific date range
   */
  async getWeatherForDateRange(
    lat: number,
    lon: number,
    startDate: string,
    endDate: string
  ): Promise<DailyWeather[]> {
    const forecast = await this.getWeatherForecast(lat, lon);
    if (!forecast) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    return forecast.daily.filter((day) => {
      const date = new Date(day.date);
      return date >= start && date <= end;
    });
  }

  /**
   * Get weather recommendations for a specific date
   */
  getWeatherRecommendation(weather: DailyWeather): WeatherRecommendation {
    return {
      date: weather.date,
      clothing: generateClothingSuggestions(weather),
      activities: generateActivitySuitability(weather),
      tips: generateWeatherTips(weather),
    };
  }

  /**
   * Get weather recommendations for multiple days
   */
  getWeatherRecommendations(
    dailyWeather: DailyWeather[]
  ): WeatherRecommendation[] {
    return dailyWeather.map((weather) => this.getWeatherRecommendation(weather));
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { memoryCacheSize: number } {
    return {
      memoryCacheSize: this.memoryCache.size,
    };
  }
}

// Singleton instance
let weatherServiceInstance: WeatherService | null = null;

export function getWeatherService(): WeatherService {
  if (!weatherServiceInstance) {
    weatherServiceInstance = new WeatherService();
  }
  return weatherServiceInstance;
}

export default WeatherService;
