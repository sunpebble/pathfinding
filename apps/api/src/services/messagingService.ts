/**
 * Messaging Service - Convex Implementation
 * CRUD operations for conversations and messages
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface SendMessageInput {
  content: string;
  messageType: 'text' | 'image' | 'itinerary_share';
  sharedItineraryId?: string;
  sharedImageUrl?: string;
}

export interface MessageListQuery {
  limit: number;
  before?: number;
}

export interface ConversationListQuery {
  limit: number;
}

export interface UserSearchQuery {
  q: string;
  limit: number;
}

/**
 * Messaging service for conversations and messages
 */
export const MessagingService = {
  /**
   * List conversations for a user
   */
  async listConversations(userId: string, query: ConversationListQuery) {
    const conversations = await convex.query(api.messaging.listConversations, {
      userId,
      limit: query.limit,
    });

    return conversations;
  },

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(userId: string, otherUserId: string) {
    const conversationId = await convex.mutation(
      api.messaging.getOrCreateConversation,
      {
        userId,
        otherUserId,
      }
    );

    return conversationId;
  },

  /**
   * Get a conversation by ID
   */
  async getConversation(
    conversationId: string,
    userId: string
  ) {
    const conversation = await convex.query(api.messaging.getConversation, {
      conversationId: conversationId as Id<'conversations'>,
      userId,
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    return conversation;
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    query: MessageListQuery
  ) {
    const messages = await convex.query(api.messaging.getMessages, {
      conversationId: conversationId as Id<'conversations'>,
      userId,
      limit: query.limit,
      before: query.before,
    });

    return messages;
  },

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    input: SendMessageInput
  ) {
    const messageId = await convex.mutation(api.messaging.sendMessage, {
      conversationId: conversationId as Id<'conversations'>,
      senderId: userId,
      content: input.content,
      messageType: input.messageType,
      sharedItineraryId: input.sharedItineraryId as
        | Id<'itineraries'>
        | undefined,
      sharedImageUrl: input.sharedImageUrl,
    });

    return messageId;
  },

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string) {
    await convex.mutation(api.messaging.deleteMessage, {
      messageId: messageId as Id<'messages'>,
      userId,
    });
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string, userId: string) {
    await convex.mutation(api.messaging.markAsRead, {
      conversationId: conversationId as Id<'conversations'>,
      userId,
    });
  },

  /**
   * Get total unread message count for a user
   */
  async getUnreadCount(userId: string) {
    const count = await convex.query(api.messaging.getUnreadCount, {
      userId,
    });

    return count;
  },

  /**
   * Search users for starting a new conversation
   */
  async searchUsers(userId: string, query: UserSearchQuery) {
    const users = await convex.query(api.messaging.searchUsers, {
      query: query.q,
      currentUserId: userId,
      limit: query.limit,
    });

    return users;
  },
};
