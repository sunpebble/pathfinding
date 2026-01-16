import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Expense Splitting - 费用分摊功能
 *
 * Features:
 * - Trip member management (旅行同伴管理)
 * - Shared expense recording (共享支出记录)
 * - Balance calculation (余额计算)
 * - Settlement suggestions with minimum transfers (最少转账次数结算建议)
 */

// Validators
const expenseCategoryValidator = v.union(
  v.literal('food'),
  v.literal('transport'),
  v.literal('accommodation'),
  v.literal('tickets'),
  v.literal('shopping'),
  v.literal('other')
);

const splitTypeValidator = v.union(
  v.literal('equal'),
  v.literal('exact'),
  v.literal('percentage'),
  v.literal('shares')
);

// ============================================
// Permission Helpers
// ============================================

async function checkItineraryAccess(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<'itineraries'>,
  userId: string
): Promise<boolean> {
  const itinerary = await ctx.db.get(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Check if user is the owner
  if (itinerary.userId === userId) {
    return true;
  }

  // Check if user is a collaborator
  const collab = await ctx.db
    .query('itineraryCollaborators')
    .withIndex('by_itinerary_user', (q) =>
      q.eq('itineraryId', itineraryId).eq('userId', userId)
    )
    .first();

  if (!collab) {
    throw new Error('You do not have access to this itinerary');
  }

  return true;
}

async function checkMemberAccess(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<'tripMembers'>,
  userId: string
): Promise<Id<'itineraries'>> {
  const member = await ctx.db.get(memberId);
  if (!member) {
    throw new Error('Trip member not found');
  }

  await checkItineraryAccess(ctx, member.itineraryId, userId);
  return member.itineraryId;
}

// ============================================
// Trip Members (旅行同伴)
// ============================================

// List members for an itinerary
export const listMembers = query({
  args: {
    itineraryId: v.id('itineraries'),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query('tripMembers')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    return members.sort((a, b) => {
      // Owner first, then by creation time
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return a.createdAt - b.createdAt;
    });
  },
});

// Add a trip member
export const addMember = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(), // Current user ID for permission check
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    memberUserId: v.optional(v.string()), // Optional: link to registered user
  },
  handler: async (ctx, args) => {
    await checkItineraryAccess(ctx, args.itineraryId, args.userId);

    // Check if member already exists (by name or linked user ID)
    const existing = await ctx.db
      .query('tripMembers')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    if (args.memberUserId) {
      const existingByUserId = existing.find(
        (m) => m.userId === args.memberUserId
      );
      if (existingByUserId) {
        throw new Error('This user is already a member of this trip');
      }
    }

    const memberId = await ctx.db.insert('tripMembers', {
      itineraryId: args.itineraryId,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      userId: args.memberUserId,
      isOwner: false,
      createdAt: Date.now(),
    });

    return memberId;
  },
});

// Add the trip owner as a member (called when first accessing expense splitting)
export const addOwnerAsMember = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkItineraryAccess(ctx, args.itineraryId, args.userId);

    // Check if owner already exists as member
    const existing = await ctx.db
      .query('tripMembers')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    const memberId = await ctx.db.insert('tripMembers', {
      itineraryId: args.itineraryId,
      name: args.name,
      avatarUrl: args.avatarUrl,
      userId: args.userId,
      isOwner: true,
      createdAt: Date.now(),
    });

    return memberId;
  },
});

// Update a trip member
export const updateMember = mutation({
  args: {
    memberId: v.id('tripMembers'),
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkMemberAccess(ctx, args.memberId, args.userId);

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    await ctx.db.patch(args.memberId, updates);
    return await ctx.db.get(args.memberId);
  },
});

// Remove a trip member (cannot remove owner)
export const removeMember = mutation({
  args: {
    memberId: v.id('tripMembers'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const itineraryId = await checkMemberAccess(ctx, args.memberId, args.userId);
    const member = await ctx.db.get(args.memberId);

    if (member?.isOwner) {
      throw new Error('Cannot remove the trip owner');
    }

    // Check if member has any expenses
    const expenses = await ctx.db
      .query('sharedExpenses')
      .withIndex('by_paid_by', (q) => q.eq('paidById', args.memberId))
      .first();

    if (expenses) {
      throw new Error('Cannot remove a member who has paid for expenses. Delete the expenses first.');
    }

    // Check if member is participant in any expenses
    const participations = await ctx.db
      .query('expenseParticipants')
      .withIndex('by_member', (q) => q.eq('memberId', args.memberId))
      .first();

    if (participations) {
      throw new Error('Cannot remove a member who is part of expense splits. Remove them from expenses first.');
    }

    await ctx.db.delete(args.memberId);
  },
});

// ============================================
// Shared Expenses (共享支出)
// ============================================

// List expenses for an itinerary
export const listExpenses = query({
  args: {
    itineraryId: v.id('itineraries'),
    category: v.optional(expenseCategoryValidator),
  },
  handler: async (ctx, args) => {
    let expenses = await ctx.db
      .query('sharedExpenses')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    if (args.category) {
      expenses = expenses.filter((e) => e.category === args.category);
    }

    // Sort by date descending, then by creation time
    expenses.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt - a.createdAt;
    });

    // Enrich with payer info and participants
    const enriched = await Promise.all(
      expenses.map(async (expense) => {
        const payer = await ctx.db.get(expense.paidById);
        const participants = await ctx.db
          .query('expenseParticipants')
          .withIndex('by_expense', (q) => q.eq('expenseId', expense._id))
          .collect();

        // Get participant member info
        const participantsWithInfo = await Promise.all(
          participants.map(async (p) => {
            const member = await ctx.db.get(p.memberId);
            return {
              ...p,
              memberName: member?.name ?? 'Unknown',
            };
          })
        );

        return {
          ...expense,
          payerName: payer?.name ?? 'Unknown',
          participants: participantsWithInfo,
        };
      })
    );

    return enriched;
  },
});

// Get a single expense with details
export const getExpense = query({
  args: {
    expenseId: v.id('sharedExpenses'),
  },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) return null;

    const payer = await ctx.db.get(expense.paidById);
    const participants = await ctx.db
      .query('expenseParticipants')
      .withIndex('by_expense', (q) => q.eq('expenseId', args.expenseId))
      .collect();

    const participantsWithInfo = await Promise.all(
      participants.map(async (p) => {
        const member = await ctx.db.get(p.memberId);
        return {
          ...p,
          memberName: member?.name ?? 'Unknown',
        };
      })
    );

    return {
      ...expense,
      payerName: payer?.name ?? 'Unknown',
      participants: participantsWithInfo,
    };
  },
});

// Add a new expense
export const addExpense = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    paidById: v.id('tripMembers'),
    amount: v.number(), // Amount in cents
    currency: v.string(),
    description: v.string(),
    category: expenseCategoryValidator,
    splitType: splitTypeValidator,
    date: v.string(),
    notes: v.optional(v.string()),
    receiptImageUrl: v.optional(v.string()),
    // Participants with their split values
    participants: v.array(
      v.object({
        memberId: v.id('tripMembers'),
        splitValue: v.number(), // Meaning depends on splitType
      })
    ),
  },
  handler: async (ctx, args) => {
    await checkItineraryAccess(ctx, args.itineraryId, args.userId);

    if (args.participants.length === 0) {
      throw new Error('At least one participant is required');
    }

    // Calculate amounts owed based on split type
    const participantsWithAmounts = calculateSplitAmounts(
      args.amount,
      args.splitType,
      args.participants
    );

    const now = Date.now();

    // Create the expense
    const expenseId = await ctx.db.insert('sharedExpenses', {
      itineraryId: args.itineraryId,
      paidById: args.paidById,
      amount: args.amount,
      currency: args.currency,
      description: args.description,
      category: args.category,
      splitType: args.splitType,
      date: args.date,
      notes: args.notes,
      receiptImageUrl: args.receiptImageUrl,
      createdAt: now,
      updatedAt: now,
    });

    // Create participant records
    for (const participant of participantsWithAmounts) {
      await ctx.db.insert('expenseParticipants', {
        expenseId,
        memberId: participant.memberId,
        splitValue: participant.splitValue,
        amountOwed: participant.amountOwed,
      });
    }

    return expenseId;
  },
});

// Update an expense
export const updateExpense = mutation({
  args: {
    expenseId: v.id('sharedExpenses'),
    userId: v.string(),
    paidById: v.optional(v.id('tripMembers')),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(expenseCategoryValidator),
    splitType: v.optional(splitTypeValidator),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
    receiptImageUrl: v.optional(v.string()),
    participants: v.optional(
      v.array(
        v.object({
          memberId: v.id('tripMembers'),
          splitValue: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    await checkItineraryAccess(ctx, expense.itineraryId, args.userId);

    // Prepare updates
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.paidById !== undefined) updates.paidById = args.paidById;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.splitType !== undefined) updates.splitType = args.splitType;
    if (args.date !== undefined) updates.date = args.date;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.receiptImageUrl !== undefined) updates.receiptImageUrl = args.receiptImageUrl;

    await ctx.db.patch(args.expenseId, updates);

    // Update participants if provided
    if (args.participants !== undefined) {
      // Delete existing participants
      const existingParticipants = await ctx.db
        .query('expenseParticipants')
        .withIndex('by_expense', (q) => q.eq('expenseId', args.expenseId))
        .collect();

      for (const p of existingParticipants) {
        await ctx.db.delete(p._id);
      }

      // Calculate new amounts
      const amount = args.amount ?? expense.amount;
      const splitType = args.splitType ?? expense.splitType;
      const participantsWithAmounts = calculateSplitAmounts(
        amount,
        splitType,
        args.participants
      );

      // Create new participant records
      for (const participant of participantsWithAmounts) {
        await ctx.db.insert('expenseParticipants', {
          expenseId: args.expenseId,
          memberId: participant.memberId,
          splitValue: participant.splitValue,
          amountOwed: participant.amountOwed,
        });
      }
    }

    return await ctx.db.get(args.expenseId);
  },
});

// Delete an expense
export const deleteExpense = mutation({
  args: {
    expenseId: v.id('sharedExpenses'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    await checkItineraryAccess(ctx, expense.itineraryId, args.userId);

    // Delete participants first
    const participants = await ctx.db
      .query('expenseParticipants')
      .withIndex('by_expense', (q) => q.eq('expenseId', args.expenseId))
      .collect();

    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    // Delete the expense
    await ctx.db.delete(args.expenseId);
  },
});

// ============================================
// Balance Calculation (余额计算)
// ============================================

// Get balances for all members in an itinerary
export const getBalances = query({
  args: {
    itineraryId: v.id('itineraries'),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query('tripMembers')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    const expenses = await ctx.db
      .query('sharedExpenses')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Initialize balances
    const balances = new Map<string, number>();
    for (const member of members) {
      balances.set(member._id, 0);
    }

    // Process each expense
    for (const expense of expenses) {
      // Payer paid the full amount (credit)
      const currentPayer = balances.get(expense.paidById) ?? 0;
      balances.set(expense.paidById, currentPayer + expense.amount);

      // Get participants and their owed amounts
      const participants = await ctx.db
        .query('expenseParticipants')
        .withIndex('by_expense', (q) => q.eq('expenseId', expense._id))
        .collect();

      // Each participant owes their share (debit)
      for (const participant of participants) {
        const current = balances.get(participant.memberId) ?? 0;
        balances.set(participant.memberId, current - participant.amountOwed);
      }
    }

    // Account for existing settlements
    const settlements = await ctx.db
      .query('settlements')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    for (const settlement of settlements) {
      if (settlement.isSettled) {
        // From member paid (debit their balance by amount)
        const fromBalance = balances.get(settlement.fromMemberId) ?? 0;
        balances.set(settlement.fromMemberId, fromBalance - settlement.amount);

        // To member received (credit their balance by amount)
        const toBalance = balances.get(settlement.toMemberId) ?? 0;
        balances.set(settlement.toMemberId, toBalance + settlement.amount);
      }
    }

    // Build response with member info
    const result = members.map((member) => ({
      memberId: member._id,
      memberName: member.name,
      avatarUrl: member.avatarUrl,
      isOwner: member.isOwner,
      balance: balances.get(member._id) ?? 0, // Positive = owed money, Negative = owes money
    }));

    return result.sort((a, b) => b.balance - a.balance);
  },
});

// Get expense summary by category
export const getExpenseSummary = query({
  args: {
    itineraryId: v.id('itineraries'),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query('sharedExpenses')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Calculate totals by category
    const categoryTotals = new Map<string, number>();
    let total = 0;

    for (const expense of expenses) {
      const current = categoryTotals.get(expense.category) ?? 0;
      categoryTotals.set(expense.category, current + expense.amount);
      total += expense.amount;
    }

    const categories = ['food', 'transport', 'accommodation', 'tickets', 'shopping', 'other'];
    const breakdown = categories.map((category) => ({
      category,
      amount: categoryTotals.get(category) ?? 0,
      percentage: total > 0 ? Math.round(((categoryTotals.get(category) ?? 0) / total) * 100) : 0,
    }));

    return {
      total,
      expenseCount: expenses.length,
      breakdown,
      currency: expenses[0]?.currency ?? 'CNY',
    };
  },
});

// ============================================
// Settlement Suggestions (结算建议)
// ============================================

// Calculate optimal settlements with minimum transfers
export const getSettlementSuggestions = query({
  args: {
    itineraryId: v.id('itineraries'),
  },
  handler: async (ctx, args) => {
    // Get current balances
    const members = await ctx.db
      .query('tripMembers')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    const expenses = await ctx.db
      .query('sharedExpenses')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Initialize balances
    const balances = new Map<string, number>();
    const memberInfo = new Map<string, { name: string; avatarUrl?: string }>();

    for (const member of members) {
      balances.set(member._id, 0);
      memberInfo.set(member._id, { name: member.name, avatarUrl: member.avatarUrl });
    }

    // Calculate balances
    for (const expense of expenses) {
      const currentPayer = balances.get(expense.paidById) ?? 0;
      balances.set(expense.paidById, currentPayer + expense.amount);

      const participants = await ctx.db
        .query('expenseParticipants')
        .withIndex('by_expense', (q) => q.eq('expenseId', expense._id))
        .collect();

      for (const participant of participants) {
        const current = balances.get(participant.memberId) ?? 0;
        balances.set(participant.memberId, current - participant.amountOwed);
      }
    }

    // Account for existing settled settlements
    const settlements = await ctx.db
      .query('settlements')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    for (const settlement of settlements) {
      if (settlement.isSettled) {
        const fromBalance = balances.get(settlement.fromMemberId) ?? 0;
        balances.set(settlement.fromMemberId, fromBalance - settlement.amount);

        const toBalance = balances.get(settlement.toMemberId) ?? 0;
        balances.set(settlement.toMemberId, toBalance + settlement.amount);
      }
    }

    // Use greedy algorithm for minimum transfers
    const suggestions = calculateMinimumTransfers(balances, memberInfo);

    return {
      suggestions,
      pendingSettlements: settlements.filter((s) => !s.isSettled).map((s) => ({
        ...s,
        fromMemberName: memberInfo.get(s.fromMemberId)?.name ?? 'Unknown',
        toMemberName: memberInfo.get(s.toMemberId)?.name ?? 'Unknown',
      })),
    };
  },
});

// Create a settlement record
export const createSettlement = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    fromMemberId: v.id('tripMembers'),
    toMemberId: v.id('tripMembers'),
    amount: v.number(),
    currency: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkItineraryAccess(ctx, args.itineraryId, args.userId);

    if (args.fromMemberId === args.toMemberId) {
      throw new Error('From and to members cannot be the same');
    }

    if (args.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const settlementId = await ctx.db.insert('settlements', {
      itineraryId: args.itineraryId,
      fromMemberId: args.fromMemberId,
      toMemberId: args.toMemberId,
      amount: args.amount,
      currency: args.currency,
      isSettled: false,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return settlementId;
  },
});

// Mark a settlement as complete
export const markSettlementComplete = mutation({
  args: {
    settlementId: v.id('settlements'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db.get(args.settlementId);
    if (!settlement) {
      throw new Error('Settlement not found');
    }

    await checkItineraryAccess(ctx, settlement.itineraryId, args.userId);

    await ctx.db.patch(args.settlementId, {
      isSettled: true,
      settledAt: Date.now(),
    });

    return await ctx.db.get(args.settlementId);
  },
});

// Delete a settlement
export const deleteSettlement = mutation({
  args: {
    settlementId: v.id('settlements'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db.get(args.settlementId);
    if (!settlement) {
      throw new Error('Settlement not found');
    }

    await checkItineraryAccess(ctx, settlement.itineraryId, args.userId);

    await ctx.db.delete(args.settlementId);
  },
});

// List settlements for an itinerary
export const listSettlements = query({
  args: {
    itineraryId: v.id('itineraries'),
    showSettled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let settlements = await ctx.db
      .query('settlements')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    if (args.showSettled === false) {
      settlements = settlements.filter((s) => !s.isSettled);
    } else if (args.showSettled === true) {
      settlements = settlements.filter((s) => s.isSettled);
    }

    // Enrich with member info
    const enriched = await Promise.all(
      settlements.map(async (settlement) => {
        const [fromMember, toMember] = await Promise.all([
          ctx.db.get(settlement.fromMemberId),
          ctx.db.get(settlement.toMemberId),
        ]);

        return {
          ...settlement,
          fromMemberName: fromMember?.name ?? 'Unknown',
          fromMemberAvatarUrl: fromMember?.avatarUrl,
          toMemberName: toMember?.name ?? 'Unknown',
          toMemberAvatarUrl: toMember?.avatarUrl,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate split amounts based on split type
 */
function calculateSplitAmounts(
  totalAmount: number,
  splitType: string,
  participants: Array<{ memberId: Id<'tripMembers'>; splitValue: number }>
): Array<{ memberId: Id<'tripMembers'>; splitValue: number; amountOwed: number }> {
  const result: Array<{ memberId: Id<'tripMembers'>; splitValue: number; amountOwed: number }> = [];

  switch (splitType) {
    case 'equal': {
      // Split equally - each person owes total / count
      const perPerson = Math.floor(totalAmount / participants.length);
      const remainder = totalAmount - perPerson * participants.length;

      participants.forEach((p, index) => {
        // Distribute remainder to first few participants to handle rounding
        const extra = index < remainder ? 1 : 0;
        result.push({
          memberId: p.memberId,
          splitValue: 1,
          amountOwed: perPerson + extra,
        });
      });
      break;
    }

    case 'exact': {
      // Exact amounts - splitValue is the exact amount owed
      for (const p of participants) {
        result.push({
          memberId: p.memberId,
          splitValue: p.splitValue,
          amountOwed: p.splitValue,
        });
      }
      break;
    }

    case 'percentage': {
      // Percentage-based - splitValue is the percentage (0-100)
      const totalPercentage = participants.reduce((sum, p) => sum + p.splitValue, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Percentages must sum to 100');
      }

      let allocated = 0;
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        let amountOwed: number;

        if (i === participants.length - 1) {
          // Last person gets the remainder to avoid rounding issues
          amountOwed = totalAmount - allocated;
        } else {
          amountOwed = Math.round((p.splitValue / 100) * totalAmount);
        }

        result.push({
          memberId: p.memberId,
          splitValue: p.splitValue,
          amountOwed,
        });

        allocated += amountOwed;
      }
      break;
    }

    case 'shares': {
      // Share-based - splitValue is the number of shares
      const totalShares = participants.reduce((sum, p) => sum + p.splitValue, 0);
      if (totalShares === 0) {
        throw new Error('Total shares must be greater than 0');
      }

      let allocated = 0;
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        let amountOwed: number;

        if (i === participants.length - 1) {
          amountOwed = totalAmount - allocated;
        } else {
          amountOwed = Math.round((p.splitValue / totalShares) * totalAmount);
        }

        result.push({
          memberId: p.memberId,
          splitValue: p.splitValue,
          amountOwed,
        });

        allocated += amountOwed;
      }
      break;
    }

    default:
      throw new Error(`Unknown split type: ${splitType}`);
  }

  return result;
}

/**
 * Calculate minimum number of transfers to settle all debts
 * Uses a greedy algorithm: match largest creditor with largest debtor
 */
function calculateMinimumTransfers(
  balances: Map<string, number>,
  memberInfo: Map<string, { name: string; avatarUrl?: string }>
): Array<{
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}> {
  const suggestions: Array<{
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    amount: number;
  }> = [];

  // Create arrays of debtors (negative balance) and creditors (positive balance)
  const debtors: Array<{ id: string; amount: number }> = [];
  const creditors: Array<{ id: string; amount: number }> = [];

  balances.forEach((balance, id) => {
    if (balance < -1) {
      // Threshold to avoid tiny amounts due to rounding
      debtors.push({ id, amount: -balance });
    } else if (balance > 1) {
      creditors.push({ id, amount: balance });
    }
  });

  // Sort by amount descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // Greedy matching
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      suggestions.push({
        fromMemberId: debtor.id,
        fromMemberName: memberInfo.get(debtor.id)?.name ?? 'Unknown',
        toMemberId: creditor.id,
        toMemberName: memberInfo.get(creditor.id)?.name ?? 'Unknown',
        amount: Math.round(transferAmount),
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    // Remove settled parties
    if (debtor.amount <= 1) {
      debtors.shift();
    }
    if (creditor.amount <= 1) {
      creditors.shift();
    }
  }

  return suggestions;
}
