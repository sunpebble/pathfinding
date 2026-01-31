/**
 * City entity - destination city reference data
 */
export interface City {
  id: string;
  name: string;
  nameEn?: string;
  timezone: string; // IANA timezone identifier (e.g., "Asia/Shanghai")
  countryCode: string;
  latitude: number;
  longitude: number;
  // Extended timezone information
  utcOffset?: number; // Standard UTC offset in minutes (e.g., 480 for +08:00)
  dstOffset?: number; // DST UTC offset in minutes (if applicable)
  observesDst?: boolean; // Whether the city observes daylight saving time
  createdAt: Date;
}

/**
 * City input for creating a new city
 */
export type CreateCityInput = Omit<City, 'id' | 'createdAt'>;

/**
 * City update input for partial updates
 */
export type UpdateCityInput = Partial<Omit<City, 'id' | 'createdAt'>>;

/**
 * Timezone info for a city (simplified for UI)
 */
export interface CityTimezoneInfo {
  id: string;
  name: string;
  nameEn?: string;
  timezone: string;
  utcOffset?: number;
  dstOffset?: number;
  observesDst?: boolean;
  countryCode: string;
}

/**
 * User timezone settings
 */
export interface UserTimezoneSettings {
  userId: string;
  homeTimezone: string;
  homeCityId?: string;
  displayFormat: '12h' | '24h';
  showSeconds: boolean;
  autoDetect: boolean;
  savedClocks: SavedClock[];
  createdAt: number;
  updatedAt: number;
}

/**
 * A saved clock in the user's world clock
 */
export interface SavedClock {
  cityId: string;
  label?: string;
  sortOrder: number;
}

/**
 * World clock display item (city with timezone info)
 */
export interface WorldClockItem {
  city: City;
  label?: string;
  sortOrder: number;
}

/**
 * Full world clock response
 */
export interface WorldClockResponse {
  settings: {
    homeTimezone: string;
    displayFormat: '12h' | '24h';
    showSeconds: boolean;
    autoDetect: boolean;
  } | null;
  homeCity: City | null;
  clocks: WorldClockItem[];
}

/**
 * Time difference between two timezones
 */
export interface TimeDifference {
  hours: number;
  minutes: number;
  isAhead: boolean; // true if destination is ahead of origin
  formatted: string; // e.g., "+8:00" or "-5:30"
}

// ============================================
// City Encyclopedia Types
// ============================================

/**
 * Season for best travel time
 */
export type TravelSeason = 'spring' | 'summer' | 'autumn' | 'winter' | 'all_year';

/**
 * Best travel time information
 */
export interface BestTravelTime {
  seasons: TravelSeason[];
  months: number[]; // 1-12
  description: string;
  descriptionEn?: string;
  weatherNotes?: string;
  crowdLevel?: 'low' | 'medium' | 'high';
  priceLevel?: 'low' | 'medium' | 'high';
}

/**
 * Local custom or taboo
 */
export interface LocalCustom {
  category: 'etiquette' | 'religion' | 'dining' | 'dress' | 'gift' | 'gesture' | 'general';
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  isTaboo: boolean; // true if this is something to avoid
  importance: 'low' | 'medium' | 'high';
}

/**
 * Practical travel information
 */
export interface PracticalInfo {
  voltage: string; // e.g., "220V"
  plugType: string[]; // e.g., ["Type A", "Type C"]
  currency: string; // e.g., "CNY"
  currencySymbol: string; // e.g., "¥"
  currencyNameLocal: string; // e.g., "人民币"
  currencyNameEn: string; // e.g., "Chinese Yuan"
  tippingCustom: string;
  tippingCustomEn?: string;
  waterSafety: 'safe' | 'boil' | 'bottled'; // tap water safety
  waterSafetyNote?: string;
  visaRequired?: boolean;
  visaNote?: string;
  languageOfficial: string[]; // e.g., ["Chinese"]
  languageCommon: string[]; // commonly spoken languages
  emergencyNumber: string; // e.g., "110"
  ambulanceNumber: string; // e.g., "120"
  fireNumber: string; // e.g., "119"
  touristHotline?: string;
}

/**
 * City history and culture information
 */
export interface CityHistory {
  foundedYear?: number;
  historicalNames?: string[];
  briefHistory: string;
  briefHistoryEn?: string;
  culturalHighlights: string[];
  culturalHighlightsEn?: string[];
  famousFor: string[];
  famousForEn?: string[];
  worldHeritageSites?: string[];
}

/**
 * City basic information
 */
export interface CityBasicInfo {
  population?: number;
  populationYear?: number;
  area?: number; // in square kilometers
  elevation?: number; // in meters
  climate?: string; // e.g., "Humid subtropical"
  climateEn?: string;
  motto?: string;
  mottoEn?: string;
  nicknames?: string[];
  nicknamesEn?: string[];
}

/**
 * Complete city encyclopedia data
 */
export interface CityEncyclopedia {
  id: string;
  cityId: string;
  basicInfo?: CityBasicInfo;
  history?: CityHistory;
  bestTravelTime?: BestTravelTime;
  customs: LocalCustom[];
  practicalInfo?: PracticalInfo;
  lastUpdatedAt: number;
  sources?: string[];
}

/**
 * City with encyclopedia data
 */
export interface CityWithEncyclopedia extends City {
  encyclopedia?: CityEncyclopedia;
}
