/**
 * User Preferences Routes
 * API endpoints for preference management and behavior tracking
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { UserPreferencesService } from '../services/userPreferencesService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validation schemas
const PreferenceCategorySchema = z.enum([
  'food',
  'culture',
  'nature',
  'shopping',
  'nightlife',
  'adventure',
  'relaxation',
  'photography',
  'family',
  'budget',
  'luxury',
]);

const TravelStyleSchema = z.enum(['adventurous', 'relaxed', 'cultural', 'balanced']);
const BudgetLevelSchema = z.enum(['budget', 'moderate', 'luxury']);
const PacePreferenceSchema = z.enum(['slow', 'moderate', 'fast']);
const BehaviorTypeSchema = z.enum([
  'view',
  'save',
  'unsave',
  'copy',
  'share',
  'like',
  'unlike',
  'search',
  'poi_click',
  'poi_add',
]);
const TargetTypeSchema = z.enum(['guide', 'itinerary', 'poi', 'city', 'search']);

const UpdatePreferencesSchema = z.object({
  explicitPreferences: z.array(PreferenceCategorySchema).optional(),
  travelStyle: TravelStyleSchema.optional(),
  budgetLevel: BudgetLevelSchema.optional(),
  pacePreference: PacePreferenceSchema.optional(),
  preferLocalFood: z.boolean().optional(),
  preferOffBeatPlaces: z.boolean().optional(),
  accessibilityNeeds: z.boolean().optional(),
});

const RecordBehaviorSchema = z.object({
  behaviorType: BehaviorTypeSchema,
  targetType: TargetTypeSchema,
  targetId: z.string().min(1),
  categories: z.array(PreferenceCategorySchema).optional(),
  metadata: z
    .object({
      duration: z.number().optional(),
      scrollDepth: z.number().min(0).max(100).optional(),
      searchQuery: z.string().optional(),
      cityName: z.string().optional(),
      poiCategory: z.string().optional(),
    })
    .optional(),
});

// Protected routes (auth required)
export const preferencesRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /preferences - Get current user's preferences
 */
preferencesRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const preferences = await UserPreferencesService.getOrCreatePreferences(userId);

  return c.json({
    success: true,
    data: preferences,
  });
});

/**
 * PUT /preferences - Update user preferences
 */
preferencesRoutes.put(
  '/',
  zValidator('json', UpdatePreferencesSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    const preferenceId = await UserPreferencesService.updatePreferences(userId, input);

    // Return updated preferences
    const preferences = await UserPreferencesService.getOrCreatePreferences(userId);

    return c.json({
      success: true,
      data: preferences,
    });
  }
);

/**
 * POST /preferences/behavior - Record a user behavior event
 */
preferencesRoutes.post(
  '/behavior',
  zValidator('json', RecordBehaviorSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    const eventId = await UserPreferencesService.recordBehavior(userId, input);

    return c.json({
      success: true,
      data: { eventId },
    });
  }
);

/**
 * GET /preferences/categories - Get user's top preference categories
 */
preferencesRoutes.get(
  '/categories',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(11).optional().default(5),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { limit } = c.req.valid('query');

    const categories = await UserPreferencesService.getTopCategories(userId, limit);

    return c.json({
      success: true,
      data: categories,
    });
  }
);

/**
 * GET /preferences/recommendations - Get personalized recommendations
 */
preferencesRoutes.get('/recommendations', async (c) => {
  const userId = c.get('userId');

  const recommendations = await UserPreferencesService.getRecommendations(userId);

  return c.json({
    success: true,
    data: recommendations,
  });
});

/**
 * GET /preferences/behaviors - Get recent behavior events
 */
preferencesRoutes.get(
  '/behaviors',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      type: BehaviorTypeSchema.optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { limit, type } = c.req.valid('query');

    const behaviors = await UserPreferencesService.getRecentBehaviors(userId, limit, type);

    return c.json({
      success: true,
      data: behaviors,
    });
  }
);

/**
 * DELETE /preferences/reset - Reset learned preferences (keep explicit settings)
 */
preferencesRoutes.delete('/reset', async (c) => {
  const userId = c.get('userId');

  const result = await UserPreferencesService.resetPreferences(userId);

  return c.json({
    success: true,
    data: result,
  });
});
