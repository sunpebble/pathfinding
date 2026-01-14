import { z } from 'zod';

/**
 * POI Ticket Models - Zod schemas for ticket API validation
 */

/**
 * Ticket type enum schema
 */
export const TicketTypeSchema = z.enum([
  'adult',
  'student',
  'senior',
  'child',
  'group',
  'family',
  'vip',
  'free',
  'other',
]);

/**
 * Stock status enum schema
 */
export const StockStatusSchema = z.enum([
  'in_stock',
  'low_stock',
  'sold_out',
  'unknown',
]);

/**
 * Age range schema
 */
export const AgeRangeSchema = z.object({
  minAge: z.number().int().min(0).max(150).optional(),
  maxAge: z.number().int().min(0).max(150).optional(),
});

/**
 * POI Ticket response schema
 */
export const PoiTicketSchema = z.object({
  id: z.string(),
  poiId: z.string(),
  ticketName: z.string(),
  ticketType: TicketTypeSchema,
  price: z.number().min(0),
  originalPrice: z.number().min(0).optional(),
  currency: z.string().default('CNY'),
  discountInfo: z.string().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  eligibilityRequirements: z.string().optional(),
  ageRange: AgeRangeSchema.optional(),
  validFrom: z.number().optional(),
  validUntil: z.number().optional(),
  validDays: z.number().int().min(1).optional(),
  purchaseUrl: z.string().url().optional(),
  purchasePlatform: z.string().optional(),
  requiresReservation: z.boolean(),
  reservationUrl: z.string().url().optional(),
  reservationTips: z.string().optional(),
  advanceBookingDays: z.number().int().min(0).optional(),
  usageInstructions: z.string().optional(),
  includedServices: z.array(z.string()).optional(),
  excludedServices: z.array(z.string()).optional(),
  isActive: z.boolean(),
  stockStatus: StockStatusSchema.optional(),
  sortOrder: z.number(),
  isRecommended: z.boolean().optional(),
  source: z.string().optional(),
  lastSyncedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Create ticket input schema
 */
export const CreateTicketSchema = z.object({
  ticketName: z.string().min(1).max(200),
  ticketType: TicketTypeSchema,
  price: z.number().min(0),
  originalPrice: z.number().min(0).optional(),
  currency: z.string().max(10).optional().default('CNY'),
  discountInfo: z.string().max(500).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  eligibilityRequirements: z.string().max(500).optional(),
  ageRange: AgeRangeSchema.optional(),
  validFrom: z.number().optional(),
  validUntil: z.number().optional(),
  validDays: z.number().int().min(1).optional(),
  purchaseUrl: z.string().url().max(500).optional(),
  purchasePlatform: z.string().max(100).optional(),
  requiresReservation: z.boolean().default(false),
  reservationUrl: z.string().url().max(500).optional(),
  reservationTips: z.string().max(500).optional(),
  advanceBookingDays: z.number().int().min(0).optional(),
  usageInstructions: z.string().max(1000).optional(),
  includedServices: z.array(z.string().max(200)).max(20).optional(),
  excludedServices: z.array(z.string().max(200)).max(20).optional(),
  isActive: z.boolean().optional().default(true),
  stockStatus: StockStatusSchema.optional(),
  sortOrder: z.number().int().optional(),
  isRecommended: z.boolean().optional(),
  source: z.string().max(100).optional(),
});

/**
 * Update ticket input schema
 */
export const UpdateTicketSchema = CreateTicketSchema.partial();

/**
 * Ticket price range response schema
 */
export const TicketPriceRangeSchema = z.object({
  minPrice: z.number(),
  maxPrice: z.number(),
  currency: z.string(),
  hasFreeTickets: z.boolean(),
  ticketCount: z.number(),
});

/**
 * Ticket reminder type enum schema
 */
export const TicketReminderTypeSchema = z.enum([
  'reservation_open',
  'booking_reminder',
  'visit_reminder',
  'price_drop',
  'stock_available',
]);

/**
 * Ticket reminder response schema
 */
export const TicketReminderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  poiId: z.string(),
  ticketId: z.string().optional(),
  itineraryId: z.string().optional(),
  reminderType: TicketReminderTypeSchema,
  reminderTime: z.number(),
  message: z.string().optional(),
  isTriggered: z.boolean(),
  triggeredAt: z.number().optional(),
  isRead: z.boolean(),
  readAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Create ticket reminder input schema
 */
export const CreateTicketReminderSchema = z.object({
  poiId: z.string(),
  ticketId: z.string().optional(),
  itineraryId: z.string().optional(),
  reminderType: TicketReminderTypeSchema,
  reminderTime: z.number(),
  message: z.string().max(500).optional(),
});

/**
 * Update ticket reminder input schema
 */
export const UpdateTicketReminderSchema = z.object({
  reminderTime: z.number().optional(),
  message: z.string().max(500).optional(),
  reminderType: TicketReminderTypeSchema.optional(),
});

// Infer types from schemas
export type TicketType = z.infer<typeof TicketTypeSchema>;
export type StockStatus = z.infer<typeof StockStatusSchema>;
export type AgeRange = z.infer<typeof AgeRangeSchema>;
export type PoiTicket = z.infer<typeof PoiTicketSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
export type TicketPriceRange = z.infer<typeof TicketPriceRangeSchema>;
export type TicketReminderType = z.infer<typeof TicketReminderTypeSchema>;
export type TicketReminder = z.infer<typeof TicketReminderSchema>;
export type CreateTicketReminderInput = z.infer<typeof CreateTicketReminderSchema>;
export type UpdateTicketReminderInput = z.infer<typeof UpdateTicketReminderSchema>;
