// packages/database/src/client.ts
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema/index.js';

/** Drizzle ORM database instance type with full schema inference. */
export type Database = ReturnType<typeof createDb>;

/**
 * 从 Cloudflare D1 binding 构造一个 Drizzle 实例。
 * 每个请求在中间件里调用一次（D1 无连接池，binding 是每请求的）。
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
