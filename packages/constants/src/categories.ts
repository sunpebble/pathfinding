import type { PoiCategory } from "@pathfinding/types";

/**
 * POI category definitions with display labels
 */
export const POI_CATEGORIES: Record<PoiCategory, { label: string; labelEn: string; icon: string }> =
  {
    attraction: {
      label: "景点",
      labelEn: "Attraction",
      icon: "landmark",
    },
    restaurant: {
      label: "餐饮",
      labelEn: "Restaurant",
      icon: "utensils",
    },
    hotel: {
      label: "住宿",
      labelEn: "Hotel",
      icon: "bed",
    },
    shopping: {
      label: "购物",
      labelEn: "Shopping",
      icon: "shopping-bag",
    },
    other: {
      label: "其他",
      labelEn: "Other",
      icon: "map-pin",
    },
  };

/**
 * All POI category values
 */
export const POI_CATEGORY_VALUES: PoiCategory[] = [
  "attraction",
  "restaurant",
  "hotel",
  "shopping",
  "other",
];

/**
 * Get category display label
 */
export function getCategoryLabel(category: PoiCategory, locale: "zh" | "en" = "zh"): string {
  const cat = POI_CATEGORIES[category];
  return locale === "zh" ? cat.label : cat.labelEn;
}

/**
 * Get category icon name
 */
export function getCategoryIcon(category: PoiCategory): string {
  return POI_CATEGORIES[category].icon;
}
