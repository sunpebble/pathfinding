/**
 * Category Mapper
 * Maps platform-specific categories to unified taxonomy
 */

import type { POICategory } from '@pathfinding/crawler-types';
import { POI_CATEGORIES } from '@pathfinding/crawler-types';

/**
 * OSM cuisine tag to subcategory mapping
 */
const CUISINE_SUBCATEGORY_MAP: Record<string, string> = {
  chinese: 'chinese',
  cantonese: 'chinese',
  sichuan: 'chinese',
  hunan: 'chinese',
  japanese: 'japanese',
  sushi: 'japanese',
  ramen: 'japanese',
  korean: 'korean',
  thai: 'southeast_asian',
  vietnamese: 'southeast_asian',
  indian: 'indian',
  italian: 'western',
  pizza: 'western',
  french: 'western',
  american: 'western',
  burger: 'fast_food',
  kebab: 'fast_food',
  coffee: 'cafe',
  tea: 'cafe',
  ice_cream: 'dessert',
  cake: 'dessert',
  seafood: 'seafood',
  hotpot: 'hotpot',
  bbq: 'bbq',
  vegetarian: 'vegetarian',
  vegan: 'vegetarian',
};

/**
 * Parse OSM cuisine tag to get subcategory
 */
export function parseOsmCuisine(cuisineTag: string | undefined): string {
  if (!cuisineTag) return 'other';

  const cuisines = cuisineTag.toLowerCase().split(/[;,]/);
  for (const cuisine of cuisines) {
    const trimmed = cuisine.trim();
    if (CUISINE_SUBCATEGORY_MAP[trimmed]) {
      return CUISINE_SUBCATEGORY_MAP[trimmed];
    }
  }
  return 'other';
}

/**
 * Map OSM tags to category with cuisine awareness
 */
export function mapOsmTagsToCategory(
  tags: Record<string, string>
): { category: POICategory; subcategory?: string } | null {
  // Check amenity=restaurant with cuisine
  if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food') {
    const subcategory = parseOsmCuisine(tags.cuisine);
    return {
      category: 'restaurant',
      subcategory: tags.amenity === 'fast_food' ? 'fast_food' : subcategory,
    };
  }

  // Build tag key for lookup
  for (const key of [
    'amenity',
    'tourism',
    'shop',
    'leisure',
    'historic',
    'aeroway',
    'railway',
  ]) {
    if (tags[key]) {
      const tagKey = `${key}=${tags[key]}`;
      if (osmCategoryMap[tagKey]) {
        return osmCategoryMap[tagKey];
      }
    }
  }

  return null;
}

/**
 * OSM tag to unified category mapping
 */
const osmCategoryMap: Record<
  string,
  { category: POICategory; subcategory?: string }
> = {
  // Tourism
  'tourism=attraction': { category: 'attraction', subcategory: 'landmark' },
  'tourism=museum': { category: 'attraction', subcategory: 'museum' },
  'tourism=gallery': { category: 'attraction', subcategory: 'museum' },
  'tourism=viewpoint': { category: 'attraction', subcategory: 'scenic_spot' },
  'tourism=artwork': { category: 'attraction', subcategory: 'landmark' },
  'tourism=theme_park': { category: 'attraction', subcategory: 'theme_park' },
  'tourism=zoo': { category: 'attraction', subcategory: 'zoo' },
  'tourism=aquarium': { category: 'attraction', subcategory: 'zoo' },

  // Historic
  'historic=monument': { category: 'attraction', subcategory: 'monument' },
  'historic=memorial': { category: 'attraction', subcategory: 'monument' },
  'historic=castle': { category: 'attraction', subcategory: 'historic_site' },
  'historic=ruins': { category: 'attraction', subcategory: 'historic_site' },
  'historic=archaeological_site': {
    category: 'attraction',
    subcategory: 'historic_site',
  },

  // Amenity - Food (default subcategories, cuisine tag takes precedence)
  'amenity=restaurant': { category: 'restaurant', subcategory: 'other' },
  'amenity=fast_food': { category: 'restaurant', subcategory: 'fast_food' },
  'amenity=cafe': { category: 'restaurant', subcategory: 'cafe' },
  'amenity=food_court': { category: 'restaurant', subcategory: 'food_court' },
  'amenity=bar': { category: 'restaurant', subcategory: 'bar' },
  'amenity=pub': { category: 'restaurant', subcategory: 'bar' },
  'amenity=ice_cream': { category: 'restaurant', subcategory: 'dessert' },

  // Amenity - Entertainment
  'amenity=cinema': { category: 'entertainment', subcategory: 'cinema' },
  'amenity=theatre': { category: 'entertainment', subcategory: 'theater' },
  'amenity=nightclub': { category: 'entertainment', subcategory: 'nightclub' },
  'amenity=casino': { category: 'entertainment', subcategory: 'casino' },

  // Leisure
  'leisure=park': { category: 'attraction', subcategory: 'park' },
  'leisure=garden': { category: 'attraction', subcategory: 'park' },
  'leisure=nature_reserve': {
    category: 'attraction',
    subcategory: 'national_park',
  },
  'leisure=golf_course': {
    category: 'entertainment',
    subcategory: 'sports_venue',
  },
  'leisure=stadium': { category: 'entertainment', subcategory: 'sports_venue' },
  'leisure=sports_centre': {
    category: 'entertainment',
    subcategory: 'sports_venue',
  },
  'leisure=amusement_arcade': {
    category: 'entertainment',
    subcategory: 'amusement_park',
  },
  'leisure=water_park': {
    category: 'entertainment',
    subcategory: 'amusement_park',
  },
  'leisure=beach_resort': { category: 'attraction', subcategory: 'beach' },
  'leisure=spa': { category: 'entertainment', subcategory: 'spa' },

  // Tourism - Accommodation
  'tourism=hotel': { category: 'hotel', subcategory: 'hotel' },
  'tourism=motel': { category: 'hotel', subcategory: 'motel' },
  'tourism=hostel': { category: 'hotel', subcategory: 'hostel' },
  'tourism=guest_house': { category: 'hotel', subcategory: 'guesthouse' },
  'tourism=apartment': { category: 'hotel', subcategory: 'apartment' },

  // Shop
  'shop=mall': { category: 'shopping', subcategory: 'mall' },
  'shop=department_store': {
    category: 'shopping',
    subcategory: 'department_store',
  },
  'shop=supermarket': { category: 'shopping', subcategory: 'supermarket' },
  'shop=convenience': {
    category: 'shopping',
    subcategory: 'convenience_store',
  },
  'shop=clothes': { category: 'shopping', subcategory: 'fashion' },
  'shop=electronics': { category: 'shopping', subcategory: 'electronics' },
  'shop=jewelry': { category: 'shopping', subcategory: 'jewelry' },
  'shop=gift': { category: 'shopping', subcategory: 'souvenirs' },
  'shop=books': { category: 'shopping', subcategory: 'books' },

  // Transport
  'aeroway=aerodrome': { category: 'transport', subcategory: 'airport' },
  'aeroway=terminal': { category: 'transport', subcategory: 'airport' },
  'railway=station': { category: 'transport', subcategory: 'train_station' },
  'railway=subway_entrance': {
    category: 'transport',
    subcategory: 'metro_station',
  },
  'amenity=bus_station': { category: 'transport', subcategory: 'bus_station' },
  'amenity=ferry_terminal': {
    category: 'transport',
    subcategory: 'ferry_terminal',
  },
  'amenity=taxi': { category: 'transport', subcategory: 'taxi_stand' },

  // Service
  'amenity=bank': { category: 'service', subcategory: 'bank' },
  'amenity=atm': { category: 'service', subcategory: 'atm' },
  'amenity=post_office': { category: 'service', subcategory: 'post_office' },
  'amenity=hospital': { category: 'service', subcategory: 'hospital' },
  'amenity=clinic': { category: 'service', subcategory: 'clinic' },
  'amenity=pharmacy': { category: 'service', subcategory: 'pharmacy' },
  'amenity=police': { category: 'service', subcategory: 'police' },
  'amenity=embassy': { category: 'service', subcategory: 'embassy' },
  'tourism=information': { category: 'service', subcategory: 'tourist_info' },
};

/**
 * Amap typecode to unified category mapping
 * Amap uses 6-digit codes where first 2 digits indicate major category
 */
const amapCategoryMap: Record<
  string,
  { category: POICategory; subcategory?: string }
> = {
  // 05 - 餐饮服务 (Restaurant)
  '050000': { category: 'restaurant' },
  '050100': { category: 'restaurant', subcategory: 'chinese' },
  '050101': { category: 'restaurant', subcategory: 'chinese' }, // 中餐厅
  '050102': { category: 'restaurant', subcategory: 'chinese' }, // 综合酒楼
  '050200': { category: 'restaurant', subcategory: 'chinese' }, // 外国餐厅
  '050201': { category: 'restaurant', subcategory: 'japanese' }, // 日本料理
  '050202': { category: 'restaurant', subcategory: 'korean' }, // 韩国料理
  '050203': { category: 'restaurant', subcategory: 'western' }, // 西餐厅
  '050204': { category: 'restaurant', subcategory: 'western' }, // 法国餐厅
  '050205': { category: 'restaurant', subcategory: 'western' }, // 意大利餐厅
  '050206': { category: 'restaurant', subcategory: 'southeast_asian' }, // 东南亚餐厅
  '050300': { category: 'restaurant', subcategory: 'fast_food' }, // 快餐厅
  '050400': { category: 'restaurant', subcategory: 'cafe' }, // 咖啡厅
  '050500': { category: 'restaurant', subcategory: 'bar' }, // 茶艺馆
  '050600': { category: 'restaurant', subcategory: 'dessert' }, // 甜品店
  '050700': { category: 'restaurant', subcategory: 'bar' }, // 酒吧
  '050800': { category: 'restaurant', subcategory: 'food_court' }, // 食品市场

  // 06 - 购物服务 (Shopping)
  '060000': { category: 'shopping' },
  '060100': { category: 'shopping', subcategory: 'mall' }, // 商场
  '060101': { category: 'shopping', subcategory: 'mall' }, // 购物中心
  '060102': { category: 'shopping', subcategory: 'department_store' }, // 百货商场
  '060200': { category: 'shopping', subcategory: 'supermarket' }, // 超级市场
  '060300': { category: 'shopping', subcategory: 'convenience_store' }, // 便利店
  '060400': { category: 'shopping', subcategory: 'electronics' }, // 家电数码
  '060500': { category: 'shopping', subcategory: 'fashion' }, // 服装鞋帽皮具
  '060600': { category: 'shopping', subcategory: 'market' }, // 花鸟鱼虫市场
  '060700': { category: 'shopping', subcategory: 'market' }, // 体育用品
  '060800': { category: 'shopping', subcategory: 'cosmetics' }, // 美妆日化
  '061000': { category: 'shopping', subcategory: 'jewelry' }, // 珠宝首饰

  // 08 - 体育休闲 (Entertainment)
  '080000': { category: 'entertainment' },
  '080100': { category: 'entertainment', subcategory: 'sports_venue' }, // 体育场馆
  '080200': { category: 'entertainment', subcategory: 'sports_venue' }, // 高尔夫场
  '080300': { category: 'entertainment', subcategory: 'cinema' }, // 影剧院
  '080400': { category: 'entertainment', subcategory: 'ktv' }, // KTV
  '080500': { category: 'entertainment', subcategory: 'spa' }, // 休闲场所
  '080600': { category: 'entertainment', subcategory: 'amusement_park' }, // 游乐园
  '080700': { category: 'entertainment', subcategory: 'nightclub' }, // 夜总会

  // 0A - 住宿服务 (Hotel)
  '100000': { category: 'hotel' },
  '100100': { category: 'hotel', subcategory: 'hotel' }, // 宾馆酒店
  '100101': { category: 'hotel', subcategory: 'resort' }, // 星级酒店
  '100102': { category: 'hotel', subcategory: 'hotel' }, // 快捷酒店
  '100103': { category: 'hotel', subcategory: 'apartment' }, // 公寓式酒店
  '100200': { category: 'hotel', subcategory: 'hostel' }, // 旅馆招待所
  '100300': { category: 'hotel', subcategory: 'motel' }, // 民宿客栈

  // 0B - 风景名胜 (Attraction)
  '110000': { category: 'attraction' },
  '110100': { category: 'attraction', subcategory: 'scenic_spot' }, // 风景名胜
  '110101': { category: 'attraction', subcategory: 'national_park' }, // 国家级景点
  '110102': { category: 'attraction', subcategory: 'scenic_spot' }, // 省级景点
  '110200': { category: 'attraction', subcategory: 'park' }, // 公园广场
  '110201': { category: 'attraction', subcategory: 'park' }, // 公园
  '110202': { category: 'attraction', subcategory: 'park' }, // 广场
  '110203': { category: 'attraction', subcategory: 'beach' }, // 海滨浴场
  '110300': { category: 'attraction', subcategory: 'theme_park' }, // 游乐场
  '110301': { category: 'attraction', subcategory: 'theme_park' }, // 主题乐园
  '110302': { category: 'attraction', subcategory: 'zoo' }, // 动物园
  '110303': { category: 'attraction', subcategory: 'zoo' }, // 海洋馆
  '110304': { category: 'attraction', subcategory: 'zoo' }, // 植物园

  // 14 - 科教文化 (Cultural)
  '140000': { category: 'attraction' },
  '140100': { category: 'attraction', subcategory: 'museum' }, // 博物馆
  '140200': { category: 'attraction', subcategory: 'gallery' }, // 展览馆
  '140300': { category: 'attraction', subcategory: 'library' }, // 图书馆
  '140400': { category: 'service', subcategory: 'school' }, // 学校
  '140500': { category: 'attraction', subcategory: 'historic_site' }, // 科研机构
  '140600': { category: 'entertainment', subcategory: 'theater' }, // 文化宫
  '140700': { category: 'attraction', subcategory: 'temple' }, // 宗教场所

  // 15 - 交通设施 (Transport)
  '150000': { category: 'transport' },
  '150100': { category: 'transport', subcategory: 'airport' }, // 机场
  '150200': { category: 'transport', subcategory: 'train_station' }, // 火车站
  '150300': { category: 'transport', subcategory: 'bus_station' }, // 长途汽车站
  '150400': { category: 'transport', subcategory: 'metro_station' }, // 地铁站
  '150500': { category: 'transport', subcategory: 'ferry_terminal' }, // 港口码头
  '150600': { category: 'transport', subcategory: 'parking' }, // 停车场
  '150700': { category: 'transport', subcategory: 'gas_station' }, // 加油站

  // 09 - 医疗保健 (Medical)
  '090000': { category: 'service' },
  '090100': { category: 'service', subcategory: 'hospital' }, // 综合医院
  '090200': { category: 'service', subcategory: 'clinic' }, // 专科医院
  '090300': { category: 'service', subcategory: 'clinic' }, // 诊所
  '090400': { category: 'service', subcategory: 'pharmacy' }, // 药店
  '090500': { category: 'service', subcategory: 'clinic' }, // 动物医疗
  '090600': { category: 'service', subcategory: 'clinic' }, // 急救中心
  '090700': { category: 'service', subcategory: 'clinic' }, // 疾病预防
};

/**
 * Map platform-specific category to unified category
 */
export function mapPlatformCategoryInternal(
  platform: string,
  platformCategory: string
): { category: POICategory; subcategory?: string } | null {
  const lowerPlatform = platform.toLowerCase();

  if (lowerPlatform === 'osm') {
    return osmCategoryMap[platformCategory] || null;
  }

  if (lowerPlatform === 'amap') {
    // Try exact match first
    if (amapCategoryMap[platformCategory]) {
      return amapCategoryMap[platformCategory];
    }

    // Try parent category (first 4 digits)
    const parent4 = `${platformCategory.slice(0, 4)}00`;
    if (amapCategoryMap[parent4]) {
      return amapCategoryMap[parent4];
    }

    // Try major category (first 2 digits)
    const parent2 = `${platformCategory.slice(0, 2)}0000`;
    if (amapCategoryMap[parent2]) {
      return amapCategoryMap[parent2];
    }
  }

  return null;
}

/**
 * Get unified category info
 */
export function getCategoryInfo(
  category: POICategory
): (typeof POI_CATEGORIES)[POICategory] | null {
  return POI_CATEGORIES[category] || null;
}

/**
 * Validate if a category is valid
 */
export function isValidCategory(category: string): category is POICategory {
  return category in POI_CATEGORIES;
}

/**
 * Get all categories
 */
export function getAllCategories(): POICategory[] {
  return Object.keys(POI_CATEGORIES) as POICategory[];
}
