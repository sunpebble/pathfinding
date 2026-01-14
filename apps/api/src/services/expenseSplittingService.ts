/**
 * Expense Splitting Service - Convex Implementation
 * Manages trip members, shared expenses, balances, and settlements
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'tickets'
  | 'shopping'
  | 'other';

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface AddMemberInput {
  name: string;
  email?: string;
  avatarUrl?: string;
  userId?: string;
}

export interface UpdateMemberInput {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface ParticipantInput {
  memberId: string;
  splitValue: number;
}

export interface AddExpenseInput {
  paidById: string;
  amount: number;
  currency: string;
  description: string;
  category: ExpenseCategory;
  splitType: SplitType;
  date: string;
  notes?: string;
  receiptImageUrl?: string;
  participants: ParticipantInput[];
}

export interface UpdateExpenseInput {
  paidById?: string;
  amount?: number;
  currency?: string;
  description?: string;
  category?: ExpenseCategory;
  splitType?: SplitType;
  date?: string;
  notes?: string;
  receiptImageUrl?: string;
  participants?: ParticipantInput[];
}

export interface CreateSettlementInput {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  notes?: string;
}

/**
 * Expense Splitting Service
 */
export const ExpenseSplittingService = {
  // ============================================
  // Trip Members
  // ============================================

  /**
   * List all members for an itinerary
   */
  async listMembers(itineraryId: string, userId: string, _accessToken: string) {
    // Access check is done in Convex function
    const members = await convex.query(api.expenseSplitting.listMembers, {
      itineraryId: itineraryId as Id<'itineraries'>,
    });

    return members;
  },

  /**
   * Add a new member to the trip
   */
  async addMember(
    itineraryId: string,
    userId: string,
    input: AddMemberInput,
    _accessToken: string
  ) {
    const memberId = await convex.mutation(api.expenseSplitting.addMember, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl,
      linkedUserId: input.userId,
    });

    return { id: memberId };
  },

  /**
   * Add the itinerary owner as a member (convenience method)
   */
  async addOwnerAsMember(
    itineraryId: string,
    userId: string,
    name: string,
    _accessToken: string
  ) {
    const memberId = await convex.mutation(
      api.expenseSplitting.addOwnerAsMember,
      {
        itineraryId: itineraryId as Id<'itineraries'>,
        userId,
        name,
      }
    );

    return { id: memberId };
  },

  /**
   * Update a member's details
   */
  async updateMember(
    memberId: string,
    userId: string,
    input: UpdateMemberInput,
    _accessToken: string
  ) {
    const member = await convex.mutation(api.expenseSplitting.updateMember, {
      memberId: memberId as Id<'tripMembers'>,
      userId,
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl,
    });

    return member;
  },

  /**
   * Remove a member from the trip
   */
  async removeMember(memberId: string, userId: string, _accessToken: string) {
    await convex.mutation(api.expenseSplitting.removeMember, {
      memberId: memberId as Id<'tripMembers'>,
      userId,
    });
  },

  // ============================================
  // Expenses
  // ============================================

  /**
   * List all expenses for an itinerary
   */
  async listExpenses(
    itineraryId: string,
    userId: string,
    options: {
      category?: ExpenseCategory;
      startDate?: string;
      endDate?: string;
    },
    _accessToken: string
  ) {
    const expenses = await convex.query(api.expenseSplitting.listExpenses, {
      itineraryId: itineraryId as Id<'itineraries'>,
      category: options.category,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    return expenses;
  },

  /**
   * Get a single expense with participants
   */
  async getExpense(expenseId: string, userId: string, _accessToken: string) {
    const expense = await convex.query(api.expenseSplitting.getExpense, {
      expenseId: expenseId as Id<'sharedExpenses'>,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    return expense;
  },

  /**
   * Add a new expense
   */
  async addExpense(
    itineraryId: string,
    userId: string,
    input: AddExpenseInput,
    _accessToken: string
  ) {
    const expenseId = await convex.mutation(api.expenseSplitting.addExpense, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      paidById: input.paidById as Id<'tripMembers'>,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      category: input.category,
      splitType: input.splitType,
      date: input.date,
      notes: input.notes,
      receiptImageUrl: input.receiptImageUrl,
      participants: input.participants.map((p) => ({
        memberId: p.memberId as Id<'tripMembers'>,
        splitValue: p.splitValue,
      })),
    });

    return { id: expenseId };
  },

  /**
   * Update an expense
   */
  async updateExpense(
    expenseId: string,
    userId: string,
    input: UpdateExpenseInput,
    _accessToken: string
  ) {
    const expense = await convex.mutation(api.expenseSplitting.updateExpense, {
      expenseId: expenseId as Id<'sharedExpenses'>,
      userId,
      paidById: input.paidById as Id<'tripMembers'> | undefined,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      category: input.category,
      splitType: input.splitType,
      date: input.date,
      notes: input.notes,
      receiptImageUrl: input.receiptImageUrl,
      participants: input.participants?.map((p) => ({
        memberId: p.memberId as Id<'tripMembers'>,
        splitValue: p.splitValue,
      })),
    });

    return expense;
  },

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string, userId: string, _accessToken: string) {
    await convex.mutation(api.expenseSplitting.deleteExpense, {
      expenseId: expenseId as Id<'sharedExpenses'>,
      userId,
    });
  },

  // ============================================
  // Balances & Settlements
  // ============================================

  /**
   * Get balances for all members in an itinerary
   */
  async getBalances(itineraryId: string, userId: string, _accessToken: string) {
    const balances = await convex.query(api.expenseSplitting.getBalances, {
      itineraryId: itineraryId as Id<'itineraries'>,
    });

    return balances;
  },

  /**
   * Get expense summary for an itinerary
   */
  async getExpenseSummary(
    itineraryId: string,
    userId: string,
    _accessToken: string
  ) {
    const summary = await convex.query(api.expenseSplitting.getExpenseSummary, {
      itineraryId: itineraryId as Id<'itineraries'>,
    });

    return summary;
  },

  /**
   * Get settlement suggestions with minimum transfers
   */
  async getSettlementSuggestions(
    itineraryId: string,
    userId: string,
    _accessToken: string
  ) {
    const suggestions = await convex.query(
      api.expenseSplitting.getSettlementSuggestions,
      {
        itineraryId: itineraryId as Id<'itineraries'>,
      }
    );

    return suggestions;
  },

  /**
   * Create a settlement record
   */
  async createSettlement(
    itineraryId: string,
    userId: string,
    input: CreateSettlementInput,
    _accessToken: string
  ) {
    const settlementId = await convex.mutation(
      api.expenseSplitting.createSettlement,
      {
        itineraryId: itineraryId as Id<'itineraries'>,
        userId,
        fromMemberId: input.fromMemberId as Id<'tripMembers'>,
        toMemberId: input.toMemberId as Id<'tripMembers'>,
        amount: input.amount,
        currency: input.currency,
        notes: input.notes,
      }
    );

    return { id: settlementId };
  },

  /**
   * Mark a settlement as complete
   */
  async markSettlementComplete(
    settlementId: string,
    userId: string,
    _accessToken: string
  ) {
    const settlement = await convex.mutation(
      api.expenseSplitting.markSettlementComplete,
      {
        settlementId: settlementId as Id<'settlements'>,
        userId,
      }
    );

    return settlement;
  },

  /**
   * Delete a settlement
   */
  async deleteSettlement(
    settlementId: string,
    userId: string,
    _accessToken: string
  ) {
    await convex.mutation(api.expenseSplitting.deleteSettlement, {
      settlementId: settlementId as Id<'settlements'>,
      userId,
    });
  },

  /**
   * List all settlements for an itinerary
   */
  async listSettlements(
    itineraryId: string,
    userId: string,
    options: { isSettled?: boolean },
    _accessToken: string
  ) {
    const settlements = await convex.query(
      api.expenseSplitting.listSettlements,
      {
        itineraryId: itineraryId as Id<'itineraries'>,
        isSettled: options.isSettled,
      }
    );

    return settlements;
  },
};
