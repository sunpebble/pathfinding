/**
 * Weather Service
 * Proxies weather requests to the crawler service
 */

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001';

export interface DailyWeather {
  date: string;
  timestamp: number;
  condition: string;
  conditionDescription: string;
  icon: string;
  tempMin: number;
  tempMax: number;
  tempMorning: number;
  tempDay: number;
  tempEvening: number;
  tempNight: number;
  feelsLikeDay: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
  uvIndex: number;
  sunrise: number;
  sunset: number;
  cloudiness: number;
  pressure: number;
}

export interface WeatherAlert {
  event: string;
  sender: string;
  start: number;
  end: number;
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

export class WeatherService {
  /**
   * Get weather forecast for a location
   */
  static async getForecast(
    lat: number,
    lon: number,
    forceRefresh = false
  ): Promise<WeatherForecast | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });
      if (forceRefresh) {
        params.set('force_refresh', 'true');
      }

      const response = await fetch(
        `${CRAWLER_URL}/api/weather/forecast?${params}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        console.error(`Weather API error: ${response.status}`);
        return null;
      }

      const result = await response.json();
      return result.data as WeatherForecast;
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      return null;
    }
  }

  /**
   * Get daily weather for a date range
   */
  static async getDailyWeather(
    lat: number,
    lon: number,
    startDate: string,
    endDate: string
  ): Promise<DailyWeather[]> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        start_date: startDate,
        end_date: endDate,
      });

      const response = await fetch(
        `${CRAWLER_URL}/api/weather/daily?${params}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.data as DailyWeather[];
    } catch (error) {
      console.error('Failed to fetch daily weather:', error);
      return [];
    }
  }

  /**
   * Get weather recommendations for a location and date
   */
  static async getRecommendations(
    lat: number,
    lon: number,
    date?: string
  ): Promise<{ weather: DailyWeather; recommendation: WeatherRecommendation } | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });
      if (date) {
        params.set('date', date);
      }

      const response = await fetch(
        `${CRAWLER_URL}/api/weather/recommendations?${params}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch weather recommendations:', error);
      return null;
    }
  }

  /**
   * Get weather alerts for a location
   */
  static async getAlerts(
    lat: number,
    lon: number
  ): Promise<{ alerts: WeatherAlert[]; count: number; hasSevere: boolean } | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });

      const response = await fetch(
        `${CRAWLER_URL}/api/weather/alerts?${params}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return {
        alerts: result.data.alerts,
        count: result.data.count,
        hasSevere: result.data.has_severe,
      };
    } catch (error) {
      console.error('Failed to fetch weather alerts:', error);
      return null;
    }
  }

  /**
   * Get weather for an itinerary
   */
  static async getItineraryWeather(
    guideId: string
  ): Promise<{
    guideId: string;
    location: { latitude: number; longitude: number };
    timezone: string;
    alerts: WeatherAlert[];
    days: Array<{
      dayNumber: number;
      weather: DailyWeather;
      recommendation: WeatherRecommendation;
    }>;
  } | null> {
    try {
      const response = await fetch(
        `${CRAWLER_URL}/api/weather/itinerary/${guideId}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return {
        guideId: result.data.guide_id,
        location: result.data.location,
        timezone: result.data.timezone,
        alerts: result.data.alerts,
        days: result.data.days,
      };
    } catch (error) {
      console.error('Failed to fetch itinerary weather:', error);
      return null;
    }
  }
}

export default WeatherService;
