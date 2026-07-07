// packages/database/src/schema/columns.ts
import { integer } from 'drizzle-orm/sqlite-core';

/** SQLite INTEGER PRIMARY KEY AUTOINCREMENT（mode number）。 */
export function id() {
  return integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true });
}

/** 外键列（INTEGER）。调用方按需链 `.notNull()`。 */
export function fk(name: string) {
  return integer(name);
}

/** created_at：存为 integer timestamp（秒），默认现在。 */
export function createdAt() {
  return integer('created_at', { mode: 'timestamp' }).notNull().defaultNow();
}

/** updated_at：存为 integer timestamp（秒），默认现在。自动刷新由 D1 AFTER UPDATE 触发器负责（见 Task 1.4）。 */
export function updatedAt() {
  return integer('updated_at', { mode: 'timestamp' }).notNull().defaultNow();
}
