/**
 * Amap (Gaode) Parser
 * Parses raw Amap API data into normalized POI format
 */

import type {
  Location,
  OperatingHours,
  RatingInfo,
} from '@pathfinding/crawler-types';
import type { Parser, ParserResult } from './index.js';

import { mapPlatformCategory } from '@pathfinding/crawler-types';
import { gcj02ToWgs84 } from '../coordinate-validator.js';

interface AmapPOI {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string;
  tel?: string;
  website?: string;
  pname?: string;
  cityname?: string;
  adname?: string;
  photos?: Array<{ url: string }>;
  biz_ext?: {
    rating?: string;
    cost?: string;
    open_time?: string;
    opentime_today?: string;
    meal_ordering?: string;
    keytag?: string;
    seat?: string;
    wifi?: string;
    parking?: string;
    smoking?: string;
    facility?: string;
  };
  alias?: string;
  entr_location?: string;
  navi_poiid?: string;
  indoor_map?: string;
  email?: string;
  postcode?: string;
  tag?: string;
  business_area?: string;
}

/**
 * Parse Amap type code to unified category
 */
function parseCategory(typecode: string): {
  category: string;
  subcategory?: string;
} {
  // Try direct mapping first
  const mapping = mapPlatformCategory('amap', typecode);
  if (mapping) return mapping;

  // Try parent category (first 2 digits)
  const parentCode = `${typecode.slice(0, 2)}0000`;
  const parentMapping = mapPlatformCategory('amap', parentCode);
  if (parentMapping) return parentMapping;

  // Default based on first digit
  const firstDigit = typecode.charAt(0);
  const categoryMap: Record<string, string> = {
    '0': 'service', // 汽车服务
    '1': 'transport', // 交通设施
    '2': 'service', // 金融保险
    '3': 'service', // 房产小区
    '4': 'service', // 公司企业
    '5': 'restaurant', // 餐饮服务
    '6': 'shopping', // 购物服务
    '7': 'service', // 生活服务
    '8': 'entertainment', // 体育休闲
    '9': 'service', // 医疗保健
    A: 'hotel', // 住宿服务
    B: 'attraction', // 风景名胜
    C: 'service', // 商务住宅
    D: 'service', // 政府机构
    E: 'service', // 科教文化
  };

  return { category: categoryMap[firstDigit] || 'service' };
}

/**
 * Parse Amap location string "lng,lat" to coordinates
 * Converts from GCJ-02 (Amap) to WGS-84 (standard GPS)
 */
function parseLocation(
  locationStr: string
): { latitude: number; longitude: number } | null {
  if (!locationStr) return null;

  const [lng, lat] = locationStr.split(',').map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  // Convert from GCJ-02 to WGS-84
  const wgs84 = gcj02ToWgs84(lat, lng);
  return { latitude: wgs84.latitude, longitude: wgs84.longitude };
}

/**
 * Parse Amap rating to standard format
 */
function parseRating(bizExt?: AmapPOI['biz_ext']): RatingInfo {
  const result: RatingInfo = { count: 0 };

  if (bizExt?.rating) {
    const rating = Number.parseFloat(bizExt.rating);
    if (!Number.isNaN(rating)) {
      // Amap uses 0-5 scale
      result.overall = rating;
    }
  }

  return result;
}

/**
 * Parse Amap price info
 */
function parsePriceRange(bizExt?: AmapPOI['biz_ext']): {
  range?: string;
  avg?: number;
} {
  const result: { range?: string; avg?: number } = {};

  if (bizExt?.cost) {
    const cost = Number.parseFloat(bizExt.cost);
    if (!Number.isNaN(cost)) {
      result.avg = cost;

      // Map to price range
      if (cost < 30) {
        result.range = '¥';
      } else if (cost < 80) {
        result.range = '¥¥';
      } else if (cost < 200) {
        result.range = '¥¥¥';
      } else {
        result.range = '¥¥¥¥';
      }
    }
  }

  return result;
}

/**
 * Parse Amap opening hours
 */
function parseOpeningHours(
  bizExt?: AmapPOI['biz_ext']
): OperatingHours | undefined {
  if (!bizExt?.open_time) return undefined;

  const hoursString = bizExt.open_time;
  const hours: OperatingHours = {};

  try {
    // Common patterns:
    // "全天" = 24/7
    // "09:00-22:00" = same hours every day
    // "周一至周五 09:00-18:00;周六 10:00-16:00" = different by day

    if (hoursString === '全天' || hoursString === '24小时营业') {
      const allDay = { open: '00:00', close: '23:59' };
      hours.monday = allDay;
      hours.tuesday = allDay;
      hours.wednesday = allDay;
      hours.thursday = allDay;
      hours.friday = allDay;
      hours.saturday = allDay;
      hours.sunday = allDay;
      return hours;
    }

    // Simple time pattern like "09:00-22:00"
    const simpleMatch = hoursString.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (simpleMatch) {
      const dayHours = { open: simpleMatch[1], close: simpleMatch[2] };
      hours.monday = dayHours;
      hours.tuesday = dayHours;
      hours.wednesday = dayHours;
      hours.thursday = dayHours;
      hours.friday = dayHours;
      hours.saturday = dayHours;
      hours.sunday = dayHours;
      return hours;
    }

    // Complex patterns would need more sophisticated parsing
    // For now, return undefined for complex patterns
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse phone numbers (Amap sometimes returns multiple semicolon-separated)
 */
function parsePhone(tel?: string): string | undefined {
  if (!tel) return undefined;

  // Return first phone number if multiple
  const phones = tel.split(';');
  return phones[0]?.trim() || undefined;
}

/**
 * Extract tags from Amap data
 */
function extractTags(poi: AmapPOI): string[] {
  const tags: string[] = [];

  // Add type as tag
  if (poi.type) {
    tags.push(...poi.type.split(';').map((t) => t.trim()));
  }

  // Add keytag if available
  if (poi.biz_ext?.keytag) {
    tags.push(...poi.biz_ext.keytag.split(';').map((t) => t.trim()));
  }

  // Add tag field if available
  if (poi.tag) {
    tags.push(...poi.tag.split(';').map((t) => t.trim()));
  }

  // Add facility info as tags
  if (poi.biz_ext?.wifi === '1') tags.push('wifi');
  if (poi.biz_ext?.parking === '1') tags.push('parking');
  if (poi.biz_ext?.smoking === '0') tags.push('no_smoking');

  // Filter out empty tags and dedupe
  return [...new Set(tags.filter((t) => t.length > 0))];
}

/**
 * Amap Parser implementation
 */
export const amapParser: Parser = {
  platform: 'amap',

  async parse(content: string, _url: string): Promise<ParserResult> {
    let poi: AmapPOI;

    try {
      poi = JSON.parse(content);
    } catch {
      throw new Error('Invalid JSON content');
    }

    // Get coordinates
    const coords = parseLocation(poi.location);
    if (!coords) {
      throw new Error('Missing or invalid coordinates');
    }

    // Get name (required)
    if (!poi.name) {
      throw new Error('Missing name');
    }

    // Parse category
    const { category, subcategory } = parseCategory(poi.typecode);

    // Build location
    const location: Location = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: poi.address || undefined,
      city: poi.cityname || undefined,
      district: poi.adname || undefined,
      country: 'CN',
      postal_code: poi.postcode || undefined,
    };

    // Parse price info
    const priceInfo = parsePriceRange(poi.biz_ext);

    // Build result
    const result: ParserResult = {
      name: poi.name,
      aliases: poi.alias ? [poi.alias] : undefined,
      category,
      subcategory,
      tags: extractTags(poi),
      location,
      ratings: parseRating(poi.biz_ext),
      operating_hours: parseOpeningHours(poi.biz_ext),
      price_range: priceInfo.range,
      price_avg: priceInfo.avg,
      phone: parsePhone(poi.tel),
      website: poi.website || undefined,
      photo_urls: poi.photos?.map((p) => p.url).filter(Boolean),
    };

    return result;
  },
};
