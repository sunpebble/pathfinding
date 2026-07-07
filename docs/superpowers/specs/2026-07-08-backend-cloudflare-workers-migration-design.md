# 后端迁移至 Cloudflare Workers 设计：D1 + R2 + CI 部署

日期：2026-07-08
状态：已逐节与维护者确认，待审阅
触发问题：iOS「助手」tab 永久转圈。根因调查证实生产 API 域名 `api.trips.sunpebblelabs.com`
无 DNS 记录（后端从未部署）。本设计把后端技术栈迁移到 Cloudflare Workers 并经 CI 部署，
从而真正提供 `api.trips.sunpebblelabs.com` 服务。

## 0. 范围

**目标**：`@pathfinding/api` 在 Cloudflare Workers 上运行，数据库用 D1，上传用 R2，
push 到 `main` 即自动部署到生产 Worker（自定义域名 `api.trips.sunpebblelabs.com`）。

**已确认约束**：
- 数据库：**改用 Cloudflare D1**（MySQL→SQLite），**无数据需迁移**（schema-only）。
- 上传：**本次迁移到 R2**。
- 部署：**仅 push 到 `main` 自动部署**（不要 PR preview）。
- 框架：**沿用 Flue 的 `--target cloudflare`**（保留 agent/workflow 能力）。

**不在本 spec 范围**（独立后续项目）：
- iOS「助手 tab 永久转圈」的客户端修复（未登录门、错误兜底、重试 UI）。
- iOS 与 chat API 的**契约不匹配**修复（`success` 字段、`chat/sessions/:id/messages`
  路径、PATCH/DELETE、`context` 类型）。这些在 Workers 后端可用后单独处理。

## 1. 现状审计（迁移工作面量化）

| 维度 | 现状 | 迁移影响 |
|---|---|---|
| 运行时 | Hono `app.ts` 导出 `app.fetch`，**Workers 兼容**；Flue 已有 `flue build --target cloudflare` | 运行时层改动小 |
| HTTP 入口 | `src/server.ts` 用 `@hono/node-server` + `process.on/exit` | Node-only，退役（dev 切 cloudflare target） |
| DB 驱动 | `mysql2/promise` + `drizzle-orm/mysql2`，**全局单例** `getDb()`（`database/src/client.ts`） | 不兼容 Workers，全面重写 |
| `getDb()` 调用 | **31 个文件、~130 处**；含 **5 个 service**（`auth`/`push`/`itinerary-access`/`backfill`/`backfill-executor`） | 每请求注入 + service 收 `db` 参数 |
| schema | 17 文件、~74 张 `mysqlTable`；方言集中在 `schema/columns.ts` 4 个助手 | 方言重写（核心在 `columns.ts`） |
| `process.env` | 12 个非测试文件（auth/deepseek/cors/logger/security-headers/health 等） | 改 `c.env`；模块级读取需重构 |
| 上传 | `routes/uploads.ts` 用 `node:fs`/`node:path` | 重写为 R2 |
| 密码/哈希 | `auth.service.ts` 用 `scryptSync`/`randomBytes`/`timingSafeEqual`/`Buffer` | 靠 `nodejs_compat` 保留 |
| `$returningId()` | 自定义 MySQL 助手，路由 + `auth.service`/`guide-writer` + 测试使用 | 改 D1 原生 `.returning({ id })` |
| CI | `.github/workflows/ci.yml` 只有质量+构建，**无部署** | 新增部署工作流 |

## 2. 方案选型

| 方案 | 说明 | 取舍 | 结论 |
|---|---|---|---|
| **A（采用）** | 沿用 Flue cloudflare target | 保留 agent/workflow（`trips-planner` 等）；Flue 生成 Worker 入口、合并 binding、默认 `nodejs_compat`；改动面最小 | ✅ |
| B | Worker 端弃 Flue，裸 Hono Worker | 丢 Flue agent 运行时（`/agents`、`/runs`、`trips-planner` 全坏）；Node/Worker 两套割裂；改动更大 | ✗ |
| C | 薄 Worker 网关 + 后端仍跑 Node | 不满足"迁移技术栈到 worker" | ✗ |

**Flue cloudflare target 关键事实**（官方文档）：
- `flue build --target cloudflare` 产出 `dist/<worker>/`，内含生成好的 `wrangler.json`（入口、合并的 binding、Vite 产物）。
- 部署用**产物里的** config：`wrangler deploy --config dist/<worker>/wrangler.json`。
- 源根 `wrangler.jsonc` 由项目持有：声明 D1/R2/DO binding、有序迁移历史、`compatibility_*`、自定义域名。
- 默认带 `compatibility_flags: ["nodejs_compat"]`（`node:crypto`/`Buffer` 可用）。
- HTTP 组合仍在 `app.ts`（现有 `app.route('/', flue())` 用法契合）。

## 3. 架构与「请求期资源访问」模型（命门）

D1 无连接池，binding 是每请求的；全局单例模式在 Workers 上不成立。资源一律经请求上下文流转。

**Bindings/Env 类型**：
```ts
type Env = {
  DB: D1Database;
  UPLOADS: R2Bucket;
  JWT_SECRET: string;          // wrangler secret
  DEEPSEEK_API_KEY?: string;
  CORS_ORIGIN?: string;        // 可放 vars
  ADMIN_EMAILS?: string;
};
```

**资源访问三原则**：

1. **DB：每请求注入，消灭 `getDb()` 单例**
   - 根 app 加中间件：`c.set('db', drizzle(c.env.DB, { schema }))`。
   - 路由：`getDb()` → `c.get('db')`（31 文件、~130 处，机械替换）。
   - **5 个 service 直接调 `getDb()`**：改成**接收 `db` 作参数**，由路由从 `c.get('db')` 透传。最需小心的一块。

2. **配置：`process.env.X` → `c.env.X`**
   - 请求路径内（auth 的 `JWT_SECRET`、CORS、`ADMIN_EMAILS`）→ `c.env`。
   - **模块级/启动期**代码（`registerDeepSeekProvider()`、`server.ts`）不能读每请求 env：`deepseek.ts` 改成**每次调用接收 key**（`deepSeekCompletion(msgs, { apiKey: c.env.DEEPSEEK_API_KEY, signal })`），弃用 `registerDeepSeekProvider`。

3. **`$returningId()` → D1 原生 `.returning({ id })`**（D1 支持 RETURNING；路由 + `auth.service`/`guide-writer` + 测试）。

**为什么这样**：D1 binding 是每请求的，全局单例在 Workers 上不成立；显式流转 db/env 是唯一正确且可测的做法。

## 4. Schema 方言迁移与 D1 迁移管线

**方言集中改写 `packages/database/src/schema/columns.ts`**：

| 现状（mysql-core） | D1（sqlite-core） |
|---|---|
| `bigint('id',{mode:'number',unsigned}).autoincrement()` | `integer('id',{mode:'number'}).autoincrement()` |
| `bigint fk` | `integer` |
| `timestamp({mode:'date'}).defaultNow()` | `integer({mode:'timestamp'}).notNull().defaultNow()` |

**表级列类型映射**（每表改 import + 个别列）：
- `double` → `real`
- `boolean` → `integer({ mode:'boolean' })`
- `json` → `text({ mode:'json' })`（`.$type<>()` 不变）
- `varchar(n)` / `int` → `text` / `integer`
- 索引 / `uniqueIndex` API 不变

**`updatedAt` 语义缺口（已决策：走触发器）**：SQLite 无 `ON UPDATE NOW()`，`updatedAt`
不会自动刷新。**在 D1 迁移里为每张含 `updated_at` 的表生成 `AFTER UPDATE` 触发器**——零应用
改动、语义与 MySQL 一致（备选"应用层显式 set"被否，因要改 30+ update 站点、易漏）。

**迁移管线**：
- `drizzle.config.ts`：`dialect:'mysql'` → `'sqlite'`，凭据走 wrangler（`dbCredentials:{ wranglerConfigPath, dbName }`）。
- `drizzle-kit generate`（sqlite）产出 SQL → 落 D1 migrations 目录 → CI 里 `wrangler d1 migrations apply pathfinding --remote`。
- `updatedAt` 触发器作为额外 SQL 补丁接在 drizzle 生成之后（或在 `drizzle/` 里手维护）。

**本地开发统一到 cloudflare target（已决策）**：`flue dev --target cloudflare`（本地
workerd + 本地 D1 文件，端口 3583）；**停用 node-target / `server.ts` 作为服务入口**。
理由：消除"Node 能跑 Worker 挂"的偏差，dev/prod 同运行时。`pnpm dev:api` 改走此命令。

## 5. uploads → R2 + nodejs_compat 兼容面

**R2 重写 `routes/uploads.ts`**（`c.env.UPLOADS: R2Bucket`）：
- POST `/`：`parseBody` 取 file → `env.UPLOADS.put("${userId}/${filename}", body, { httpMetadata:{ contentType } })`；返回 `{ url:"/api/uploads/${filename}" }`（URL 契约不变）。
- GET `/:filename`：`env.UPLOADS.get(key)` → 流式 `new Response(obj.body, { headers:{'Content-Type':...} })`；保留 `authRequired`。
- DELETE `/:filename`：`env.UPLOADS.delete(key)`。
- key = `${userId}/${basename}`；R2 key 扁平字符串，仍保留 `basename` 防穿越。10MB/类型白名单不变。

**nodejs_compat 兼容面**（Flue 默认开，无需额外 flag）：

| 文件 | Node API | 处理 |
|---|---|---|
| `auth.service.ts` | `scryptSync`/`randomBytes`/`timingSafeEqual`/`Buffer` | **保留**（nodejs_compat；scrypt ~50–100ms CPU，付费 Workers 够用） |
| `guide-normalize.ts` | `createHash` | 保留 |
| `sharing.ts` | `randomBytes` | 保留 |
| `uploads.ts` | `fs`/`path`/`Buffer` | **重写为 R2** |
| `server.ts` | `process`/node-server | dev 已切 cloudflare target，**退役** |

**密码哈希（已决策）**：继续用 scrypt（靠 nodejs_compat），不换 Web Crypto——无数据要迁移，
scrypt 能跑且改动最小（YAGNI）。

## 6. wrangler.jsonc + 自定义域名 + CI 部署

**`packages/api/wrangler.jsonc`**（Flue 把生成的入口/DO binding/migration 与之合并）：
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "pathfinding-api",
  "compatibility_date": "2026-06-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [{ "binding": "DB", "database_name": "pathfinding", "database_id": "<wrangler d1 create 后填入>" }],
  "r2_buckets":   [{ "binding": "UPLOADS", "bucket_name": "pathfinding-uploads" }],
  "routes": [{ "pattern": "api.trips.sunpebblelabs.com", "custom_domain": true }],
  "migrations": [ /* Flue 拥有的 DO 迁移，首次 flue build 后据产物补 FlueRegistry 等 */ ]
}
```
- `JWT_SECRET` / `DEEPSEEK_API_KEY` 走 `wrangler secret put`（一次设置，跨部署持久）；
  `CORS_ORIGIN` / `ADMIN_EMAILS` 可放 `vars`。
- 一次性资源创建（手动，首次部署前）：`wrangler d1 create pathfinding`（回填 `database_id`）、
  `wrangler r2 bucket create pathfinding-uploads`。

**自定义域名（顺带根治「永久转圈」）**：zone `sunpebblelabs.com` 已在 Cloudflare，给 Worker 加
**Custom Domain `api.trips.sunpebblelabs.com`**（自动建 DNS + 证书）——补上现在缺失的 DNS 记录。

**CI 部署工作流**（新增 `.github/workflows/deploy-api.yml`，`on: push: branches:[main]`，
路径过滤 `packages/api/**`、`packages/database/**` 等）：
1. checkout + pnpm + node（复用 ci.yml 模式）
2. `pnpm build:packages`
3. `pnpm --filter @pathfinding/api exec flue build --target cloudflare`
4. `npx wrangler d1 migrations apply pathfinding --remote --config dist/<worker>/wrangler.json`
5. `npx wrangler deploy --config dist/<worker>/wrangler.json`
- GitHub Secrets：`CLOUDFLARE_API_TOKEN`（Workers/D1/R2 编辑权限）、`CLOUDFLARE_ACCOUNT_ID`。
- 与 `ci.yml` 关系：质量检查仍走 `ci.yml`；**deploy 作为独立 workflow + 路径过滤**，职责清晰。

**已决策点**：① wrangler.jsonc 放 `packages/api`；② 用 Custom Domain（非 workers.dev 路由）；
③ secrets 一次性 `wrangler secret put`（CI 只持 API_TOKEN）；④ deploy 独立 workflow。

## 7. 测试策略

- 现有 ~30 个测试用 Vitest + mock DB（`vi.mock('@pathfinding/database')` 返回 `mockDb` 的
  select/insert 链）。`getDb()` 消失后，db 经上下文注入，故**改测试装配方式**：
  `requestWithAuth`/test app 工厂把 mock 链通过 `c.set('db', mockDb)`（或 mock `D1Database`
  binding）喂进去；`createSelectChain` 这类 mock 构造器**不变**。
- 路由单测保持 mock-db 层级；新增覆盖：db 注入中间件、R2 上传/读取/删除、env/secret 接线。
- **加一小撮本地 D1 集成测**（`@cloudflare/vitest-pool-workers`），覆盖 SQLite 语义易错点：
  `updatedAt` 触发器、RETURNING、`text({mode:'json'})` 列。不全量迁移。
- 关卡：每阶段后 `pnpm check`（typecheck+lint+test）必须绿；60% 覆盖率不回退。

## 8. 风险与回滚

- 风险：D1 写入主区域延迟、D1 单库/单查询限额；nodejs_compat 包体积；scrypt CPU；Flue beta
  cloudflare target 变动。
- **回滚成本低**：Node 后端从未上线（域名没解析过），属**全新部署、无线上流量**；回滚即
  `wrangler deployments rollback` 到上一版本，Custom Domain 不动。
- 缓解：分阶段 + 每阶段 `pnpm check` + 先本地 workerd 充分验、再首次远端部署。

## 9. 分阶段落地顺序（后续实现计划的骨架）

1. **地基**：`wrangler.jsonc` + D1/R2 资源创建 + `Env` 类型 + db 注入中间件 + `process.env`→`c.env` + deepseek 改每次传 key。
2. **DB 方言**：重写 `columns.ts` + 全量 schema mysql→sqlite + `drizzle.config`(sqlite) + 生成 D1 迁移（含 updatedAt 触发器）+ `$returningId`→`.returning`。
3. **service 接线**：5 个 service 改收 `db` 参数。
4. **uploads→R2**。
5. **本地 dev 切 `flue dev --target cloudflare`**，退役 node-target。
6. **测试**：改 mock 装配 + 加新测试 + 本地 D1 集成测，`pnpm check` 绿。
7. **CI 部署**：新增 deploy workflow；首次部署；验证 `api.trips.sunpebblelabs.com` 解析 + `/health` 200。
8. **冒烟**：iOS/dashboard 指向新 API，过关键端点。

## 10. 验收标准

- `pnpm check` 全绿（typecheck + lint + test，覆盖率 ≥ 60%）。
- `flue build --target cloudflare` 成功产出 `dist/<worker>/wrangler.json`。
- `wrangler deploy --dry-run --config dist/<worker>/wrangler.json` 通过。
- push 到 `main` 触发 deploy workflow 并成功。
- `https://api.trips.sunpebblelabs.com/health` 返回 200（DNS 已生效）。
- 本地 `flue dev --target cloudflare` 可起，关键端点（auth、itineraries、chat）冒烟通过。
