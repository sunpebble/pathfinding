/**
 * Expense Splitting Routes
 * API endpoints for trip expense management and settlement
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ExpenseSplittingService } from '../services/expenseSplittingService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validation schemas
const ExpenseCategorySchema = z.enum([
  'food',
  'transport',
  'accommodation',
  'tickets',
  'shopping',
  'other',
]);

const SplitTypeSchema = z.enum(['equal', 'exact', 'percentage', 'shares']);

const ParticipantSchema = z.object({
  memberId: z.string(),
  splitValue: z.number().min(0),
});

const AddMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  userId: z.string().optional(),
});

const UpdateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

const AddExpenseSchema = z.object({
  paidById: z.string(),
  amount: z.number().int().min(1), // Amount in cents
  currency: z.string().length(3).default('CNY'),
  description: z.string().min(1).max(500),
  category: ExpenseCategorySchema,
  splitType: SplitTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).optional(),
  receiptImageUrl: z.string().url().optional(),
  participants: z.array(ParticipantSchema).min(1),
});

const UpdateExpenseSchema = z.object({
  paidById: z.string().optional(),
  amount: z.number().int().min(1).optional(),
  currency: z.string().length(3).optional(),
  description: z.string().min(1).max(500).optional(),
  category: ExpenseCategorySchema.optional(),
  splitType: SplitTypeSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  notes: z.string().max(1000).optional(),
  receiptImageUrl: z.string().url().optional(),
  participants: z.array(ParticipantSchema).min(1).optional(),
});

const CreateSettlementSchema = z.object({
  fromMemberId: z.string(),
  toMemberId: z.string(),
  amount: z.number().int().min(1),
  currency: z.string().length(3).default('CNY'),
  notes: z.string().max(500).optional(),
});

const ListExpensesQuerySchema = z.object({
  category: ExpenseCategorySchema.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const ListSettlementsQuerySchema = z.object({
  isSettled: z.coerce.boolean().optional(),
});

// Protected routes (auth required)
export const expenseSplittingRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Trip Members Routes
// ============================================

/**
 * GET /itineraries/:itineraryId/expense-splitting/members
 * List all trip members for expense splitting
 */
expenseSplittingRoutes.get(
  '/:itineraryId/expense-splitting/members',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');

    const members = await ExpenseSplittingService.listMembers(
      itineraryId,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: members,
    });
  }
);

/**
 * POST /itineraries/:itineraryId/expense-splitting/members
 * Add a new trip member
 */
expenseSplittingRoutes.post(
  '/:itineraryId/expense-splitting/members',
  zValidator('json', AddMemberSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const input = c.req.valid('json');

    const result = await ExpenseSplittingService.addMember(
      itineraryId,
      userId,
      input,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * POST /itineraries/:itineraryId/expense-splitting/members/add-owner
 * Add the itinerary owner as a member (convenience endpoint)
 */
expenseSplittingRoutes.post(
  '/:itineraryId/expense-splitting/members/add-owner',
  zValidator('json', z.object({ name: z.string().min(1).max(100) })),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const { name } = c.req.valid('json');

    const result = await ExpenseSplittingService.addOwnerAsMember(
      itineraryId,
      userId,
      name,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * PATCH /itineraries/:itineraryId/expense-splitting/members/:memberId
 * Update a trip member
 */
expenseSplittingRoutes.patch(
  '/:itineraryId/expense-splitting/members/:memberId',
  zValidator('json', UpdateMemberSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const memberId = c.req.param('memberId');
    const input = c.req.valid('json');

    const member = await ExpenseSplittingService.updateMember(
      memberId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: member,
    });
  }
);

/**
 * DELETE /itineraries/:itineraryId/expense-splitting/members/:memberId
 * Remove a trip member
 */
expenseSplittingRoutes.delete(
  '/:itineraryId/expense-splitting/members/:memberId',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const memberId = c.req.param('memberId');

    await ExpenseSplittingService.removeMember(memberId, userId, accessToken);

    return c.json({
      success: true,
      data: null,
    });
  }
);

// ============================================
// Expenses Routes
// ============================================

/**
 * GET /itineraries/:itineraryId/expense-splitting/expenses
 * List all expenses for an itinerary
 */
expenseSplittingRoutes.get(
  '/:itineraryId/expense-splitting/expenses',
  zValidator('query', ListExpensesQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const query = c.req.valid('query');

    const expenses = await ExpenseSplittingService.listExpenses(
      itineraryId,
      userId,
      query,
      accessToken
    );

    return c.json({
      success: true,
      data: expenses,
    });
  }
);

/**
 * GET /itineraries/:itineraryId/expense-splitting/expenses/:expenseId
 * Get a single expense with participants
 */
expenseSplittingRoutes.get(
  '/:itineraryId/expense-splitting/expenses/:expenseId',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const expenseId = c.req.param('expenseId');

    const expense = await ExpenseSplittingService.getExpense(
      expenseId,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: expense,
    });
  }
);

/**
 * POST /itineraries/:itineraryId/expense-splitting/expenses
 * Add a new expense
 */
expenseSplittingRoutes.post(
  '/:itineraryId/expense-splitting/expenses',
  zValidator('json', AddExpenseSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const input = c.req.valid('json');

    const result = await ExpenseSplittingService.addExpense(
      itineraryId,
      userId,
      input,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * PATCH /itineraries/:itineraryId/expense-splitting/expenses/:expenseId
 * Update an expense
 */
expenseSplittingRoutes.patch(
  '/:itineraryId/expense-splitting/expenses/:expenseId',
  zValidator('json', UpdateExpenseSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const expenseId = c.req.param('expenseId');
    const input = c.req.valid('json');

    const expense = await ExpenseSplittingService.updateExpense(
      expenseId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: expense,
    });
  }
);

/**
 * DELETE /itineraries/:itineraryId/expense-splitting/expenses/:expenseId
 * Delete an expense
 */
expenseSplittingRoutes.delete(
  '/:itineraryId/expense-splitting/expenses/:expenseId',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const expenseId = c.req.param('expenseId');

    await ExpenseSplittingService.deleteExpense(expenseId, userId, accessToken);

    return c.json({
      success: true,
      data: null,
    });
  }
);

// ============================================
// Balances & Summary Routes
// ============================================

/**
 * GET /itineraries/:itineraryId/expense-splitting/balances
 * Get balances for all members
 */
expenseSplittingRoutes.get(
  '/:itineraryId/expense-splitting/balances',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');

    const balances = await ExpenseSplittingService.getBalances(
      itineraryId,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: balances,
    });
  }
);

/**
 * GET /itineraries/:itineraryId/expense-splitting/summary
 * Get expense summary (totals by category, etc.)
 */
expenseSplittingRoutes.get(
  '/:itineraryId/expense-splitting/summary',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');

    const summary = await ExpenseSplittingService.getExpenseSummary(
      itineraryId,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: summary,
    });
  }
);

// ============================================
// Settlement Routes
// ============================================

/**
 * GET /itineraries/:itineraryId/expense-splitting/settlement-suggestions
 * Get settlement suggestions with minimum transfers
 */
expenseSplittingRoutes.get(
  '/:itineraryId/expense-splitting/settlement-suggestions',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');

    const suggestions = await ExpenseSplittingService.getSettlementSuggestions(
      itineraryId,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: suggestions,
    });
  }
);

/**
 * GET /itineraries/:itineraryId/expense-splitting/settlements
 * List all settlements
 */
expenseSplittingRoutes.get(
  '/:itineraryId/expense-splitting/settlements',
  zValidator('query', ListSettlementsQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const query = c.req.valid('query');

    const settlements = await ExpenseSplittingService.listSettlements(
      itineraryId,
      userId,
      query,
      accessToken
    );

    return c.json({
      success: true,
      data: settlements,
    });
  }
);

/**
 * POST /itineraries/:itineraryId/expense-splitting/settlements
 * Create a settlement record
 */
expenseSplittingRoutes.post(
  '/:itineraryId/expense-splitting/settlements',
  zValidator('json', CreateSettlementSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const input = c.req.valid('json');

    const result = await ExpenseSplittingService.createSettlement(
      itineraryId,
      userId,
      input,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * POST /itineraries/:itineraryId/expense-splitting/settlements/:settlementId/complete
 * Mark a settlement as complete
 */
expenseSplittingRoutes.post(
  '/:itineraryId/expense-splitting/settlements/:settlementId/complete',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const settlementId = c.req.param('settlementId');

    const settlement = await ExpenseSplittingService.markSettlementComplete(
      settlementId,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: settlement,
    });
  }
);

/**
 * DELETE /itineraries/:itineraryId/expense-splitting/settlements/:settlementId
 * Delete a settlement
 */
expenseSplittingRoutes.delete(
  '/:itineraryId/expense-splitting/settlements/:settlementId',
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const settlementId = c.req.param('settlementId');

    await ExpenseSplittingService.deleteSettlement(
      settlementId,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: null,
    });
  }
);
