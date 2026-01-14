import { z } from 'zod';

/**
 * Message type enum schema
 */
export const MessageTypeSchema = z.enum(['text', 'image', 'itinerary_share']);

/**
 * Send message input schema
 */
export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be 5000 characters or less'),
  messageType: MessageTypeSchema.optional().default('text'),
  sharedItineraryId: z.string().optional(),
  sharedImageUrl: z.string().url().optional(),
});

/**
 * Create conversation input schema
 */
export const CreateConversationSchema = z.object({
  otherUserId: z.string().min(1, 'Other user ID is required'),
});

/**
 * Message list query schema
 */
export const MessageListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  before: z.coerce.number().optional(), // Timestamp for pagination
});

/**
 * Conversation list query schema
 */
export const ConversationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * User search query schema
 */
export const UserSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Infer types from schemas
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type MessageListQuery = z.infer<typeof MessageListQuerySchema>;
export type ConversationListQuery = z.infer<typeof ConversationListQuerySchema>;
export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
