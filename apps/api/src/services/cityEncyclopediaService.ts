/**
 * City Encyclopedia Service - Convex Implementation
 * City information wiki including basic info, history, customs, and practical travel info
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';

// Type definitions
export type TravelSeason =
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'all_year';

export type CrowdLevel = 'low' | 'medium' | 'high';
export type PriceLevel = 'low' | 'medium' | 'high';
export type WaterSafety = 'safe' | 'boil' | 'bottled';
export type CustomImportance = 'low' | 'medium' | 'high';
export type CustomCategory =
  | 'etiquette'
  | 'religion'
  | 'dining'
  | 'dress'
  | 'gift'
  | 'gesture'
  | 'general';

export interface CityBasicInfo {
  population?: number;
  populationYear?: number;
  area?: number;
  elevation?: number;
  climate?: string;
  climateEn?: string;
  motto?: string;
  mottoEn?: string;
  nicknames?: string[];
  nicknamesEn?: string[];
}

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

export interface BestTravelTime {
  seasons: TravelSeason[];
  months: number[];
  description: string;
  descriptionEn?: string;
  weatherNotes?: string;
  crowdLevel?: CrowdLevel;
  priceLevel?: PriceLevel;
}

export interface LocalCustom {
  category: CustomCategory;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  isTaboo: boolean;
  importance: CustomImportance;
}

export interface PracticalInfo {
  voltage: string;
  plugType: string[];
  currency: string;
  currencySymbol: string;
  currencyNameLocal: string;
  currencyNameEn: string;
  tippingCustom: string;
  tippingCustomEn?: string;
  waterSafety: WaterSafety;
  waterSafetyNote?: string;
  visaRequired?: boolean;
  visaNote?: string;
  languageOfficial: string[];
  languageCommon: string[];
  emergencyNumber: string;
  ambulanceNumber: string;
  fireNumber: string;
  touristHotline?: string;
}

export interface CityEncyclopedia {
  id: string;
  cityId: string;
  basicInfo?: CityBasicInfo;
  history?: CityHistory;
  bestTravelTime?: BestTravelTime;
  customs: LocalCustom[];
  practicalInfo?: PracticalInfo;
  sources?: string[];
  lastUpdatedAt: number;
  createdAt: number;
}

export interface City {
  id: string;
  name: string;
  nameEn?: string;
  timezone: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  utcOffset?: number;
  dstOffset?: number;
  observesDst?: boolean;
}

export interface CityWithEncyclopedia extends City {
  encyclopedia: CityEncyclopedia | null;
  hasEncyclopedia: boolean;
}

// Helper function to transform Convex document to API response
function transformCity(doc: Doc<'cities'>): City {
  return {
    id: doc._id,
    name: doc.name,
    nameEn: doc.nameEn,
    timezone: doc.timezone,
    countryCode: doc.countryCode,
    latitude: doc.latitude,
    longitude: doc.longitude,
    utcOffset: doc.utcOffset,
    dstOffset: doc.dstOffset,
    observesDst: doc.observesDst,
  };
}

function transformEncyclopedia(
  doc: Doc<'cityEncyclopedia'>
): CityEncyclopedia {
  return {
    id: doc._id,
    cityId: doc.cityId,
    basicInfo: doc.basicInfo,
    history: doc.history,
    bestTravelTime: doc.bestTravelTime,
    customs: doc.customs,
    practicalInfo: doc.practicalInfo,
    sources: doc.sources,
    lastUpdatedAt: doc.lastUpdatedAt,
    createdAt: doc.createdAt,
  };
}

export const CityEncyclopediaService = {
  /**
   * Get city encyclopedia by city ID
   */
  async getEncyclopedia(
    cityId: string,
    accessToken: string
  ): Promise<CityEncyclopedia | null> {
    const result = await convex.query(api.cities.getEncyclopedia, {
      cityId: cityId as Id<'cities'>,
    });

    if (!result) return null;
    return transformEncyclopedia(result);
  },

  /**
   * Get city with encyclopedia data
   */
  async getCityWithEncyclopedia(
    cityId: string,
    accessToken: string
  ): Promise<CityWithEncyclopedia | null> {
    const result = await convex.query(api.cities.getCityWithEncyclopedia, {
      cityId: cityId as Id<'cities'>,
    });

    if (!result) return null;

    return {
      ...transformCity(result as Doc<'cities'>),
      encyclopedia: result.encyclopedia
        ? transformEncyclopedia(result.encyclopedia)
        : null,
      hasEncyclopedia: !!result.encyclopedia,
    };
  },

  /**
   * List all cities with encyclopedia data
   */
  async listCitiesWithEncyclopedia(
    options: {
      limit?: number;
      countryCode?: string;
    },
    accessToken: string
  ): Promise<CityWithEncyclopedia[]> {
    const result = await convex.query(api.cities.listWithEncyclopedia, {
      limit: options.limit,
      countryCode: options.countryCode,
    });

    return result.map((item) => ({
      ...transformCity(item as Doc<'cities'>),
      encyclopedia: item.encyclopedia
        ? transformEncyclopedia(item.encyclopedia as Doc<'cityEncyclopedia'>)
        : null,
      hasEncyclopedia: item.hasEncyclopedia,
    }));
  },

  /**
   * Create or update city encyclopedia
   */
  async upsertEncyclopedia(
    data: {
      cityId: string;
      basicInfo?: CityBasicInfo;
      history?: CityHistory;
      bestTravelTime?: BestTravelTime;
      customs: LocalCustom[];
      practicalInfo?: PracticalInfo;
      sources?: string[];
    },
    accessToken: string
  ): Promise<string> {
    const result = await convex.mutation(api.cities.createEncyclopedia, {
      cityId: data.cityId as Id<'cities'>,
      basicInfo: data.basicInfo,
      history: data.history,
      bestTravelTime: data.bestTravelTime,
      customs: data.customs,
      practicalInfo: data.practicalInfo,
      sources: data.sources,
    });

    return result;
  },

  /**
   * Update city encyclopedia
   */
  async updateEncyclopedia(
    id: string,
    data: Partial<{
      basicInfo: CityBasicInfo;
      history: CityHistory;
      bestTravelTime: BestTravelTime;
      customs: LocalCustom[];
      practicalInfo: PracticalInfo;
      sources: string[];
    }>,
    accessToken: string
  ): Promise<CityEncyclopedia | null> {
    const result = await convex.mutation(api.cities.updateEncyclopedia, {
      id: id as Id<'cityEncyclopedia'>,
      ...data,
    });

    if (!result) return null;
    return transformEncyclopedia(result);
  },

  /**
   * Delete city encyclopedia
   */
  async deleteEncyclopedia(id: string, accessToken: string): Promise<void> {
    await convex.mutation(api.cities.removeEncyclopedia, {
      id: id as Id<'cityEncyclopedia'>,
    });
  },

  /**
   * Get city by ID
   */
  async getCity(cityId: string, accessToken: string): Promise<City | null> {
    const result = await convex.query(api.cities.getById, {
      id: cityId as Id<'cities'>,
    });

    if (!result) return null;
    return transformCity(result);
  },

  /**
   * Search cities by name
   */
  async searchCities(name: string, accessToken: string): Promise<City[]> {
    const result = await convex.query(api.cities.searchByName, {
      name,
    });

    return result.map(transformCity);
  },

  /**
   * List cities by country
   */
  async listCitiesByCountry(
    countryCode: string,
    accessToken: string
  ): Promise<City[]> {
    const result = await convex.query(api.cities.getByCountry, {
      countryCode,
    });

    return result.map(transformCity);
  },
};
