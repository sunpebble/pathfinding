/**
 * Drizzle ORM relations — defines the logical relationships between core entities.
 *
 * These relations enable the Drizzle relational query API (`db.query.users.findMany({ with: { ... } })`)
 * but do **not** create any database-level foreign keys or require migrations.
 */
import { relations } from 'drizzle-orm';

import { users } from './auth';
import { chatMessages, chatSessions } from './chat';
import {
  guideCommentLikes,
  guideComments,
  guideRecommendations,
  travelGuideAiData,
  travelGuides,
} from './guides';
import {
  itineraries,
  itineraryCollaborators,
  itineraryDays,
  itineraryItems,
  itineraryLikes,
} from './itineraries';
import { profiles, userFollows } from './profiles';

// ── Users ──────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  itineraries: many(itineraries),
  profiles: many(profiles),
  chatSessions: many(chatSessions),
}));

// ── Profiles ───────────────────────────────────────────
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

// ── User Follows ───────────────────────────────────────
export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, { fields: [userFollows.followerId], references: [users.id], relationName: 'follower' }),
  following: one(users, { fields: [userFollows.followingId], references: [users.id], relationName: 'following' }),
}));

// ── Itineraries ────────────────────────────────────────
export const itinerariesRelations = relations(itineraries, ({ one, many }) => ({
  user: one(users, { fields: [itineraries.userId], references: [users.id] }),
  days: many(itineraryDays),
  collaborators: many(itineraryCollaborators),
  likes: many(itineraryLikes),
}));

// ── Itinerary Days ─────────────────────────────────────
export const itineraryDaysRelations = relations(itineraryDays, ({ one, many }) => ({
  itinerary: one(itineraries, { fields: [itineraryDays.itineraryId], references: [itineraries.id] }),
  items: many(itineraryItems),
}));

// ── Itinerary Items ────────────────────────────────────
export const itineraryItemsRelations = relations(itineraryItems, ({ one }) => ({
  day: one(itineraryDays, { fields: [itineraryItems.dayId], references: [itineraryDays.id] }),
}));

// ── Itinerary Collaborators ────────────────────────────
export const itineraryCollaboratorsRelations = relations(itineraryCollaborators, ({ one }) => ({
  itinerary: one(itineraries, { fields: [itineraryCollaborators.itineraryId], references: [itineraries.id] }),
  user: one(users, { fields: [itineraryCollaborators.userId], references: [users.id] }),
}));

// ── Itinerary Likes ────────────────────────────────────
export const itineraryLikesRelations = relations(itineraryLikes, ({ one }) => ({
  itinerary: one(itineraries, { fields: [itineraryLikes.itineraryId], references: [itineraries.id] }),
  user: one(users, { fields: [itineraryLikes.userId], references: [users.id] }),
}));

// ── Travel Guides ──────────────────────────────────────
export const travelGuidesRelations = relations(travelGuides, ({ many }) => ({
  comments: many(guideComments),
  recommendations: many(guideRecommendations),
  aiData: many(travelGuideAiData),
}));

// ── Guide Comments ─────────────────────────────────────
export const guideCommentsRelations = relations(guideComments, ({ one, many }) => ({
  guide: one(travelGuides, { fields: [guideComments.guideId], references: [travelGuides.id] }),
  user: one(users, { fields: [guideComments.userId], references: [users.id] }),
  likes: many(guideCommentLikes),
}));

// ── Guide Comment Likes ────────────────────────────────
export const guideCommentLikesRelations = relations(guideCommentLikes, ({ one }) => ({
  comment: one(guideComments, { fields: [guideCommentLikes.commentId], references: [guideComments.id] }),
  user: one(users, { fields: [guideCommentLikes.userId], references: [users.id] }),
}));

// ── Chat Sessions ──────────────────────────────────────
export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  messages: many(chatMessages),
}));

// ── Chat Messages ──────────────────────────────────────
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] }),
}));
