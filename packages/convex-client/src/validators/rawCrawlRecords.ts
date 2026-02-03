import { v } from 'convex/values';

/**
 * Location data from raw crawl
 */
export const rawLocationValidator = v.object({
  /** Latitude coordinate */
  lat: v.optional(v.number()),
  latitude: v.optional(v.number()),
  /** Longitude coordinate */
  lng: v.optional(v.number()),
  lon: v.optional(v.number()),
  longitude: v.optional(v.number()),
  /** Address string */
  address: v.optional(v.string()),
  /** Formatted address */
  formattedAddress: v.optional(v.string()),
  /** City name */
  city: v.optional(v.string()),
  /** Province/State */
  province: v.optional(v.string()),
  /** Country */
  country: v.optional(v.string()),
  /** Postal code */
  postalCode: v.optional(v.string()),
});

/**
 * Rating data from raw crawl
 */
export const rawRatingValidator = v.object({
  /** Overall rating score */
  score: v.optional(v.number()),
  rating: v.optional(v.number()),
  /** Number of ratings/reviews */
  count: v.optional(v.number()),
  ratingCount: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  /** Star rating (1-5) */
  stars: v.optional(v.number()),
});

/**
 * Business hours from raw crawl (various formats)
 */
export const rawBusinessHoursValidator = v.union(
  // String format: "09:00-18:00"
  v.string(),
  // Array of time periods
  v.array(
    v.object({
      day: v.optional(v.string()),
      dayOfWeek: v.optional(v.number()),
      open: v.optional(v.string()),
      close: v.optional(v.string()),
      openTime: v.optional(v.string()),
      closeTime: v.optional(v.string()),
      isClosed: v.optional(v.boolean()),
    }),
  ),
  // Object keyed by day
  v.object({
    monday: v.optional(v.string()),
    tuesday: v.optional(v.string()),
    wednesday: v.optional(v.string()),
    thursday: v.optional(v.string()),
    friday: v.optional(v.string()),
    saturday: v.optional(v.string()),
    sunday: v.optional(v.string()),
  }),
);

/**
 * Photo/Image data from raw crawl
 */
export const rawPhotoValidator = v.object({
  url: v.optional(v.string()),
  src: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  caption: v.optional(v.string()),
  alt: v.optional(v.string()),
});

/**
 * Raw crawl data validator
 * Used for rawCrawlRecords.rawData field
 * Handles various API response formats from different platforms
 *
 * @example
 * rawData: rawCrawlDataValidator
 */
export const rawCrawlDataValidator = v.union(
  v.object({
    /** External ID from source platform */
    id: v.optional(v.string()),
    externalId: v.optional(v.string()),
    uid: v.optional(v.string()),
    poiId: v.optional(v.string()),

    /** Name fields */
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    englishName: v.optional(v.string()),

    /** Category/Type */
    category: v.optional(v.string()),
    type: v.optional(v.string()),
    types: v.optional(v.array(v.string())),
    categories: v.optional(v.array(v.string())),

    /** Location data */
    location: v.optional(rawLocationValidator),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),

    /** Contact info */
    phone: v.optional(v.string()),
    tel: v.optional(v.string()),
    telephone: v.optional(v.string()),
    website: v.optional(v.string()),
    url: v.optional(v.string()),
    email: v.optional(v.string()),

    /** Rating data */
    rating: v.optional(v.union(v.number(), rawRatingValidator)),
    ratingCount: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    score: v.optional(v.number()),

    /** Price info */
    priceLevel: v.optional(v.number()),
    price: v.optional(v.string()),
    avgPrice: v.optional(v.number()),

    /** Business hours */
    businessHours: v.optional(rawBusinessHoursValidator),
    openingHours: v.optional(rawBusinessHoursValidator),
    hours: v.optional(rawBusinessHoursValidator),

    /** Photos */
    photos: v.optional(v.array(rawPhotoValidator)),
    images: v.optional(v.array(v.string())),
    imageUrls: v.optional(v.array(v.string())),
    coverImage: v.optional(v.string()),

    /** Description */
    description: v.optional(v.string()),
    intro: v.optional(v.string()),
    summary: v.optional(v.string()),

    /** Tags */
    tags: v.optional(v.array(v.string())),
    labels: v.optional(v.array(v.string())),

    /** Raw platform-specific data */
    raw: v.optional(v.any()),
    extra: v.optional(v.any()),
    metadata: v.optional(v.any()),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);
