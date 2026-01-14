/**
 * POI Q&A Routes
 * API endpoints for POI questions and answers community
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { optionalAuthMiddleware } from '../middleware/auth';
import {
  AnswerService,
  QAReportService,
  QuestionService,
} from '../services/poiQAService';

interface Variables {
  userId?: string;
  accessToken?: string;
}

// Schema definitions
const CreateQuestionSchema = z.object({
  title: z
    .string()
    .min(1, 'Question title is required')
    .max(200, 'Question title exceeds maximum length'),
  content: z
    .string()
    .min(1, 'Question content is required')
    .max(5000, 'Question content exceeds maximum length'),
  tags: z.array(z.string().max(50)).max(5).optional(),
});

const UpdateQuestionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().max(50)).max(5).optional(),
});

const CreateAnswerSchema = z.object({
  content: z
    .string()
    .min(1, 'Answer content is required')
    .max(10000, 'Answer content exceeds maximum length'),
});

const UpdateAnswerSchema = z.object({
  content: z
    .string()
    .min(1, 'Answer content is required')
    .max(10000, 'Answer content exceeds maximum length'),
});

const VoteSchema = z.object({
  voteType: z.enum(['up', 'down']),
});

const ReportSchema = z.object({
  reason: z.enum([
    'spam',
    'inappropriate',
    'misleading',
    'off_topic',
    'harassment',
    'other',
  ]),
  description: z.string().max(500).optional(),
});

const QuestionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  sortBy: z
    .enum(['newest', 'oldest', 'most_upvoted', 'most_active'])
    .optional(),
  status: z.enum(['open', 'closed', 'resolved']).optional(),
});

const AnswerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  sortBy: z.enum(['newest', 'oldest', 'most_upvoted']).optional(),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  poiId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ============================================
// Public Q&A Routes (read-only, no auth required)
// ============================================

export const publicQARoutes = new Hono<{ Variables: Variables }>();

// Apply optional auth to public routes (for vote status)
publicQARoutes.use('*', optionalAuthMiddleware);

/**
 * GET /pois/:poiId/questions - List questions for a POI
 */
publicQARoutes.get(
  '/:poiId/questions',
  zValidator('query', QuestionListQuerySchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const query = c.req.valid('query');
    const userId = c.get('userId');

    const result = await QuestionService.listByPoi(poiId, query, userId);

    return c.json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.total,
        totalPages: result.totalPages,
      },
    });
  }
);

/**
 * GET /questions/search - Search questions
 */
publicQARoutes.get(
  '/questions/search',
  zValidator('query', SearchQuerySchema),
  async (c) => {
    const { q, poiId, limit } = c.req.valid('query');

    const results = await QuestionService.search(q, poiId, limit);

    return c.json({
      success: true,
      data: results,
    });
  }
);

/**
 * GET /questions/:questionId - Get a single question
 */
publicQARoutes.get('/questions/:questionId', async (c) => {
  const questionId = c.req.param('questionId');
  const userId = c.get('userId');

  const question = await QuestionService.getById(questionId, userId);

  // Increment view count (fire and forget)
  QuestionService.incrementViews(questionId).catch(() => {
    // Ignore errors for view count
  });

  return c.json({
    success: true,
    data: question,
  });
});

/**
 * GET /questions/:questionId/answers - List answers for a question
 */
publicQARoutes.get(
  '/questions/:questionId/answers',
  zValidator('query', AnswerListQuerySchema),
  async (c) => {
    const questionId = c.req.param('questionId');
    const query = c.req.valid('query');
    const userId = c.get('userId');

    const result = await AnswerService.listByQuestion(questionId, query, userId);

    return c.json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.total,
        totalPages: result.totalPages,
      },
    });
  }
);

/**
 * GET /answers/:answerId - Get a single answer
 */
publicQARoutes.get('/answers/:answerId', async (c) => {
  const answerId = c.req.param('answerId');
  const userId = c.get('userId');

  const answer = await AnswerService.getById(answerId, userId);

  return c.json({
    success: true,
    data: answer,
  });
});

/**
 * GET /pois/:poiId/questions/count - Get question count for a POI
 */
publicQARoutes.get('/:poiId/questions/count', async (c) => {
  const poiId = c.req.param('poiId');

  const count = await QuestionService.getCount(poiId);

  return c.json({
    success: true,
    data: { count },
  });
});

// ============================================
// Protected Q&A Routes (auth required)
// ============================================

export const qaRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Question Routes
// ============================================

/**
 * POST /pois/:poiId/questions - Create a new question
 */
qaRoutes.post(
  '/:poiId/questions',
  zValidator('json', CreateQuestionSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const poiId = c.req.param('poiId');
    const input = c.req.valid('json');

    const question = await QuestionService.create(poiId, userId, input);

    return c.json(
      {
        success: true,
        data: question,
      },
      201
    );
  }
);

/**
 * PATCH /questions/:questionId - Update a question
 */
qaRoutes.patch(
  '/questions/:questionId',
  zValidator('json', UpdateQuestionSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const questionId = c.req.param('questionId');
    const input = c.req.valid('json');

    const question = await QuestionService.update(questionId, userId, input);

    return c.json({
      success: true,
      data: question,
    });
  }
);

/**
 * DELETE /questions/:questionId - Delete a question
 */
qaRoutes.delete('/questions/:questionId', async (c) => {
  const userId = c.get('userId')!;
  const questionId = c.req.param('questionId');

  await QuestionService.delete(questionId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /questions/:questionId/vote - Vote on a question
 */
qaRoutes.post(
  '/questions/:questionId/vote',
  zValidator('json', VoteSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const questionId = c.req.param('questionId');
    const { voteType } = c.req.valid('json');

    const result = await QuestionService.vote(questionId, userId, voteType);

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * POST /questions/:questionId/close - Close a question
 */
qaRoutes.post('/questions/:questionId/close', async (c) => {
  const userId = c.get('userId')!;
  const questionId = c.req.param('questionId');

  await QuestionService.close(questionId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /questions/:questionId/reopen - Reopen a question
 */
qaRoutes.post('/questions/:questionId/reopen', async (c) => {
  const userId = c.get('userId')!;
  const questionId = c.req.param('questionId');

  await QuestionService.reopen(questionId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /questions/:questionId/report - Report a question
 */
qaRoutes.post(
  '/questions/:questionId/report',
  zValidator('json', ReportSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const questionId = c.req.param('questionId');
    const input = c.req.valid('json');

    const result = await QAReportService.report(
      'question',
      questionId,
      userId,
      input
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

// ============================================
// Answer Routes
// ============================================

/**
 * POST /questions/:questionId/answers - Create an answer
 */
qaRoutes.post(
  '/questions/:questionId/answers',
  zValidator('json', CreateAnswerSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const questionId = c.req.param('questionId');
    const input = c.req.valid('json');

    const answer = await AnswerService.create(questionId, userId, input);

    return c.json(
      {
        success: true,
        data: answer,
      },
      201
    );
  }
);

/**
 * PATCH /answers/:answerId - Update an answer
 */
qaRoutes.patch(
  '/answers/:answerId',
  zValidator('json', UpdateAnswerSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const answerId = c.req.param('answerId');
    const input = c.req.valid('json');

    const answer = await AnswerService.update(answerId, userId, input);

    return c.json({
      success: true,
      data: answer,
    });
  }
);

/**
 * DELETE /answers/:answerId - Delete an answer
 */
qaRoutes.delete('/answers/:answerId', async (c) => {
  const userId = c.get('userId')!;
  const answerId = c.req.param('answerId');

  await AnswerService.delete(answerId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /answers/:answerId/vote - Vote on an answer
 */
qaRoutes.post(
  '/answers/:answerId/vote',
  zValidator('json', VoteSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const answerId = c.req.param('answerId');
    const { voteType } = c.req.valid('json');

    const result = await AnswerService.vote(answerId, userId, voteType);

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * POST /answers/:answerId/best - Mark answer as best
 */
qaRoutes.post('/answers/:answerId/best', async (c) => {
  const userId = c.get('userId')!;
  const answerId = c.req.param('answerId');

  await AnswerService.markBest(answerId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * DELETE /answers/:answerId/best - Unmark answer as best
 */
qaRoutes.delete('/answers/:answerId/best', async (c) => {
  const userId = c.get('userId')!;
  const answerId = c.req.param('answerId');

  await AnswerService.unmarkBest(answerId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /answers/:answerId/report - Report an answer
 */
qaRoutes.post(
  '/answers/:answerId/report',
  zValidator('json', ReportSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const answerId = c.req.param('answerId');
    const input = c.req.valid('json');

    const result = await QAReportService.report(
      'answer',
      answerId,
      userId,
      input
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

// ============================================
// User's Q&A Routes
// ============================================

/**
 * GET /me/questions - Get current user's questions
 */
qaRoutes.get('/me/questions', async (c) => {
  const userId = c.get('userId')!;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');

  const result = await QuestionService.getMyQuestions(userId, page, pageSize);

  return c.json({
    success: true,
    data: result.data,
    meta: {
      totalCount: result.total,
    },
  });
});

/**
 * GET /me/answers - Get current user's answers
 */
qaRoutes.get('/me/answers', async (c) => {
  const userId = c.get('userId')!;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');

  const result = await AnswerService.getMyAnswers(userId, page, pageSize);

  return c.json({
    success: true,
    data: result.data,
    meta: {
      totalCount: result.total,
    },
  });
});
