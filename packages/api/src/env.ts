// packages/api/src/env.ts
import type { Database } from '@pathfinding/database';
import type { AuthVariables } from './middleware/auth.js';

/** Cloudflare Worker bindings（在 packages/api/wrangler.jsonc 声明）。 */
export interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  JWT_SECRET: string;
  DEEPSEEK_API_KEY?: string;
  CORS_ORIGIN?: string;
  ADMIN_EMAILS?: string;
}

/** 每请求由 db 中间件注入。 */
export interface Vars {
  db: Database;
}

/** 根 app 与路由共享的上下文类型（auth + db 变量）。 */
export interface AppContext {
  Bindings: Env;
  Variables: AuthVariables & Vars;
}
