// packages/api/src/env.ts
import type { Database } from '@pathfinding/database';
import type { AuthVariables } from './middleware/auth.js';

/** Cloudflare Worker bindings（在 packages/api/wrangler.jsonc 声明）。 */
export interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  // 鉴权与密钥（请求路径必须通过 c.env 读取）
  JWT_SECRET: string;
  DEEPSEEK_API_KEY?: string;
  CORS_ORIGIN?: string;
  ADMIN_EMAILS?: string;
  GOOGLE_CLIENT_ID?: string;
  APPLE_CLIENT_ID?: string;
  OPENWEATHERMAP_API_KEY?: string;
  // 运行期配置（非密钥）
  APP_VERSION?: string;
  NODE_ENV?: string;
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
