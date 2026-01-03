import { z } from 'npm:zod';

/**
 * POI category enum schema
 */
export const PoiCategorySchema = z.enum([
  'attraction',
  'restaurant',
  'hotel',
  'shopping',
  'other',
]);

/**
 * Business hours schema for a single day
 */
const DayHoursSchema = z
  .array(
    z.object({
      open: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid open time'),
      close: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid close time'),
    })
  )
  .optional();

/**
 * Business hours schema for all days of the week
 */
export const BusinessHoursSchema = z.object({
  monday: DayHoursSchema,
  tuesday: DayHoursSchema,
  wednesday: DayHoursSchema,
  thursday: DayHoursSchema,
  friday: DayHoursSchema,
  saturday: DayHoursSchema,
  sunday: DayHoursSchema,
});

/**
 * POI creation input schema
 */
export const CreatePoiSchema = z.object({
  externalId: z.string().optional(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),
  nameEn: z.string().max(200).optional(),
  category: PoiCategorySchema,
  cityId: z.string().uuid('Invalid city ID'),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().min(0).default(0),
  priceLevel: z.number().int().min(1).max(4).optional(),
  businessHours: BusinessHoursSchema.optional(),
  phone: z.string().max(50).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  source: z.string().max(50).default('manual'),
});

/**
 * POI update input schema
 */
export const UpdatePoiSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameEn: z.string().max(200).optional(),
  category: PoiCategorySchema.optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().min(0).optional(),
  priceLevel: z.number().int().min(1).max(4).optional().nullable(),
  businessHours: BusinessHoursSchema.optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  imageUrls: z.array(z.string().url()).optional(),
});

/**
 * POI search query schema
 */
export const PoiSearchQuerySchema = z.object({
  cityId: z.string().uuid('Invalid city ID'),
  category: PoiCategorySchema.optional(),
  query: z.string().max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  priceLevel: z.coerce.number().int().min(1).max(4).optional(),
  nearbyLat: z.coerce.number().min(-90).max(90).optional(),
  nearbyLng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0).max(100).optional().default(10),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreatePoiInput = z.infer<typeof CreatePoiSchema>;
export type UpdatePoiInput = z.infer<typeof UpdatePoiSchema>;
export type PoiSearchQuery = z.infer<typeof PoiSearchQuerySchema>;
