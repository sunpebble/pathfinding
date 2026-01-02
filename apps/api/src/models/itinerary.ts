import { z } from 'npm:zod';

/**
 * Itinerary visibility enum schema
 */
export const ItineraryVisibilitySchema = z.enum(['private', 'team', 'public']);

/**
 * Itinerary creation input schema
 */
export const CreateItinerarySchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or less'),
    cityId: z.string().uuid('Invalid city ID'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    visibility: ItineraryVisibilitySchema.optional().default('private'),
    coverImageUrl: z.string().url().optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

/**
 * Itinerary update input schema
 */
export const UpdateItinerarySchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  cityId: z.string().uuid('Invalid city ID').optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  visibility: ItineraryVisibilitySchema.optional(),
  coverImageUrl: z.string().url().nullable().optional(),
});

/**
 * Itinerary list query schema
 */
export const ItineraryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z
    .enum(['created_at', 'updated_at', 'start_date'])
    .optional()
    .default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Itinerary database row type
 */
export interface ItineraryRow {
  id: string;
  user_id: string;
  title: string;
  city_id: string;
  start_date: string;
  end_date: string;
  visibility: 'private' | 'team' | 'public';
  cover_image_url: string | null;
  copied_from_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Itinerary response type (camelCase for API)
 */
export interface ItineraryResponse {
  id: string;
  userId: string;
  title: string;
  cityId: string;
  startDate: string;
  endDate: string;
  visibility: 'private' | 'team' | 'public';
  coverImageUrl: string | null;
  copiedFromId: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  daysCount?: number;
  cityName?: string;
}

/**
 * Transform database row to API response
 */
export function toItineraryResponse(row: ItineraryRow): ItineraryResponse {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    cityId: row.city_id,
    startDate: row.start_date,
    endDate: row.end_date,
    visibility: row.visibility,
    coverImageUrl: row.cover_image_url,
    copiedFromId: row.copied_from_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Infer types from schemas
export type CreateItineraryInput = z.infer<typeof CreateItinerarySchema>;
export type UpdateItineraryInput = z.infer<typeof UpdateItinerarySchema>;
export type ItineraryListQuery = z.infer<typeof ItineraryListQuerySchema>;
