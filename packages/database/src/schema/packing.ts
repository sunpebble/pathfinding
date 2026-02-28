/**
 * Packing schema - packing lists, items, templates.
 */
import { boolean, index, int, json, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const packingLists = mysqlTable('packing_lists', {
  id: id(),
  userId: fk('user_id').notNull(),
  itineraryId: fk('itinerary_id'),
  name: varchar('name', { length: 255 }).notNull(),
  shareCode: varchar('share_code', { length: 50 }),
  isPublic: boolean('is_public').notNull().default(false),
  itemCount: int('item_count').notNull().default(0),
  packedCount: int('packed_count').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('packing_lists_user_idx').on(t.userId),
  index('packing_lists_itin_idx').on(t.itineraryId),
  index('packing_lists_code_idx').on(t.shareCode),
  index('packing_lists_user_created_idx').on(t.userId, t.createdAt),
  index('packing_lists_public_idx').on(t.isPublic),
]);

export const packingItems = mysqlTable('packing_items', {
  id: id(),
  listId: fk('list_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }),
  quantity: int('quantity').notNull().default(1),
  isPacked: boolean('is_packed').notNull().default(false),
  isEssential: boolean('is_essential').notNull().default(false),
  notes: text('notes'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('packing_items_list_idx').on(t.listId),
  index('packing_items_list_cat_idx').on(t.listId, t.category),
  index('packing_items_list_packed_idx').on(t.listId, t.isPacked),
  index('packing_items_list_essential_idx').on(t.listId, t.isEssential),
]);

export const packingTemplates = mysqlTable('packing_templates', {
  id: id(),
  name: varchar('name', { length: 255 }).notNull(),
  tripType: varchar('trip_type', { length: 30 }),
  climate: varchar('climate', { length: 30 }),
  isSystem: boolean('is_system').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(true),
  creatorId: fk('creator_id'),
  items: json('items'),
  usageCount: int('usage_count').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('packing_tpl_trip_idx').on(t.tripType),
  index('packing_tpl_climate_idx').on(t.climate),
  index('packing_tpl_system_idx').on(t.isSystem),
  index('packing_tpl_public_idx').on(t.isPublic),
  index('packing_tpl_creator_idx').on(t.creatorId),
  index('packing_tpl_usage_idx').on(t.usageCount),
]);
