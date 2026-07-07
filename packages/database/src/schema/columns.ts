// packages/database/src/schema/columns.ts
import { sql } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';

/** SQLite INTEGER PRIMARY KEY AUTOINCREMENT（mode number）。 */
export function id() {
  return integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true });
}

/** 外键列（INTEGER）。调用方按需链 `.notNull()`。 */
export function fk(name: string) {
  return integer(name);
}

/**
 * created_at：integer timestamp（mode 'timestamp' → ORM 以秒读写）。
 * 默认值用 `unixepoch()`（秒）而非 drizzle 已弃用的 `.defaultNow()`，
 * 后者生成毫秒级默认值，与 mode 'timestamp' 的秒级映射冲突。
 */
export function createdAt() {
  return integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);
}

/**
 * updated_at：integer timestamp（mode 'timestamp' → ORM 以秒读写），默认 `unixepoch()`（秒）。
 * 自动刷新由 D1 AFTER UPDATE 触发器负责（见 drizzle/0001_updated_at_triggers.sql）。
 */
export function updatedAt() {
  return integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);
}
