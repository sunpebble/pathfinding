import { z } from 'npm:zod';

/**
 * ItineraryDay creation input schema
 */
export const CreateItineraryDaySchema = z.object({
  itineraryId: z.string().uuid('Invalid itinerary ID'),
  dayNumber: z.number().int().positive('Day number must be positive'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

/**
 * ItineraryDay update input schema
 */
export const UpdateItineraryDaySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
});

/**
 * ItineraryDay database row type
 */
export interface ItineraryDayRow {
  id: string;
  itinerary_id: string;
  day_number: number;
  date: string;
  created_at: string;
  updated_at: string;
}

/**
 * ItineraryDay response type (camelCase for API)
 */
export interface ItineraryDayResponse {
  id: string;
  itineraryId: string;
  dayNumber: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  // Populated relation
  items?: unknown[];
}

/**
 * Transform database row to API response
 */
export function toItineraryDayResponse(
  row: ItineraryDayRow
): ItineraryDayResponse {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    dayNumber: row.day_number,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Infer types from schemas
export type CreateItineraryDayInput = z.infer<typeof CreateItineraryDaySchema>;
export type UpdateItineraryDayInput = z.infer<typeof UpdateItineraryDaySchema>;
