/**
 * Parser Registry
 * Central registry for platform-specific parsers
 */

import type {
  Location,
  OperatingHours,
  RatingInfo,
} from '@pathfinding/crawler-types';

import { amapParser } from './amap.parser.js';
// Import and register parsers
import { osmParser } from './osm.parser.js';

/**
 * Parsed POI data from raw content
 */
export interface ParserResult {
  name: string;
  name_en?: string;
  aliases?: string[];
  description?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  location: Location;
  ratings?: RatingInfo;
  operating_hours?: OperatingHours;
  price_range?: string;
  price_avg?: number;
  phone?: string;
  website?: string;
  photo_urls?: string[];
}

/**
 * Parser interface that all platform parsers must implement
 */
export interface Parser {
  platform: string;
  parse: (content: string, url: string) => Promise<ParserResult>;
}

// Parser registry
const parserRegistry: Map<string, Parser> = new Map();

/**
 * Register a parser for a platform
 */
export function registerParser(parser: Parser): void {
  parserRegistry.set(parser.platform.toLowerCase(), parser);
}

/**
 * Get a parser for a platform
 */
export function getParser(platform: string): Parser | null {
  return parserRegistry.get(platform.toLowerCase()) || null;
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): string[] {
  return Array.from(parserRegistry.keys());
}

registerParser(osmParser);
registerParser(amapParser);

export { amapParser, osmParser };
