/**
 * 马蜂窝数据存储 Mutations
 * 处理各类马蜂窝爬取数据的存储
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ============================================
// 目的地存储
// ============================================

/**
 * 插入或更新目的地
 */
export const upsertDestination = mutation({
  args: {
    mddId: v.string(),
    sourceUrl: v.string(),
    name: v.string(),
    nameEn: v.optional(v.string()),
    country: v.optional(v.string()),
    province: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    bestTravelTime: v.optional(v.string()),
    avgStayDays: v.optional(v.string()),
    climate: v.optional(v.string()),
    language: v.optional(v.string()),
    currency: v.optional(v.string()),
    visa: v.optional(v.string()),
    travelNotesCount: v.number(),
    poisCount: v.number(),
    questionsCount: v.number(),
    guidesCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 检查是否已存在
    const existing = await ctx.db
      .query('mafengwoDestinations')
      .withIndex('by_mdd_id', q => q.eq('mddId', args.mddId))
      .first();

    const now = Date.now();

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }
    else {
      // 插入
      return await ctx.db.insert('mafengwoDestinations', {
        ...args,
        crawledAt: now,
      });
    }
  },
});

// ============================================
// POI 存储
// ============================================

/**
 * 插入或更新 POI
 */
export const upsertPoi = mutation({
  args: {
    poiId: v.string(),
    sourceUrl: v.string(),
    name: v.string(),
    nameEn: v.optional(v.string()),
    category: v.union(
      v.literal('attraction'),
      v.literal('restaurant'),
      v.literal('hotel'),
      v.literal('shopping'),
      v.literal('entertainment'),
      v.literal('transport'),
    ),
    destinationId: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    rating: v.optional(v.number()),
    ratingCount: v.number(),
    priceLevel: v.optional(v.number()),
    priceRange: v.optional(v.string()),
    ticketPrice: v.optional(v.string()),
    openingHours: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    description: v.optional(v.string()),
    tips: v.array(v.string()),
    highlights: v.array(v.string()),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    reviewsCount: v.number(),
    savesCount: v.number(),
    tags: v.array(v.string()),
    cuisineType: v.optional(v.string()),
    signatureDishes: v.array(v.string()),
    starRating: v.optional(v.number()),
    amenities: v.array(v.string()),
    checkInTime: v.optional(v.string()),
    checkOutTime: v.optional(v.string()),
    qualityScore: v.number(),
  },
  handler: async (ctx, args) => {
    // 检查是否已存在
    const existing = await ctx.db
      .query('mafengwoPois')
      .withIndex('by_poi_id', q => q.eq('poiId', args.poiId))
      .first();

    const now = Date.now();

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }
    else {
      // 插入
      return await ctx.db.insert('mafengwoPois', {
        ...args,
        crawledAt: now,
      });
    }
  },
});

/**
 * 批量插入 POI
 */
export const batchInsertPois = mutation({
  args: {
    pois: v.array(v.object({
      poiId: v.string(),
      sourceUrl: v.string(),
      name: v.string(),
      category: v.string(),
      destinationId: v.optional(v.string()),
      destinationName: v.optional(v.string()),
      rating: v.optional(v.number()),
      coverImageUrl: v.optional(v.string()),
      address: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const poi of args.pois) {
      const existing = await ctx.db
        .query('mafengwoPois')
        .withIndex('by_poi_id', q => q.eq('poiId', poi.poiId))
        .first();

      if (existing) {
        // 更新基本信息
        await ctx.db.patch(existing._id, {
          name: poi.name,
          rating: poi.rating,
          coverImageUrl: poi.coverImageUrl,
          address: poi.address,
          updatedAt: now,
        });
        updated++;
      }
      else {
        // 插入新记录
        await ctx.db.insert('mafengwoPois', {
          poiId: poi.poiId,
          sourceUrl: poi.sourceUrl,
          name: poi.name,
          category: poi.category as 'attraction' | 'restaurant' | 'hotel' | 'shopping' | 'entertainment' | 'transport',
          destinationId: poi.destinationId,
          destinationName: poi.destinationName,
          rating: poi.rating,
          ratingCount: 0,
          coverImageUrl: poi.coverImageUrl,
          imageUrls: [],
          address: poi.address,
          tips: [],
          highlights: [],
          reviewsCount: 0,
          savesCount: 0,
          tags: [],
          signatureDishes: [],
          amenities: [],
          qualityScore: 0.3, // 初始低质量分数
          crawledAt: now,
        });
        inserted++;
      }
    }

    return { inserted, updated, total: args.pois.length };
  },
});

// ============================================
// 攻略存储
// ============================================

/**
 * 插入或更新攻略
 */
export const upsertGuide = mutation({
  args: {
    guideId: v.string(),
    sourceUrl: v.string(),
    title: v.string(),
    destinationId: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorId: v.optional(v.string()),
    summary: v.optional(v.string()),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    sections: v.array(v.object({
      title: v.string(),
      content: v.string(),
      order: v.number(),
    })),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    viewsCount: v.number(),
    likesCount: v.number(),
    savesCount: v.number(),
    commentsCount: v.number(),
    tags: v.array(v.string()),
    publishedAt: v.optional(v.number()),
    qualityScore: v.number(),
  },
  handler: async (ctx, args) => {
    // 检查是否已存在
    const existing = await ctx.db
      .query('mafengwoGuides')
      .withIndex('by_guide_id', q => q.eq('guideId', args.guideId))
      .first();

    const now = Date.now();

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }
    else {
      // 插入
      return await ctx.db.insert('mafengwoGuides', {
        ...args,
        crawledAt: now,
      });
    }
  },
});

// ============================================
// 问答存储
// ============================================

/**
 * 插入或更新问答
 */
export const upsertQa = mutation({
  args: {
    questionId: v.string(),
    sourceUrl: v.string(),
    title: v.string(),
    content: v.string(),
    destinationId: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorId: v.optional(v.string()),
    answersCount: v.number(),
    viewsCount: v.number(),
    tags: v.array(v.string()),
    createdAt: v.optional(v.number()),
    bestAnswer: v.optional(v.object({
      content: v.string(),
      authorName: v.optional(v.string()),
      authorId: v.optional(v.string()),
      likesCount: v.number(),
      createdAt: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    // 检查是否已存在
    const existing = await ctx.db
      .query('mafengwoQa')
      .withIndex('by_question_id', q => q.eq('questionId', args.questionId))
      .first();

    const now = Date.now();

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        ...args,
      });
      return existing._id;
    }
    else {
      // 插入
      return await ctx.db.insert('mafengwoQa', {
        ...args,
        crawledAt: now,
      });
    }
  },
});

// ============================================
// 评论存储
// ============================================

/**
 * 插入或更新评论
 */
export const upsertReview = mutation({
  args: {
    reviewId: v.string(),
    poiExternalId: v.string(),
    poiName: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorId: v.optional(v.string()),
    authorAvatarUrl: v.optional(v.string()),
    rating: v.optional(v.number()),
    content: v.string(),
    imageUrls: v.array(v.string()),
    likesCount: v.number(),
    tags: v.array(v.string()),
    visitDate: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 检查是否已存在
    const existing = await ctx.db
      .query('mafengwoReviews')
      .withIndex('by_review_id', q => q.eq('reviewId', args.reviewId))
      .first();

    const now = Date.now();

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        ...args,
      });
      return existing._id;
    }
    else {
      // 插入
      return await ctx.db.insert('mafengwoReviews', {
        ...args,
        crawledAt: now,
      });
    }
  },
});

// ============================================
// 榜单存储
// ============================================

/**
 * 插入或更新榜单
 */
export const upsertRanking = mutation({
  args: {
    rankingId: v.string(),
    sourceUrl: v.string(),
    rankingType: v.union(
      v.literal('must_visit'),
      v.literal('food'),
      v.literal('hotel'),
      v.literal('shopping'),
      v.literal('hidden_gem'),
    ),
    title: v.string(),
    destinationId: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    description: v.optional(v.string()),
    items: v.array(v.object({
      rank: v.number(),
      poiExternalId: v.string(),
      name: v.string(),
      category: v.optional(v.string()),
      rating: v.optional(v.number()),
      reviewsCount: v.number(),
      coverImageUrl: v.optional(v.string()),
      reason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // 检查是否已存在
    const existing = await ctx.db
      .query('mafengwoRankings')
      .withIndex('by_ranking_id', q => q.eq('rankingId', args.rankingId))
      .first();

    const now = Date.now();

    if (existing) {
      // 更新
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }
    else {
      // 插入
      return await ctx.db.insert('mafengwoRankings', {
        ...args,
        crawledAt: now,
      });
    }
  },
});

// ============================================
// 爬取任务存储
// ============================================

/**
 * 创建爬取任务
 */
export const createCrawlTask = mutation({
  args: {
    taskType: v.union(
      v.literal('destination_list'),
      v.literal('destination_detail'),
      v.literal('poi_list'),
      v.literal('poi_detail'),
      v.literal('guide_list'),
      v.literal('guide_detail'),
      v.literal('travel_note_list'),
      v.literal('travel_note_detail'),
      v.literal('qa_list'),
      v.literal('qa_detail'),
      v.literal('ranking'),
      v.literal('review_list'),
    ),
    config: v.object({
      destinationId: v.optional(v.string()),
      destinationName: v.optional(v.string()),
      poiCategory: v.optional(v.string()),
      rankingType: v.optional(v.string()),
      targetUrl: v.optional(v.string()),
      page: v.optional(v.number()),
      pageSize: v.optional(v.number()),
      scrollCount: v.optional(v.number()),
      useAI: v.optional(v.boolean()),
    }),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert('mafengwoCrawlTasks', {
      taskType: args.taskType,
      config: args.config,
      priority: args.priority,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
    });
  },
});

/**
 * 更新任务状态
 */
export const updateCrawlTaskStatus = mutation({
  args: {
    taskId: v.id('mafengwoCrawlTasks'),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled'),
    ),
    itemsCollected: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.status === 'running') {
      updates.startedAt = now;
    }
    else if (args.status === 'completed' || args.status === 'failed') {
      updates.completedAt = now;
    }

    if (args.itemsCollected !== undefined) {
      updates.itemsCollected = args.itemsCollected;
    }

    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.taskId, updates);
  },
});

/**
 * 获取待处理任务
 */
export const getPendingTasks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    return await ctx.db
      .query('mafengwoCrawlTasks')
      .withIndex('by_status_priority', q => q.eq('status', 'pending'))
      .order('desc')
      .take(limit);
  },
});

// ============================================
// 查询接口
// ============================================

/**
 * 获取目的地列表
 */
export const listDestinations = query({
  args: {
    limit: v.optional(v.number()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.country) {
      return await ctx.db
        .query('mafengwoDestinations')
        .withIndex('by_country', q => q.eq('country', args.country))
        .take(limit);
    }

    return await ctx.db
      .query('mafengwoDestinations')
      .order('desc')
      .take(limit);
  },
});

/**
 * 获取目的地详情
 */
export const getDestination = query({
  args: {
    mddId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('mafengwoDestinations')
      .withIndex('by_mdd_id', q => q.eq('mddId', args.mddId))
      .first();
  },
});

/**
 * 获取 POI 列表
 */
export const listPois = query({
  args: {
    destinationId: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.destinationId && args.category) {
      return await ctx.db
        .query('mafengwoPois')
        .withIndex('by_destination_category', q =>
          q.eq('destinationId', args.destinationId).eq('category', args.category as 'attraction'))
        .take(limit);
    }

    if (args.destinationId) {
      return await ctx.db
        .query('mafengwoPois')
        .withIndex('by_destination', q => q.eq('destinationId', args.destinationId))
        .take(limit);
    }

    if (args.category) {
      return await ctx.db
        .query('mafengwoPois')
        .withIndex('by_category', q => q.eq('category', args.category as 'attraction'))
        .take(limit);
    }

    return await ctx.db
      .query('mafengwoPois')
      .order('desc')
      .take(limit);
  },
});

/**
 * 获取攻略列表
 */
export const listGuides = query({
  args: {
    destinationId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.destinationId) {
      return await ctx.db
        .query('mafengwoGuides')
        .withIndex('by_destination', q => q.eq('destinationId', args.destinationId))
        .take(limit);
    }

    return await ctx.db
      .query('mafengwoGuides')
      .withIndex('by_views')
      .order('desc')
      .take(limit);
  },
});

/**
 * 获取榜单
 */
export const getRanking = query({
  args: {
    destinationId: v.string(),
    rankingType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('mafengwoRankings')
      .withIndex('by_destination_type', q =>
        q.eq('destinationId', args.destinationId).eq('rankingType', args.rankingType as 'must_visit'))
      .first();
  },
});

/**
 * 统计数据
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const destinations = await ctx.db.query('mafengwoDestinations').collect();
    const pois = await ctx.db.query('mafengwoPois').collect();
    const guides = await ctx.db.query('mafengwoGuides').collect();
    const qa = await ctx.db.query('mafengwoQa').collect();
    const reviews = await ctx.db.query('mafengwoReviews').collect();
    const rankings = await ctx.db.query('mafengwoRankings').collect();
    const tasks = await ctx.db.query('mafengwoCrawlTasks').collect();

    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const runningTasks = tasks.filter(t => t.status === 'running').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;

    return {
      destinations: destinations.length,
      pois: pois.length,
      guides: guides.length,
      qa: qa.length,
      reviews: reviews.length,
      rankings: rankings.length,
      tasks: {
        total: tasks.length,
        pending: pendingTasks,
        running: runningTasks,
        completed: completedTasks,
        failed: failedTasks,
      },
    };
  },
});
