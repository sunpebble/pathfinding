import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  TravelStatsService,
  YearlyReviewsService,
} from '../services/travelStatsService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Protected routes (auth required)
export const statsRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Travel Statistics Routes
// ============================================

/**
 * GET /stats - Get user's complete travel statistics
 */
statsRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const stats = await TravelStatsService.getByUser(userId);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /stats/quick - Get quick stats summary
 */
statsRoutes.get('/quick', async (c) => {
  const userId = c.get('userId');

  const stats = await TravelStatsService.getQuickStats(userId);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * POST /stats/calculate - Calculate and update travel statistics
 */
statsRoutes.post('/calculate', async (c) => {
  const userId = c.get('userId');

  const stats = await TravelStatsService.calculate(userId);

  return c.json({
    success: true,
    data: stats,
  });
});

// ============================================
// Yearly Reviews Routes
// ============================================

/**
 * GET /stats/yearly - List all yearly reviews for user
 */
statsRoutes.get('/yearly', async (c) => {
  const userId = c.get('userId');

  const reviews = await YearlyReviewsService.listByUser(userId);

  return c.json({
    success: true,
    data: reviews,
  });
});

/**
 * GET /stats/yearly/available - Get available years with data
 */
statsRoutes.get('/yearly/available', async (c) => {
  const userId = c.get('userId');

  const years = await YearlyReviewsService.getAvailableYears(userId);

  return c.json({
    success: true,
    data: years,
  });
});

/**
 * GET /stats/yearly/:year - Get yearly review for specific year
 */
statsRoutes.get(
  '/yearly/:year',
  zValidator(
    'param',
    z.object({
      year: z.coerce.number().int().min(2000).max(2100),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { year } = c.req.valid('param');

    const review = await YearlyReviewsService.getByYear(userId, year);

    return c.json({
      success: true,
      data: review,
    });
  }
);

/**
 * POST /stats/yearly/:year/generate - Generate yearly review
 */
statsRoutes.post(
  '/yearly/:year/generate',
  zValidator(
    'param',
    z.object({
      year: z.coerce.number().int().min(2000).max(2100),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { year } = c.req.valid('param');

    const review = await YearlyReviewsService.generate(userId, year);

    return c.json(
      {
        success: true,
        data: review,
      },
      201
    );
  }
);

/**
 * POST /stats/yearly/:year/memories - Add a memory to yearly review
 */
statsRoutes.post(
  '/yearly/:year/memories',
  zValidator(
    'param',
    z.object({
      year: z.coerce.number().int().min(2000).max(2100),
    })
  ),
  zValidator(
    'json',
    z.object({
      text: z.string().min(1).max(500),
      itineraryId: z.string().optional(),
      imageUrl: z.string().url().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { year } = c.req.valid('param');
    const { text, itineraryId, imageUrl } = c.req.valid('json');

    const review = await YearlyReviewsService.addMemory(
      userId,
      year,
      text,
      itineraryId,
      imageUrl
    );

    return c.json({
      success: true,
      data: review,
    });
  }
);

/**
 * DELETE /stats/yearly/:year - Delete yearly review
 */
statsRoutes.delete(
  '/yearly/:year',
  zValidator(
    'param',
    z.object({
      year: z.coerce.number().int().min(2000).max(2100),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { year } = c.req.valid('param');

    await YearlyReviewsService.remove(userId, year);

    return c.json({
      success: true,
      data: null,
    });
  }
);
