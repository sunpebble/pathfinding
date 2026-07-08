# Phase 2 后端夯实（Backend Usable）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把后端做成自洽可用 + Dashboard 端到端跑通，达成 R4「本地一键起库自动建表、web 核心流程冒烟通过、端点 contract 测试绿」。

**Architecture:** 后端在 Cloudflare Workers（Hono + D1 + R2，每请求 `c.get('db')` / `c.env`）。本阶段：① 补齐/收口后端自身（auth refresh、AI 面鉴权、agent 状态持久化、currency 写入方）；② 让 Dashboard 的标准 REST 调用经 catch-all rewrite 全部命中后端，集中鉴权守卫，登录页收敛；③ 建立 R4 验证闸（dev 自动建表 + 冒烟脚本 + 端点 contract 测试）。**不追 iOS 旧契约**（信封 `{success,data}`、嵌套 `/api/itineraries/:id/budget`、`/v1/*`）——那些随 Phase 3 iOS 数据层重写对齐。

**Tech Stack:** Hono、Drizzle（sqlite-core / D1）、jose、Zod、Next.js 16、React 19、Vitest。

**Spec:** `docs/superpowers/specs/2026-07-07-product-refocus-design.md`（R1–R9；本计划实现 R9 定义的 Phase 2 靶向 + §6 后端方案中非 iOS-契约部分）。

## Global Constraints

- 分支：`feat/phase2-backend-usable`（基于 main 合并点 `ea5d6fc`，在 worktree
  `/Users/shikun/Developer/freelance/sunpebble/pathfinding-phase2` 执行）。
- 每个任务结束必须 `pnpm check` 全绿（typecheck + lint + 全部测试），然后提交。首次
  在 worktree 里需先 `pnpm install && pnpm build:packages`。
- 提交格式：Conventional Commits（`feat:` / `fix:` / `refactor:` / `test:` / `chore:`）。
- **安全红线（CLAUDE.md，违反即 Critical）**：JWT 一律用 `jose` 经 `services/auth.service.ts`
  的 `verifyToken()`，禁止手工 base64 解 JWT；所有权比较用严格 `===`，禁止 `.includes()`；
  所有进入路由的用户输入过 Zod schema；用户 HTML 内容过 `isomorphic-dompurify`。
- **性能红线**：不在循环里 `db.query`/`db.select`；用 `.where()` + 索引列过滤，禁止取全表
  再 JS `.filter()`。
- **鉴权基建（现有，直接复用，勿重造）**：`middleware/auth.ts` 的 `authRequired()`
  从 `Authorization: Bearer` 提 token → `verifyToken` → `c.set('userId', payload.sub)`；
  `adminRequired()` 加 `role==='admin'` 或 email ∈ `c.env.ADMIN_EMAILS`。路由内 userId
  一律 `c.get('userId')`，**禁止**从 query/body 取 userId。
- **行号是 recon 快照提示**，执行时按符号/字符串定位。
- 本地 D1 迁移目录：`packages/database/drizzle/`（baseline `0000_abandoned_meltdown.sql`
  - 手维护触发器 `0001_updated_at_triggers.sql`，后者不在 `meta/_journal.json`，靠
    `wrangler d1 migrations apply` 目录扫描应用）。新增迁移追加为 `0002_*.sql` 并进 journal。
- iOS 契约明确**不在本阶段处理**：不加 `{success,data}` 信封、不加 `/api/itineraries/:id/budget*`
  嵌套端点、不加 `/v1/*`、不改 chat 为 `/sessions/:id/messages` 嵌套。

---

### Task 0: 建 worktree 与分支

- [ ] **Step 1: 建 worktree**

```bash
cd /Users/shikun/Developer/freelance/sunpebble/pathfinding
git worktree add ../pathfinding-phase2 -b feat/phase2-backend-usable main
cd ../pathfinding-phase2 && pnpm install && pnpm build:packages
pnpm check   # 确认基点全绿
```

预期：`pnpm check` exit 0（基点 = main @ ea5d6fc，Phase 1 已并入）。

---

### Task 1: `POST /api/auth/refresh` —— 用 authSessions 做 session 重签

**Files:**

- Modify: `packages/api/src/services/auth.service.ts`、`packages/api/src/routes/auth.ts`、`packages/api/src/routes/auth.test.ts`

**Interfaces:**

- Consumes: 现有 `createSession(db, userId)`、`isSessionValid(db, sessionId)`、`generateToken(userId, email, secret, sessionId?)`、`verifyToken(token, secret)`。
- Produces: `refreshSession(db, refreshToken)` 服务函数；`POST /api/auth/refresh` 路由。signin/social 响应新增 `refreshToken` 字段。

**背景（recon）**：当前 auth 是单个 30 天 JWT + `authSessions`（列 id/userId/expirationTime）做吊销，无 refreshToken 概念。iOS `AuthManager` 期望 `POST /api/auth/refresh` body `{refreshToken}` → 响应 `{token, refreshToken?, userId?, email?}`（与登录同形），且 iOS 已把 `AuthResponse.refreshToken` 存进 Keychain 并在 accessToken 失效时调 refresh——**后端一旦返回 refreshToken 并支持 /refresh，iOS 会话续期无需改 iOS 即生效**。最省实现：refreshToken 即 `authSessions.id`（不透明 sessionId），/refresh 校验该 session 有效后按其 userId 重新 `generateToken`。

- [ ] **Step 1: 先写失败测试**（`auth.test.ts` 追加 describe）

```ts
describe('POST /api/auth/refresh', () => {
  it('re-mints an access token for a valid session', async () => {
    // Arrange: signup 拿到 refreshToken
    const signup = await app.request('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'r@e.com', password: 'pw12345678', flow: 'signUp', name: 'R' }),
    }, testEnv);
    const { refreshToken } = await signup.json();
    expect(refreshToken).toBeTruthy();
    // Act
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }, testEnv);
    // Assert
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.refreshToken).toBe(refreshToken);
    expect(body.userId).toBeTruthy();
  });

  it('rejects an unknown/expired refresh token with 401', async () => {
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'nonexistent-session-id' }),
    }, testEnv);
    expect(res.status).toBe(401);
  });
});
```

（`testEnv` / `app` 的构造沿用 `auth.test.ts` 现有 helper——先读该文件顶部的测试装配，复用它，不要新造。）

- [ ] **Step 2: 运行确认失败**

```bash
pnpm --filter @pathfinding/api test auth
```

预期：FAIL（`/api/auth/refresh` 404 / refreshToken undefined）。

- [ ] **Step 3: 服务层 `refreshSession`**（`auth.service.ts`）

在 `isSessionValid` 附近加（复用现有 db 查询风格；读现有 `getUserById`/查 users 表的写法后照抄结构）：

```ts
/**
 * 校验 refreshToken（= authSessions.id），有效则按其 userId 重签一个新的 access JWT。
 * 返回 null 表示 session 不存在或已过期。
 */
export async function refreshSession(
  db: Database,
  refreshToken: string,
  secret: string,
): Promise<{ token: string; userId: string; email: string } | null> {
  const valid = await isSessionValid(db, refreshToken);
  if (!valid) return null;
  const [session] = await db
    .select({ userId: authSessions.userId })
    .from(authSessions)
    .where(eq(authSessions.id, refreshToken))
    .limit(1);
  if (!session) return null;
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user) return null;
  const token = await generateToken(user.id, user.email, secret, refreshToken);
  return { token, userId: user.id, email: user.email };
}
```

（import `authSessions`/`users`/`eq` 若未在文件顶部则补上；变量名以文件现有 schema import 为准。）

- [ ] **Step 4: 路由 `POST /refresh`**（`auth.ts`，放在 `/signin` 之后）

```ts
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

app.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  const db = c.get('db');
  const result = await refreshSession(db, refreshToken, c.env.JWT_SECRET);
  if (!result) return c.json({ error: 'invalid_refresh_token' }, 401);
  return c.json({
    token: result.token,
    refreshToken,
    userId: result.userId,
    email: result.email,
  });
});
```

- [ ] **Step 5: signin/social 响应回带 refreshToken**

读 `auth.ts` 的 `/signin` 与 `/social` 成功分支：当前调 `createSession(db, userId)` 拿 sessionId 并 `generateToken(..., sessionId)`。把该 sessionId 作为 `refreshToken` 一并放进 JSON 响应（若响应对象里还没有该字段就加）。确认与 iOS `AuthResponse{token, refreshToken?, userId?, email?}` 字段名一致（顶层、非信封）。

- [ ] **Step 6: 跑测试 + check**

```bash
pnpm --filter @pathfinding/api test auth   # 期望 PASS
pnpm check
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): add POST /auth/refresh (session re-mint) and return refreshToken on signin"
```

---

### Task 2: AI 面鉴权收口（agent + chat 去匿名洞、去双挂载）

**Files:**

- Modify: `packages/api/src/app.ts`、`packages/api/src/routes/agent.ts`、`packages/api/src/routes/chat.ts`、`packages/api/src/routes/agent.test.ts`、`packages/api/src/routes/chat.test.ts`、`apps/dashboard/src/app/api/chat/route.ts`、`apps/dashboard/src/app/(dashboard)/chat/page.tsx`

**背景（recon）**：`app.ts` 把 `agentRoutes` 双挂载（`/api/agent` L92 + `/api` L93），且挂载处无 `authRequired`；`agent.ts` 全程不鉴权、不使用 userId → 匿名可消耗 DeepSeek 配额。`chat.ts` 除 `POST /query`（L159 公开）外都自带 `authRequired()`。dashboard 的 `src/app/api/chat/route.ts` 转发到 `/api/agent/chat/stream` 时**不带 Authorization**。

- [ ] **Step 1: 失败测试——匿名访问 AI 面返回 401**（`agent.test.ts` + `chat.test.ts`）

```ts
// agent.test.ts
it('rejects unauthenticated POST /api/agent/chat/stream with 401', async () => {
  const res = await app.request('/api/agent/chat/stream', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [] }),
  }, testEnv);
  expect(res.status).toBe(401);
});
// chat.test.ts
it('rejects unauthenticated POST /api/chat/query with 401', async () => {
  const res = await app.request('/api/chat/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hi' }),
  }, testEnv);
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm --filter @pathfinding/api test agent chat
```

预期：FAIL（当前匿名可达，返回非 401）。

- [ ] **Step 3: 去双挂载 + 挂 authRequired**（`app.ts`）

删除 `app.route('/api', agentRoutes)`（约 L93，重复挂载）。保留 `app.route('/api/agent', agentRoutes)`。在 `agent.ts` 内部为每个路由加 `authRequired()`（与 chat.ts 现有写法一致：`app.post('/chat/stream', authRequired(), async (c) => ...)`），或在 agent.ts 顶部 `app.use('*', authRequired())` 统一加（读 agent.ts 结构选更贴合的一种；若 agent.ts 内已有不该鉴权的 webhook 类端点则用逐路由方式——recon 显示全部是 chat/plan/ai，均应鉴权）。

- [ ] **Step 4: chat `/query` 加鉴权 + userId 从 token**（`chat.ts`）

`POST /query`（约 L159）加 `authRequired()`；若其内部逻辑需要 userId，用 `c.get('userId')`。

- [ ] **Step 5: dashboard chat 转发 Authorization**

`apps/dashboard/src/app/api/chat/route.ts`：从入站请求读 `Authorization` header，转发给后端 `/api/agent/chat/stream`：

```ts
const authHeader = req.headers.get('authorization');
// ...
const upstream = await fetch(`${BACKEND_API_URL}/api/agent/chat/stream`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
  },
  body: JSON.stringify({ messages, sessionId }),
});
```

`apps/dashboard/src/app/(dashboard)/chat/page.tsx`：确认客户端向自身 `/api/chat` 发起请求时带上 `Authorization: Bearer <token>`（token 取自 `src/lib/api/client.ts` 的 `getAuthToken()`）。若当前 useChat/fetch 未带，则补上 header（读该页 useChat/transport 配置后加）。

- [ ] **Step 6: 测试 + check + Commit**

```bash
pnpm --filter @pathfinding/api test agent chat   # 期望 PASS
pnpm check
git add -A && git commit -m "fix(api): require auth on agent + chat/query, drop agent double-mount; forward Authorization from dashboard chat"
```

---

### Task 3: agent plan 状态 D1 持久化（去模块级 Map）

**Files:**

- Create: `packages/database/src/schema/ai-plans.ts`、`packages/database/drizzle/0002_ai_plan_drafts.sql`
- Modify: `packages/database/src/schema/index.ts`、`packages/database/drizzle/meta/_journal.json`、`packages/database/drizzle/meta/0002_snapshot.json`（drizzle-kit 生成）、`packages/api/src/routes/agent.ts`、`packages/api/src/routes/agent.test.ts`

**背景（recon）**：`agent.ts` 用模块级 `const plans = new Map<string, AIPlanDraft>()`（约 L45）存 plan 草稿，跨 `start → status → feedback → result` 多请求。Cloudflare Workers 每请求可能落在不同 isolate → Map 不保证存活 → iOS AI 规划多步流程在生产上会「找不到 plan」。改为 D1 表持久化，按 `sessionId` + `userId` 归属。

**Interfaces:**

- Produces: `ai_plan_drafts` 表（`session_id` PK-ish、`user_id`、`draft`(json)、`updated_at`）；agent plan 端点改读写该表。

- [ ] **Step 1: schema 定义**（`ai-plans.ts`，照 `chat.ts` schema 风格）

```ts
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { id, fk, timestamps } from './columns';

export const aiPlanDrafts = sqliteTable(
  'ai_plan_drafts',
  {
    id: id(),
    sessionId: text('session_id').notNull(),
    userId: fk('user_id').notNull(),
    draft: text('draft', { mode: 'json' }).$type<unknown>().notNull(),
    ...timestamps(),
  },
  (t) => [
    index('ai_plan_drafts_session_idx').on(t.sessionId),
    index('ai_plan_drafts_user_idx').on(t.userId),
  ],
);
```

（`id`/`fk`/`timestamps` 的确切导出名以 `columns.ts` 为准——先读它；`$type<>` 用 agent.ts 里 `AIPlanDraft` 的实际类型。）
`index.ts` 追加 `export * from './ai-plans';`。

- [ ] **Step 2: 生成迁移**

```bash
cd packages/database && pnpm db:generate
```

预期：drizzle-kit 生成 `0002_*.sql`（只含 `CREATE TABLE ai_plan_drafts` + 索引）与 `meta/0002_snapshot.json`，并把 `0002` 追加进 `meta/_journal.json`。若生成的文件名不是 `0002_ai_plan_drafts.sql`，接受 drizzle-kit 的命名。核验：`grep -c "CREATE TABLE" packages/database/drizzle/0002_*.sql` 应为 1。

- [ ] **Step 3: 失败测试**（`agent.test.ts`，用 D1 集成测试项目，需真实 DB）

在 `vitest.d1.config.ts` 覆盖的集成测试里加：`POST /plan/start`（带 auth）→ 用不同的模拟请求上下文 `GET /plan/:sessionId/status` 仍能取回 plan（证明不依赖同一 isolate 内存）。若 agent.test.ts 是 mock-db 单测项目，则在 D1 集成测试文件 `packages/api/src/test/d1-integration.test.ts` 追加此断言。

- [ ] **Step 4: agent.ts 改用 D1**

删除模块级 `plans` Map。plan 的 start/status/feedback/result 改为读写 `aiPlanDrafts`：start → `db.insert`；status/result → `db.select().where(eq(sessionId) & eq(userId))`（所有权 `===` 校验，userId 取 `c.get('userId')`）；feedback → `db.update`。用 `c.get('db')` 注入的句柄。

- [ ] **Step 5: 应用迁移到本地 D1 并跑测试**

```bash
cd packages/api && npx wrangler d1 migrations apply pathfinding --local
cd ../.. && pnpm --filter @pathfinding/api test
pnpm check
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor(api): persist agent plan drafts in D1 (drop module-level Map, unreliable on Workers)"
```

---

### Task 4: currency 按需拉取写入方（frankfurter.app）

**Files:**

- Modify: `packages/api/src/routes/currency.ts`、`packages/api/src/routes/currency.test.ts`

**背景（recon）**：`currency.ts` 三个端点全是只读 SELECT，`currency_rates`/`currency_history` 表**无任何写入方** → `/rates` 永远返回 null。frankfurter.app 免 key（`GET https://api.frankfurter.app/latest?base=CNY`，返回 `{amount, base, date, rates:{USD:0.14,...}}`）。写 `currency_rates`（`baseCurrency`, `rates`(json), `fetchedAt`）。

- [ ] **Step 1: 失败测试**（mock global fetch）

```ts
it('GET /rates fetches from frankfurter and persists when cache is empty', async () => {
  const fetchMock = vi.fn(async () => new Response(
    JSON.stringify({ base: 'CNY', date: '2026-07-08', rates: { USD: 0.14, JPY: 21.5 } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ));
  vi.stubGlobal('fetch', fetchMock);
  const res = await app.request('/api/currency/rates?base=CNY', {}, testEnv);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.data.rates.USD).toBe(0.14);
  expect(fetchMock).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm --filter @pathfinding/api test currency
```

预期：FAIL（当前无 fetch、返回 null）。

- [ ] **Step 3: 实现按需拉取**（`currency.ts` 的 `GET /rates`）

读现有 `/rates` 的 SELECT 逻辑：查最新一行；若无（或 `fetchedAt` 早于今天，用可调阈值），则 `fetch('https://api.frankfurter.app/latest?base=' + base)` → 写一行 `currency_rates{baseCurrency: base, rates: json, fetchedAt: <now-seconds>}` → 返回。fetch 失败时回退到已有缓存行（若有），否则返回 `{data: null}` + 一条 warn（不 500——外部依赖降级）。所有输入过 Zod（base 是 3 位字母）。

```ts
// ponytail: 每日一刷的按需缓存；写入 currency_rates。若需 history/trend 再按 (base,target) 落 currency_history。
```

- [ ] **Step 4: 测试 + check + Commit**

```bash
pnpm --filter @pathfinding/api test currency   # 期望 PASS
pnpm check
git add -A && git commit -m "feat(api): currency /rates fetches + persists from frankfurter.app when cache stale"
```

---

### Task 5: Dashboard catch-all rewrite（web 调用命中后端）

**Files:**

- Modify: `apps/dashboard/next.config.ts`
- Test: `apps/dashboard/next.config.test.ts`（若不存在则创建一个轻量断言）

**背景（recon）**：当前 `next.config.ts` 只有 5 条命名前缀 rewrite（auth/itineraries/pois/itinerary-collaborators/ai-service）。profile 页 `/api/users/:id`、expenses 页 `/api/expense-splitting/*` **无 rewrite → 命中 Next 本地 404**。`src/app/api/` 下只有 `chat`、`health` 两个本地 handler；数组式 rewrite 属 `afterFiles`，文件系统路由优先，故 catch-all 不会吃掉它们。

- [ ] **Step 1: 改为 catch-all**（`next.config.ts` 的 `rewrites()`）

用单条 `/api/:path*` 取代 5 条命名 rewrite（保留 `apiUrl` env 取值逻辑）：

```ts
async rewrites() {
  return [
    { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
  ];
}
```

保留 `aiServiceUrl` 的 legacy `/api/ai-service/:path*` 若仍被引用则留；否则一并删（grep `ai-service` 确认无消费者再删）。本地 handler `/api/chat`、`/api/health` 因 FS 路由优先自动保留。

- [ ] **Step 2: 断言测试**（`next.config.test.ts`）

```ts
import config from './next.config';
it('rewrites all /api/* to the backend', async () => {
  const rules = await (config.rewrites as () => Promise<unknown[]>)();
  const flat = Array.isArray(rules) ? rules : (rules as { afterFiles: unknown[] }).afterFiles;
  expect(flat.some((r) => (r as { source: string }).source === '/api/:path*')).toBe(true);
});
```

（若 `next.config.ts` 是 TS 且导出形态不便测，改为一个 `scripts/` 下的最小校验或跳过——但优先加断言。）

- [ ] **Step 3: check + Commit**

```bash
pnpm check
git add -A && git commit -m "feat(dashboard): catch-all /api/:path* rewrite so profile/expense-splitting reach backend"
```

---

### Task 6: Dashboard 集中鉴权守卫（客户端 layout）

**Files:**

- Modify: `apps/dashboard/src/app/(dashboard)/layout.tsx`；移除各页面重复守卫：`itineraries/page.tsx`、`itineraries/new/page.tsx`、`itineraries/[id]/page.tsx`、`expenses/page.tsx`
- Test: `apps/dashboard/src/app/(dashboard)/layout.test.tsx`（新建）

**背景（recon）**：token 存 **localStorage**（`src/lib/api/client.ts`，`AUTH_TOKEN_STORAGE_KEY`）→ Next 服务端 middleware 读不到，**守卫必须在客户端**。现无 middleware.ts，守卫散落 4 页 useEffect（未登录 → `/auth/signin`），chat/overview/settings 无守卫。收敛到 `(dashboard)/layout.tsx` 客户端守卫，统一未登录 → `/`（配合 Task 7 登录收敛）。

- [ ] **Step 1: 失败测试**（`layout.test.tsx`）

断言：未登录（`isAuthenticated=false`）时 layout 触发 `router.replace('/')`；已登录时渲染 children。用现有 dashboard 测试的 `useAuth` mock 方式（读 `auth-button.test.tsx` 的 mock 装配复用）。

- [ ] **Step 2: layout 客户端守卫**

`(dashboard)/layout.tsx` 顶部（`'use client'`）：

```tsx
const { isAuthenticated, isLoading } = useAuth();
const router = useRouter();
useEffect(() => {
  if (!isLoading && !isAuthenticated) router.replace('/');
}, [isLoading, isAuthenticated, router]);
if (isLoading) return <LoadingState />;      // 复用现有 loading 组件
if (!isAuthenticated) return null;
```

（`useAuth` 的 `isLoading` 字段名以 `providers.tsx` 实际为准；若无 loading 态则省略该分支。）

- [ ] **Step 3: 删各页重复守卫**

从 `itineraries/page.tsx`、`itineraries/new/page.tsx`、`itineraries/[id]/page.tsx`、`expenses/page.tsx` 移除各自 `!isAuthenticated → router.replace('/auth/signin')` 的 useEffect 与 `return null` 守卫（现由 layout 统一负责）。保留这些页面里与鉴权无关的逻辑。

- [ ] **Step 4: 测试 + check + Commit**

```bash
pnpm check
git add -A && git commit -m "feat(dashboard): centralize auth guard in (dashboard) layout, drop scattered per-page redirects"
```

---

### Task 7: 登录页收敛到 `/`

**Files:**

- Modify: `apps/dashboard/src/app/auth/signin/page.tsx`、`apps/dashboard/src/app/auth/signup/page.tsx`、`apps/dashboard/src/components/auth-button.tsx`
- Test: 相关页面/组件的现有测试同步调整

**背景（recon）**：根 `/`（`page.tsx`）已是 amber 品牌落地页 + 内联登录表单（符合目标）；`/auth/signin`、`/auth/signup` 是各自独立完整表单（重复）；`auth-button` 未登录时指向 `/auth/signin`。spec 要 `/` 收敛登录，signin/signup 重定向到 `/`，auth-button → `/`。

- [ ] **Step 1: signin/signup 变重定向**

`auth/signin/page.tsx` 与 `auth/signup/page.tsx` 改为重定向到 `/`（保留 signup 的注册流程：若 `/` 落地页只含登录表单而无注册，则 signup 页保留注册表单、仅把 signin 页 302 到 `/`；读 `/` 的 `page.tsx` 是否含注册入口再决定——recon 显示 `/` 底部有 `Link href='/auth/signup'`，即注册仍在独立页）。最小方案：**signin 页**重定向到 `/`（登录已在 `/`）；**signup 页**保留（`/` 通过 Link 指向它）。用 Next `redirect('/')`（server component）或客户端 `router.replace('/')`。

- [ ] **Step 2: auth-button 未登录指向 `/`**

`auth-button.tsx`：未认证时 `Link href='/'`（文案「登录」）取代 `/auth/signin`。

- [ ] **Step 3: 同步测试**

`auth/signin/page.test.tsx`、`auth-button.test.tsx` 中对 `/auth/signin` 的断言改为 `/`。

- [ ] **Step 4: check + Commit**

```bash
pnpm check
git add -A && git commit -m "feat(dashboard): consolidate login on / and redirect /auth/signin there"
```

---

### Task 8: R4 验证闸——dev 自动建表 + 冒烟脚本 + 端点 contract 测试

**Files:**

- Modify: `packages/api/package.json`（predev 钩子）、根 `package.json`
- Create: `scripts/smoke.mjs`、`packages/api/src/routes/__contract__.test.ts`（或 `app.test.ts` 追加）

**背景（recon）**：`pnpm dev:api` = `flue dev --target cloudflare`，**不自动 apply 迁移**，新人首次起库后表不存在。R4 要「一键起库自动建表」。

- [ ] **Step 1: dev 自动建表**

`packages/api/package.json` 加 predev（在 `flue dev` 前 apply 本地迁移）：

```json
"predev": "wrangler d1 migrations apply pathfinding --local",
"dev": "flue dev --target cloudflare"
```

（确认 `wrangler` 在 api 包可解析；若需 `npx wrangler` 则用之。predev 是 pnpm/npm 生命周期钩子，`pnpm --filter @pathfinding/api dev` 会先跑 predev。）

- [ ] **Step 2: 端点 contract 测试**（锁定 web + 冒烟依赖的端点存在）

`packages/api/src/routes/__contract__.test.ts`：对每个关键端点做「存在性」断言（未鉴权时返回 401 而非 404，即路由已挂载）：

```ts
const MOUNTED = [
  ['POST', '/api/auth/signin'], ['POST', '/api/auth/refresh'],
  ['GET', '/api/users/me'], ['GET', '/api/itineraries'],
  ['GET', '/api/pois'], ['GET', '/api/expense-splitting/balance'],
  ['GET', '/api/budgets'], ['GET', '/api/expenses'],
  ['POST', '/api/agent/chat/stream'], ['GET', '/api/chat/sessions'],
  ['GET', '/api/currency/rates'], ['GET', '/api/sharing'],
];
it.each(MOUNTED)('%s %s is mounted (not 404)', async (method, path) => {
  const res = await app.request(path, { method }, testEnv);
  expect(res.status).not.toBe(404);
});
```

（路径以 recon 确认的实际挂载为准；未挂载的从列表剔除——目的是防回归误删路由，不是要求全部 200。）

- [ ] **Step 3: 冒烟脚本**（`scripts/smoke.mjs`，node，打本地 dev）

针对本地 `http://localhost:3000` 走 web 核心流程：注册 → 登录 → 建行程 → 加天/POI → 列表 → 分账基础读。每步断言 2xx，任一失败退出码非 0 并打印。示例骨架（用 `fetch`，node ≥18）：

```js
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const j = (r) => r.json();
async function main() {
  const email = `smoke+${Date.now()}@e.com`;
  const up = await fetch(`${BASE}/api/auth/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'pw12345678', flow: 'signUp', name: 'Smoke' }) });
  if (!up.ok) throw new Error(`signup ${up.status}`);
  const { token } = await j(up);
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const it = await fetch(`${BASE}/api/itineraries`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'Smoke Trip', cityId: null }) });
  if (!it.ok) throw new Error(`create itinerary ${it.status}`);
  // ... 加天/POI/列表/分账读，逐步断言
  console.log('SMOKE OK');
}
main().catch((e) => { console.error('SMOKE FAIL', e); process.exit(1); });
```

根 `package.json` 加 `"smoke": "node scripts/smoke.mjs"`。冒烟脚本**不进 pnpm check**（需要 dev server 在跑）；README/plan 注明用法：一个终端 `pnpm dev:db`（若适用）+ `pnpm dev:api`，另一个 `pnpm smoke`。建行程/加 POI 的确切 body 形状以 `itineraries.ts`/`pois.ts` 路由的 Zod schema 为准（实现时读它们）。

- [ ] **Step 4: 跑 contract 测试 + check**

```bash
pnpm --filter @pathfinding/api test __contract__
pnpm check
```

- [ ] **Step 5: 手动跑一次冒烟（R4 验收证据）**

```bash
# 终端 A
cd packages/api && npx wrangler d1 migrations apply pathfinding --local && cd ../.. && pnpm dev:api
# 终端 B（待 A 就绪）
pnpm smoke
```

预期：`SMOKE OK`。把实际输出记进任务报告（这是 R4「web 核心流程冒烟通过」的证据）。若 dev server 在本环境起不来，记录卡点并把 contract 测试作为最低门槛。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore(api): dev auto-migrate + smoke script + endpoint contract test (R4 gate)"
```

---

## Self-Review 记录

1. **Spec 覆盖（R9 Phase 2 靶向）**：后端自洽——auth/refresh（Task 1）、AI 面鉴权+去双挂载（Task 2）、agent 状态持久化（Task 3）、currency 写入方（Task 4）；Web 端到端——catch-all rewrite（Task 5）、客户端集中守卫（Task 6）、登录收敛（Task 7）；R4 闸——dev 自动建表+冒烟+contract（Task 8）。全覆盖。
2. **明确不做（Phase 3）**：`{success,data}` 信封、`/api/itineraries/:id/budget*` 嵌套端点、`/v1/*`（stats/footprints/preferences 本地化）、chat 嵌套 `/sessions/:id/messages`、iOS 端到端。Global Constraints 已声明。
3. **红线一致性**：所有新路由过 Zod（Task 1/4）、userId 一律 `c.get('userId')` 不从 body（Task 2/3）、所有权 `===`（Task 3）、JWT 经 jose/verifyToken（Task 1 复用 auth.service）。
4. **依赖顺序**：Task 3 新增迁移，Task 8 的 dev-migrate/contract 覆盖它；Task 2 的后端鉴权与 dashboard 转发同任务落地避免中间态破绿；Task 6 依赖 Task 7 的 `/` 登录目标（同分支相邻任务，均在 layout 守卫指向 `/` 前后一致）。
5. **localStorage token 修正**：守卫为客户端 layout 而非 Next middleware（recon 实证），已写入 Task 6 背景与 spec R9。
