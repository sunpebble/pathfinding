/**
 * Expense Splitting schema - trip members, shared expenses, participants, settlements.
 */
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

export const tripMembers = sqliteTable('trip_members', {
  id: id(),
  itineraryId: fk('itinerary_id').notNull(),
  userId: fk('user_id'),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  isRegistered: integer('is_registered', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
}, t => [
  index('trip_members_itin_idx').on(t.itineraryId),
  index('trip_members_itin_user_idx').on(t.itineraryId, t.userId),
  index('trip_members_user_idx').on(t.userId),
]);

export const sharedExpenses = sqliteTable('shared_expenses', {
  id: id(),
  itineraryId: fk('itinerary_id').notNull(),
  paidByMemberId: fk('paid_by_member_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('CNY'),
  category: text('category'),
  description: text('description'),
  date: text('date'),
  splitType: text('split_type').notNull().default('equal'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('shared_exp_itin_idx').on(t.itineraryId),
  index('shared_exp_itin_date_idx').on(t.itineraryId, t.date),
  index('shared_exp_paid_by_idx').on(t.paidByMemberId),
  index('shared_exp_category_idx').on(t.category),
]);

export const expenseParticipants = sqliteTable('expense_participants', {
  id: id(),
  expenseId: fk('expense_id').notNull(),
  memberId: fk('member_id').notNull(),
  shareAmount: real('share_amount').notNull(),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
}, t => [
  index('exp_participants_expense_idx').on(t.expenseId),
  index('exp_participants_member_idx').on(t.memberId),
  index('exp_participants_pair_idx').on(t.expenseId, t.memberId),
]);

export const settlements = sqliteTable('settlements', {
  id: id(),
  itineraryId: fk('itinerary_id').notNull(),
  fromMemberId: fk('from_member_id').notNull(),
  toMemberId: fk('to_member_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('CNY'),
  isSettled: integer('is_settled', { mode: 'boolean' }).notNull().default(false),
  settledAt: integer('settled_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
}, t => [
  index('settlements_itin_idx').on(t.itineraryId),
  index('settlements_from_idx').on(t.fromMemberId),
  index('settlements_to_idx').on(t.toMemberId),
  index('settlements_settled_idx').on(t.isSettled),
]);
