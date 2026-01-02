/**
 * Itinerary visibility levels
 */
export const VISIBILITY_LEVELS = {
  private: {
    label: '私密',
    labelEn: 'Private',
    description: '仅自己可见',
    descriptionEn: 'Only visible to you',
  },
  team: {
    label: '团队',
    labelEn: 'Team',
    description: '团队成员可见',
    descriptionEn: 'Visible to team members',
  },
  public: {
    label: '公开',
    labelEn: 'Public',
    description: '所有人可见',
    descriptionEn: 'Visible to everyone',
  },
} as const;

/**
 * Default reminder times in minutes
 */
export const DEFAULT_REMINDER_TIMES = [15, 30, 60, 120, 1440] as const;

/**
 * Maximum items per day
 */
export const MAX_ITEMS_PER_DAY = 20;

/**
 * Maximum days per itinerary
 */
export const MAX_DAYS_PER_ITINERARY = 30;

/**
 * Default page size for list APIs
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum page size for list APIs
 */
export const MAX_PAGE_SIZE = 100;

/**
 * POI search radius in kilometers
 */
export const DEFAULT_POI_SEARCH_RADIUS_KM = 5;

/**
 * Maximum POI search radius in kilometers
 */
export const MAX_POI_SEARCH_RADIUS_KM = 50;
