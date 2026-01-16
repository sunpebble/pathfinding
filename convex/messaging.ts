/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Messaging - Private Direct Messages
 * Handles conversations, messages, and read status
 */

const messageTypeValidator = v.union(
  v.literal('text'),
  v.literal('image'),
  v.literal('itinerary_share')
);

// ============================================
// Conversation Queries
// ============================================

/**
 * List all conversations for a user
 * Returns conversations sorted by last message time
 */
export const listConversations = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get all conversations where user is a participant
    const allConversations = await ctx.db
      .query('conversations')
      .withIndex('by_last_message')
      .order('desc')
      .collect();

    // Filter to only conversations where user is a participant
    const userConversations = allConversations.filter((conv) =>
      conv.participantIds.includes(args.userId)
    );

    const limitedConversations = userConversations.slice(0, limit);

    // Enrich with participant profiles and unread counts
    const enriched = await Promise.all(
      limitedConversations.map(async (conv) => {
        // Get the other participant's ID
        const otherUserId = conv.participantIds.find(
          (id) => id !== args.userId
        );

        // Get other participant's profile
        let otherUser = null;
        if (otherUserId) {
          const profile = await ctx.db
            .query('profiles')
            .withIndex('by_email', (q) => q.eq('email', otherUserId))
            .first();

          otherUser = profile
            ? {
                id: otherUserId,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
              }
            : {
                id: otherUserId,
                displayName: null,
                avatarUrl: null,
              };
        }

        // Get unread count
        const readStatus = await ctx.db
          .query('messageReadStatus')
          .withIndex('by_conversation_user', (q) =>
            q.eq('conversationId', conv._id).eq('userId', args.userId)
          )
          .first();

        let unreadCount = 0;
        if (readStatus?.lastReadAt) {
          // Count messages after lastReadAt that are not from this user
          const unreadMessages = await ctx.db
            .query('messages')
            .withIndex('by_conversation_time', (q) =>
              q
                .eq('conversationId', conv._id)
                .gt('sentAt', readStatus.lastReadAt)
            )
            .collect();

          unreadCount = unreadMessages.filter(
            (msg) => msg.senderId !== args.userId && !msg.isDeleted
          ).length;
        } else if (conv.lastMessageAt) {
          // No read status yet, count all messages not from this user
          const allMessages = await ctx.db
            .query('messages')
            .withIndex('by_conversation', (q) =>
              q.eq('conversationId', conv._id)
            )
            .collect();

          unreadCount = allMessages.filter(
            (msg) => msg.senderId !== args.userId && !msg.isDeleted
          ).length;
        }

        return {
          ...conv,
          otherUser,
          unreadCount,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = mutation({
  args: {
    userId: v.string(),
    otherUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.userId === args.otherUserId) {
      throw new Error('Cannot create conversation with yourself');
    }

    // Sort participant IDs for consistent lookup
    const participantIds = [args.userId, args.otherUserId].sort();

    // Look for existing conversation
    const allConversations = await ctx.db.query('conversations').collect();

    const existing = allConversations.find(
      (conv) =>
        conv.participantIds.length === 2 &&
        conv.participantIds[0] === participantIds[0] &&
        conv.participantIds[1] === participantIds[1]
    );

    if (existing) {
      return existing._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert('conversations', {
      participantIds,
      lastMessageText: undefined,
      lastMessageAt: undefined,
      lastMessageSenderId: undefined,
    });

    // Initialize read status for both users
    const now = Date.now();
    await ctx.db.insert('messageReadStatus', {
      conversationId,
      userId: args.userId,
      lastReadAt: now,
    });
    await ctx.db.insert('messageReadStatus', {
      conversationId,
      userId: args.otherUserId,
      lastReadAt: now,
    });

    return conversationId;
  },
});

/**
 * Get conversation by ID with participant info
 */
export const getConversation = query({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return null;
    }

    // Check if user is a participant
    if (!conversation.participantIds.includes(args.userId)) {
      return null;
    }

    // Get the other participant's profile
    const otherUserId = conversation.participantIds.find(
      (id) => id !== args.userId
    );

    let otherUser = null;
    if (otherUserId) {
      const profile = await ctx.db
        .query('profiles')
        .withIndex('by_email', (q) => q.eq('email', otherUserId))
        .first();

      otherUser = profile
        ? {
            id: otherUserId,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          }
        : {
            id: otherUserId,
            displayName: null,
            avatarUrl: null,
          };
    }

    return {
      ...conversation,
      otherUser,
    };
  },
});

// ============================================
// Message Queries and Mutations
// ============================================

/**
 * Get messages for a conversation with pagination
 */
export const getMessages = query({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // Timestamp for pagination
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Verify user is a participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(args.userId)) {
      throw new Error('Not authorized to view this conversation');
    }

    // Get messages
    let messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation_time', (q) =>
        q.eq('conversationId', args.conversationId)
      )
      .order('desc')
      .collect();

    // Filter by timestamp if provided
    if (args.before) {
      messages = messages.filter((msg) => msg.sentAt < args.before);
    }

    // Apply limit
    messages = messages.slice(0, limit);

    // Filter out deleted messages
    messages = messages.filter((msg) => !msg.isDeleted);

    // Enrich with sender info and shared itinerary data
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        // Get sender profile
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', msg.senderId))
          .first();

        const sender = profile
          ? {
              id: msg.senderId,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            }
          : {
              id: msg.senderId,
              displayName: null,
              avatarUrl: null,
            };

        // Get shared itinerary if present
        let sharedItinerary = null;
        if (msg.sharedItineraryId) {
          const itinerary = await ctx.db.get(msg.sharedItineraryId);
          if (itinerary) {
            const city = await ctx.db.get(itinerary.cityId);
            sharedItinerary = {
              id: itinerary._id,
              title: itinerary.title,
              cityName: city?.name,
              coverImageUrl: itinerary.coverImageUrl,
              startDate: itinerary.startDate,
              endDate: itinerary.endDate,
            };
          }
        }

        return {
          ...msg,
          sender,
          sharedItinerary,
        };
      })
    );

    // Return in chronological order (oldest first)
    return enriched.reverse();
  },
});

/**
 * Send a message
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    senderId: v.string(),
    content: v.string(),
    messageType: messageTypeValidator,
    sharedItineraryId: v.optional(v.id('itineraries')),
    sharedImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify sender is a participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(args.senderId)) {
      throw new Error('Not authorized to send messages in this conversation');
    }

    const now = Date.now();

    // Create the message
    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      messageType: args.messageType,
      sharedItineraryId: args.sharedItineraryId,
      sharedImageUrl: args.sharedImageUrl,
      sentAt: now,
      isDeleted: false,
    });

    // Update conversation's last message
    const previewText =
      args.messageType === 'text'
        ? args.content.slice(0, 100)
        : args.messageType === 'image'
          ? '[图片]'
          : '[分享行程]';

    await ctx.db.patch(args.conversationId, {
      lastMessageText: previewText,
      lastMessageAt: now,
      lastMessageSenderId: args.senderId,
    });

    // Update sender's read status
    const senderReadStatus = await ctx.db
      .query('messageReadStatus')
      .withIndex('by_conversation_user', (q) =>
        q.eq('conversationId', args.conversationId).eq('userId', args.senderId)
      )
      .first();

    if (senderReadStatus) {
      await ctx.db.patch(senderReadStatus._id, {
        lastReadAt: now,
        lastReadMessageId: messageId,
      });
    } else {
      await ctx.db.insert('messageReadStatus', {
        conversationId: args.conversationId,
        userId: args.senderId,
        lastReadAt: now,
        lastReadMessageId: messageId,
      });
    }

    // Create notification for the other participant
    const recipientId = conversation.participantIds.find(
      (id) => id !== args.senderId
    );

    if (recipientId) {
      // Get sender's display name
      const senderProfile = await ctx.db
        .query('profiles')
        .withIndex('by_email', (q) => q.eq('email', args.senderId))
        .first();

      const senderName = senderProfile?.displayName || '用户';

      await ctx.db.insert('notifications', {
        userId: recipientId,
        type: 'comment', // Reusing comment type for messages
        referenceType: 'user',
        referenceId: args.conversationId,
        actorId: args.senderId,
        message: `${senderName} 给你发送了一条私信`,
        isRead: false,
        createdAt: now,
      });
    }

    return messageId;
  },
});

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id('messages'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can delete their own messages
    if (message.senderId !== args.userId) {
      throw new Error('Not authorized to delete this message');
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
    });
  },
});

// ============================================
// Read Status
// ============================================

/**
 * Mark conversation as read
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is a participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(args.userId)) {
      throw new Error('Not authorized');
    }

    const now = Date.now();

    // Get the latest message
    const latestMessage = await ctx.db
      .query('messages')
      .withIndex('by_conversation_time', (q) =>
        q.eq('conversationId', args.conversationId)
      )
      .order('desc')
      .first();

    // Update or create read status
    const readStatus = await ctx.db
      .query('messageReadStatus')
      .withIndex('by_conversation_user', (q) =>
        q.eq('conversationId', args.conversationId).eq('userId', args.userId)
      )
      .first();

    if (readStatus) {
      await ctx.db.patch(readStatus._id, {
        lastReadAt: now,
        lastReadMessageId: latestMessage?._id,
      });
    } else {
      await ctx.db.insert('messageReadStatus', {
        conversationId: args.conversationId,
        userId: args.userId,
        lastReadAt: now,
        lastReadMessageId: latestMessage?._id,
      });
    }
  },
});

/**
 * Get total unread message count for a user
 */
export const getUnreadCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all conversations for user
    const allConversations = await ctx.db.query('conversations').collect();

    const userConversations = allConversations.filter((conv) =>
      conv.participantIds.includes(args.userId)
    );

    let totalUnread = 0;

    for (const conv of userConversations) {
      const readStatus = await ctx.db
        .query('messageReadStatus')
        .withIndex('by_conversation_user', (q) =>
          q.eq('conversationId', conv._id).eq('userId', args.userId)
        )
        .first();

      if (readStatus?.lastReadAt) {
        const unreadMessages = await ctx.db
          .query('messages')
          .withIndex('by_conversation_time', (q) =>
            q.eq('conversationId', conv._id).gt('sentAt', readStatus.lastReadAt)
          )
          .collect();

        totalUnread += unreadMessages.filter(
          (msg) => msg.senderId !== args.userId && !msg.isDeleted
        ).length;
      } else if (conv.lastMessageAt) {
        const allMessages = await ctx.db
          .query('messages')
          .withIndex('by_conversation', (q) => q.eq('conversationId', conv._id))
          .collect();

        totalUnread += allMessages.filter(
          (msg) => msg.senderId !== args.userId && !msg.isDeleted
        ).length;
      }
    }

    return totalUnread;
  },
});

/**
 * Search users for starting a new conversation
 */
export const searchUsers = query({
  args: {
    query: v.string(),
    currentUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchQuery = args.query.toLowerCase();

    // Get all profiles
    const profiles = await ctx.db.query('profiles').collect();

    // Filter by display name or email (case-insensitive)
    const matches = profiles
      .filter((profile) => {
        if (profile.email === args.currentUserId) return false;
        const displayName = profile.displayName?.toLowerCase() || '';
        const email = profile.email.toLowerCase();
        return displayName.includes(searchQuery) || email.includes(searchQuery);
      })
      .slice(0, limit);

    return matches.map((profile) => ({
      id: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    }));
  },
});
