/**
 * Astronomy Types
 * Types for sunrise/sunset times, golden hour, and astronomical events
 */

/**
 * Sun times for a specific location and date
 */
export interface SunTimes {
  date: string; // ISO date string (YYYY-MM-DD)
  latitude: number;
  longitude: number;
  timezone: string;

  // Core sun times (ISO datetime strings)
  sunrise: string;
  sunset: string;
  solarNoon: string;

  // Twilight times
  civilDawn: string; // Civil twilight start
  civilDusk: string; // Civil twilight end
  nauticalDawn: string;
  nauticalDusk: string;
  astronomicalDawn: string;
  astronomicalDusk: string;

  // Photography golden/blue hours
  goldenHourMorningStart: string;
  goldenHourMorningEnd: string;
  goldenHourEveningStart: string;
  goldenHourEveningEnd: string;
  blueHourMorningStart: string;
  blueHourMorningEnd: string;
  blueHourEveningStart: string;
  blueHourEveningEnd: string;

  // Day length
  dayLengthMinutes: number;
}

/**
 * Moon phase information
 */
export interface MoonPhase {
  date: string;
  phase: MoonPhaseName;
  illumination: number; // 0-100 percentage
  age: number; // Days since new moon
  emoji: string;
}

export type MoonPhaseName
  = | 'new_moon'
    | 'waxing_crescent'
    | 'first_quarter'
    | 'waxing_gibbous'
    | 'full_moon'
    | 'waning_gibbous'
    | 'last_quarter'
    | 'waning_crescent';

/**
 * Astronomical event types
 */
export type AstronomicalEventType
  = | 'solar_eclipse'
    | 'lunar_eclipse'
    | 'meteor_shower'
    | 'planet_conjunction'
    | 'supermoon'
    | 'blue_moon'
    | 'equinox'
    | 'solstice';

/**
 * Astronomical event
 */
export interface AstronomicalEvent {
  id: string;
  type: AstronomicalEventType;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  startDate: string;
  endDate?: string;
  peakDate?: string;
  visibility: EventVisibility;
  bestViewingLocations?: string[];
  tips?: string[];
  tipsZh?: string[];
}

export type EventVisibility
  = | 'global'
    | 'northern_hemisphere'
    | 'southern_hemisphere'
    | 'regional';

/**
 * Stargazing location recommendation
 */
export interface StargazingSpot {
  id: string;
  name: string;
  nameZh: string;
  description?: string;
  descriptionZh?: string;
  latitude: number;
  longitude: number;
  address?: string;
  lightPollutionLevel: LightPollutionLevel;
  bortleScale: number; // 1-9, lower is better
  altitude?: number; // meters
  bestSeasons?: string[];
  facilities?: string[];
  tips?: string[];
  tipsZh?: string[];
  imageUrl?: string;
}

export type LightPollutionLevel = 'excellent' | 'good' | 'moderate' | 'poor';

/**
 * Photography reminder for golden hour
 */
export interface PhotographyReminder {
  id: string;
  type:
    | 'golden_hour_morning'
    | 'golden_hour_evening'
    | 'blue_hour_morning'
    | 'blue_hour_evening'
    | 'sunrise'
    | 'sunset';
  locationName: string;
  latitude: number;
  longitude: number;
  date: string;
  startTime: string;
  endTime: string;
  notifyMinutesBefore: number;
}

/**
 * Request parameters for sun times
 */
export interface SunTimesRequest {
  latitude: number;
  longitude: number;
  date?: string; // ISO date, defaults to today
  timezone?: string; // IANA timezone, auto-detected if not provided
}

/**
 * Request parameters for sun times range
 */
export interface SunTimesRangeRequest {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  timezone?: string;
}

/**
 * Request parameters for astronomical events
 */
export interface AstronomicalEventsRequest {
  startDate?: string;
  endDate?: string;
  types?: AstronomicalEventType[];
  latitude?: number;
  longitude?: number;
}

/**
 * Request parameters for stargazing spots
 */
export interface StargazingSpotRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  minBortleScale?: number;
  limit?: number;
}

/**
 * Combined astronomy data response
 */
export interface AstronomyData {
  sunTimes: SunTimes;
  moonPhase: MoonPhase;
  upcomingEvents?: AstronomicalEvent[];
  nearbyStargazingSpots?: StargazingSpot[];
}
