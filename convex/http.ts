/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { httpRouter } from 'convex/server';
import { api } from './_generated/api';
import { httpAction } from './_generated/server';
import { auth } from './auth';

/**
 * Convex HTTP Router
 * Handles HTTP endpoints including auth routes and API endpoints
 */
const http = httpRouter();

// Add auth routes for sign in, sign out, etc.
auth.addHttpRoutes(http);

// ============================================
// Comments API
// ============================================

/**
 * GET /api/comments?itineraryId=<id>&page=1&pageSize=20
 * List comments for an itinerary
 */
http.route({
  path: '/api/comments',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const itineraryId = url.searchParams.get('itineraryId');
    const userId = url.searchParams.get('userId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');

    if (!itineraryId) {
      return new Response(JSON.stringify({ error: '缺少itineraryId参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const result = await ctx.runQuery(api.itineraryComments.listByItinerary, {
        itineraryId: itineraryId as any,
        page,
        pageSize,
        userId: userId ?? undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : '请求失败',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }),
});

// ============================================
// Collections API
// ============================================

/**
 * GET /api/collections?userId=<id>&page=1&pageSize=20
 * List user's favorite collections
 */
http.route({
  path: '/api/collections',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');

    if (!userId) {
      return new Response(JSON.stringify({ error: '缺少userId参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const result = await ctx.runQuery(api.favoriteCollections.listByUser, {
        userId,
        page,
        pageSize,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : '请求失败',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }),
});

// ============================================
// Favorited Itineraries API
// ============================================

/**
 * GET /api/favorited?userId=<id>&page=1&pageSize=20
 * List user's favorited itineraries
 */
http.route({
  path: '/api/favorited',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const collectionId = url.searchParams.get('collectionId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');

    if (!userId) {
      return new Response(JSON.stringify({ error: '缺少userId参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const result = await ctx.runQuery(api.itineraryFavorites.listByUser, {
        userId,
        collectionId: collectionId as any,
        page,
        pageSize,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : '请求失败',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }),
});

// ============================================
// Liked Itineraries API
// ============================================

/**
 * GET /api/liked?userId=<id>&page=1&pageSize=20
 * List user's liked itineraries
 */
http.route({
  path: '/api/liked',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');

    if (!userId) {
      return new Response(JSON.stringify({ error: '缺少userId参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const result = await ctx.runQuery(api.itineraryLikes.listByUser, {
        userId,
        page,
        pageSize,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : '请求失败',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }),
});

// ============================================
// Guides API
// ============================================

/**
 * Helper to create JSON response
 */
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Helper to create error response
 */
function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * GET /api/guides
 * List all guides with pagination
 */
http.route({
  path: '/api/guides',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    const minQuality = Number.parseFloat(url.searchParams.get('min_quality') ?? '0');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20');
    const offset = Number.parseInt(url.searchParams.get('offset') ?? '0');

    try {
      const guides = await ctx.runQuery(api.travelGuides.list, {
        platform: platform as any,
        minQuality,
        limit: limit + offset,
      });

      const data = guides.slice(offset, offset + limit);

      return jsonResponse({
        data,
        pagination: {
          limit,
          offset,
          total: guides.length,
        },
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取指南列表失败'
      );
    }
  }),
});

/**
 * GET /api/guides/search
 * Search travel guides by query
 */
http.route({
  path: '/api/guides/search',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20');
    const offset = Number.parseInt(url.searchParams.get('offset') ?? '0');

    if (!query) {
      return errorResponse('缺少查询参数 q', 400);
    }

    try {
      const guides = await ctx.runQuery(api.travelGuides.search, {
        query,
        limit: limit + offset,
      });

      const data = guides.slice(offset, offset + limit);

      return jsonResponse({
        data,
        query,
        pagination: {
          limit,
          offset,
          total: guides.length,
        },
      });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '搜索失败');
    }
  }),
});

/**
 * GET /api/guides/stats
 * Get statistics about stored guides
 */
http.route({
  path: '/api/guides/stats',
  method: 'GET',
  handler: httpAction(async (ctx) => {
    try {
      const guides = await ctx.runQuery(api.travelGuides.list, {});

      const platformCounts: Record<string, number> = {};
      for (const guide of guides) {
        platformCounts[guide.sourcePlatform] =
          (platformCounts[guide.sourcePlatform] || 0) + 1;
      }

      return jsonResponse({
        total: guides.length,
        by_platform: platformCounts,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取统计失败'
      );
    }
  }),
});

// ============================================
// Chat Sessions API
// ============================================

/**
 * GET /api/chat/sessions
 * List user's chat sessions
 */
http.route({
  path: '/api/chat/sessions',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50');

    if (!userId) {
      return errorResponse('缺少userId参数', 400);
    }

    try {
      const sessions = await ctx.runQuery(api.chat.listSessions, {
        userId,
        includeArchived,
        limit,
      });

      return jsonResponse({ data: sessions });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取会话列表失败'
      );
    }
  }),
});

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
http.route({
  path: '/api/chat/sessions',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { userId, title, context } = body;

      if (!userId) {
        return errorResponse('缺少userId参数', 400);
      }

      const sessionId = await ctx.runMutation(api.chat.createSession, {
        userId,
        title: title || '新对话',
        context,
      });

      const session = await ctx.runQuery(api.chat.getSession, {
        sessionId,
      });

      return jsonResponse({ data: session }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建会话失败'
      );
    }
  }),
});

/**
 * GET /api/chat/sessions/messages
 * Get messages for a session (using query param instead of path param)
 */
http.route({
  path: '/api/chat/messages',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50');

    if (!sessionId) {
      return errorResponse('缺少sessionId参数', 400);
    }

    try {
      const messages = await ctx.runQuery(api.chat.getMessages, {
        sessionId: sessionId as any,
        limit,
      });

      return jsonResponse({ data: messages });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取消息失败'
      );
    }
  }),
});

/**
 * POST /api/chat/messages
 * Add a message to a session
 */
http.route({
  path: '/api/chat/messages',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { sessionId, role, content } = body;

      if (!sessionId || !role || !content) {
        return errorResponse('缺少必要参数', 400);
      }

      const messageId = await ctx.runMutation(api.chat.addMessage, {
        sessionId: sessionId as any,
        role,
        content,
      });

      return jsonResponse({ id: messageId }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '添加消息失败'
      );
    }
  }),
});

// ============================================
// User Follows API
// ============================================

/**
 * GET /api/follows/followers
 * Get user's followers
 */
http.route({
  path: '/api/follows/followers',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');

    if (!userId) {
      return errorResponse('缺少userId参数', 400);
    }

    try {
      const result = await ctx.runQuery(api.userFollows.getFollowers, {
        userId,
        page,
        pageSize,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取粉丝列表失败'
      );
    }
  }),
});

/**
 * GET /api/follows/following
 * Get users that the user is following
 */
http.route({
  path: '/api/follows/following',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');

    if (!userId) {
      return errorResponse('缺少userId参数', 400);
    }

    try {
      const result = await ctx.runQuery(api.userFollows.getFollowing, {
        userId,
        page,
        pageSize,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取关注列表失败'
      );
    }
  }),
});

/**
 * POST /api/follows
 * Follow a user
 */
http.route({
  path: '/api/follows',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { followerId, followingId } = body;

      if (!followerId || !followingId) {
        return errorResponse('缺少必要参数', 400);
      }

      await ctx.runMutation(api.userFollows.follow, {
        followerId,
        followingId,
      });

      return jsonResponse({ success: true }, 201);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '关注失败');
    }
  }),
});

/**
 * DELETE /api/follows
 * Unfollow a user
 */
http.route({
  path: '/api/follows',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { followerId, followingId } = body;

      if (!followerId || !followingId) {
        return errorResponse('缺少必要参数', 400);
      }

      await ctx.runMutation(api.userFollows.unfollow, {
        followerId,
        followingId,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '取消关注失败'
      );
    }
  }),
});

/**
 * GET /api/follows/status
 * Check if user is following another user
 */
http.route({
  path: '/api/follows/status',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const followerId = url.searchParams.get('followerId');
    const followingId = url.searchParams.get('followingId');

    if (!followerId || !followingId) {
      return errorResponse('缺少必要参数', 400);
    }

    try {
      const isFollowing = await ctx.runQuery(api.userFollows.isFollowing, {
        followerId,
        followingId,
      });

      return jsonResponse({ isFollowing });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '查询关注状态失败'
      );
    }
  }),
});

/**
 * GET /api/follows/stats
 * Get follow statistics for a user
 */
http.route({
  path: '/api/follows/stats',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return errorResponse('缺少userId参数', 400);
    }

    try {
      const stats = await ctx.runQuery(api.userFollows.getStats, {
        userId,
      });

      return jsonResponse(stats);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取统计失败'
      );
    }
  }),
});

// ============================================
// POI Q&A API
// ============================================

/**
 * GET /api/qa/questions
 * Get questions for a POI
 */
http.route({
  path: '/api/qa/questions',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const poiId = url.searchParams.get('poiId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');
    const sortBy = url.searchParams.get('sortBy') ?? 'newest';

    if (!poiId) {
      return errorResponse('缺少poiId参数', 400);
    }

    try {
      const result = await ctx.runQuery(api.poiQA.listQuestions, {
        poiId: poiId as any,
        page,
        pageSize,
        sortBy: sortBy as any,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取问题列表失败'
      );
    }
  }),
});

/**
 * POST /api/qa/questions
 * Create a new question
 */
http.route({
  path: '/api/qa/questions',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { poiId, userId, title, content, tags } = body;

      if (!poiId || !userId || !title) {
        return errorResponse('缺少必要参数', 400);
      }

      const questionId = await ctx.runMutation(api.poiQA.createQuestion, {
        poiId: poiId as any,
        userId,
        title,
        content,
        tags,
      });

      return jsonResponse({ id: questionId }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建问题失败'
      );
    }
  }),
});

/**
 * GET /api/qa/answers
 * Get answers for a question
 */
http.route({
  path: '/api/qa/answers',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const questionId = url.searchParams.get('questionId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');

    if (!questionId) {
      return errorResponse('缺少questionId参数', 400);
    }

    try {
      const result = await ctx.runQuery(api.poiQA.listAnswers, {
        questionId: questionId as any,
        page,
        pageSize,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取回答列表失败'
      );
    }
  }),
});

/**
 * POST /api/qa/answers
 * Create a new answer
 */
http.route({
  path: '/api/qa/answers',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { questionId, userId, content } = body;

      if (!questionId || !userId || !content) {
        return errorResponse('缺少必要参数', 400);
      }

      const answerId = await ctx.runMutation(api.poiQA.createAnswer, {
        questionId: questionId as any,
        userId,
        content,
      });

      return jsonResponse({ id: answerId }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建回答失败'
      );
    }
  }),
});

// ============================================
// Travel Notes API
// ============================================

/**
 * GET /api/travel-notes
 * List travel notes
 */
http.route({
  path: '/api/travel-notes',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');
    const visibility = url.searchParams.get('visibility') ?? 'public';

    try {
      const result = await ctx.runQuery(api.travelNotes.list, {
        userId: userId ?? undefined,
        page,
        pageSize,
        visibility: visibility as any,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取笔记列表失败'
      );
    }
  }),
});

/**
 * POST /api/travel-notes
 * Create a travel note
 */
http.route({
  path: '/api/travel-notes',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const {
        userId,
        title,
        content,
        tags,
        visibility,
        coverImageUrl,
        imageUrls,
        destination,
      } = body;

      if (!userId || !title || !content) {
        return errorResponse('缺少必要参数', 400);
      }

      const noteId = await ctx.runMutation(api.travelNotes.create, {
        userId,
        title,
        content,
        tags,
        visibility: visibility ?? 'public',
        coverImageUrl,
        imageUrls,
        destination,
      });

      return jsonResponse({ id: noteId }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建笔记失败'
      );
    }
  }),
});

// ============================================
// Budgets API
// ============================================

/**
 * GET /api/budgets
 * Get budget for an itinerary
 */
http.route({
  path: '/api/budgets',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const itineraryId = url.searchParams.get('itineraryId');

    if (!itineraryId) {
      return errorResponse('缺少itineraryId参数', 400);
    }

    try {
      const budget = await ctx.runQuery(api.budgets.getByItinerary, {
        itineraryId: itineraryId as any,
      });

      return jsonResponse({ data: budget });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取预算失败'
      );
    }
  }),
});

/**
 * POST /api/budgets
 * Create or update budget
 */
http.route({
  path: '/api/budgets',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { itineraryId, totalBudget, currency, categories } = body;

      if (!itineraryId || totalBudget === undefined) {
        return errorResponse('缺少必要参数', 400);
      }

      const budgetId = await ctx.runMutation(api.budgets.upsert, {
        itineraryId: itineraryId as any,
        totalBudget,
        currency: currency ?? 'CNY',
        categories,
      });

      return jsonResponse({ id: budgetId }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建预算失败'
      );
    }
  }),
});

/**
 * GET /api/expenses
 * Get expenses for an itinerary
 */
http.route({
  path: '/api/expenses',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const itineraryId = url.searchParams.get('itineraryId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '50');

    if (!itineraryId) {
      return errorResponse('缺少itineraryId参数', 400);
    }

    try {
      const result = await ctx.runQuery(api.budgets.listExpenses, {
        itineraryId: itineraryId as any,
        page,
        pageSize,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取支出列表失败'
      );
    }
  }),
});

/**
 * POST /api/expenses
 * Add an expense
 */
http.route({
  path: '/api/expenses',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { itineraryId, amount, category, description, date, currency } =
        body;

      if (!itineraryId || amount === undefined || !category) {
        return errorResponse('缺少必要参数', 400);
      }

      const expenseId = await ctx.runMutation(api.budgets.addExpense, {
        itineraryId: itineraryId as any,
        amount,
        category,
        description,
        date,
        currency: currency ?? 'CNY',
      });

      return jsonResponse({ id: expenseId }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '添加支出失败'
      );
    }
  }),
});

// ============================================
// Notifications API
// ============================================

/**
 * GET /api/notifications
 * Get user's notifications
 */
http.route({
  path: '/api/notifications',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = Number.parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '20');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    if (!userId) {
      return errorResponse('缺少userId参数', 400);
    }

    try {
      const result = await ctx.runQuery(api.notifications.list, {
        userId,
        page,
        pageSize,
        unreadOnly,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取通知失败'
      );
    }
  }),
});

/**
 * POST /api/notifications/read
 * Mark notifications as read
 */
http.route({
  path: '/api/notifications/read',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { notificationIds, userId } = body;

      if (!userId) {
        return errorResponse('缺少userId参数', 400);
      }

      await ctx.runMutation(api.notifications.markAsRead, {
        notificationIds,
        userId,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '标记已读失败'
      );
    }
  }),
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
http.route({
  path: '/api/notifications/unread-count',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return errorResponse('缺少userId参数', 400);
    }

    try {
      const count = await ctx.runQuery(api.notifications.getUnreadCount, {
        userId,
      });

      return jsonResponse({ count });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取未读数量失败'
      );
    }
  }),
});

// ============================================
// POIs API
// ============================================

/**
 * GET /api/pois
 * Search POIs
 */
http.route({
  path: '/api/pois',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const cityId = url.searchParams.get('cityId');
    const category = url.searchParams.get('category');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20');
    const offset = Number.parseInt(url.searchParams.get('offset') ?? '0');

    try {
      const result = await ctx.runQuery(api.pois.search, {
        query: query ?? undefined,
        cityId: cityId as any,
        category: category as any,
        limit,
        offset,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '搜索POI失败'
      );
    }
  }),
});

// ============================================
// Share Events API
// ============================================

/**
 * POST /api/share/link
 * Generate a share link
 */
http.route({
  path: '/api/share/link',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { resourceType, resourceId, userId, platform } = body;

      if (!resourceType || !resourceId) {
        return errorResponse('缺少必要参数', 400);
      }

      const result = await ctx.runMutation(api.shareEvents.createShareLink, {
        resourceType,
        resourceId,
        userId,
        platform,
      });

      return jsonResponse(result, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建分享链接失败'
      );
    }
  }),
});

/**
 * POST /api/share/track
 * Track a share event
 */
http.route({
  path: '/api/share/track',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { shareCode, eventType, metadata } = body;

      if (!shareCode || !eventType) {
        return errorResponse('缺少必要参数', 400);
      }

      await ctx.runMutation(api.shareEvents.trackEvent, {
        shareCode,
        eventType,
        metadata,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '记录事件失败'
      );
    }
  }),
});

/**
 * GET /api/share/stats
 * Get share statistics
 */
http.route({
  path: '/api/share/stats',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const resourceId = url.searchParams.get('resourceId');

    if (!resourceId) {
      return errorResponse('缺少resourceId参数', 400);
    }

    try {
      const stats = await ctx.runQuery(api.shareEvents.getStats, {
        resourceId,
      });

      return jsonResponse(stats);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取统计失败'
      );
    }
  }),
});

// ============================================
// Translations API
// ============================================

/**
 * GET /api/translations/categories
 * Get all translation categories with phrase counts
 */
http.route({
  path: '/api/translations/categories',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const sourceLang = url.searchParams.get('sourceLang');

    try {
      const categories = await ctx.runQuery(api.translations.getCategories, {
        sourceLang: sourceLang ?? undefined,
      });

      return jsonResponse({ data: categories });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取分类失败'
      );
    }
  }),
});

/**
 * GET /api/translations/phrases
 * List phrases by category
 */
http.route({
  path: '/api/translations/phrases',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const sourceLang = url.searchParams.get('sourceLang');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50');

    if (!category) {
      return errorResponse('缺少category参数', 400);
    }

    try {
      const phrases = await ctx.runQuery(
        api.translations.listPhrasesByCategory,
        {
          category: category as any,
          sourceLang: sourceLang ?? undefined,
          limit,
        }
      );

      return jsonResponse({ data: phrases });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取短语失败'
      );
    }
  }),
});

/**
 * GET /api/translations/phrases/search
 * Search translation phrases
 */
http.route({
  path: '/api/translations/phrases/search',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const sourceLang = url.searchParams.get('sourceLang');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20');

    if (!query) {
      return errorResponse('缺少查询参数 q', 400);
    }

    try {
      const phrases = await ctx.runQuery(api.translations.searchPhrases, {
        query,
        category: category as any,
        sourceLang: sourceLang ?? undefined,
        limit,
      });

      return jsonResponse({ data: phrases });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '搜索失败');
    }
  }),
});

/**
 * GET /api/translations/saved
 * List user's saved translations
 */
http.route({
  path: '/api/translations/saved',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const translationType = url.searchParams.get('type');
    const favoritesOnly = url.searchParams.get('favoritesOnly') === 'true';
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50');
    const offset = Number.parseInt(url.searchParams.get('offset') ?? '0');

    if (!userId) {
      return errorResponse('缺少userId参数', 400);
    }

    try {
      const translations = await ctx.runQuery(
        api.translations.listSavedTranslations,
        {
          userId,
          translationType: translationType as any,
          favoritesOnly,
          limit,
          offset,
        }
      );

      return jsonResponse({ data: translations });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取保存的翻译失败'
      );
    }
  }),
});

/**
 * POST /api/translations/saved
 * Save a translation
 */
http.route({
  path: '/api/translations/saved',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const {
        userId,
        sourceText,
        sourceLang,
        targetText,
        targetLang,
        translationType,
        imageUrl,
        audioUrl,
        notes,
      } = body;

      if (
        !userId ||
        !sourceText ||
        !sourceLang ||
        !targetText ||
        !targetLang ||
        !translationType
      ) {
        return errorResponse('缺少必要参数', 400);
      }

      const id = await ctx.runMutation(api.translations.saveTranslation, {
        userId,
        sourceText,
        sourceLang,
        targetText,
        targetLang,
        translationType,
        imageUrl,
        audioUrl,
        notes,
      });

      return jsonResponse({ id }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '保存翻译失败'
      );
    }
  }),
});

/**
 * DELETE /api/translations/saved
 * Delete a saved translation
 */
http.route({
  path: '/api/translations/saved',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      await ctx.runMutation(api.translations.deleteSavedTranslation, {
        id: id as any,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '删除翻译失败'
      );
    }
  }),
});

/**
 * POST /api/translations/saved/favorite
 * Toggle favorite status for a saved translation
 */
http.route({
  path: '/api/translations/saved/favorite',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      const isFavorite = await ctx.runMutation(
        api.translations.toggleFavorite,
        {
          id: id as any,
        }
      );

      return jsonResponse({ isFavorite });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '操作失败');
    }
  }),
});

/**
 * GET /api/translations/packs
 * List available offline translation packs
 */
http.route({
  path: '/api/translations/packs',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const sourceLang = url.searchParams.get('sourceLang');
    const targetLang = url.searchParams.get('targetLang');

    try {
      const packs = await ctx.runQuery(api.translations.listOfflinePacks, {
        sourceLang: sourceLang ?? undefined,
        targetLang: targetLang ?? undefined,
      });

      return jsonResponse({ data: packs });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取离线包失败'
      );
    }
  }),
});

/**
 * GET /api/translations/languages
 * Get supported languages (static data)
 */
http.route({
  path: '/api/translations/languages',
  method: 'GET',
  handler: httpAction(async () => {
    const languages = [
      { code: 'zh', name: '中文', nativeName: '中文' },
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    ];

    return jsonResponse({ data: languages });
  }),
});

// ============================================
// Crawl Jobs API (Dashboard)
// ============================================

/**
 * GET /api/crawl-jobs
 * List crawl jobs
 */
http.route({
  path: '/api/crawl-jobs',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const platform = url.searchParams.get('platform');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50');

    try {
      const jobs = await ctx.runQuery(api.crawlJobs.list, {
        status: status ?? undefined,
        platform: platform ?? undefined,
        limit,
      });

      return jsonResponse({ data: jobs });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取任务列表失败'
      );
    }
  }),
});

/**
 * POST /api/crawl-jobs
 * Create a new crawl job
 */
http.route({
  path: '/api/crawl-jobs',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { name, platform, jobType, config, scheduleCron } = body;

      if (!name || !platform || !config) {
        return errorResponse('缺少必要参数', 400);
      }

      const jobId = await ctx.runMutation(api.crawlJobs.create, {
        name,
        platform,
        jobType,
        config,
        scheduleCron,
      });

      const job = await ctx.runQuery(api.crawlJobs.getById, { id: jobId });

      return jsonResponse({ data: job }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建任务失败'
      );
    }
  }),
});

/**
 * GET /api/crawl-jobs/job
 * Get a crawl job by ID (using query param)
 */
http.route({
  path: '/api/crawl-jobs/job',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return errorResponse('缺少id参数', 400);
    }

    try {
      const job = await ctx.runQuery(api.crawlJobs.getById, {
        id: id as any,
      });

      if (!job) {
        return errorResponse('任务不存在', 404);
      }

      return jsonResponse({ data: job });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取任务失败'
      );
    }
  }),
});

/**
 * DELETE /api/crawl-jobs
 * Delete a crawl job
 */
http.route({
  path: '/api/crawl-jobs',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      await ctx.runMutation(api.crawlJobs.remove, {
        id: id as any,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '删除任务失败'
      );
    }
  }),
});

/**
 * POST /api/crawl-jobs/start
 * Start a crawl job
 */
http.route({
  path: '/api/crawl-jobs/start',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      const job = await ctx.runMutation(api.crawlJobs.start, {
        id: id as any,
      });

      return jsonResponse({ data: job });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '启动任务失败'
      );
    }
  }),
});

/**
 * POST /api/crawl-jobs/complete
 * Complete a crawl job
 */
http.route({
  path: '/api/crawl-jobs/complete',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id, statistics } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      const job = await ctx.runMutation(api.crawlJobs.complete, {
        id: id as any,
        statistics,
      });

      return jsonResponse({ data: job });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '完成任务失败'
      );
    }
  }),
});

/**
 * POST /api/crawl-jobs/fail
 * Mark a crawl job as failed
 */
http.route({
  path: '/api/crawl-jobs/fail',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id, errorMessage, statistics } = body;

      if (!id || !errorMessage) {
        return errorResponse('缺少必要参数', 400);
      }

      const job = await ctx.runMutation(api.crawlJobs.fail, {
        id: id as any,
        errorMessage,
        statistics,
      });

      return jsonResponse({ data: job });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '操作失败');
    }
  }),
});

// ============================================
// Data Quality Reports API (Dashboard)
// ============================================

/**
 * GET /api/quality-reports
 * List data quality reports
 */
http.route({
  path: '/api/quality-reports',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const datasetId = url.searchParams.get('datasetId');
    const reportType = url.searchParams.get('reportType');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20');
    const offset = Number.parseInt(url.searchParams.get('offset') ?? '0');

    try {
      const result = await ctx.runQuery(api.dataQualityReports.list, {
        datasetId: datasetId as any,
        reportType: reportType ?? undefined,
        limit,
        offset,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取报告列表失败'
      );
    }
  }),
});

/**
 * POST /api/quality-reports
 * Create a quality report
 */
http.route({
  path: '/api/quality-reports',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { datasetId, reportType, metrics, issues } = body;

      if (!reportType || !metrics) {
        return errorResponse('缺少必要参数', 400);
      }

      const report = await ctx.runMutation(api.dataQualityReports.create, {
        datasetId: datasetId as any,
        reportType,
        metrics,
        issues,
      });

      return jsonResponse({ data: report }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建报告失败'
      );
    }
  }),
});

/**
 * GET /api/quality-reports/report
 * Get a quality report by ID
 */
http.route({
  path: '/api/quality-reports/report',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return errorResponse('缺少id参数', 400);
    }

    try {
      const report = await ctx.runQuery(api.dataQualityReports.getById, {
        id: id as any,
      });

      if (!report) {
        return errorResponse('报告不存在', 404);
      }

      return jsonResponse({ data: report });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取报告失败'
      );
    }
  }),
});

/**
 * DELETE /api/quality-reports
 * Delete a quality report
 */
http.route({
  path: '/api/quality-reports',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      await ctx.runMutation(api.dataQualityReports.remove, {
        id: id as any,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '删除报告失败'
      );
    }
  }),
});

/**
 * GET /api/quality-reports/summary
 * Get quality reports summary
 */
http.route({
  path: '/api/quality-reports/summary',
  method: 'GET',
  handler: httpAction(async (ctx) => {
    try {
      const summary = await ctx.runQuery(api.dataQualityReports.getSummary, {});

      return jsonResponse({ data: summary });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取摘要失败'
      );
    }
  }),
});

// ============================================
// Training Datasets API (Dashboard)
// ============================================

/**
 * GET /api/training-datasets
 * List training datasets
 */
http.route({
  path: '/api/training-datasets',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const status = url.searchParams.get('status');
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20');
    const offset = Number.parseInt(url.searchParams.get('offset') ?? '0');

    try {
      const result = await ctx.runQuery(api.trainingDatasets.list, {
        name: name ?? undefined,
        status: status as any,
        limit,
        offset,
      });

      return jsonResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取数据集列表失败'
      );
    }
  }),
});

/**
 * POST /api/training-datasets
 * Create a training dataset
 */
http.route({
  path: '/api/training-datasets',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const {
        name,
        version,
        generationParams,
        outputFormats,
        status,
        statistics,
      } = body;

      if (!name || !version || !generationParams || !outputFormats) {
        return errorResponse('缺少必要参数', 400);
      }

      const dataset = await ctx.runMutation(api.trainingDatasets.create, {
        name,
        version,
        generationParams,
        outputFormats,
        status,
        statistics,
      });

      return jsonResponse({ data: dataset }, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '创建数据集失败'
      );
    }
  }),
});

/**
 * GET /api/training-datasets/dataset
 * Get a training dataset by ID
 */
http.route({
  path: '/api/training-datasets/dataset',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return errorResponse('缺少id参数', 400);
    }

    try {
      const dataset = await ctx.runQuery(api.trainingDatasets.getById, {
        id: id as any,
      });

      if (!dataset) {
        return errorResponse('数据集不存在', 404);
      }

      return jsonResponse({ data: dataset });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取数据集失败'
      );
    }
  }),
});

/**
 * DELETE /api/training-datasets
 * Delete a training dataset
 */
http.route({
  path: '/api/training-datasets',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      await ctx.runMutation(api.trainingDatasets.remove, {
        id: id as any,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '删除数据集失败'
      );
    }
  }),
});

/**
 * PATCH /api/training-datasets
 * Update a training dataset
 */
http.route({
  path: '/api/training-datasets',
  method: 'PATCH',
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { id, status, statistics, storagePaths, generatedAt } = body;

      if (!id) {
        return errorResponse('缺少id参数', 400);
      }

      const dataset = await ctx.runMutation(api.trainingDatasets.update, {
        id: id as any,
        status,
        statistics,
        storagePaths,
        generatedAt,
      });

      return jsonResponse({ data: dataset });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '更新数据集失败'
      );
    }
  }),
});

// ============================================
// Currency Rates API
// ============================================

/**
 * GET /api/currency/rates
 * Get cached exchange rates
 */
http.route({
  path: '/api/currency/rates',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const base = url.searchParams.get('base') ?? 'CNY';

    try {
      const rates = await ctx.runQuery(api.currencyRates.get, {
        base,
      });

      return jsonResponse({ data: rates });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取汇率失败'
      );
    }
  }),
});

/**
 * GET /api/currency/history
 * Get exchange rate history
 */
http.route({
  path: '/api/currency/history',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const base = url.searchParams.get('base') ?? 'CNY';
    const target = url.searchParams.get('target') ?? 'USD';
    const days = Number.parseInt(url.searchParams.get('days') ?? '30');

    try {
      const history = await ctx.runQuery(api.currencyRates.getHistory, {
        base,
        target,
        days,
      });

      return jsonResponse({ data: history });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取汇率历史失败'
      );
    }
  }),
});

/**
 * GET /api/currency/stats
 * Get currency cache statistics
 */
http.route({
  path: '/api/currency/stats',
  method: 'GET',
  handler: httpAction(async (ctx) => {
    try {
      const stats = await ctx.runQuery(api.currencyRates.stats, {});

      return jsonResponse({ data: stats });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取统计失败'
      );
    }
  }),
});

export default http;
