/**
 * Budget Management Functions
 * Handles itinerary budgets, expenses, and expense categories
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// ============================================
// Expense Categories
// ============================================

/**
 * List all expense categories, ordered by sortOrder
 */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query('expenseCategories')
      .withIndex('by_sort_order')
      .collect();
    return categories;
  },
});

/**
 * Get a single expense category by ID
 */
export const getCategory = query({
  args: { id: v.id('expenseCategories') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new expense category
 */
export const createCategory = mutation({
  args: {
    name: v.string(),
    nameEn: v.string(),
    icon: v.string(),
    color: v.string(),
    sortOrder: v.number(),
    isSystem: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('expenseCategories', args);
  },
});

/**
 * Seed default expense categories
 */
export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if categories already exist
    const existing = await ctx.db.query('expenseCategories').first();
    if (existing) {
      return { message: 'Categories already seeded' };
    }

    const defaultCategories = [
      { name: '交通', nameEn: 'Transportation', icon: 'car.fill', color: '#3B82F6', sortOrder: 1, isSystem: true },
      { name: '住宿', nameEn: 'Accommodation', icon: 'bed.double.fill', color: '#8B5CF6', sortOrder: 2, isSystem: true },
      { name: '餐饮', nameEn: 'Food & Dining', icon: 'fork.knife', color: '#F59E0B', sortOrder: 3, isSystem: true },
      { name: '门票', nameEn: 'Tickets & Entrance', icon: 'ticket.fill', color: '#10B981', sortOrder: 4, isSystem: true },
      { name: '购物', nameEn: 'Shopping', icon: 'bag.fill', color: '#EC4899', sortOrder: 5, isSystem: true },
      { name: '娱乐', nameEn: 'Entertainment', icon: 'gamecontroller.fill', color: '#6366F1', sortOrder: 6, isSystem: true },
      { name: '其他', nameEn: 'Other', icon: 'ellipsis.circle.fill', color: '#6B7280', sortOrder: 7, isSystem: true },
    ];

    for (const category of defaultCategories) {
      await ctx.db.insert('expenseCategories', category);
    }

    return { message: 'Default categories seeded successfully', count: defaultCategories.length };
  },
});

// ============================================
// Itinerary Budgets
// ============================================

/**
 * Get budget for an itinerary
 */
export const getBudget = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    const budget = await ctx.db
      .query('itineraryBudgets')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .first();
    return budget;
  },
});

/**
 * Get budget with enriched category data
 */
export const getBudgetWithCategories = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    const budget = await ctx.db
      .query('itineraryBudgets')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .first();

    if (!budget) {
      return null;
    }

    // Enrich category budgets with category details
    const enrichedCategoryBudgets = await Promise.all(
      budget.categoryBudgets.map(async (cb) => {
        const category = await ctx.db.get(cb.categoryId);
        return {
          ...cb,
          category,
        };
      })
    );

    return {
      ...budget,
      categoryBudgets: enrichedCategoryBudgets,
    };
  },
});

/**
 * Create or update budget for an itinerary
 */
export const upsertBudget = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    totalBudget: v.number(),
    currency: v.string(),
    categoryBudgets: v.array(
      v.object({
        categoryId: v.id('expenseCategories'),
        amount: v.number(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('itineraryBudgets')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalBudget: args.totalBudget,
        currency: args.currency,
        categoryBudgets: args.categoryBudgets,
        notes: args.notes,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert('itineraryBudgets', {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete budget for an itinerary
 */
export const deleteBudget = mutation({
  args: { id: v.id('itineraryBudgets') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================
// Expenses
// ============================================

/**
 * List expenses for an itinerary
 */
export const listExpenses = query({
  args: {
    itineraryId: v.id('itineraries'),
    categoryId: v.optional(v.id('expenseCategories')),
  },
  handler: async (ctx, args) => {
    let expenses;

    if (args.categoryId) {
      expenses = await ctx.db
        .query('expenses')
        .withIndex('by_itinerary_category', (q) =>
          q.eq('itineraryId', args.itineraryId).eq('categoryId', args.categoryId)
        )
        .collect();
    } else {
      expenses = await ctx.db
        .query('expenses')
        .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
        .collect();
    }

    return expenses;
  },
});

/**
 * List expenses with enriched category data
 */
export const listExpensesWithCategories = query({
  args: {
    itineraryId: v.id('itineraries'),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query('expenses')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Enrich with category details
    const enrichedExpenses = await Promise.all(
      expenses.map(async (expense) => {
        const category = await ctx.db.get(expense.categoryId);
        return {
          ...expense,
          category,
        };
      })
    );

    // Sort by date descending
    return enrichedExpenses.sort((a, b) => {
      if (a.date === b.date) {
        return b.createdAt - a.createdAt;
      }
      return b.date.localeCompare(a.date);
    });
  },
});

/**
 * Get a single expense by ID
 */
export const getExpense = query({
  args: { id: v.id('expenses') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new expense
 */
export const createExpense = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    categoryId: v.id('expenseCategories'),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    poiId: v.optional(v.id('pois')),
    dayNumber: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    receiptImageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('expenses', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an expense
 */
export const updateExpense = mutation({
  args: {
    id: v.id('expenses'),
    categoryId: v.optional(v.id('expenseCategories')),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    poiId: v.optional(v.id('pois')),
    dayNumber: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    receiptImageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete an expense
 */
export const deleteExpense = mutation({
  args: { id: v.id('expenses') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================
// Budget Summary & Analytics
// ============================================

/**
 * Get budget summary with spending breakdown for an itinerary
 */
export const getBudgetSummary = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    // Get budget
    const budget = await ctx.db
      .query('itineraryBudgets')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .first();

    // Get all expenses
    const expenses = await ctx.db
      .query('expenses')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Get all categories
    const categories = await ctx.db
      .query('expenseCategories')
      .withIndex('by_sort_order')
      .collect();

    // Calculate total spent
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate spending by category
    const spendingByCategory = categories.map((category) => {
      const categoryExpenses = expenses.filter((e) => e.categoryId === category._id);
      const spent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const budgetAmount =
        budget?.categoryBudgets.find((cb) => cb.categoryId === category._id)?.amount || 0;

      return {
        category,
        budgetAmount,
        spent,
        remaining: budgetAmount - spent,
        percentUsed: budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0,
        isOverBudget: spent > budgetAmount && budgetAmount > 0,
        expenseCount: categoryExpenses.length,
      };
    });

    // Calculate daily spending trend
    const spendingByDate: Record<string, number> = {};
    expenses.forEach((expense) => {
      spendingByDate[expense.date] = (spendingByDate[expense.date] || 0) + expense.amount;
    });

    const dailyTrend = Object.entries(spendingByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      budget: budget
        ? {
            total: budget.totalBudget,
            currency: budget.currency,
            notes: budget.notes,
          }
        : null,
      totalSpent,
      remaining: budget ? budget.totalBudget - totalSpent : 0,
      percentUsed: budget && budget.totalBudget > 0 ? (totalSpent / budget.totalBudget) * 100 : 0,
      isOverBudget: budget ? totalSpent > budget.totalBudget : false,
      expenseCount: expenses.length,
      spendingByCategory: spendingByCategory.filter((c) => c.spent > 0 || c.budgetAmount > 0),
      dailyTrend,
    };
  },
});

/**
 * Get spending trend data for charts
 */
export const getSpendingTrend = query({
  args: {
    itineraryId: v.id('itineraries'),
    groupBy: v.optional(v.union(v.literal('day'), v.literal('category'))),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query('expenses')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    const categories = await ctx.db
      .query('expenseCategories')
      .withIndex('by_sort_order')
      .collect();

    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    if (args.groupBy === 'category') {
      // Group by category for pie chart
      const byCategory = new Map<string, { category: (typeof categories)[0]; amount: number }>();

      expenses.forEach((expense) => {
        const category = categoryMap.get(expense.categoryId);
        if (category) {
          const existing = byCategory.get(category._id) || { category, amount: 0 };
          existing.amount += expense.amount;
          byCategory.set(category._id, existing);
        }
      });

      return Array.from(byCategory.values())
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);
    } else {
      // Group by day for line chart
      const byDate = new Map<string, number>();

      expenses.forEach((expense) => {
        const existing = byDate.get(expense.date) || 0;
        byDate.set(expense.date, existing + expense.amount);
      });

      return Array.from(byDate.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  },
});
