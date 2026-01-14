/**
 * Budget API Routes
 * Handles itinerary budgets, expenses, and expense categories
 */

import { Hono } from 'hono';
import { api, convex } from '../lib/convex';
import type { Id } from '@pathfinding/convex';
import { logger } from '../lib/logger';

const budgets = new Hono();

// ============================================
// Expense Categories
// ============================================

/**
 * GET /categories
 * List all expense categories
 */
budgets.get('/categories', async (c) => {
  try {
    const categories = await convex.query(api.budgets.listCategories, {});
    return c.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Failed to list categories', { error });
    return c.json({ success: false, error: 'Failed to list categories' }, 500);
  }
});

/**
 * POST /categories/seed
 * Seed default expense categories
 */
budgets.post('/categories/seed', async (c) => {
  try {
    const result = await convex.mutation(api.budgets.seedDefaultCategories, {});
    return c.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to seed categories', { error });
    return c.json({ success: false, error: 'Failed to seed categories' }, 500);
  }
});

/**
 * POST /categories
 * Create a new expense category
 */
budgets.post('/categories', async (c) => {
  try {
    const body = await c.req.json();
    const { name, nameEn, icon, color, sortOrder, isSystem } = body;

    if (!name || !nameEn || !icon || !color || sortOrder === undefined) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const id = await convex.mutation(api.budgets.createCategory, {
      name,
      nameEn,
      icon,
      color,
      sortOrder,
      isSystem: isSystem ?? false,
    });

    return c.json({ success: true, data: { id } });
  } catch (error) {
    logger.error('Failed to create category', { error });
    return c.json({ success: false, error: 'Failed to create category' }, 500);
  }
});

// ============================================
// Itinerary Budgets
// ============================================

/**
 * GET /itineraries/:itineraryId/budget
 * Get budget for an itinerary
 */
budgets.get('/itineraries/:itineraryId/budget', async (c) => {
  try {
    const itineraryId = c.req.param('itineraryId') as Id<'itineraries'>;
    const withCategories = c.req.query('withCategories') === 'true';

    let budget;
    if (withCategories) {
      budget = await convex.query(api.budgets.getBudgetWithCategories, { itineraryId });
    } else {
      budget = await convex.query(api.budgets.getBudget, { itineraryId });
    }

    return c.json({ success: true, data: budget });
  } catch (error) {
    logger.error('Failed to get budget', { error });
    return c.json({ success: false, error: 'Failed to get budget' }, 500);
  }
});

/**
 * PUT /itineraries/:itineraryId/budget
 * Create or update budget for an itinerary
 */
budgets.put('/itineraries/:itineraryId/budget', async (c) => {
  try {
    const itineraryId = c.req.param('itineraryId') as Id<'itineraries'>;
    const body = await c.req.json();
    const { userId, totalBudget, currency, categoryBudgets, notes } = body;

    if (!userId || totalBudget === undefined || !currency) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const id = await convex.mutation(api.budgets.upsertBudget, {
      itineraryId,
      userId,
      totalBudget,
      currency,
      categoryBudgets: categoryBudgets || [],
      notes,
    });

    return c.json({ success: true, data: { id } });
  } catch (error) {
    logger.error('Failed to upsert budget', { error });
    return c.json({ success: false, error: 'Failed to save budget' }, 500);
  }
});

/**
 * DELETE /budgets/:budgetId
 * Delete a budget
 */
budgets.delete('/budgets/:budgetId', async (c) => {
  try {
    const budgetId = c.req.param('budgetId') as Id<'itineraryBudgets'>;
    await convex.mutation(api.budgets.deleteBudget, { id: budgetId });
    return c.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete budget', { error });
    return c.json({ success: false, error: 'Failed to delete budget' }, 500);
  }
});

// ============================================
// Expenses
// ============================================

/**
 * GET /itineraries/:itineraryId/expenses
 * List expenses for an itinerary
 */
budgets.get('/itineraries/:itineraryId/expenses', async (c) => {
  try {
    const itineraryId = c.req.param('itineraryId') as Id<'itineraries'>;
    const categoryId = c.req.query('categoryId') as Id<'expenseCategories'> | undefined;
    const withCategories = c.req.query('withCategories') === 'true';

    let expenses;
    if (withCategories) {
      expenses = await convex.query(api.budgets.listExpensesWithCategories, { itineraryId });
    } else {
      expenses = await convex.query(api.budgets.listExpenses, {
        itineraryId,
        categoryId: categoryId || undefined,
      });
    }

    return c.json({ success: true, data: expenses });
  } catch (error) {
    logger.error('Failed to list expenses', { error });
    return c.json({ success: false, error: 'Failed to list expenses' }, 500);
  }
});

/**
 * GET /expenses/:expenseId
 * Get a single expense
 */
budgets.get('/expenses/:expenseId', async (c) => {
  try {
    const expenseId = c.req.param('expenseId') as Id<'expenses'>;
    const expense = await convex.query(api.budgets.getExpense, { id: expenseId });

    if (!expense) {
      return c.json({ success: false, error: 'Expense not found' }, 404);
    }

    return c.json({ success: true, data: expense });
  } catch (error) {
    logger.error('Failed to get expense', { error });
    return c.json({ success: false, error: 'Failed to get expense' }, 500);
  }
});

/**
 * POST /itineraries/:itineraryId/expenses
 * Create a new expense
 */
budgets.post('/itineraries/:itineraryId/expenses', async (c) => {
  try {
    const itineraryId = c.req.param('itineraryId') as Id<'itineraries'>;
    const body = await c.req.json();
    const {
      userId,
      categoryId,
      amount,
      currency,
      description,
      date,
      time,
      poiId,
      dayNumber,
      paymentMethod,
      receiptImageUrl,
      notes,
    } = body;

    if (!userId || !categoryId || amount === undefined || !currency || !description || !date) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const id = await convex.mutation(api.budgets.createExpense, {
      itineraryId,
      userId,
      categoryId,
      amount,
      currency,
      description,
      date,
      time,
      poiId,
      dayNumber,
      paymentMethod,
      receiptImageUrl,
      notes,
    });

    return c.json({ success: true, data: { id } });
  } catch (error) {
    logger.error('Failed to create expense', { error });
    return c.json({ success: false, error: 'Failed to create expense' }, 500);
  }
});

/**
 * PATCH /expenses/:expenseId
 * Update an expense
 */
budgets.patch('/expenses/:expenseId', async (c) => {
  try {
    const expenseId = c.req.param('expenseId') as Id<'expenses'>;
    const body = await c.req.json();

    await convex.mutation(api.budgets.updateExpense, {
      id: expenseId,
      ...body,
    });

    return c.json({ success: true });
  } catch (error) {
    logger.error('Failed to update expense', { error });
    return c.json({ success: false, error: 'Failed to update expense' }, 500);
  }
});

/**
 * DELETE /expenses/:expenseId
 * Delete an expense
 */
budgets.delete('/expenses/:expenseId', async (c) => {
  try {
    const expenseId = c.req.param('expenseId') as Id<'expenses'>;
    await convex.mutation(api.budgets.deleteExpense, { id: expenseId });
    return c.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete expense', { error });
    return c.json({ success: false, error: 'Failed to delete expense' }, 500);
  }
});

// ============================================
// Budget Summary & Analytics
// ============================================

/**
 * GET /itineraries/:itineraryId/budget/summary
 * Get budget summary with spending breakdown
 */
budgets.get('/itineraries/:itineraryId/budget/summary', async (c) => {
  try {
    const itineraryId = c.req.param('itineraryId') as Id<'itineraries'>;
    const summary = await convex.query(api.budgets.getBudgetSummary, { itineraryId });
    return c.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to get budget summary', { error });
    return c.json({ success: false, error: 'Failed to get budget summary' }, 500);
  }
});

/**
 * GET /itineraries/:itineraryId/budget/trend
 * Get spending trend data for charts
 */
budgets.get('/itineraries/:itineraryId/budget/trend', async (c) => {
  try {
    const itineraryId = c.req.param('itineraryId') as Id<'itineraries'>;
    const groupBy = c.req.query('groupBy') as 'day' | 'category' | undefined;

    const trend = await convex.query(api.budgets.getSpendingTrend, {
      itineraryId,
      groupBy,
    });

    return c.json({ success: true, data: trend });
  } catch (error) {
    logger.error('Failed to get spending trend', { error });
    return c.json({ success: false, error: 'Failed to get spending trend' }, 500);
  }
});

export default budgets;
