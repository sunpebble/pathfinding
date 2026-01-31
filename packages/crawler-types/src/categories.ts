/**
 * POI Category Taxonomy
 * Unified category system for cross-platform POI normalization
 */

export const POI_CATEGORIES = {
  // Dining
  restaurant: {
    name_zh: '餐厅',
    name_en: 'Restaurant',
    subcategories: [
      'chinese',
      'western',
      'japanese',
      'korean',
      'thai',
      'indian',
      'fastfood',
      'cafe',
      'bar',
      'bakery',
      'dessert',
    ],
  },

  // Attractions
  attraction: {
    name_zh: '景点',
    name_en: 'Attraction',
    subcategories: [
      'natural',
      'historical',
      'museum',
      'park',
      'theme_park',
      'religious',
      'landmark',
      'zoo',
      'aquarium',
      'garden',
    ],
  },

  // Accommodation
  hotel: {
    name_zh: '住宿',
    name_en: 'Hotel',
    subcategories: [
      'luxury',
      'business',
      'budget',
      'hostel',
      'apartment',
      'resort',
      'boutique',
      'motel',
      'guesthouse',
    ],
  },

  // Shopping
  shopping: {
    name_zh: '购物',
    name_en: 'Shopping',
    subcategories: [
      'mall',
      'market',
      'specialty',
      'convenience',
      'supermarket',
      'outlet',
      'department_store',
      'street_market',
    ],
  },

  // Transportation
  transport: {
    name_zh: '交通',
    name_en: 'Transportation',
    subcategories: [
      'airport',
      'train_station',
      'bus_station',
      'subway',
      'port',
      'taxi_stand',
      'bike_share',
      'parking',
    ],
  },

  // Entertainment
  entertainment: {
    name_zh: '娱乐',
    name_en: 'Entertainment',
    subcategories: [
      'cinema',
      'ktv',
      'spa',
      'gym',
      'nightclub',
      'arcade',
      'theater',
      'concert_hall',
      'sports_venue',
    ],
  },

  // Services
  service: {
    name_zh: '服务',
    name_en: 'Service',
    subcategories: [
      'bank',
      'hospital',
      'pharmacy',
      'post_office',
      'police',
      'embassy',
      'currency_exchange',
      'atm',
    ],
  },
} as const;

export type POICategory = keyof typeof POI_CATEGORIES;
export type POISubcategory<T extends POICategory>
  = (typeof POI_CATEGORIES)[T]['subcategories'][number];

/**
 * Platform-specific category mappings to unified categories
 */
export const PLATFORM_CATEGORY_MAPPINGS: Record<
  string,
  Record<string, { category: POICategory; subcategory?: string }>
> = {
  amap: {
    // Amap category codes
    '050000': { category: 'restaurant', subcategory: 'chinese' },
    '050100': { category: 'restaurant', subcategory: 'chinese' },
    '050200': { category: 'restaurant', subcategory: 'western' },
    '050300': { category: 'restaurant', subcategory: 'fastfood' },
    '050400': { category: 'restaurant', subcategory: 'cafe' },
    '060000': { category: 'shopping' },
    '060100': { category: 'shopping', subcategory: 'mall' },
    '060200': { category: 'shopping', subcategory: 'supermarket' },
    '070000': { category: 'attraction' },
    '070100': { category: 'attraction', subcategory: 'natural' },
    '070200': { category: 'attraction', subcategory: 'park' },
    '080000': { category: 'hotel' },
    '080100': { category: 'hotel', subcategory: 'luxury' },
    '080200': { category: 'hotel', subcategory: 'business' },
    '080300': { category: 'hotel', subcategory: 'budget' },
    '100000': { category: 'transport' },
    '100100': { category: 'transport', subcategory: 'airport' },
    '100200': { category: 'transport', subcategory: 'train_station' },
    '100300': { category: 'transport', subcategory: 'bus_station' },
    '100400': { category: 'transport', subcategory: 'subway' },
  },

  osm: {
    // OpenStreetMap amenity/tourism tags
    'amenity=restaurant': { category: 'restaurant' },
    'amenity=cafe': { category: 'restaurant', subcategory: 'cafe' },
    'amenity=bar': { category: 'restaurant', subcategory: 'bar' },
    'amenity=fast_food': { category: 'restaurant', subcategory: 'fastfood' },
    'tourism=hotel': { category: 'hotel' },
    'tourism=hostel': { category: 'hotel', subcategory: 'hostel' },
    'tourism=guest_house': { category: 'hotel', subcategory: 'guesthouse' },
    'tourism=attraction': { category: 'attraction' },
    'tourism=museum': { category: 'attraction', subcategory: 'museum' },
    'tourism=viewpoint': { category: 'attraction', subcategory: 'landmark' },
    'leisure=park': { category: 'attraction', subcategory: 'park' },
    'shop=mall': { category: 'shopping', subcategory: 'mall' },
    'shop=supermarket': { category: 'shopping', subcategory: 'supermarket' },
    'shop=convenience': { category: 'shopping', subcategory: 'convenience' },
    'aeroway=aerodrome': { category: 'transport', subcategory: 'airport' },
    'railway=station': { category: 'transport', subcategory: 'train_station' },
    'amenity=bus_station': {
      category: 'transport',
      subcategory: 'bus_station',
    },
    'station=subway': { category: 'transport', subcategory: 'subway' },
    'amenity=cinema': { category: 'entertainment', subcategory: 'cinema' },
    'leisure=fitness_centre': { category: 'entertainment', subcategory: 'gym' },
    'amenity=bank': { category: 'service', subcategory: 'bank' },
    'amenity=hospital': { category: 'service', subcategory: 'hospital' },
    'amenity=pharmacy': { category: 'service', subcategory: 'pharmacy' },
  },
};

/**
 * Get unified category from platform-specific category
 */
export function mapPlatformCategory(
  platform: string,
  platformCategory: string,
): { category: POICategory; subcategory?: string } | null {
  const platformMappings = PLATFORM_CATEGORY_MAPPINGS[platform];
  if (!platformMappings) {
    return null;
  }
  return platformMappings[platformCategory] || null;
}

/**
 * Get all valid categories
 */
export function getAllCategories(): POICategory[] {
  return Object.keys(POI_CATEGORIES) as POICategory[];
}

/**
 * Get subcategories for a category
 */
export function getSubcategories(category: POICategory): readonly string[] {
  return POI_CATEGORIES[category]?.subcategories ?? [];
}

/**
 * Check if a category is valid
 */
export function isValidCategory(category: string): category is POICategory {
  return category in POI_CATEGORIES;
}
