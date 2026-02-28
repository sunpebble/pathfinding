/**
 * Expense Splitting schema - trip members, shared expenses, participants, settlements.
 */
import { boolean, double, index, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const tripMembers = mysqlTable('trip_members', {
  id: id(),
  itineraryId: fk('itinerary_id').notNull(),
  userId: fk('user_id'),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  isRegistered: boolean('is_registered').notNull().default(false),
  createdAt: createdAt(),
}, t => [
  index('trip_members_itin_idx').on(t.itineraryId),
  index('trip_members_itin_user_idx').on(t.itineraryId, t.userId),
  index('trip_members_user_idx').on(t.userId),
]);

export const sharedExpenses = mysqlTable('shared_expenses', {
  id: id(),
  itineraryId: fk('itinerary_id').notNull(),
  paidByMemberId: fk('paid_by_member_id').notNull(),
  amount: double('amount').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('CNY'),
  category: varchar('category', { length: 50 }),
  description: text('description'),
  date: varchar('date', { length: 10 }),
  splitType: varchar('split_type', { length: 20 }).notNull().default('equal'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('shared_exp_itin_idx').on(t.itineraryId),
  index('shared_exp_itin_date_idx').on(t.itineraryId, t.date),
  index('shared_exp_paid_by_idx').on(t.paidByMemberId),
  index('shared_exp_category_idx').on(t.category),
]);

export const expenseParticipants = mysqlTable('expense_participants', {
  id: id(),
  expenseId: fk('expense_id').notNull(),
  memberId: fk('member_id').notNull(),
  shareAmount: double('share_amount').notNull(),
  isPaid: boolean('is_paid').notNull().default(false),
  createdAt: createdAt(),
}, t => [
  index('exp_participants_expense_idx').on(t.expenseId),
  index('exp_participants_member_idx').on(t.memberId),
  index('exp_participants_pair_idx').on(t.expenseId, t.memberId),
]);

export const settlements = mysqlTable('settlements', {
  id: id(),
  itineraryId: fk('itinerary_id').notNull(),
  fromMemberId: fk('from_member_id').notNull(),
  toMemberId: fk('to_member_id').notNull(),
  amount: double('amount').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('CNY'),
  isSettled: boolean('is_settled').notNull().default(false),
  settledAt: timestamp('settled_at', { mode: 'date' }),
  createdAt: createdAt(),
}, t => [
  index('settlements_itin_idx').on(t.itineraryId),
  index('settlements_from_idx').on(t.fromMemberId),
  index('settlements_to_idx').on(t.toMemberId),
  index('settlements_settled_idx').on(t.isSettled),
]);
