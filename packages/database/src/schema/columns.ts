/**
 * Common column helpers for Drizzle schema definitions.
 *
 * Provides reusable column factories so every table in the monorepo follows
 * the same conventions for primary keys, foreign keys and timestamps.
 *
 * Design decisions:
 *   - Primary keys: AUTO_INCREMENT BIGINT UNSIGNED (TiDB-optimized)
 *   - Foreign keys: BIGINT UNSIGNED (matches PK type)
 *   - Timestamps: MySQL TIMESTAMP with `mode: 'date'` for JS Date objects
 *
 * @example
 * ```ts
 * import { id, fk, createdAt, updatedAt } from './columns';
 *
 * export const posts = mysqlTable('posts', {
 *   id: id(),
 *   authorId: fk('author_id').notNull(),
 *   createdAt: createdAt(),
 *   updatedAt: updatedAt(),
 * });
 * ```
 */
import { bigint, timestamp } from 'drizzle-orm/mysql-core';

/**
 * Standard auto-increment BIGINT UNSIGNED primary key column.
 *
 * Maps to `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY` in MySQL / TiDB.
 */
export function id() {
  return bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement();
}

/**
 * Foreign key column referencing another table's primary key.
 *
 * The column is **nullable** by default — chain `.notNull()` at the call
 * site when the relationship is required.
 *
 * @param name - The column name in snake_case (e.g. `'user_id'`).
 */
export function fk(name: string) {
  return bigint(name, { mode: 'number', unsigned: true });
}

/**
 * Standard `created_at` timestamp column.
 *
 * Defaults to `NOW()` on insert. The column is non-nullable.
 */
export function createdAt() {
  return timestamp('created_at', { mode: 'date' }).notNull().defaultNow();
}

/**
 * Standard `updated_at` timestamp column.
 *
 * Defaults to `NOW()` on insert and auto-updates via `ON UPDATE NOW()`.
 * The column is non-nullable.
 */
export function updatedAt() {
  return timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow();
}
