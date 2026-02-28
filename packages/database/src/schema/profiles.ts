/**
 * Profiles schema - user profiles, follows, activity feed, preferences.
 */
import {
  boolean,
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

// ── Profiles ───────────────────────────────────────────
export const profiles = mysqlTable(
  'profiles',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    expoPushToken: varchar('expo_push_token', { length: 255 }),
    followersCount: int('followers_count').default(0),
    followingCount: int('following_count').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('profiles_user_idx').on(t.userId),
    index('profiles_email_idx').on(t.email),
    index('profiles_phone_idx').on(t.phone),
  ],
);

// ── User Follows ───────────────────────────────────────
export const userFollows = mysqlTable(
  'user_follows',
  {
    id: id(),
    followerId: fk('follower_id').notNull(),
    followingId: fk('following_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('user_follows_follower_idx').on(t.followerId),
    index('user_follows_following_idx').on(t.followingId),
    index('user_follows_pair_idx').on(t.followerId, t.followingId),
  ],
);

// ── Activity Feed ──────────────────────────────────────
export const activityFeed = mysqlTable(
  'activity_feed',
  {
    id: id(),
    actorId: fk('actor_id').notNull(),
    actorName: varchar('actor_name', { length: 255 }),
    actorAvatarUrl: text('actor_avatar_url'),
    activityType: varchar('activity_type', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: fk('target_id').notNull(),
    targetTitle: varchar('target_title', { length: 500 }),
    targetCoverImageUrl: text('target_cover_image_url'),
    targetUserName: varchar('target_user_name', { length: 255 }),
    targetCityName: varchar('target_city_name', { length: 255 }),
    likesCount: int('likes_count').notNull().default(0),
    commentsCount: int('comments_count').notNull().default(0),
    visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('activity_feed_actor_idx').on(t.actorId),
    index('activity_feed_target_idx').on(t.targetType, t.targetId),
    index('activity_feed_type_idx').on(t.activityType),
    index('activity_feed_visibility_idx').on(t.visibility),
    index('activity_feed_visibility_created_idx').on(t.visibility, t.createdAt),
    index('activity_feed_created_idx').on(t.createdAt),
    index('activity_feed_actor_created_idx').on(t.actorId, t.createdAt),
  ],
);

// ── User Preferences ───────────────────────────────────
export const userPreferences = mysqlTable(
  'user_preferences',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    categoryScores: json('category_scores'),
    explicitPreferences: json('explicit_preferences'),
    travelStyle: varchar('travel_style', { length: 50 }).notNull(),
    budgetLevel: varchar('budget_level', { length: 50 }).notNull(),
    pacePreference: varchar('pace_preference', { length: 50 }).notNull(),
    preferLocalFood: boolean('prefer_local_food').notNull().default(false),
    preferOffBeatPlaces: boolean('prefer_off_beat_places').notNull().default(false),
    accessibilityNeeds: boolean('accessibility_needs').notNull().default(false),
    totalInteractions: int('total_interactions').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('user_preferences_user_idx').on(t.userId)],
);

// ── User Behavior Events ───────────────────────────────
export const userBehaviorEvents = mysqlTable(
  'user_behavior_events',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    behaviorType: varchar('behavior_type', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: fk('target_id').notNull(),
    categories: json('categories'),
    metadata: json('metadata'),
    createdAt: createdAt(),
  },
  t => [
    index('user_behavior_events_user_idx').on(t.userId),
    index('user_behavior_events_user_type_idx').on(t.userId, t.behaviorType),
    index('user_behavior_events_target_idx').on(t.targetType, t.targetId),
    index('user_behavior_events_created_idx').on(t.createdAt),
  ],
);

// ── User Travel Preferences ────────────────────────────
export const userTravelPreferences = mysqlTable(
  'user_travel_preferences',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    travelStyles: json('travel_styles'),
    preferredPace: varchar('preferred_pace', { length: 50 }),
    languages: json('languages'),
    ageRange: varchar('age_range', { length: 20 }),
    gender: varchar('gender', { length: 20 }),
    preferredPartnerGender: varchar('preferred_partner_gender', { length: 20 }),
    bio: text('bio'),
    interests: json('interests'),
    smokingPreference: varchar('smoking_preference', { length: 30 }),
    accommodationPreference: varchar('accommodation_preference', { length: 30 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('user_travel_prefs_user_idx').on(t.userId),
    index('user_travel_prefs_age_idx').on(t.ageRange),
    index('user_travel_prefs_gender_idx').on(t.gender),
  ],
);

// ── User Timezone Settings ─────────────────────────────
export const userTimezoneSettings = mysqlTable(
  'user_timezone_settings',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    homeTimezone: varchar('home_timezone', { length: 100 }),
    currentTimezone: varchar('current_timezone', { length: 100 }),
    autoDetect: boolean('auto_detect').notNull().default(true),
    format24h: boolean('format_24h').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('user_tz_settings_user_idx').on(t.userId)],
);

// ── User Travel Stats ──────────────────────────────────
export const userTravelStats = mysqlTable(
  'user_travel_stats',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    totalTrips: int('total_trips').notNull().default(0),
    totalCountries: int('total_countries').notNull().default(0),
    totalCities: int('total_cities').notNull().default(0),
    totalDistance: double('total_distance').notNull().default(0),
    totalDays: int('total_days').notNull().default(0),
    longestTrip: int('longest_trip').notNull().default(0),
    favoriteCity: varchar('favorite_city', { length: 255 }),
    favoriteCountry: varchar('favorite_country', { length: 255 }),
    travelStyle: varchar('travel_style', { length: 50 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('user_travel_stats_user_idx').on(t.userId),
    index('user_travel_stats_trips_idx').on(t.totalTrips),
    index('user_travel_stats_distance_idx').on(t.totalDistance),
  ],
);

// ── User Trust Scores ──────────────────────────────────
export const userTrustScores = mysqlTable(
  'user_trust_scores',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    overallScore: double('overall_score').notNull().default(0),
    contentQualityScore: double('content_quality_score').notNull().default(0),
    reviewAccuracyScore: double('review_accuracy_score').notNull().default(0),
    communityScore: double('community_score').notNull().default(0),
    verificationScore: double('verification_score').notNull().default(0),
    totalContributions: int('total_contributions').notNull().default(0),
    reportCount: int('report_count').notNull().default(0),
    lastCalculatedAt: timestamp('last_calculated_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('user_trust_scores_user_idx').on(t.userId),
    index('user_trust_scores_overall_idx').on(t.overallScore),
  ],
);

// ── User Verifications ─────────────────────────────────
export const userVerifications = mysqlTable(
  'user_verifications',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    verificationType: varchar('verification_type', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    verificationData: json('verification_data'),
    verifiedAt: timestamp('verified_at', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('user_verif_user_idx').on(t.userId),
    index('user_verif_user_type_idx').on(t.userId, t.verificationType),
    index('user_verif_status_idx').on(t.status),
    index('user_verif_type_status_idx').on(t.verificationType, t.status),
  ],
);

// ── Verification Badges ────────────────────────────────
export const verificationBadges = mysqlTable(
  'verification_badges',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    badgeType: varchar('badge_type', { length: 30 }).notNull(), // travel_expert, local_guide, official_account
    displayName: varchar('display_name', { length: 255 }),
    description: text('description'),
    iconUrl: text('icon_url'),
    isActive: boolean('is_active').notNull().default(true),
    grantedAt: timestamp('granted_at', { mode: 'date' }).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('verif_badges_user_idx').on(t.userId),
    index('verif_badges_user_type_idx').on(t.userId, t.badgeType),
    index('verif_badges_type_idx').on(t.badgeType),
    index('verif_badges_active_idx').on(t.isActive),
    index('verif_badges_user_active_idx').on(t.userId, t.isActive),
  ],
);

// ── Verification Applications ──────────────────────────
export const verificationApplications = mysqlTable(
  'verification_applications',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    applicationType: varchar('application_type', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    applicationData: json('application_data'),
    reviewNotes: text('review_notes'),
    reviewedBy: fk('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('verif_apps_user_idx').on(t.userId),
    index('verif_apps_status_idx').on(t.status),
    index('verif_apps_type_idx').on(t.applicationType),
    index('verif_apps_user_type_idx').on(t.userId, t.applicationType),
    index('verif_apps_user_status_idx').on(t.userId, t.status),
    index('verif_apps_created_idx').on(t.createdAt),
  ],
);
