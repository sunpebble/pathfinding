// packages/api/src/middleware/db.ts
import type { Env, Vars } from '../env.js';
import { createDb } from '@pathfinding/database';
import { createMiddleware } from 'hono/factory';

/** 每请求从 c.env.DB 构造 Drizzle 实例并注入上下文。 */
export const dbMiddleware = createMiddleware<{ Bindings: Env; Variables: Vars }>(
  async (c, next) => {
    c.set('db', createDb(c.env.DB));
    await next();
  },
);
