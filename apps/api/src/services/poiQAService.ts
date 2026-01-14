/**
 * POI Q&A Service - Convex Implementation
 * CRUD operations for POI questions and answers
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

// Types
export interface CreateQuestionInput {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateQuestionInput {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface CreateAnswerInput {
  content: string;
}

export interface UpdateAnswerInput {
  content: string;
}

export interface ReportInput {
  reason:
    | 'spam'
    | 'inappropriate'
    | 'misleading'
    | 'off_topic'
    | 'harassment'
    | 'other';
  description?: string;
}

export interface QuestionListQuery {
  page: number;
  pageSize: number;
  sortBy?: 'newest' | 'oldest' | 'most_upvoted' | 'most_active';
  status?: 'open' | 'closed' | 'resolved';
}

export interface AnswerListQuery {
  page: number;
  pageSize: number;
  sortBy?: 'newest' | 'oldest' | 'most_upvoted';
}

/**
 * POI Q&A Service for questions
 */
export const QuestionService = {
  /**
   * List questions for a POI with pagination
   */
  async listByPoi(poiId: string, query: QuestionListQuery, userId?: string) {
    const result = await convex.query(api.poiQA.listQuestionsByPoi, {
      poiId: poiId as Id<'pois'>,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      status: query.status,
      userId,
    });

    return result;
  },

  /**
   * Get a single question by ID
   */
  async getById(questionId: string, userId?: string) {
    const question = await convex.query(api.poiQA.getQuestionById, {
      id: questionId as Id<'poiQuestions'>,
      userId,
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    return question;
  },

  /**
   * Search questions
   */
  async search(query: string, poiId?: string, limit?: number) {
    const results = await convex.query(api.poiQA.searchQuestions, {
      query,
      poiId: poiId ? (poiId as Id<'pois'>) : undefined,
      limit,
    });

    return results;
  },

  /**
   * Get question count for a POI
   */
  async getCount(poiId: string) {
    return await convex.query(api.poiQA.getQuestionCount, {
      poiId: poiId as Id<'pois'>,
    });
  },

  /**
   * Get user's questions
   */
  async getMyQuestions(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ) {
    return await convex.query(api.poiQA.getMyQuestions, {
      userId,
      page,
      pageSize,
    });
  },

  /**
   * Create a new question
   */
  async create(poiId: string, userId: string, input: CreateQuestionInput) {
    if (!input.title || !input.title.trim()) {
      throw new ValidationError('Question title cannot be empty');
    }

    if (input.title.length > 200) {
      throw new ValidationError(
        'Question title exceeds maximum length of 200 characters'
      );
    }

    if (!input.content || !input.content.trim()) {
      throw new ValidationError('Question content cannot be empty');
    }

    if (input.content.length > 5000) {
      throw new ValidationError(
        'Question content exceeds maximum length of 5000 characters'
      );
    }

    const questionId = await convex.mutation(api.poiQA.createQuestion, {
      poiId: poiId as Id<'pois'>,
      userId,
      title: input.title,
      content: input.content,
      tags: input.tags,
    });

    // Fetch the created question
    const question = await convex.query(api.poiQA.getQuestionById, {
      id: questionId,
      userId,
    });

    return question;
  },

  /**
   * Update a question
   */
  async update(
    questionId: string,
    userId: string,
    input: UpdateQuestionInput
  ) {
    if (input.title !== undefined && input.title.length > 200) {
      throw new ValidationError(
        'Question title exceeds maximum length of 200 characters'
      );
    }

    if (input.content !== undefined && input.content.length > 5000) {
      throw new ValidationError(
        'Question content exceeds maximum length of 5000 characters'
      );
    }

    const updated = await convex.mutation(api.poiQA.updateQuestion, {
      id: questionId as Id<'poiQuestions'>,
      userId,
      title: input.title,
      content: input.content,
      tags: input.tags,
    });

    return updated;
  },

  /**
   * Delete a question
   */
  async delete(questionId: string, userId: string) {
    await convex.mutation(api.poiQA.deleteQuestion, {
      id: questionId as Id<'poiQuestions'>,
      userId,
    });
  },

  /**
   * Vote on a question
   */
  async vote(
    questionId: string,
    userId: string,
    voteType: 'up' | 'down'
  ) {
    const result = await convex.mutation(api.poiQA.voteQuestion, {
      questionId: questionId as Id<'poiQuestions'>,
      userId,
      voteType,
    });

    return result;
  },

  /**
   * Increment view count
   */
  async incrementViews(questionId: string) {
    return await convex.mutation(api.poiQA.incrementQuestionViews, {
      id: questionId as Id<'poiQuestions'>,
    });
  },

  /**
   * Close a question
   */
  async close(questionId: string, userId: string) {
    await convex.mutation(api.poiQA.closeQuestion, {
      id: questionId as Id<'poiQuestions'>,
      userId,
    });
  },

  /**
   * Reopen a question
   */
  async reopen(questionId: string, userId: string) {
    await convex.mutation(api.poiQA.reopenQuestion, {
      id: questionId as Id<'poiQuestions'>,
      userId,
    });
  },
};

/**
 * POI Q&A Service for answers
 */
export const AnswerService = {
  /**
   * List answers for a question
   */
  async listByQuestion(
    questionId: string,
    query: AnswerListQuery,
    userId?: string
  ) {
    const result = await convex.query(api.poiQA.listAnswersByQuestion, {
      questionId: questionId as Id<'poiQuestions'>,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      userId,
    });

    return result;
  },

  /**
   * Get a single answer by ID
   */
  async getById(answerId: string, userId?: string) {
    const answer = await convex.query(api.poiQA.getAnswerById, {
      id: answerId as Id<'poiAnswers'>,
      userId,
    });

    if (!answer) {
      throw new NotFoundError('Answer not found');
    }

    return answer;
  },

  /**
   * Get user's answers
   */
  async getMyAnswers(userId: string, page: number = 1, pageSize: number = 20) {
    return await convex.query(api.poiQA.getMyAnswers, {
      userId,
      page,
      pageSize,
    });
  },

  /**
   * Create a new answer
   */
  async create(questionId: string, userId: string, input: CreateAnswerInput) {
    if (!input.content || !input.content.trim()) {
      throw new ValidationError('Answer content cannot be empty');
    }

    if (input.content.length > 10000) {
      throw new ValidationError(
        'Answer content exceeds maximum length of 10000 characters'
      );
    }

    const answerId = await convex.mutation(api.poiQA.createAnswer, {
      questionId: questionId as Id<'poiQuestions'>,
      userId,
      content: input.content,
    });

    // Fetch the created answer
    const answer = await convex.query(api.poiQA.getAnswerById, {
      id: answerId,
      userId,
    });

    return answer;
  },

  /**
   * Update an answer
   */
  async update(answerId: string, userId: string, input: UpdateAnswerInput) {
    if (!input.content || !input.content.trim()) {
      throw new ValidationError('Answer content cannot be empty');
    }

    if (input.content.length > 10000) {
      throw new ValidationError(
        'Answer content exceeds maximum length of 10000 characters'
      );
    }

    const updated = await convex.mutation(api.poiQA.updateAnswer, {
      id: answerId as Id<'poiAnswers'>,
      userId,
      content: input.content,
    });

    return updated;
  },

  /**
   * Delete an answer
   */
  async delete(answerId: string, userId: string) {
    await convex.mutation(api.poiQA.deleteAnswer, {
      id: answerId as Id<'poiAnswers'>,
      userId,
    });
  },

  /**
   * Vote on an answer
   */
  async vote(answerId: string, userId: string, voteType: 'up' | 'down') {
    const result = await convex.mutation(api.poiQA.voteAnswer, {
      answerId: answerId as Id<'poiAnswers'>,
      userId,
      voteType,
    });

    return result;
  },

  /**
   * Mark an answer as best
   */
  async markBest(answerId: string, userId: string) {
    await convex.mutation(api.poiQA.markBestAnswer, {
      answerId: answerId as Id<'poiAnswers'>,
      userId,
    });
  },

  /**
   * Unmark an answer as best
   */
  async unmarkBest(answerId: string, userId: string) {
    await convex.mutation(api.poiQA.unmarkBestAnswer, {
      answerId: answerId as Id<'poiAnswers'>,
      userId,
    });
  },
};

/**
 * POI Q&A Report Service
 */
export const QAReportService = {
  /**
   * Report a question or answer
   */
  async report(
    targetType: 'question' | 'answer',
    targetId: string,
    userId: string,
    input: ReportInput
  ) {
    const reportId = await convex.mutation(api.poiQA.reportQA, {
      targetType,
      targetId,
      userId,
      reason: input.reason,
      description: input.description,
    });

    return { reportId };
  },
};
