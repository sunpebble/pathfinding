# 后端 Cloudflare Workers 迁移 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `@pathfinding/api` 迁到 Cloudflare Workers（D1 + R2），push 到 `main` 自动部署到 `api.trips.sunpebblelabs.com`。

**Architecture:** 沿用 Flue 的 `--target cloudflare` 生成 Worker 入口与 binding 合并；DB 驱动 `mysql2`→`drizzle-orm/d1`，schema 由 `mysql-core` 全量改写为 `sqlite-core`；`getDb()` 全局单例改为每请求经 Hono 上下文注入；`uploads` 的 `node:fs` 改 R2；`process.env` 改 `c.env`；CI 新增部署工作流。

**Tech Stack:** Hono, Flue (`@flue/cli` cloudflare target), Drizzle ORM (`drizzle-orm/d1` + `sqlite-core`), Cloudflare D1 + R2 + Workers, Wrangler, Vitest, GitHub Actions。

**Spec:** `docs/superpowers/specs/2026-07-08-backend-cloudflare-workers-migration-design.md`

## Global Constraints

- D1（SQLite），无数据迁移；schema-only。
- 上传走 R2；绑定名 `UPLOADS`，DB 绑定名 `DB`。
- 仅 push 到 `main` 自动部署（不要 PR preview）。
- 沿用 Flue cloudflare target；保留 agent/workflow 能力。
- 密码哈希保留 scrypt（靠 `nodejs_compat`，不换方案）。
- `updatedAt` 自动刷新靠 D1 `AFTER UPDATE` 触发器（非应用层）。
- 每个任务结束必须 `pnpm check` 绿（typecheck + lint + test，覆盖率 ≥ 60% 不回退）。
- 提交遵循 Conventional Commits（`feat:`/`refactor:`/`chore:`/`ci:`/`test:`/`build:`）。
- 数据库列名 snake_case；Drizzle 定义 camelCase（沿用现有约定）。

## File Structure（改动地图）

**`packages/database/`（Phase 1）**
- Modify: `src/schema/columns.ts` — 方言助手（id/fk/createdAt/updatedAt）改 sqlite-core
- Modify: `src/schema/*.ts`（17 文件）— `mysqlTable`→`sqliteTable` + 列类型映射（机械规程）
- Rewrite: `src/client.ts` — `mysql2` 单例 → D1 工厂 `createDb(d1)`
- Modify: `drizzle.config.ts` — `dialect:'mysql'`→`'sqlite'`
- Create: `src/triggers.sql`（或并入迁移目录）— `updated_at` 触发器补丁
- Modify: `package.json` — 去 `mysql2`，无需新增（drizzle 已在）

**`packages/api/`（Phase 2–5）**
- Create: `src/env.ts` — `Env`（Bindings）类型 + `db` 变量类型导出
- Create: `src/middleware/db.ts` — 每请求注入 db 到上下文
- Modify: `src/app.ts` — 装配 db 中间件；`process.env`→默认值兜底；`registerDeepSeekProvider` 移除
- Modify: `src/lib/deepseek.ts` — 改每次调用接收 `apiKey`
- Modify: `src/middleware/auth.ts`、`security-headers.ts`、`error-handler.ts`、`lib/logger.ts`、`routes/health.ts`、`routes/auxiliary.ts`、`services/auth.service.ts`、`services/oauth.service.ts` — `process.env`→`c.env`（或参数透传）
- Modify: 全部 `src/routes/*.ts`（~26 文件）— `getDb()`→`c.get('db')`；`$returningId()`→`.returning({ id })`（机械规程）
- Modify: `src/services/{auth,push,itinerary-access,backfill,backfill-executor}.service.ts` — 收 `db` 参数；`$returningId`→`.returning`
- Rewrite: `src/routes/uploads.ts` — `node:fs`→R2
- Modify: `package.json` — dev/build 脚本切 cloudflare target；去 `@hono/node-server`（仅 Worker 用）
- Modify: `src/server.ts` — 标注仅脚本用（或删）

**根/CI（Phase 6）**
- Create: `packages/api/wrangler.jsonc`
- Create: `.github/workflows/deploy-api.yml`

---

# Phase 1 — 迁移 `@pathfinding/database` 到 D1/SQLite

> 先迁 DB 包：后续 `api` 包的 `drizzle(c.env.DB,{schema})` 才能编译。

## Task 1.1: 重写 `columns.ts` 方言助手（sqlite-core）

**Files:**
- Modify: `packages/database/src/schema/columns.ts`

**Interfaces:**
- Produces: `id()`→`integer('id',{mode:'number'}).primaryKey({autoIncrement:true})`；`fk(name)`→`integer(name)`；`createdAt()`→`integer('created_at',{mode:'timestamp'}).notNull().defaultNow()`；`updatedAt()`→`integer('updated_at',{mode:'timestamp'}).notNull().defaultNow()`（`onUpdateNow` 移除，由触发器实现）。

- [ ] **Step 1: 重写 `columns.ts`**

```ts
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
```

- [ ] **Step 2: typecheck（database 包）**

Run: `pnpm --filter @pathfinding/database typecheck`
Expected: 仅因各 schema 文件仍 import `mysqlTable`/`mysql-core` 报错（这些在 Task 1.2 修）。`columns.ts` 本身无错。

- [ ] **Step 3: Commit**

```bash
git add packages/database/src/schema/columns.ts
git commit -m "refactor(database): rewrite columns helpers for sqlite-core"
```

## Task 1.2: schema 文件批量 mysql→sqlite（机械规程）

**Files:**
- Modify: `packages/database/src/schema/*.ts`（17 文件，不含已改的 `columns.ts`）

**机械变换规程（对每个文件逐条应用，确定性）：**

1. import 来源 `drizzle-orm/mysql-core` → `drizzle-orm/sqlite-core`。
2. `mysqlTable(` → `sqliteTable(`。
3. 列类型映射（逐列）：
   - `double('x')` → `real('x')`
   - `boolean('x')` → `integer('x', { mode: 'boolean' })`
   - `json('x')` → `text('x', { mode: 'json' })`（保留其后的 `.$type<...>()`）
   - `varchar('x', { length: N })` → `text('x')`
   - `int('x')` → `integer('x')`
   - `timestamp('x', { mode: 'date' })`（裸用，非助手）→ `integer('x', { mode: 'timestamp' })`
4. `id()`/`fk()`/`createdAt()`/`updatedAt()` 调用**不变**（Task 1.1 已改其实现）。
5. `index`/`uniqueIndex` 调用**不变**（sqlite-core 同名同签名）。

**工作样例（`itineraries.ts` 关键差异）：**

```ts
// BEFORE
import { boolean, double, index, int, json, mysqlTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
// ...
export const itineraries = mysqlTable('itineraries', {
  // ...
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
  // ...
  reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
});
export const itineraryBudgets = mysqlTable('itinerary_budgets', {
  totalBudget: double('total_budget'),
  categoryBudgets: json('category_budgets').$type<CategoryBudgets>(),
});
export const favoriteCollections = mysqlTable('favorite_collections', {
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: int('sort_order').notNull().default(0),
});
```
```ts
// AFTER
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
// ...
export const itineraries = sqliteTable('itineraries', {
  // ...
  visibility: text('visibility').notNull().default('private'),
  // ...
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
});
export const itineraryBudgets = sqliteTable('itinerary_budgets', {
  totalBudget: real('total_budget'),
  categoryBudgets: text('category_budgets', { mode: 'json' }).$type<CategoryBudgets>(),
});
export const favoriteCollections = sqliteTable('favorite_collections', {
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});
```

**验收命令（每文件改完或全部改完后）：**

- [ ] **Step 1: 对 17 个 schema 文件应用上述规程**

涉及文件清单：`auth.ts, chat.ts, cities.ts, crawl.ts, currency.ts, expense-splitting.ts, guides.ts, itineraries.ts, mafengwo.ts, notifications.ts, pois.ts, profiles.ts, sharing.ts, translations.ts, travel-notes.ts`（`columns.ts` 已改，`index.ts` 仅 re-export 无需改，确认即可）。

- [ ] **Step 2: 全仓 typecheck**

Run: `pnpm typecheck`
Expected: `@pathfinding/database` 全绿；`@pathfinding/api` 因 `getDb()`/`mysql2`/`process.env` 仍报错（Phase 2 修），**预期内，不阻断本任务提交**。若 database 包自身有报错须修到绿。

- [ ] **Step 3: Commit**

```bash
git add packages/database/src/schema
git commit -m "refactor(database): migrate all schemas from mysql-core to sqlite-core"
```

## Task 1.3: 重写 `client.ts` 为 D1 工厂

**Files:**
- Modify: `packages/database/src/client.ts`
- Modify: `packages/database/src/index.ts`（导出签名变化）

**Interfaces:**
- Produces: `createDb(d1: D1Database): Database`（每请求由中间件调用）；删除 `getDb`/`createPool`（mysql2 单例/池不再存在）。
- 消费方注意：`api` 包 Phase 2 会把所有 `getDb()` 改为 `c.get('db')`，故此处**不再导出 `getDb`**——保留会让旧调用静默走错。`index.ts` 同步去掉 `getDb`/`createPool` 导出。

- [ ] **Step 1: 重写 `client.ts`**

```ts
// packages/database/src/client.ts
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
```

- [ ] **Step 2: 更新 `index.ts` 导出**

```ts
// packages/database/src/index.ts
export { createDb, type Database } from './client.js';
export * from './schema/index.js';
```

- [ ] **Step 3: typecheck（database 包，预期 api 包仍红）**

Run: `pnpm --filter @pathfinding/database typecheck`
Expected: 绿。

- [ ] **Step 4: Commit**

```bash
git add packages/database/src/client.ts packages/database/src/index.ts
git commit -m "refactor(database): replace mysql2 singleton with D1 createDb factory"
```

## Task 1.4: drizzle.config 切 sqlite + 生成迁移 + updatedAt 触发器

**Files:**
- Modify: `packages/database/drizzle.config.ts`
- Create: `packages/database/drizzle/0001_updated_at_triggers.sql`（触发器补丁，命名并入 drizzle 迁移序）

**Interfaces:**
- Produces: `drizzle-kit generate`（dialect sqlite）产出建表 SQL；触发器 SQL 接在其后；最终由 `wrangler d1 migrations apply` 执行（Phase 6）。

- [ ] **Step 1: 改 `drizzle.config.ts`**

```ts
// packages/database/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

// generate 仅需 dialect + schema + out；远程执行走 wrangler d1 migrations apply（见 deploy 工作流）
export default defineConfig({
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
```

- [ ] **Step 2: 生成迁移**

Run: `pnpm --filter @pathfinding/database exec drizzle-kit generate`
Expected: 在 `packages/database/drizzle/` 产出 `0000_*.sql`（建表），含 `AUTOINCREMENT`、`text`、`integer`、`real`、索引。检查 SQL 无 `bigint`/`timestamp`/`varchar(n)` 残留。

- [ ] **Step 3: 写 `updated_at` 触发器补丁**

创建 `packages/database/drizzle/0001_updated_at_triggers.sql`，为每张含 `updated_at` 的表加触发器。表名清单由 Step 2 生成的 SQL 中 `updated_at` 列确定；典型写法（逐表重复）：

```sql
-- packages/database/drizzle/0001_updated_at_triggers.sql
-- SQLite 无 ON UPDATE NOW()，用触发器等价实现 MySQL 的 updated_at 自动刷新。
CREATE TRIGGER IF NOT EXISTS itineraries_updated_at
AFTER UPDATE ON itineraries
BEGIN
  UPDATE itineraries SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;
-- 对每张含 updated_at 的表重复上述一段（表名替换）：
--   itineraries, itinerary_days, itinerary_items, itinerary_collaborators, comment_reports,
--   favorite_collections, itinerary_budgets, expenses, ...（以 0000_*.sql 实际含 updated_at 的表为准）
```

> 触发器体用 `unixepoch()`（与 drizzle `integer({mode:'timestamp'})` 存秒一致）。`WHERE updated_at = OLD.updated_at` 防止显式改 updated_at 时被覆盖。

- [ ] **Step 4: 校验迁移 SQL（本地 D1）**

Run: `pnpm --filter @pathfinding/database exec wrangler d1 create pathfinding-local --experimental-local` 或在 Phase 6 创建正式库后回测。**本任务仅保证文件存在与 SQL 语法肉眼正确**；远端 apply 验收在 Phase 6/7。

- [ ] **Step 5: typecheck + commit**

Run: `pnpm --filter @pathfinding/database typecheck` → 绿。

```bash
git add packages/database/drizzle.config.ts packages/database/drizzle
git commit -m "build(database): switch drizzle-kit to sqlite, add D1 migrations and updated_at triggers"
```

---

# Phase 2 — `@pathfinding/api` 基础：Env / db 注入 / env 透传

## Task 2.1: `Env` 类型 + db 注入中间件

**Files:**
- Create: `packages/api/src/env.ts`
- Create: `packages/api/src/middleware/db.ts`
- Modify: `packages/api/src/app.ts`

**Interfaces:**
- Produces: `Env`（Bindings）、`Vars`（`{ db: Database }`）、`createDb` 复用自 `@pathfinding/database`。app 顶层泛型 `{ Bindings: Env; Variables: Vars }`。
- 消费：Task 1.3 的 `createDb(d1)`。

- [ ] **Step 1: 建 `env.ts`**

```ts
// packages/api/src/env.ts
import type { Database } from '@pathfinding/database';

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
```

- [ ] **Step 2: 建 db 中间件**

```ts
// packages/api/src/middleware/db.ts
import { createDb } from '@pathfinding/database';
import { createMiddleware } from 'hono/factory';
import type { Env, Vars } from '../env.js';

/** 每请求从 c.env.DB 构造 Drizzle 实例并注入上下文。 */
export const dbMiddleware = createMiddleware<{ Bindings: Env; Variables: Vars }>(
  async (c, next) => {
    c.set('db', createDb(c.env.DB));
    await next();
  },
);
```

- [ ] **Step 3: 在 `app.ts` 装配 + 调整 app 泛型**

在 `createApp()` 内、所有 `app.route(...)` 之前加：

```ts
// app.ts 内，全局中间件区
app.use('*', dbMiddleware);
```
并把根 app 泛型改为 `new Hono<{ Bindings: Env; Variables: Vars }>()`，`import type { Env, Vars } from './env.js';`。
> 子路由 `new Hono<{ Variables: AuthVariables }>()` 在后续 Task 2.4 统一加 `db: Database` 到 Variables（或改用共享 `AppVars` 类型）。

- [ ] **Step 4: typecheck**

Run: `pnpm --filter @pathfinding/api typecheck`
Expected: `dbMiddleware` 装配绿；路由内 `getDb()` 仍报错（Task 2.3 修）。

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/env.ts packages/api/src/middleware/db.ts packages/api/src/app.ts
git commit -m "feat(api): add Env bindings type and per-request db injection middleware"
```

## Task 2.2: deepseek 改每次调用传 key + 移除 registerDeepSeekProvider

**Files:**
- Modify: `packages/api/src/lib/deepseek.ts`
- Modify: `packages/api/src/app.ts`（移除 `registerDeepSeekProvider()` 调用与 import）
- Modify: 调用 `deepSeekCompletion` 的处：`src/routes/chat.ts`、`src/routes/agent.ts`、`src/agents/trips-planner.ts`（及任何引用）

**Interfaces:**
- Produces: `deepSeekCompletion(messages, opts: { apiKey: string; signal?: AbortSignal }): Promise<string>`、`class DeepSeekConfigError`。
- 消费方：调用点改为 `deepSeekCompletion(msgs, { apiKey: c.env.DEEPSEEK_API_KEY ?? '', signal: c.req.raw.signal })`。

- [ ] **Step 1: 改 `deepseek.ts` 签名（去掉模块级读 process.env）**

将原 `export async function deepSeekCompletion(messages, options?)` 改为强制 `apiKey`：

```ts
// packages/api/src/lib/deepseek.ts（关键差异）
export async function deepSeekCompletion(
  messages: { role: string; content: string }[],
  opts: { apiKey: string; signal?: AbortSignal },
): Promise<string> {
  if (!opts.apiKey) {
    throw new DeepSeekConfigError('DeepSeek API key not configured');
  }
  // 原 fetch 逻辑不变， Authorization 用 opts.apiKey，signal 用 opts.signal
  // ...
}
```
> 保留 `DeepSeekConfigError` 导出；删掉模块顶对 `process.env.DEEPSEEK_API_KEY` 的读取。

- [ ] **Step 2: 改调用点**

- `chat.ts`：`deepSeekCompletion([...], { apiKey: c.env.DEEPSEEK_API_KEY ?? '', signal: c.req.raw.signal })`
- `agent.ts` / `trips-planner.ts`：同理从各自 handler 的 `c.env` 取 key 传入（`trips-planner` 若不在 handler 内，需由调用方把 key 作为参数传入该 agent 函数）。

- [ ] **Step 3: 移除 `registerDeepSeekProvider`**

删 `app.ts` 内 `registerDeepSeekProvider();` 调用与 import；删 `deepseek.ts` 内该函数定义（若无其他引用）。

- [ ] **Step 4: typecheck → 绿（仅剩 getDb/process.env 其它点）**

Run: `pnpm --filter @pathfinding/api typecheck`

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/deepseek.ts packages/api/src/app.ts packages/api/src/routes/chat.ts packages/api/src/routes/agent.ts packages/api/src/agents/trips-planner.ts
git commit -m "refactor(api): pass DEEPSEEK key per-call, drop module-level provider registration"
```

## Task 2.3: `process.env` → `c.env`（请求路径配置）

**Files:**
- Modify: `src/middleware/auth.ts`、`src/middleware/security-headers.ts`、`src/middleware/error-handler.ts`、`src/lib/logger.ts`、`src/routes/health.ts`、`src/routes/auxiliary.ts`、`src/services/auth.service.ts`、`src/services/oauth.service.ts`

**规程：**
- 请求处理内读 `process.env.JWT_SECRET` 等 → 从 `c.env` 取（middleware/handler 有 `c`）。
- 被多处调用的纯函数（如 `auth.service` 的 `verifyToken`、`signToken`）改为**接收 secret 作参数**，由调用方从 `c.env.JWT_SECRET` 透传。
- `logger.ts` 若仅按 `process.env.LOG_LEVEL` 决定级别：改为函数工厂 `createLogger(category, level?)`，由 app 启动时从 `c.env` 传，或保留读 `process.env`（dev 本地 workerd 也注入 env，可保留少量只读场景）。**原则：运行期鉴权/密钥必须走 `c.env`；纯日志级别可放宽。**

**关键样例（`auth.ts`）：**

```ts
// auth.service.ts：把 verifyToken 改成收 secret
export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  // jose importKey/verifyJWT 用传入的 secret，不再读 process.env.JWT_SECRET
}
```
```ts
// middleware/auth.ts：调用处从 c.env 取
const payload = await verifyToken(token, c.env.JWT_SECRET);
```

- [ ] **Step 1: 逐文件改 `process.env`→`c.env`/参数透传**（按上面规程）
- [ ] **Step 2: typecheck（预期 getDb 仍报错，其余清零）**

Run: `pnpm --filter @pathfinding/api typecheck`

- [ ] **Step 3: Commit**

```bash
git add packages/api/src
git commit -m "refactor(api): route runtime config and secrets through c.env"
```

## Task 2.4: 路由 `getDb()`→`c.get('db')` + 子 app Variables 统一（机械规程）

**Files:**
- Modify: 全部 `src/routes/*.ts`（~26 文件）、`src/middleware/rate-limit.ts`

**机械规程：**
1. 每个 handler 开头的 `const db = getDb();`（或内联 `getDb()`）→ `const db = c.get('db');`。
2. 子 app 顶层 `new Hono<{ Variables: AuthVariables }>()` → `new Hono<{ Bindings: Env; Variables: AuthVariables & { db: Database } }>()`（或定义共享 `type AppContext = { Bindings: Env; Variables: AuthVariables & { db: Database } }` 于 `env.ts`，各路由改用它）。**推荐共享类型，减少重复。**

**共享类型（加入 `env.ts`）：**
```ts
import type { AuthVariables } from './middleware/auth.js';
export type AppContext = { Bindings: Env; Variables: AuthVariables & Vars };
```
> 注意循环 import：`Vars` 用 `Database`，`AppContext` 用 `AuthVariables`；`env.ts` 只 `import type`，无运行期循环。

**样例（`chat.ts` handler）：**
```ts
// BEFORE
const app = new Hono<{ Variables: AuthVariables }>();
app.get('/sessions', authRequired(), async (c) => {
  const db = getDb();
  // ...
});
```
```ts
// AFTER
import type { AppContext } from '../env.js';
const app = new Hono<AppContext>();
app.get('/sessions', authRequired(), async (c) => {
  const db = c.get('db');
  // ...
});
```

- [ ] **Step 1: 在 `env.ts` 加 `AppContext`**
- [ ] **Step 2: 对 ~26 路由文件应用规程（含 `rate-limit.ts`）**
- [ ] **Step 3: typecheck（api 包应接近全绿，剩 `$returningId` 与 service）**

Run: `pnpm --filter @pathfinding/api typecheck`

- [ ] **Step 4: Commit**

```bash
git add packages/api/src
git commit -m "refactor(api): replace getDb() with per-request c.get('db'); unify AppContext"
```

## Task 2.5: `$returningId()` → `.returning({ id })`

**Files:**
- Modify: 用到 `.$returningId()` 的路由/服务：`routes/{auth,itineraries,itinerary-collaborators,chat,guides}.ts`、`services/{auth.service,guide-writer}.ts`

**规程：**
```ts
// BEFORE
const [result] = await db.insert(chatSessions).values({...}).$returningId();
// 后续读 result!.id
```
```ts
// AFTER（D1 支持 RETURNING）
const [result] = await db.insert(chatSessions).values({...}).returning({ id: chatSessions.id });
// 读 result.id
```
> 多处把 `[result] = ...$returningId()` 后 `result!.id` 改为 `result.id`（非空断言可保留或按上下文去掉）。

- [ ] **Step 1: 全量替换 `.$returningId()` 为 `.returning({ id: <table>.id })`**
- [ ] **Step 2: typecheck（api 包应全绿）**

Run: `pnpm --filter @pathfinding/api typecheck`

- [ ] **Step 3: Commit**

```bash
git add packages/api/src
git commit -m "refactor(api): use D1 .returning({id}) instead of \$returningId()"
```

## Task 2.6: 5 个 service 改收 `db` 参数

**Files:**
- Modify: `services/{auth,push,itinerary-access,backfill,backfill-executor}.service.ts` 及其调用点

**规程：**
- 每个 service 函数签名加 `db: Database` 首参（去掉函数内 `getDb()`）。
- 调用点（路由）从 `c.get('db')` 透传。

**样例（`itinerary-access.service.ts`）：**
```ts
// BEFORE
export async function assertCanEdit(itineraryId: number, userId: number) {
  const db = getDb();
  // ...
}
```
```ts
// AFTER
import type { Database } from '@pathfinding/database';
export async function assertCanEdit(db: Database, itineraryId: number, userId: number) {
  // ...
}
```
路由侧：`await assertCanEdit(c.get('db'), id, userId)`。

- [ ] **Step 1: 改 5 个 service 签名 + 调用点**
- [ ] **Step 2: typecheck**

Run: `pnpm --filter @pathfinding/api typecheck` → 绿。

- [ ] **Step 3: Commit**

```bash
git add packages/api/src
git commit -m "refactor(api): thread db into services instead of global getDb()"
```

---

# Phase 3 — uploads → R2

## Task 3.1: 重写 `uploads.ts` 用 R2

**Files:**
- Rewrite: `packages/api/src/routes/uploads.ts`

**Interfaces:**
- 消费：`c.env.UPLOADS: R2Bucket`、`c.get('userId')`。
- 保留对外 URL 契约：`{ url: "/api/uploads/${filename}" }`。

- [ ] **Step 1: 重写 `uploads.ts`**

```ts
// packages/api/src/routes/uploads.ts
import type { AppContext } from '../env.js';
import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<AppContext>();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
  'image/gif': '.gif', 'image/webp': '.webp', 'application/pdf': '.pdf',
};
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
};

// 仅取 basename，防穿越（R2 key 扁平，但仍清洗）
function safeBase(name: string): string {
  return name.split('/').pop()!.replace(/[^\w.-]/g, '_');
}

app.post('/', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.parseBody();
  const file = body.file;
  if (!file || !(file instanceof File)) return c.json({ error: '请上传文件' }, 400);
  if (file.size > MAX_FILE_SIZE) return c.json({ error: '文件大小不能超过 10MB' }, 400);
  const mimeType = file.type;
  if (!ALLOWED_TYPES[mimeType]) {
    return c.json({ error: '不支持的文件类型，仅支持 jpg、png、gif、webp、pdf' }, 400);
  }
  const ext = ALLOWED_TYPES[mimeType];
  const filename = `${Date.now()}-${safeBase(file.name)}${ext}`;
  const key = `${userId}/${filename}`;
  await c.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: mimeType },
  });
  return c.json({ url: `/api/uploads/${filename}`, filename, size: file.size, type: mimeType });
});

app.get('/:filename', authRequired(), async (c) => {
  const userId = c.get('userId');
  const filename = safeBase(c.req.param('filename'));
  const key = `${userId}/${filename}`;
  const obj = await c.env.UPLOADS.get(key);
  if (!obj) return c.json({ error: '文件不存在' }, 404);
  const ext = `.${filename.split('.').pop()!.toLowerCase()}`;
  const contentType = EXTENSION_TO_CONTENT_TYPE[ext] ?? 'application/octet-stream';
  const headers = new Headers({ 'Content-Type': contentType });
  obj.writeHttpMetadata(headers);
  return new Response(obj.body, { headers });
});

app.delete('/:filename', authRequired(), async (c) => {
  const userId = c.get('userId');
  const filename = safeBase(c.req.param('filename'));
  const key = `${userId}/${filename}`;
  const obj = await c.env.UPLOADS.get(key);
  if (!obj) return c.json({ error: '文件不存在' }, 404);
  await c.env.UPLOADS.delete(key);
  return c.json({ success: true });
});

export default app;
```

- [ ] **Step 2: typecheck**

Run: `pnpm --filter @pathfinding/api typecheck` → 绿。

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routes/uploads.ts
git commit -m "refactor(api): rewrite uploads route to use R2 instead of node:fs"
```

---

# Phase 4 — 本地 dev 切 cloudflare target

## Task 4.1: api 包脚本切 cloudflare target + 退役 server.ts

**Files:**
- Modify: `packages/api/package.json`
- Modify: `packages/api/src/server.ts`（顶部加注释标注仅脚本用）或删除
- Modify: 根 `package.json` 的 `dev`/`dev:api` 脚本

**规程：**
- `packages/api/package.json`：
  - `dev` → `flue dev --target cloudflare`（Flue 本地 workerd，默认 3583；如需 3000 加 `--port` 视 Flue 支持而定，先用默认）。
  - 删 `flue:dev`/`flue:build`（node target）、`start`（`tsx dist/server.mjs`）、`@hono/node-server` 依赖；保留 `flue:build:cloudflare` 改名 `build`。
- 根 `package.json`：`dev:api` 仍 `pnpm --filter @pathfinding/api dev`（指向新 dev）；`dev`（并行 api+dashboard）保持；`dev:db` 去掉 TiDB docker（D1 本地自带），改为 noop 或备注。

- [ ] **Step 1: 改 `packages/api/package.json` scripts + deps**
- [ ] **Step 2: 根 `package.json` 调整 `dev`/`dev:api`/`dev:db`**
- [ ] **Step 3: `server.ts` 顶部加注释**：`/** @deprecated Node-only；dev 已切 flue --target cloudflare。仅留作一次性脚本入口。*/`
- [ ] **Step 4: typecheck**

Run: `pnpm typecheck` → 绿。

- [ ] **Step 5: Commit**

```bash
git add packages/api/package.json package.json packages/api/src/server.ts
git commit -m "build(api): switch dev to flue --target cloudflare, retire node-server"
```

---

# Phase 5 — 测试适配

## Task 5.1: 改测试 mock 装配（经上下文注入 db）

**Files:**
- Modify: `packages/api/src/test/helpers.ts`（`requestWithAuth` 等）
- Modify: 受影响测试：`vi.mock('@pathfinding/database')` 的所有 `*.test.ts`

**规程：**
- 现有 mock 提供 `getDb`/`createDb` 返回 `mockDb` 链。改为：mock `@pathfinding/database` 的 `createDb` 返回 mockDb 链；test app 工厂在构造时注入一个假 binding `DB`（miniflare D1 或直接把 `createDb` mock 后让 `dbMiddleware` 得到 mockDb）。
- **最简**：`vi.mock('@pathfinding/database', () => ({ createDb: () => mockDb, ...actual schema }))`；test app `createApp()` 时 `app.use('*', async (c,n)=>{ c.set('env'...)})`——但中间件调 `createDb(c.env.DB)`，故测试需提供 `c.env.DB`。**做法**：让 `createDb` mock 忽略入参直接返回 mockDb；测试构造 app 后直接用（中间件会 `createDb(undefined as any)` → mockDb）。即在测试里：

```ts
// helpers.ts
export async function requestWithAuth(app, path, init?) {
  // app 已在 createApp 内装了 dbMiddleware；createDb 被 mock 成 () => mockDb
  return app.request(path, init, { JWT_SECRET: 'test-jwt-secret' /* , DB, UPLOADS 按需 mock */ });
}
```
> `app.request(path, init, env)` 第三参即注入 `c.env`。测试统一传 `{ JWT_SECRET }`；涉及 R2 的 uploads 测试另传假 `UPLOADS`。

- [ ] **Step 1: 改 `helpers.ts`：`requestWithAuth(app,path,init,env?)` 透传 env**
- [ ] **Step 2: 全仓把 `vi.mock('@pathfinding/database')` 的 `getDb`/`createDb` 改为 `createDb: () => mockDb`（忽略入参）**
- [ ] **Step 3: 跑测试**

Run: `pnpm test`
Expected: 现有测试逐步转绿；按失败信息补 env/mock（如 `JWT_SECRET` 未透传、`UPLOADS` 缺失等）。

- [ ] **Step 4: 跑 `pnpm check`**

Run: `pnpm check`
Expected: 全绿，覆盖率 ≥ 60%。

- [ ] **Step 5: Commit**

```bash
git add packages/api/src
git commit -m "test(api): adapt mock harness to context-injected db and c.env"
```

## Task 5.2: 新增覆盖（db 中间件 / R2 / env）+ 本地 D1 集成测

**Files:**
- Create: `packages/api/src/middleware/db.test.ts`
- Create: `packages/api/src/routes/uploads.test.ts`
- Create: `packages/api/src/test/d1-integration.test.ts`（用 `@cloudflare/vitest-pool-workers`，覆盖 updatedAt 触发器 / RETURNING / json 列）
- Modify: `packages/api/package.json`（加 `@cloudflare/vitest-pool-workers` devDep + vitest 配置 `unstable_pool: 'worker'`）

- [ ] **Step 1: db 中间件测试**（断言 `c.get('db')` 为 createDb 产物）
- [ ] **Step 2: uploads 测试**（mock `R2Bucket`：`put/get/delete`）
- [ ] **Step 3: 本地 D1 集成测**（建表+触发器 SQL → insert/update 验 `updated_at` 变化；insert+returning 拿 id；json 列往返）
- [ ] **Step 4: `pnpm check` 绿**

- [ ] **Step 5: Commit**

```bash
git add packages/api
git commit -m "test(api): cover db middleware, R2 uploads, and D1 integration semantics"
```

---

# Phase 6 — wrangler.jsonc + CI 部署

## Task 6.1: 创建 `wrangler.jsonc`（源根）

**Files:**
- Create: `packages/api/wrangler.jsonc`

**Interfaces:**
- `database_id` 在执行 `wrangler d1 create pathfinding` 后回填；R2 bucket 同理。

- [ ] **Step 1: 建 `packages/api/wrangler.jsonc`**

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "pathfinding-api",
  "compatibility_date": "2026-06-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "pathfinding",
      "database_id": "REPLACE_AFTER_wrangler_d1_create",
      "migrations_dir": "../../packages/database/drizzle"
    }
  ],
  "r2_buckets": [{ "binding": "UPLOADS", "bucket_name": "pathfinding-uploads" }],
  "routes": [{ "pattern": "api.trips.sunpebblelabs.com", "custom_domain": true }],
  "vars": { "CORS_ORIGIN": "https://trips.sunpebblelabs.com" },
  "migrations": []
}
```
> `migrations`（Flue DO）在 Task 6.3 首次 `flue build` 后据 `dist/<worker>/wrangler.json` 提示补 `FlueRegistry` 等 `new_sqlite_classes`。

- [ ] **Step 2: Commit**

```bash
git add packages/api/wrangler.jsonc
git commit -m "chore(api): add source-root wrangler.jsonc (D1/R2/custom domain)"
```

## Task 6.2: 一次性资源创建 + secrets（手动，记录到 README/ops）

**Files:**
- Create: `docs/superpowers/ops/cloudflare-workers-setup.md`（操作 runbook）

- [ ] **Step 1: 创建 D1 + R2（手动，本地 wrangler 登录后）**

Run:
```bash
npx wrangler d1 create pathfinding            # 回填 database_id 到 wrangler.jsonc
npx wrangler r2 bucket create pathfinding-uploads
npx wrangler secret put JWT_SECRET            # 输入生产 secret
npx wrangler secret put DEEPSEEK_API_KEY      # 若启用
```
> 注：`wrangler secret put` 需在 `packages/api/` 下、指向生成的 `dist/<worker>/wrangler.json`；首次需先 build（Task 6.3）。或用 `--config`。

- [ ] **Step 2: 写 ops runbook**，含：上述命令、所需 GitHub Secrets（`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`）、**回滚步骤**（`npx wrangler deployments rollback --config packages/api/dist/<worker>/wrangler.json`，Custom Domain 不变）、监控/排错提示。

runbook 必含的回滚段落（最低要求）：
```md
## 回滚
npx wrangler deployments list --config packages/api/dist/<worker>/wrangler.json
npx wrangler deployments rollback --config packages/api/dist/<worker>/wrangler.json
# Custom Domain api.trips.sunpebblelabs.com 保持不变，回滚即时生效。
```

- [ ] **Step 3: Commit runbook**

```bash
git add docs/superpowers/ops/cloudflare-workers-setup.md packages/api/wrangler.jsonc
git commit -m "docs(ops): cloudflare workers one-time setup runbook (d1/r2/secrets)"
```

## Task 6.3: 首次构建 + dry-run + 回填 Flue DO migrations

**Files:**
- Modify: `packages/api/wrangler.jsonc`（补 `migrations`）

- [ ] **Step 1: 本地构建**

Run: `pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @pathfinding/api exec flue build --target cloudflare`
Expected: 产出 `packages/api/dist/<worker>/wrangler.json`。

- [ ] **Step 2: dry-run deploy**

Run: `npx wrangler deploy --dry-run --config packages/api/dist/<worker>/wrangler.json`
Expected: 通过，无 binding 缺失。

- [ ] **Step 3: 据 build 产物提示把 Flue DO `new_sqlite_classes` 补进源根 `wrangler.jsonc` 的 `migrations`**（`FlueRegistry` + agent/workflow 类；tag 从 `v1` 起）。
- [ ] **Step 4: Commit**

```bash
git add packages/api/wrangler.jsonc
git commit -m "chore(api): register flue durable-object migrations in wrangler.jsonc"
```

## Task 6.4: CI 部署工作流

**Files:**
- Create: `.github/workflows/deploy-api.yml`

- [ ] **Step 1: 写 deploy workflow**

```yaml
# .github/workflows/deploy-api.yml
name: Deploy API
on:
  push:
    branches: [main]
    paths:
      - 'packages/api/**'
      - 'packages/database/**'
      - '.github/workflows/deploy-api.yml'
  workflow_dispatch:

concurrency:
  group: deploy-api
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:packages
      - name: Build Worker
        working-directory: packages/api
        run: npx flue build --target cloudflare
      - name: Resolve worker dir
        id: w
        working-directory: packages/api
        run: echo "dir=$(ls -d dist/*/ | head -n1)" >> "$GITHUB_OUTPUT"
      - name: Apply D1 migrations
        working-directory: packages/api
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler d1 migrations apply pathfinding --remote --config ${{ steps.w.outputs.dir }}wrangler.json
      - name: Deploy Worker
        working-directory: packages/api
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler deploy --config ${{ steps.w.outputs.dir }}wrangler.json
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-api.yml
git commit -m "ci: deploy api worker to cloudflare on push to main"
```

---

# Phase 7 — 首次部署 + 冒烟验收

## Task 7.1: 首次部署并验证 DNS + health

- [ ] **Step 1: push 到 main 触发 deploy**（或 `workflow_dispatch`）
- [ ] **Step 2: 等 workflow 绿**
- [ ] **Step 3: 验证 DNS + health**

Run:
```bash
dig +short api.trips.sunpebblelabs.com A         # 应有记录（Workers custom domain）
curl -sS -m 15 -w "\nHTTP %{http_code}\n" https://api.trips.sunpebblelabs.com/health
```
Expected: A 记录存在；`/health` 200。

- [ ] **Step 4: 冒烟关键端点**（auth signup/signin → 带 token 打 `/api/itineraries`、`/api/chat/sessions`）
- [ ] **Step 5: 记录验收结果 + Commit（若有文档更新）**

---

## Self-Review（plan vs spec 覆盖核对）

- §3 资源访问三原则 → Task 2.1（db 注入）、2.3（c.env）、2.5（returning）✅
- §4 schema 方言 + updatedAt 触发器 + 本地 dev → Task 1.1/1.2/1.4、Task 4.1 ✅
- §5 R2 + nodejs_compat 保留 scrypt → Task 3.1（R2）；scrypt 不改代码（靠 nodejs_compat，wrangler flag 已在 6.1）✅
- §6 wrangler.jsonc + 自定义域名 + CI → Task 6.1/6.4 ✅
- §7 测试（mock 装配 + 本地 D1 集成测）→ Task 5.1/5.2 ✅
- §8 回滚（`wrangler deployments rollback`）→ ops runbook（6.2 应含）— **补：在 6.2 runbook 加回滚条目**
- §9 分阶段顺序 → Phase 1→7，已把 spec「地基/DB 方言」对调（DB 包先行以解编译依赖），其余一致 ✅
- §10 验收 → Task 7.1 ✅

**类型一致性核对：** `createDb(d1)`（1.3）→ `dbMiddleware` 用 `createDb(c.env.DB)`（2.1）→ 路由 `c.get('db'): Database`（2.4）→ service 收 `db: Database`（2.6），类型贯穿一致；`Env.DB: D1Database`、`Env.UPLOADS: R2Bucket` 与 wrangler.jsonc binding 名一致。
