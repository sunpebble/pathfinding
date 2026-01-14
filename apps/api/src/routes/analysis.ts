/**
 * Itinerary Analysis API Routes
 * Provides endpoints for generating and retrieving itinerary analysis reports
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ItineraryAnalysisService } from '../services/itineraryAnalysisService';

interface Variables {
  userId: string;
  accessToken: string;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const AnalysisOptionsSchema = z.object({
  includeRouteOptimization: z.boolean().optional().default(true),
  includeBudgetAnalysis: z.boolean().optional().default(true),
  includeTimeAnalysis: z.boolean().optional().default(true),
  preferredTransportMode: z
    .enum(['walking', 'driving', 'transit', 'taxi', 'cycling'])
    .optional(),
});

// Protected routes (auth required)
export const analysisRoutes = new Hono<{ Variables: Variables }>();

// ============================================================================
// Analysis Routes
// ============================================================================

/**
 * GET /analysis/:itineraryId - Get full analysis report for an itinerary
 */
analysisRoutes.get(
  '/:itineraryId',
  zValidator(
    'param',
    z.object({
      itineraryId: z.string().min(1),
    })
  ),
  zValidator(
    'query',
    z.object({
      includeRouteOptimization: z
        .string()
        .transform((v) => v === 'true')
        .optional(),
      includeBudgetAnalysis: z
        .string()
        .transform((v) => v === 'true')
        .optional(),
      preferredTransportMode: z
        .enum(['walking', 'driving', 'transit', 'taxi', 'cycling'])
        .optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryId } = c.req.valid('param');
    const query = c.req.valid('query');

    const report = await ItineraryAnalysisService.analyze(itineraryId, userId, {
      includeRouteOptimization: query.includeRouteOptimization ?? true,
      includeBudgetAnalysis: query.includeBudgetAnalysis ?? true,
      includeTimeAnalysis: true,
      preferredTransportMode: query.preferredTransportMode,
    });

    return c.json({
      success: true,
      data: report,
    });
  }
);

/**
 * POST /analysis/:itineraryId - Generate analysis report with custom options
 */
analysisRoutes.post(
  '/:itineraryId',
  zValidator(
    'param',
    z.object({
      itineraryId: z.string().min(1),
    })
  ),
  zValidator('json', AnalysisOptionsSchema),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryId } = c.req.valid('param');
    const options = c.req.valid('json');

    const report = await ItineraryAnalysisService.analyze(
      itineraryId,
      userId,
      options
    );

    return c.json({
      success: true,
      data: report,
    });
  }
);

/**
 * GET /analysis/:itineraryId/quick - Get quick analysis summary
 */
analysisRoutes.get(
  '/:itineraryId/quick',
  zValidator(
    'param',
    z.object({
      itineraryId: z.string().min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryId } = c.req.valid('param');

    const summary = await ItineraryAnalysisService.getQuickAnalysis(
      itineraryId,
      userId
    );

    return c.json({
      success: true,
      data: summary,
    });
  }
);

/**
 * GET /analysis/:itineraryId/score - Get just the score breakdown
 */
analysisRoutes.get(
  '/:itineraryId/score',
  zValidator(
    'param',
    z.object({
      itineraryId: z.string().min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryId } = c.req.valid('param');

    const report = await ItineraryAnalysisService.analyze(itineraryId, userId, {
      includeBudgetAnalysis: false,
      includeRouteOptimization: false,
    });

    return c.json({
      success: true,
      data: {
        overallScore: report.overallScore,
        scoreLevel: report.scoreLevel,
        scoreBreakdown: report.scoreBreakdown,
      },
    });
  }
);

/**
 * GET /analysis/:itineraryId/budget - Get budget analysis only
 */
analysisRoutes.get(
  '/:itineraryId/budget',
  zValidator(
    'param',
    z.object({
      itineraryId: z.string().min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryId } = c.req.valid('param');

    const report = await ItineraryAnalysisService.analyze(itineraryId, userId, {
      includeBudgetAnalysis: true,
      includeRouteOptimization: false,
    });

    if (!report.budgetAnalysis) {
      return c.json({
        success: true,
        data: null,
        message: 'Budget analysis not available',
      });
    }

    return c.json({
      success: true,
      data: report.budgetAnalysis,
    });
  }
);

/**
 * GET /analysis/:itineraryId/recommendations - Get optimization recommendations
 */
analysisRoutes.get(
  '/:itineraryId/recommendations',
  zValidator(
    'param',
    z.object({
      itineraryId: z.string().min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryId } = c.req.valid('param');

    const report = await ItineraryAnalysisService.analyze(itineraryId, userId, {
      includeBudgetAnalysis: true,
      includeRouteOptimization: true,
    });

    return c.json({
      success: true,
      data: {
        topRecommendations: report.topRecommendations,
        routeOptimizations: report.routeOptimizations,
        strengths: report.strengths,
        improvements: report.improvements,
        criticalIssues: report.criticalIssues,
      },
    });
  }
);

/**
 * GET /analysis/:itineraryId/day/:dayNumber - Get analysis for a specific day
 */
analysisRoutes.get(
  '/:itineraryId/day/:dayNumber',
  zValidator(
    'param',
    z.object({
      itineraryId: z.string().min(1),
      dayNumber: z.coerce.number().int().min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryId, dayNumber } = c.req.valid('param');

    const report = await ItineraryAnalysisService.analyze(itineraryId, userId, {
      includeBudgetAnalysis: false,
      includeRouteOptimization: true,
    });

    const dayAnalysis = report.dayAnalysis.find((d) => d.dayNumber === dayNumber);

    if (!dayAnalysis) {
      return c.json(
        {
          success: false,
          error: 'Day not found',
        },
        404
      );
    }

    const dayOptimization = report.routeOptimizations.find(
      (r) => r.dayNumber === dayNumber
    );

    return c.json({
      success: true,
      data: {
        ...dayAnalysis,
        routeOptimization: dayOptimization || null,
      },
    });
  }
);

export default analysisRoutes;
