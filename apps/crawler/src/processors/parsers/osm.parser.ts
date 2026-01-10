/**
 * OpenStreetMap Parser
 * Parses raw OSM/Overpass API data into normalized POI format
 */

import type { Location, OperatingHours } from '@pathfinding/crawler-types';
import type { Parser, ParserResult } from './index.js';

import { mapPlatformCategory } from '@pathfinding/crawler-types';

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Parse OSM tags to determine category
 */
function parseCategory(tags: Record<string, string>): {
  category: string;
  subcategory?: string;
} {
  // Check tourism tags first
  if (tags.tourism) {
    const mapping = mapPlatformCategory('osm', `tourism=${tags.tourism}`);
    if (mapping) return mapping;
  }

  // Check amenity tags
  if (tags.amenity) {
    const mapping = mapPlatformCategory('osm', `amenity=${tags.amenity}`);
    if (mapping) return mapping;
  }

  // Check shop tags
  if (tags.shop) {
    const mapping = mapPlatformCategory('osm', `shop=${tags.shop}`);
    if (mapping) return mapping;
  }

  // Check leisure tags
  if (tags.leisure) {
    const mapping = mapPlatformCategory('osm', `leisure=${tags.leisure}`);
    if (mapping) return mapping;
  }

  // Check aeroway/railway for transport
  if (tags.aeroway) {
    const mapping = mapPlatformCategory('osm', `aeroway=${tags.aeroway}`);
    if (mapping) return mapping;
  }

  if (tags.railway) {
    const mapping = mapPlatformCategory('osm', `railway=${tags.railway}`);
    if (mapping) return mapping;
  }

  // Default to attraction if it has a name but no category
  return { category: 'attraction' };
}

/**
 * Parse OSM opening_hours tag
 * Format: Mo-Fr 09:00-18:00; Sa 10:00-16:00
 */
function parseOpeningHours(hoursString?: string): OperatingHours | undefined {
  if (!hoursString) return undefined;

  // This is a simplified parser - OSM opening_hours format is complex
  // For production, consider using a library like opening_hours.js
  const hours: OperatingHours = {};

  // Handle simple case: 24/7
  if (hoursString === '24/7') {
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

  // Handle common patterns
  type DayKey =
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  const dayMap: Record<string, DayKey> = {
    Mo: 'monday',
    Tu: 'tuesday',
    We: 'wednesday',
    Th: 'thursday',
    Fr: 'friday',
    Sa: 'saturday',
    Su: 'sunday',
  };

  try {
    // Split by semicolon for different rules
    const rules = hoursString.split(';').map((r) => r.trim());

    for (const rule of rules) {
      // Match pattern like "Mo-Fr 09:00-18:00" or "Sa 10:00-16:00"
      const match = rule.match(/^([A-Z,-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/i);
      if (!match) continue;

      const [, days, open, close] = match;
      const dayHours = { open, close };

      // Handle day ranges like "Mo-Fr"
      if (days.includes('-')) {
        const [start, end] = days.split('-');
        const dayKeys = Object.keys(dayMap);
        const startIdx = dayKeys.indexOf(start);
        const endIdx = dayKeys.indexOf(end);

        if (startIdx >= 0 && endIdx >= 0) {
          for (let i = startIdx; i <= endIdx; i++) {
            const dayKey = dayMap[dayKeys[i]];
            if (dayKey) hours[dayKey] = dayHours;
          }
        }
      } else {
        // Single day like "Sa"
        const dayKey = dayMap[days];
        if (dayKey) hours[dayKey] = dayHours;
      }
    }
  } catch {
    // Return undefined if parsing fails
    return undefined;
  }

  return Object.keys(hours).length > 0 ? hours : undefined;
}

/**
 * Parse price range from tags
 */
function parsePriceRange(tags: Record<string, string>): string | undefined {
  // OSM doesn't have a standard price tag, check common variations
  const priceValue = tags['price:range'] || tags.price;

  if (!priceValue) return undefined;

  // Map to standard price range format
  if (priceValue.includes('cheap') || priceValue.includes('budget')) {
    return '¥';
  }
  if (priceValue.includes('moderate') || priceValue.includes('mid')) {
    return '¥¥';
  }
  if (priceValue.includes('expensive') || priceValue.includes('upscale')) {
    return '¥¥¥';
  }
  if (priceValue.includes('luxury') || priceValue.includes('fine')) {
    return '¥¥¥¥';
  }

  return undefined;
}

/**
 * OSM Parser implementation
 */
export const osmParser: Parser = {
  platform: 'osm',

  async parse(content: string, _url: string): Promise<ParserResult> {
    let element: OSMElement;

    try {
      element = JSON.parse(content);
    } catch {
      throw new Error('Invalid JSON content');
    }

    const tags = element.tags || {};

    // Get coordinates
    const lat = element.lat || element.center?.lat;
    const lon = element.lon || element.center?.lon;

    if (!lat || !lon) {
      throw new Error('Missing coordinates');
    }

    // Get name (required)
    const name = tags.name || tags['name:zh'] || tags['name:en'];
    if (!name) {
      throw new Error('Missing name');
    }

    // Parse category
    const { category, subcategory } = parseCategory(tags);

    // Build location
    const location: Location = {
      latitude: lat,
      longitude: lon,
      address:
        [tags['addr:street'], tags['addr:housenumber']]
          .filter(Boolean)
          .join(' ') || undefined,
      city: tags['addr:city'],
      district: tags['addr:district'],
      country: tags['addr:country'] || 'CN',
      postal_code: tags['addr:postcode'],
    };

    // Build result
    const result: ParserResult = {
      name,
      name_en: tags['name:en'],
      aliases: tags.alt_name ? [tags.alt_name] : undefined,
      description: tags.description,
      category,
      subcategory,
      tags: extractTags(tags),
      location,
      operating_hours: parseOpeningHours(tags.opening_hours),
      price_range: parsePriceRange(tags),
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags['contact:website'],
      photo_urls: tags.image ? [tags.image] : undefined,
    };

    return result;
  },
};

/**
 * Extract relevant tags as an array
 */
function extractTags(tags: Record<string, string>): string[] {
  const result: string[] = [];

  // Add cuisine tags for restaurants
  if (tags.cuisine) {
    result.push(...tags.cuisine.split(';').map((c) => c.trim()));
  }

  // Add tourism type
  if (tags.tourism) {
    result.push(tags.tourism);
  }

  // Add amenity type
  if (tags.amenity) {
    result.push(tags.amenity);
  }

  // Add wheelchair accessibility
  if (tags.wheelchair === 'yes') {
    result.push('wheelchair_accessible');
  }

  // Add wifi availability
  if (tags.internet_access === 'wlan' || tags.internet_access === 'yes') {
    result.push('wifi');
  }

  return result;
}
