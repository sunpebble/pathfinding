import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * POI Questions & Answers - Queries and Mutations
 * Community Q&A system for Points of Interest
 * Supports questions, answers, voting, best answer marking, and search
 */

const voteTypeValidator = v.union(v.literal('up'), v.literal('down'));

const reportReasonValidator = v.union(
  v.literal('spam'),
  v.literal('inappropriate'),
  v.literal('misleading'),
  v.literal('off_topic'),
  v.literal('harassment'),
  v.literal('other')
);

const questionStatusValidator = v.union(
  v.literal('open'),
  v.literal('closed'),
  v.literal('resolved')
);

/**
 * Helper: Get user profile info
 */
async function getUserProfile(ctx: QueryCtx | MutationCtx, userId: string) {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_email', (q) => q.eq('email', userId))
    .first();

  return profile;
}

/**
 * Helper: Check if POI exists
 */
async function checkPoiExists(
  ctx: QueryCtx | MutationCtx,
  poiId: Id<'pois'>
): Promise<boolean> {
  const poi = await ctx.db.get(poiId);
  if (!poi) {
    throw new Error('POI not found');
  }
  return true;
}

/**
 * Helper: Create notification for Q&A
 */
async function createQANotification(
  ctx: MutationCtx,
  params: {
    userId: string;
    type: 'question' | 'answer' | 'best_answer' | 'vote';
    referenceType: 'question' | 'answer';
    referenceId: string;
    actorId: string;
    message: string;
  }
) {
  // Don't notify yourself
  if (params.userId === params.actorId) {
    return;
  }

  await ctx.db.insert('notifications', {
    userId: params.userId,
    type: params.type as 'comment', // Using 'comment' type for compatibility
    referenceType: 'itinerary', // Using 'itinerary' for compatibility
    referenceId: params.referenceId,
    actorId: params.actorId,
    message: params.message,
    isRead: false,
    createdAt: Date.now(),
  });
}

// ============================================
// Question Queries
// ============================================

/**
 * List questions for a POI with pagination
 */
export const listQuestionsByPoi = query({
  args: {
    poiId: v.id('pois'),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal('newest'),
        v.literal('oldest'),
        v.literal('most_upvoted'),
        v.literal('most_active')
      )
    ),
    status: v.optional(questionStatusValidator),
    userId: v.optional(v.string()), // For checking if user voted
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const sortBy = args.sortBy ?? 'newest';

    // Get all questions for this POI
    let questions = await ctx.db
      .query('poiQuestions')
      .withIndex('by_poi', (q) => q.eq('poiId', args.poiId))
      .collect();

    // Filter by status if specified
    if (args.status) {
      questions = questions.filter((q) => q.status === args.status);
    }

    // Filter out deleted/hidden
    questions = questions.filter((q) => !q.isDeleted && !q.isHidden);

    // Sort
    switch (sortBy) {
      case 'newest':
        questions.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        questions.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'most_upvoted':
        questions.sort((a, b) => b.upvotesCount - a.upvotesCount);
        break;
      case 'most_active':
        questions.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
        break;
    }

    const total = questions.length;
    const paginatedQuestions = questions.slice(offset, offset + pageSize);

    // Enrich with user info and vote status
    const enriched = await Promise.all(
      paginatedQuestions.map(async (question) => {
        const profile = await getUserProfile(ctx, question.userId);

        // Check if current user voted
        let userVote: 'up' | 'down' | null = null;
        if (args.userId) {
          const vote = await ctx.db
            .query('poiQuestionVotes')
            .withIndex('by_question_user', (q) =>
              q.eq('questionId', question._id).eq('userId', args.userId!)
            )
            .first();
          userVote = vote?.voteType ?? null;
        }

        return {
          ...question,
          id: question._id,
          authorName: profile?.displayName ?? question.authorName ?? 'Anonymous',
          authorAvatarUrl: profile?.avatarUrl ?? question.authorAvatarUrl,
          userVote,
          score: question.upvotesCount - question.downvotesCount,
        };
      })
    );

    return {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

/**
 * Get a single question by ID with full details
 */
export const getQuestionById = query({
  args: {
    id: v.id('poiQuestions'),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question || question.isDeleted || question.isHidden) {
      return null;
    }

    const profile = await getUserProfile(ctx, question.userId);

    // Check user's vote
    let userVote: 'up' | 'down' | null = null;
    if (args.userId) {
      const vote = await ctx.db
        .query('poiQuestionVotes')
        .withIndex('by_question_user', (q) =>
          q.eq('questionId', args.id).eq('userId', args.userId!)
        )
        .first();
      userVote = vote?.voteType ?? null;
    }

    // Get POI info
    const poi = await ctx.db.get(question.poiId);

    return {
      ...question,
      id: question._id,
      authorName: profile?.displayName ?? question.authorName ?? 'Anonymous',
      authorAvatarUrl: profile?.avatarUrl ?? question.authorAvatarUrl,
      userVote,
      score: question.upvotesCount - question.downvotesCount,
      poiName: poi?.name,
    };
  },
});

/**
 * Search questions by text
 */
export const searchQuestions = query({
  args: {
    query: v.string(),
    poiId: v.optional(v.id('pois')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let searchResults = await ctx.db
      .query('poiQuestions')
      .withSearchIndex('search_questions', (q) => {
        let search = q.search('title', args.query);
        if (args.poiId) {
          search = search.eq('poiId', args.poiId);
        }
        return search.eq('isDeleted', false);
      })
      .take(limit);

    // Enrich results
    const enriched = await Promise.all(
      searchResults.map(async (question) => {
        const profile = await getUserProfile(ctx, question.userId);
        const poi = await ctx.db.get(question.poiId);

        return {
          ...question,
          id: question._id,
          authorName: profile?.displayName ?? question.authorName ?? 'Anonymous',
          authorAvatarUrl: profile?.avatarUrl ?? question.authorAvatarUrl,
          score: question.upvotesCount - question.downvotesCount,
          poiName: poi?.name,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get question count for a POI
 */
export const getQuestionCount = query({
  args: { poiId: v.id('pois') },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query('poiQuestions')
      .withIndex('by_poi', (q) => q.eq('poiId', args.poiId))
      .collect();

    return questions.filter((q) => !q.isDeleted && !q.isHidden).length;
  },
});

/**
 * Get user's questions
 */
export const getMyQuestions = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const questions = await ctx.db
      .query('poiQuestions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    const filtered = questions.filter((q) => !q.isDeleted);
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + pageSize);

    // Enrich with POI info
    const enriched = await Promise.all(
      paginated.map(async (question) => {
        const poi = await ctx.db.get(question.poiId);
        return {
          ...question,
          id: question._id,
          poiName: poi?.name,
          score: question.upvotesCount - question.downvotesCount,
        };
      })
    );

    return { data: enriched, total };
  },
});

// ============================================
// Answer Queries
// ============================================

/**
 * List answers for a question with pagination
 */
export const listAnswersByQuestion = query({
  args: {
    questionId: v.id('poiQuestions'),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(
      v.union(v.literal('newest'), v.literal('oldest'), v.literal('most_upvoted'))
    ),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const sortBy = args.sortBy ?? 'most_upvoted';

    let answers = await ctx.db
      .query('poiAnswers')
      .withIndex('by_question', (q) => q.eq('questionId', args.questionId))
      .collect();

    // Filter out deleted/hidden
    answers = answers.filter((a) => !a.isDeleted && !a.isHidden);

    // Always put best answer first, then sort the rest
    const bestAnswers = answers.filter((a) => a.isBestAnswer);
    const otherAnswers = answers.filter((a) => !a.isBestAnswer);

    // Sort non-best answers
    switch (sortBy) {
      case 'newest':
        otherAnswers.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        otherAnswers.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'most_upvoted':
        otherAnswers.sort((a, b) => b.upvotesCount - a.upvotesCount);
        break;
    }

    const sortedAnswers = [...bestAnswers, ...otherAnswers];
    const total = sortedAnswers.length;
    const paginatedAnswers = sortedAnswers.slice(offset, offset + pageSize);

    // Enrich with user info and vote status
    const enriched = await Promise.all(
      paginatedAnswers.map(async (answer) => {
        const profile = await getUserProfile(ctx, answer.userId);

        let userVote: 'up' | 'down' | null = null;
        if (args.userId) {
          const vote = await ctx.db
            .query('poiAnswerVotes')
            .withIndex('by_answer_user', (q) =>
              q.eq('answerId', answer._id).eq('userId', args.userId!)
            )
            .first();
          userVote = vote?.voteType ?? null;
        }

        return {
          ...answer,
          id: answer._id,
          authorName: profile?.displayName ?? answer.authorName ?? 'Anonymous',
          authorAvatarUrl: profile?.avatarUrl ?? answer.authorAvatarUrl,
          userVote,
          score: answer.upvotesCount - answer.downvotesCount,
        };
      })
    );

    return {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

/**
 * Get a single answer by ID
 */
export const getAnswerById = query({
  args: {
    id: v.id('poiAnswers'),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.id);
    if (!answer || answer.isDeleted || answer.isHidden) {
      return null;
    }

    const profile = await getUserProfile(ctx, answer.userId);

    let userVote: 'up' | 'down' | null = null;
    if (args.userId) {
      const vote = await ctx.db
        .query('poiAnswerVotes')
        .withIndex('by_answer_user', (q) =>
          q.eq('answerId', args.id).eq('userId', args.userId!)
        )
        .first();
      userVote = vote?.voteType ?? null;
    }

    return {
      ...answer,
      id: answer._id,
      authorName: profile?.displayName ?? answer.authorName ?? 'Anonymous',
      authorAvatarUrl: profile?.avatarUrl ?? answer.authorAvatarUrl,
      userVote,
      score: answer.upvotesCount - answer.downvotesCount,
    };
  },
});

/**
 * Get user's answers
 */
export const getMyAnswers = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const answers = await ctx.db
      .query('poiAnswers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    const filtered = answers.filter((a) => !a.isDeleted);
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + pageSize);

    // Enrich with question info
    const enriched = await Promise.all(
      paginated.map(async (answer) => {
        const question = await ctx.db.get(answer.questionId);
        const poi = await ctx.db.get(answer.poiId);
        return {
          ...answer,
          id: answer._id,
          questionTitle: question?.title,
          poiName: poi?.name,
          score: answer.upvotesCount - answer.downvotesCount,
        };
      })
    );

    return { data: enriched, total };
  },
});

// ============================================
// Question Mutations
// ============================================

/**
 * Create a new question
 */
export const createQuestion = mutation({
  args: {
    poiId: v.id('pois'),
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Validate POI exists
    await checkPoiExists(ctx, args.poiId);

    // Validate content
    const title = args.title.trim();
    const content = args.content.trim();

    if (!title) {
      throw new Error('Question title cannot be empty');
    }
    if (title.length > 200) {
      throw new Error('Question title exceeds maximum length of 200 characters');
    }
    if (!content) {
      throw new Error('Question content cannot be empty');
    }
    if (content.length > 5000) {
      throw new Error('Question content exceeds maximum length of 5000 characters');
    }

    // Get user profile for denormalized data
    const profile = await getUserProfile(ctx, args.userId);
    const now = Date.now();

    const questionId = await ctx.db.insert('poiQuestions', {
      poiId: args.poiId,
      userId: args.userId,
      title,
      content,
      authorName: profile?.displayName,
      authorAvatarUrl: profile?.avatarUrl,
      upvotesCount: 0,
      downvotesCount: 0,
      answersCount: 0,
      viewsCount: 0,
      hasBestAnswer: false,
      status: 'open',
      isEdited: false,
      isDeleted: false,
      reportCount: 0,
      isHidden: false,
      tags: args.tags,
      createdAt: now,
      lastActivityAt: now,
    });

    return questionId;
  },
});

/**
 * Update a question
 */
export const updateQuestion = mutation({
  args: {
    id: v.id('poiQuestions'),
    userId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.userId !== args.userId) {
      throw new Error('You can only edit your own questions');
    }

    if (question.isDeleted) {
      throw new Error('Cannot edit a deleted question');
    }

    const updates: Record<string, unknown> = {
      isEdited: true,
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) {
        throw new Error('Question title cannot be empty');
      }
      if (title.length > 200) {
        throw new Error('Question title exceeds maximum length of 200 characters');
      }
      updates.title = title;
    }

    if (args.content !== undefined) {
      const content = args.content.trim();
      if (!content) {
        throw new Error('Question content cannot be empty');
      }
      if (content.length > 5000) {
        throw new Error('Question content exceeds maximum length of 5000 characters');
      }
      updates.content = content;
    }

    if (args.tags !== undefined) {
      updates.tags = args.tags;
    }

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a question (soft delete)
 */
export const deleteQuestion = mutation({
  args: {
    id: v.id('poiQuestions'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.userId !== args.userId) {
      throw new Error('You can only delete your own questions');
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Vote on a question
 */
export const voteQuestion = mutation({
  args: {
    questionId: v.id('poiQuestions'),
    userId: v.string(),
    voteType: voteTypeValidator,
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.isDeleted) {
      throw new Error('Cannot vote on a deleted question');
    }

    // Check for existing vote
    const existingVote = await ctx.db
      .query('poiQuestionVotes')
      .withIndex('by_question_user', (q) =>
        q.eq('questionId', args.questionId).eq('userId', args.userId)
      )
      .first();

    if (existingVote) {
      if (existingVote.voteType === args.voteType) {
        // Remove vote (toggle off)
        await ctx.db.delete(existingVote._id);

        // Update counts
        const countUpdate =
          args.voteType === 'up'
            ? { upvotesCount: question.upvotesCount - 1 }
            : { downvotesCount: question.downvotesCount - 1 };
        await ctx.db.patch(args.questionId, countUpdate);

        return { action: 'removed', voteType: null };
      } else {
        // Change vote
        await ctx.db.patch(existingVote._id, {
          voteType: args.voteType,
          createdAt: Date.now(),
        });

        // Update counts (remove old, add new)
        const countUpdate =
          args.voteType === 'up'
            ? {
                upvotesCount: question.upvotesCount + 1,
                downvotesCount: question.downvotesCount - 1,
              }
            : {
                upvotesCount: question.upvotesCount - 1,
                downvotesCount: question.downvotesCount + 1,
              };
        await ctx.db.patch(args.questionId, countUpdate);

        return { action: 'changed', voteType: args.voteType };
      }
    } else {
      // Create new vote
      await ctx.db.insert('poiQuestionVotes', {
        questionId: args.questionId,
        userId: args.userId,
        voteType: args.voteType,
        createdAt: Date.now(),
      });

      // Update counts
      const countUpdate =
        args.voteType === 'up'
          ? { upvotesCount: question.upvotesCount + 1 }
          : { downvotesCount: question.downvotesCount + 1 };
      await ctx.db.patch(args.questionId, countUpdate);

      // Notify question author of upvote
      if (args.voteType === 'up') {
        const profile = await getUserProfile(ctx, args.userId);
        await createQANotification(ctx, {
          userId: question.userId,
          type: 'vote',
          referenceType: 'question',
          referenceId: args.questionId,
          actorId: args.userId,
          message: `${profile?.displayName ?? 'Someone'} upvoted your question`,
        });
      }

      return { action: 'added', voteType: args.voteType };
    }
  },
});

/**
 * Increment view count
 */
export const incrementQuestionViews = mutation({
  args: { id: v.id('poiQuestions') },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) {
      throw new Error('Question not found');
    }

    await ctx.db.patch(args.id, {
      viewsCount: question.viewsCount + 1,
    });

    return question.viewsCount + 1;
  },
});

/**
 * Close a question (stop accepting answers)
 */
export const closeQuestion = mutation({
  args: {
    id: v.id('poiQuestions'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.userId !== args.userId) {
      throw new Error('Only the question author can close the question');
    }

    await ctx.db.patch(args.id, {
      status: 'closed',
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Reopen a closed question
 */
export const reopenQuestion = mutation({
  args: {
    id: v.id('poiQuestions'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.userId !== args.userId) {
      throw new Error('Only the question author can reopen the question');
    }

    if (question.status !== 'closed') {
      throw new Error('Question is not closed');
    }

    await ctx.db.patch(args.id, {
      status: question.hasBestAnswer ? 'resolved' : 'open',
      updatedAt: Date.now(),
    });

    return true;
  },
});

// ============================================
// Answer Mutations
// ============================================

/**
 * Create a new answer
 */
export const createAnswer = mutation({
  args: {
    questionId: v.id('poiQuestions'),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.isDeleted) {
      throw new Error('Cannot answer a deleted question');
    }

    if (question.status === 'closed') {
      throw new Error('This question is closed and no longer accepting answers');
    }

    // Validate content
    const content = args.content.trim();
    if (!content) {
      throw new Error('Answer content cannot be empty');
    }
    if (content.length > 10000) {
      throw new Error('Answer content exceeds maximum length of 10000 characters');
    }

    // Get user profile
    const profile = await getUserProfile(ctx, args.userId);
    const now = Date.now();

    const answerId = await ctx.db.insert('poiAnswers', {
      questionId: args.questionId,
      poiId: question.poiId,
      userId: args.userId,
      content,
      authorName: profile?.displayName,
      authorAvatarUrl: profile?.avatarUrl,
      upvotesCount: 0,
      downvotesCount: 0,
      isBestAnswer: false,
      isEdited: false,
      isDeleted: false,
      reportCount: 0,
      isHidden: false,
      createdAt: now,
    });

    // Update question's answer count and last activity
    await ctx.db.patch(args.questionId, {
      answersCount: question.answersCount + 1,
      lastActivityAt: now,
    });

    // Notify question author
    await createQANotification(ctx, {
      userId: question.userId,
      type: 'answer',
      referenceType: 'question',
      referenceId: args.questionId,
      actorId: args.userId,
      message: `${profile?.displayName ?? 'Someone'} answered your question`,
    });

    return answerId;
  },
});

/**
 * Update an answer
 */
export const updateAnswer = mutation({
  args: {
    id: v.id('poiAnswers'),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.id);
    if (!answer) {
      throw new Error('Answer not found');
    }

    if (answer.userId !== args.userId) {
      throw new Error('You can only edit your own answers');
    }

    if (answer.isDeleted) {
      throw new Error('Cannot edit a deleted answer');
    }

    const content = args.content.trim();
    if (!content) {
      throw new Error('Answer content cannot be empty');
    }
    if (content.length > 10000) {
      throw new Error('Answer content exceeds maximum length of 10000 characters');
    }

    await ctx.db.patch(args.id, {
      content,
      isEdited: true,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Delete an answer (soft delete)
 */
export const deleteAnswer = mutation({
  args: {
    id: v.id('poiAnswers'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.id);
    if (!answer) {
      throw new Error('Answer not found');
    }

    if (answer.userId !== args.userId) {
      throw new Error('You can only delete your own answers');
    }

    // Update question's answer count
    const question = await ctx.db.get(answer.questionId);
    if (question) {
      await ctx.db.patch(answer.questionId, {
        answersCount: Math.max(0, question.answersCount - 1),
        // If this was best answer, clear it
        ...(answer.isBestAnswer
          ? {
              bestAnswerId: undefined,
              hasBestAnswer: false,
              status: question.status === 'resolved' ? 'open' : question.status,
            }
          : {}),
      });
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Vote on an answer
 */
export const voteAnswer = mutation({
  args: {
    answerId: v.id('poiAnswers'),
    userId: v.string(),
    voteType: voteTypeValidator,
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.answerId);
    if (!answer) {
      throw new Error('Answer not found');
    }

    if (answer.isDeleted) {
      throw new Error('Cannot vote on a deleted answer');
    }

    // Check for existing vote
    const existingVote = await ctx.db
      .query('poiAnswerVotes')
      .withIndex('by_answer_user', (q) =>
        q.eq('answerId', args.answerId).eq('userId', args.userId)
      )
      .first();

    if (existingVote) {
      if (existingVote.voteType === args.voteType) {
        // Remove vote (toggle off)
        await ctx.db.delete(existingVote._id);

        const countUpdate =
          args.voteType === 'up'
            ? { upvotesCount: answer.upvotesCount - 1 }
            : { downvotesCount: answer.downvotesCount - 1 };
        await ctx.db.patch(args.answerId, countUpdate);

        return { action: 'removed', voteType: null };
      } else {
        // Change vote
        await ctx.db.patch(existingVote._id, {
          voteType: args.voteType,
          createdAt: Date.now(),
        });

        const countUpdate =
          args.voteType === 'up'
            ? {
                upvotesCount: answer.upvotesCount + 1,
                downvotesCount: answer.downvotesCount - 1,
              }
            : {
                upvotesCount: answer.upvotesCount - 1,
                downvotesCount: answer.downvotesCount + 1,
              };
        await ctx.db.patch(args.answerId, countUpdate);

        return { action: 'changed', voteType: args.voteType };
      }
    } else {
      // Create new vote
      await ctx.db.insert('poiAnswerVotes', {
        answerId: args.answerId,
        userId: args.userId,
        voteType: args.voteType,
        createdAt: Date.now(),
      });

      const countUpdate =
        args.voteType === 'up'
          ? { upvotesCount: answer.upvotesCount + 1 }
          : { downvotesCount: answer.downvotesCount + 1 };
      await ctx.db.patch(args.answerId, countUpdate);

      // Notify answer author of upvote
      if (args.voteType === 'up') {
        const profile = await getUserProfile(ctx, args.userId);
        await createQANotification(ctx, {
          userId: answer.userId,
          type: 'vote',
          referenceType: 'answer',
          referenceId: args.answerId,
          actorId: args.userId,
          message: `${profile?.displayName ?? 'Someone'} upvoted your answer`,
        });
      }

      return { action: 'added', voteType: args.voteType };
    }
  },
});

/**
 * Mark an answer as best answer
 */
export const markBestAnswer = mutation({
  args: {
    answerId: v.id('poiAnswers'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.answerId);
    if (!answer) {
      throw new Error('Answer not found');
    }

    const question = await ctx.db.get(answer.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    // Only question author can mark best answer
    if (question.userId !== args.userId) {
      throw new Error('Only the question author can mark the best answer');
    }

    if (answer.isDeleted) {
      throw new Error('Cannot mark a deleted answer as best');
    }

    // Clear previous best answer if exists
    if (question.bestAnswerId && question.bestAnswerId !== args.answerId) {
      await ctx.db.patch(question.bestAnswerId, {
        isBestAnswer: false,
        updatedAt: Date.now(),
      });
    }

    // Mark new best answer
    await ctx.db.patch(args.answerId, {
      isBestAnswer: true,
      updatedAt: Date.now(),
    });

    // Update question
    await ctx.db.patch(answer.questionId, {
      bestAnswerId: args.answerId,
      hasBestAnswer: true,
      status: 'resolved',
      updatedAt: Date.now(),
    });

    // Notify answer author
    const profile = await getUserProfile(ctx, args.userId);
    await createQANotification(ctx, {
      userId: answer.userId,
      type: 'best_answer',
      referenceType: 'answer',
      referenceId: args.answerId,
      actorId: args.userId,
      message: `${profile?.displayName ?? 'Someone'} marked your answer as the best answer!`,
    });

    return true;
  },
});

/**
 * Unmark best answer
 */
export const unmarkBestAnswer = mutation({
  args: {
    answerId: v.id('poiAnswers'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.answerId);
    if (!answer) {
      throw new Error('Answer not found');
    }

    const question = await ctx.db.get(answer.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    if (question.userId !== args.userId) {
      throw new Error('Only the question author can unmark the best answer');
    }

    if (!answer.isBestAnswer) {
      throw new Error('This answer is not marked as best');
    }

    // Unmark
    await ctx.db.patch(args.answerId, {
      isBestAnswer: false,
      updatedAt: Date.now(),
    });

    // Update question
    await ctx.db.patch(answer.questionId, {
      bestAnswerId: undefined,
      hasBestAnswer: false,
      status: 'open',
      updatedAt: Date.now(),
    });

    return true;
  },
});

// ============================================
// Report Mutations
// ============================================

/**
 * Report a question or answer
 */
export const reportQA = mutation({
  args: {
    targetType: v.union(v.literal('question'), v.literal('answer')),
    targetId: v.string(),
    userId: v.string(),
    reason: reportReasonValidator,
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check target exists
    if (args.targetType === 'question') {
      const question = await ctx.db.get(args.targetId as Id<'poiQuestions'>);
      if (!question) {
        throw new Error('Question not found');
      }

      // Increment report count
      await ctx.db.patch(args.targetId as Id<'poiQuestions'>, {
        reportCount: question.reportCount + 1,
      });
    } else {
      const answer = await ctx.db.get(args.targetId as Id<'poiAnswers'>);
      if (!answer) {
        throw new Error('Answer not found');
      }

      await ctx.db.patch(args.targetId as Id<'poiAnswers'>, {
        reportCount: answer.reportCount + 1,
      });
    }

    // Check for duplicate report
    const existingReport = await ctx.db
      .query('poiQAReports')
      .withIndex('by_target', (q) =>
        q.eq('targetType', args.targetType).eq('targetId', args.targetId)
      )
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .first();

    if (existingReport) {
      throw new Error('You have already reported this');
    }

    // Create report
    const reportId = await ctx.db.insert('poiQAReports', {
      targetType: args.targetType,
      targetId: args.targetId,
      userId: args.userId,
      reason: args.reason,
      description: args.description,
      status: 'pending',
      createdAt: Date.now(),
    });

    return reportId;
  },
});
