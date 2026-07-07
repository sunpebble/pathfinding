import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import {
  expenseParticipants,
  settlements,
  sharedExpenses,
  tripMembers,
} from '@pathfinding/database';
import { and, eq, inArray } from 'drizzle-orm';
/**
 * Expense Splitting routes — trip members, shared expenses, settlements.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { parsePositiveInt } from '../lib/params.js';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<AppContext>();

// ═══════════════════════════════════════════════════════════
// Trip Members
// ═══════════════════════════════════════════════════════════

// ── GET /members — List trip members ───────────────────────
app.get('/members', authRequired(), async (c) => {
  const itineraryId = c.req.query('itineraryId');

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = c.get('db');
  const iid = Number(itineraryId);

  const members = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.itineraryId, iid));

  return c.json(convertKeysToSnakeCase(members));
});

// ── POST /members — Add a trip member ──────────────────────
const createMemberSchema = z.object({
  itineraryId: z.number(),
  name: z.string().min(1),
  userId: z.number().optional(),
  isRegistered: z.boolean().optional(),
});

app.post('/members', authRequired(), zValidator('json', createMemberSchema), async (c) => {
  const { itineraryId, name, userId, isRegistered } = c.req.valid('json');

  const db = c.get('db');

  const [result] = await db.insert(tripMembers).values({
    itineraryId: Number(itineraryId),
    name,
    userId: userId ? Number(userId) : null,
    isRegistered: isRegistered ?? false,
  }).returning({ id: tripMembers.id });

  return c.json({ id: result!.id }, 201);
});

// ── DELETE /members/:id — Remove a trip member ─────────────
app.delete('/members/:id', authRequired(), async (c) => {
  const id = parsePositiveInt(c.req.param('id'));

  if (!id) {
    throw new ApiError(400, '无效的成员ID');
  }

  const db = c.get('db');

  const existing = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new ApiError(404, '成员不存在');
  }

  await db.delete(tripMembers).where(eq(tripMembers.id, id));

  return c.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// Shared Expenses
// ═══════════════════════════════════════════════════════════

// ── GET /expenses — List shared expenses with participants ─
app.get('/expenses', authRequired(), async (c) => {
  const itineraryId = c.req.query('itineraryId');

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = c.get('db');
  const iid = Number(itineraryId);

  const expenses = await db
    .select()
    .from(sharedExpenses)
    .where(eq(sharedExpenses.itineraryId, iid));

  // Fetch participants for each expense
  const expensesWithParticipants = await Promise.all(
    expenses.map(async (expense) => {
      const participants = await db
        .select()
        .from(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, expense.id));

      return {
        ...expense,
        participants,
      };
    }),
  );

  return c.json(convertKeysToSnakeCase(expensesWithParticipants));
});

// ── POST /expenses — Create shared expense ─────────────────
const createExpenseSchema = z.object({
  itineraryId: z.number(),
  paidByMemberId: z.number(),
  amount: z.number(),
  currency: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  splitType: z.string().optional(),
  participantMemberIds: z.array(z.number()).min(1),
});

app.post('/expenses', authRequired(), zValidator('json', createExpenseSchema), async (c) => {
  const {
    itineraryId,
    paidByMemberId,
    amount,
    currency,
    category,
    description,
    date,
    splitType,
    participantMemberIds,
  } = c.req.valid('json');

  const db = c.get('db');
  const resolvedSplitType = splitType ?? 'equal';

  // Create the shared expense
  const [result] = await db.insert(sharedExpenses).values({
    itineraryId: Number(itineraryId),
    paidByMemberId: Number(paidByMemberId),
    amount,
    currency: currency ?? 'CNY',
    category: category ?? null,
    description: description ?? null,
    date: date ?? null,
    splitType: resolvedSplitType,
  }).returning({ id: sharedExpenses.id });

  const expenseId = result!.id;

  // Create expense participants
  const shareAmount = resolvedSplitType === 'equal'
    ? amount / participantMemberIds.length
    : 0;

  await Promise.all(
    participantMemberIds.map(memberId =>
      db.insert(expenseParticipants).values({
        expenseId,
        memberId: Number(memberId),
        shareAmount,
        isPaid: false,
      }),
    ),
  );

  return c.json({ id: expenseId }, 201);
});

// ── DELETE /expenses/:id — Delete shared expense ───────────
app.delete('/expenses/:id', authRequired(), async (c) => {
  const id = parsePositiveInt(c.req.param('id'));

  if (!id) {
    throw new ApiError(400, '无效的费用ID');
  }

  const db = c.get('db');

  const existing = await db
    .select()
    .from(sharedExpenses)
    .where(eq(sharedExpenses.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new ApiError(404, '费用记录不存在');
  }

  // Delete participants first, then the expense
  await db.delete(expenseParticipants).where(eq(expenseParticipants.expenseId, id));
  await db.delete(sharedExpenses).where(eq(sharedExpenses.id, id));

  return c.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// Settlements
// ═══════════════════════════════════════════════════════════

// ── GET /settlements — List settlements ────────────────────
app.get('/settlements', authRequired(), async (c) => {
  const itineraryId = c.req.query('itineraryId');

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = c.get('db');
  const iid = Number(itineraryId);

  const items = await db
    .select()
    .from(settlements)
    .where(eq(settlements.itineraryId, iid));

  return c.json(convertKeysToSnakeCase(items));
});

// ── POST /settlements — Create settlement ──────────────────
const createSettlementSchema = z.object({
  itineraryId: z.number(),
  fromMemberId: z.number(),
  toMemberId: z.number(),
  amount: z.number(),
  currency: z.string().optional(),
});

app.post('/settlements', authRequired(), zValidator('json', createSettlementSchema), async (c) => {
  const { itineraryId, fromMemberId, toMemberId, amount, currency } = c.req.valid('json');

  const db = c.get('db');

  const [result] = await db.insert(settlements).values({
    itineraryId: Number(itineraryId),
    fromMemberId: Number(fromMemberId),
    toMemberId: Number(toMemberId),
    amount,
    currency: currency ?? 'CNY',
  }).returning({ id: settlements.id });

  return c.json({ id: result!.id }, 201);
});

// ── PATCH /settlements/:id/settle — Mark as settled ────────
app.patch('/settlements/:id/settle', authRequired(), async (c) => {
  const id = parsePositiveInt(c.req.param('id'));

  if (!id) {
    throw new ApiError(400, '无效的结算ID');
  }

  const db = c.get('db');

  const existing = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new ApiError(404, '结算记录不存在');
  }

  await db
    .update(settlements)
    .set({
      isSettled: true,
      settledAt: new Date(),
    })
    .where(eq(settlements.id, id));

  return c.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// Balance
// ═══════════════════════════════════════════════════════════

// ── GET /balance — Calculate balance for each member ───────
app.get('/balance', authRequired(), async (c) => {
  const itineraryId = c.req.query('itineraryId');

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = c.get('db');
  const iid = Number(itineraryId);

  // Fetch all members
  const members = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.itineraryId, iid));

  // Fetch all expenses for this itinerary
  const expenses = await db
    .select()
    .from(sharedExpenses)
    .where(eq(sharedExpenses.itineraryId, iid));

  // Build balance map: memberId -> net balance
  // Positive = owed money, Negative = owes money
  const balanceMap: Record<number, number> = {};
  for (const member of members) {
    balanceMap[member.id] = 0;
  }

  // Batch-fetch all participants for the expenses in one query
  const expenseIds = expenses.map(e => e.id);
  const allParticipants = expenseIds.length > 0
    ? await db
        .select()
        .from(expenseParticipants)
        .where(inArray(expenseParticipants.expenseId, expenseIds))
    : [];

  const participantsByExpense = new Map<number, typeof allParticipants>();
  for (const p of allParticipants) {
    const list = participantsByExpense.get(p.expenseId) ?? [];
    list.push(p);
    participantsByExpense.set(p.expenseId, list);
  }

  for (const expense of expenses) {
    // Payer paid the full amount, so they are owed that amount
    if (balanceMap[expense.paidByMemberId] !== undefined) {
      balanceMap[expense.paidByMemberId]! += expense.amount;
    }

    // Each participant owes their share
    const participants = participantsByExpense.get(expense.id) ?? [];
    for (const participant of participants) {
      if (balanceMap[participant.memberId] !== undefined) {
        balanceMap[participant.memberId]! -= participant.shareAmount;
      }
    }
  }

  // Factor in existing settlements
  const allSettlements = await db
    .select()
    .from(settlements)
    .where(
      and(
        eq(settlements.itineraryId, iid),
        eq(settlements.isSettled, true),
      ),
    );

  for (const settlement of allSettlements) {
    if (balanceMap[settlement.fromMemberId] !== undefined) {
      balanceMap[settlement.fromMemberId]! += settlement.amount;
    }
    if (balanceMap[settlement.toMemberId] !== undefined) {
      balanceMap[settlement.toMemberId]! -= settlement.amount;
    }
  }

  // Format result
  const balances = members.map(member => ({
    memberId: member.id,
    memberName: member.name,
    balance: Math.round((balanceMap[member.id] ?? 0) * 100) / 100,
  }));

  return c.json(convertKeysToSnakeCase(balances));
});

export default app;
