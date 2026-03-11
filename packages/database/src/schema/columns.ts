/**
 * Common column helpers for Drizzle schema definitions.
 * Provides reusable patterns for primary keys, timestamps, and foreign keys.
 *
 * Design decisions:
 *   - Primary keys: AUTO_INCREMENT BIGINT (TiDB-optimized, best index performance)
 *   - Foreign keys: BIGINT unsigned (matches PK type)
 *   - Timestamps: MySQL TIMESTAMP with `mode: 'date'` for JS Date objects
 */
import { bigint, timestamp } from 'drizzle-orm/mysql-core';

/** Standard auto-increment BIGINT primary key column. */
export function id() {
  return bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement();
}

/**
 * Foreign key column referencing another table's PK.
 * @param name - the column name in snake_case (e.g. 'user_id')
 */
export function fk(name: string) {
  return bigint(name, { mode: 'number', unsigned: true });
}

/** Standard created_at timestamp column. */
export function createdAt() {
  return timestamp('created_at', { mode: 'date' }).notNull().defaultNow();
}

/** Standard updated_at timestamp column. */
export function updatedAt() {
  return timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow();
}
