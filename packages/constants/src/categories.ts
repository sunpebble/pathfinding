import type { PoiCategory } from '@pathfinding/types';

/**
 * POI category definitions with display labels
 */
export const POI_CATEGORIES: Record<
  PoiCategory,
  { label: string; labelEn: string; icon: string }
> = {
  attraction: {
    label: '景点',
    labelEn: 'Attraction',
    icon: 'landmark',
  },
  restaurant: {
    label: '餐饮',
    labelEn: 'Restaurant',
    icon: 'utensils',
  },
  hotel: {
    label: '住宿',
    labelEn: 'Hotel',
    icon: 'bed',
  },
  shopping: {
    label: '购物',
    labelEn: 'Shopping',
    icon: 'shopping-bag',
  },
  cafe: {
    label: '咖啡',
    labelEn: 'Cafe',
    icon: 'coffee',
  },
  bar: {
    label: '酒吧',
    labelEn: 'Bar',
    icon: 'wine',
  },
  museum: {
    label: '博物馆',
    labelEn: 'Museum',
    icon: 'building-columns',
  },
  park: {
    label: '公园',
    labelEn: 'Park',
    icon: 'tree',
  },
  entertainment: {
    label: '娱乐',
    labelEn: 'Entertainment',
    icon: 'theater-masks',
  },
  transport: {
    label: '交通',
    labelEn: 'Transport',
    icon: 'train',
  },
  other: {
    label: '其他',
    labelEn: 'Other',
    icon: 'map-pin',
  },
};

/**
 * All POI category values
 */
export const POI_CATEGORY_VALUES: PoiCategory[] = [
  'attraction',
  'restaurant',
  'hotel',
  'shopping',
  'cafe',
  'bar',
  'museum',
  'park',
  'entertainment',
  'transport',
  'other',
];

/**
 * Get category display label
 */
export function getCategoryLabel(
  category: PoiCategory,
  locale: 'zh' | 'en' = 'zh',
): string {
  const cat = POI_CATEGORIES[category];
  if (!cat) return category;
  return locale === 'zh' ? cat.label : cat.labelEn;
}

/**
 * Get category icon name
 */
export function getCategoryIcon(category: PoiCategory): string {
  return POI_CATEGORIES[category]?.icon ?? 'map-pin';
}
