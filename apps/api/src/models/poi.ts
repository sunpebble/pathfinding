import { z } from 'zod';

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
 * Time slot schema (open/close pair)
 */
export const TimeSlotSchema = z.object({
  open: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid open time (HH:MM format)'),
  close: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid close time (HH:MM format)'),
});

/**
 * Business hours schema for a single day
 */
const DayHoursSchema = z.array(TimeSlotSchema).optional();

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
  timezone: z.string().optional(), // IANA timezone identifier
  notes: z.string().max(500).optional(), // Additional notes
});

/**
 * Best visit time schema
 */
export const BestVisitTimeSchema = z.object({
  recommendedTime: z.string().optional(), // e.g., "09:00-11:00"
  reason: z.string().max(500).optional(), // Why this time is recommended
  avoidTimes: z.array(z.string()).optional(), // Times to avoid
  peakHours: z.array(z.string()).optional(), // Peak crowd hours
  seasonalNotes: z.string().max(500).optional(), // Seasonal considerations
});

/**
 * Holiday hours schema
 */
export const HolidayHoursSchema = z.object({
  holidayName: z.string().min(1).max(100),
  holidayNameEn: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  isClosed: z.boolean(),
  hours: z.array(TimeSlotSchema).optional(),
  notes: z.string().max(500).optional(),
  isRecurring: z.boolean(),
});

/**
 * Business hours reminder type
 */
export const ReminderTypeSchema = z.enum(['opening', 'closing', 'best_time']);

/**
 * Business hours reminder schema
 */
export const BusinessHoursReminderSchema = z.object({
  poiId: z.string(),
  itineraryItemId: z.string().optional(),
  reminderType: ReminderTypeSchema,
  minutesBefore: z.number().int().min(0).max(1440), // Max 24 hours
  scheduledTime: z.number(), // Unix timestamp
});

/**
 * Open status response schema
 */
export const OpenStatusSchema = z.object({
  isOpen: z.boolean(),
  nextOpenTime: z.string().nullable(),
  nextCloseTime: z.string().nullable(),
  currentDay: z.string(),
  todayHours: z.array(TimeSlotSchema).nullable(),
  holidayInfo: z.object({
    holidayName: z.string(),
    holidayNameEn: z.string().optional(),
    isClosed: z.boolean(),
    hours: z.array(TimeSlotSchema).optional(),
    notes: z.string().optional(),
  }).nullable(),
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
  bestVisitTime: BestVisitTimeSchema.optional(),
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
  bestVisitTime: BestVisitTimeSchema.optional().nullable(),
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

// Infer types from schemas
export type PoiCategory = z.infer<typeof PoiCategorySchema>;
export type PoiSearchQuery = z.infer<typeof PoiSearchQuerySchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type BusinessHours = z.infer<typeof BusinessHoursSchema>;
export type BestVisitTime = z.infer<typeof BestVisitTimeSchema>;
export type HolidayHours = z.infer<typeof HolidayHoursSchema>;
export type ReminderType = z.infer<typeof ReminderTypeSchema>;
export type BusinessHoursReminder = z.infer<typeof BusinessHoursReminderSchema>;
export type OpenStatus = z.infer<typeof OpenStatusSchema>;

