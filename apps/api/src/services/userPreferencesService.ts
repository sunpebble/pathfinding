/**
 * User Preferences Service - Convex Implementation
 * Handles user preference learning and personalization
 */

import { api, convex } from '../lib/convex';

// Types
export type PreferenceCategory =
  | 'food'
  | 'culture'
  | 'nature'
  | 'shopping'
  | 'nightlife'
  | 'adventure'
  | 'relaxation'
  | 'photography'
  | 'family'
  | 'budget'
  | 'luxury';

export type TravelStyle = 'adventurous' | 'relaxed' | 'cultural' | 'balanced';
export type BudgetLevel = 'budget' | 'moderate' | 'luxury';
export type PacePreference = 'slow' | 'moderate' | 'fast';

export type BehaviorType =
  | 'view'
  | 'save'
  | 'unsave'
  | 'copy'
  | 'share'
  | 'like'
  | 'unlike'
  | 'search'
  | 'poi_click'
  | 'poi_add';

export type TargetType = 'guide' | 'itinerary' | 'poi' | 'city' | 'search';

export interface UserPreferences {
  _id: string | null;
  userId: string;
  categoryScores: Record<string, number>;
  explicitPreferences: PreferenceCategory[];
  travelStyle: TravelStyle;
  budgetLevel: BudgetLevel;
  pacePreference: PacePreference;
  preferLocalFood: boolean;
  preferOffBeatPlaces: boolean;
  accessibilityNeeds: boolean;
  totalInteractions: number;
  createdAt?: number;
  lastUpdated: number;
}

export interface UpdatePreferencesInput {
  explicitPreferences?: PreferenceCategory[];
  travelStyle?: TravelStyle;
  budgetLevel?: BudgetLevel;
  pacePreference?: PacePreference;
  preferLocalFood?: boolean;
  preferOffBeatPlaces?: boolean;
  accessibilityNeeds?: boolean;
}

export interface RecordBehaviorInput {
  behaviorType: BehaviorType;
  targetType: TargetType;
  targetId: string;
  categories?: PreferenceCategory[];
  metadata?: {
    duration?: number;
    scrollDepth?: number;
    searchQuery?: string;
    cityName?: string;
    poiCategory?: string;
  };
}

export interface CategoryScore {
  category: string;
  score: number;
  normalized: number;
}

export interface RecommendedCategories {
  topCategories: string[];
  style: TravelStyle;
  budgetLevel?: BudgetLevel;
  pacePreference?: PacePreference;
  isLearned: boolean;
  totalInteractions?: number;
}

/**
 * User Preferences Service
 */
export const UserPreferencesService = {
  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const preferences = await convex.query(api.userPreferences.getUserPreferences, {
      userId,
    });
    return preferences as UserPreferences | null;
  },

  /**
   * Get or create user preferences (returns defaults if none exists)
   */
  async getOrCreatePreferences(userId: string): Promise<UserPreferences> {
    const preferences = await convex.query(api.userPreferences.getOrCreatePreferences, {
      userId,
    });
    return preferences as UserPreferences;
  },

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    input: UpdatePreferencesInput
  ): Promise<string> {
    const preferenceId = await convex.mutation(api.userPreferences.upsertPreferences, {
      userId,
      explicitPreferences: input.explicitPreferences,
      travelStyle: input.travelStyle,
      budgetLevel: input.budgetLevel,
      pacePreference: input.pacePreference,
      preferLocalFood: input.preferLocalFood,
      preferOffBeatPlaces: input.preferOffBeatPlaces,
      accessibilityNeeds: input.accessibilityNeeds,
    });
    return preferenceId;
  },

  /**
   * Record a user behavior event
   */
  async recordBehavior(userId: string, input: RecordBehaviorInput): Promise<string> {
    const eventId = await convex.mutation(api.userPreferences.recordBehavior, {
      userId,
      behaviorType: input.behaviorType,
      targetType: input.targetType,
      targetId: input.targetId,
      categories: input.categories,
      metadata: input.metadata,
    });
    return eventId;
  },

  /**
   * Get user's top preference categories
   */
  async getTopCategories(userId: string, limit?: number): Promise<CategoryScore[]> {
    const categories = await convex.query(api.userPreferences.getTopCategories, {
      userId,
      limit,
    });
    return categories as CategoryScore[];
  },

  /**
   * Get recent behavior events
   */
  async getRecentBehaviors(
    userId: string,
    limit?: number,
    behaviorType?: BehaviorType
  ) {
    const events = await convex.query(api.userPreferences.getRecentBehaviors, {
      userId,
      limit,
      behaviorType,
    });
    return events;
  },

  /**
   * Reset user preferences (clear learned data)
   */
  async resetPreferences(userId: string): Promise<{ success: boolean; deletedEvents: number }> {
    const result = await convex.mutation(api.userPreferences.resetPreferences, {
      userId,
    });
    return result;
  },

  /**
   * Get personalized recommendations based on preferences
   */
  async getRecommendations(userId: string): Promise<RecommendedCategories> {
    const recommendations = await convex.query(
      api.userPreferences.getRecommendedCategories,
      { userId }
    );
    return recommendations as RecommendedCategories;
  },
};
