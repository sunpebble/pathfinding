import { z } from 'zod';

/**
 * Travel Note visibility enum schema
 */
export const TravelNoteVisibilitySchema = z.enum([
  'private',
  'public',
  'followers',
]);

/**
 * Travel Note sort options
 */
export const TravelNoteSortSchema = z.enum(['latest', 'popular', 'trending']);

/**
 * Travel Note creation input schema
 */
export const CreateTravelNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  content: z.string().min(1, 'Content is required'),
  visibility: TravelNoteVisibilitySchema.optional().default('public'),
  itineraryId: z.string().optional(),
  location: z.string().max(200).optional(),
  travelDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().max(500).optional(),
        isCover: z.boolean().optional(),
        orderIndex: z.number().int().min(0),
      })
    )
    .max(50)
    .optional(),
});

/**
 * Travel Note update input schema
 */
export const UpdateTravelNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  content: z.string().min(1, 'Content is required').optional(),
  visibility: TravelNoteVisibilitySchema.optional(),
  itineraryId: z.string().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  travelDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .nullable()
    .optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

/**
 * Travel Note list query schema for user's own notes
 */
export const TravelNoteListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  visibility: TravelNoteVisibilitySchema.optional(),
});

/**
 * Public Travel Note list query schema
 */
export const PublicTravelNoteListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  tag: z.string().optional(),
  sortBy: TravelNoteSortSchema.optional().default('latest'),
});

/**
 * Travel Note search query schema
 */
export const TravelNoteSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * Add image to note schema
 */
export const AddImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().max(500).optional(),
  isCover: z.boolean().optional(),
  orderIndex: z.number().int().min(0),
});

/**
 * Add POI to note schema
 */
export const AddPoiSchema = z.object({
  poiId: z.string(),
  mentionIndex: z.number().int().min(0).optional(),
});

/**
 * Comment creation schema
 */
export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

/**
 * Comment update schema
 */
export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

/**
 * Comment list query schema
 */
export const CommentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  sortBy: z.enum(['latest', 'popular']).optional().default('latest'),
});

// Infer types from schemas
export type CreateTravelNoteInput = z.infer<typeof CreateTravelNoteSchema>;
export type UpdateTravelNoteInput = z.infer<typeof UpdateTravelNoteSchema>;
export type TravelNoteListQuery = z.infer<typeof TravelNoteListQuerySchema>;
export type PublicTravelNoteListQuery = z.infer<
  typeof PublicTravelNoteListQuerySchema
>;
export type TravelNoteSearchQuery = z.infer<typeof TravelNoteSearchQuerySchema>;
