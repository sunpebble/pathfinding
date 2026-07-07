# Phase 1 收缩（Contraction）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 整树删除爬虫遗留、社区壳、坏承诺与 iOS 死代码树，交付遗留表 rename 冷备脚本，使仓库表面积减半且 `pnpm check` 全绿。

**Architecture:** 纯删除 + 少量断链修理。顺序：先删后端路由/服务（消除对 schema 的引用）→ 再删 schema → 再清 dashboard 与 iOS 两个客户端 → 最后文档与终验。每个任务结束时编译、测试、lint 必须全绿并提交。

**Tech Stack:** pnpm workspace、Hono、Drizzle、Next.js 16、SwiftUI + XcodeGen。

**Spec:** `docs/superpowers/specs/2026-07-07-product-refocus-design.md`（决策 R1–R8；本计划只覆盖其第 9 节 Phase 1）。

> **2026-07-08 更新**：后端已开始迁移 Cloudflare Workers + D1 + R2（spec：
> `2026-07-08-backend-cloudflare-workers-migration-design.md`，实施进度约 3/8 阶段）。
> 影响本计划三处：① 基础分支改为 `feat/backend-cloudflare-workers`；② 原 Task 5
> 「TiDB rename 冷备脚本」作废（生产走全新 D1、无数据迁移、旧 TiDB 整体废弃），改为
> 「重新生成 D1 baseline 迁移」；③ 当前分支 typecheck 为红（`packages/guide-shape`
> 在 schema 切 sqlite-core 后类型损坏）——Task 1 删除该包即修复。CF 迁移剩余阶段
> （uploads→R2、dev 切换、测试改装、CI 部署）在本计划完成后继续，受益于减半的表面积。

## Global Constraints

- 分支：`refactor/phase1-contraction`（从 `feat/backend-cloudflare-workers` 切出）。
- **行号漂移加剧**：CF 迁移改动了大量路由/服务文件（db 注入、c.env），本计划行号以
  2026-07-07 快照为提示，执行时一律按符号名定位。
- 提交格式：Conventional Commits（`refactor:` / `chore:` / `docs:`）。
- 每个任务结束必须：`pnpm check` 全绿（TS 侧）或 iOS build 成功（iOS 侧），然后提交。
- **本计划中的行号是 2026-07-07 快照的定位提示**；执行时以符号名/内容定位为准，行号漂移属正常。
- 删除策略：只删，不重构、不改名、不顺手优化（settings 页变量改名除外，见 Task 7）。
- 保留红线（误删即断核心功能）：
  - 后端：`cities.ts`、`pois.ts` 的 pois 表、`currency.ts`、`expense-splitting.ts`、`sharing.ts`、`chat.ts`、`auth.ts` schema 及对应路由。
  - dashboard：`src/lib/api/pois.ts` 的 `getPois`（小写，走 `/api/pois` rewrite）、`next.config.ts` 全部 rewrites。
  - iOS：`BlogPost.swift` 中的 `AiDay`/`AiPoi`/`TransportInfo`；`SavedItinerary` 的 `blogId`/`sourcePlatform` 字段本身（CloudKitSyncManager 仍读）；`PreferencesAPIClient.swift`（偏好设置页在用，Phase 3 再本地化）；`ItineraryAPIClient` 的 `copyItinerary`/`copyItineraryPartial`/`getItineraryCopyStats`；`Models/Itinerary.swift` 的 `PaginationMeta`。
- iOS 编译验证命令（每个 iOS 任务的验收）：

```bash
cd apps/ios/Pathfinding && xcodegen generate && \
xcodebuild -project Pathfinding.xcodeproj -scheme Pathfinding-Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

---

### Task 0: 建分支

- [ ] **Step 1: 切分支**

```bash
git checkout feat/backend-cloudflare-workers && git checkout -b refactor/phase1-contraction
```

注意：起点分支 typecheck 为红（`guide-shape`），这是已知状态，Task 1 修复。

---

### Task 1: 后端爬虫域整树删除

**Files:**

- Delete（路由+测试）: `packages/api/src/routes/{crawl-jobs,quality-reports,training-datasets,crawler-fetch,guides}.ts` 及同名 `.test.ts`（共 10 个）
- Delete（服务+测试）: `packages/api/src/services/{backfill.service,backfill-executor.service,guide-content,guide-import.service,guide-normalize,guide-writer}.ts` 及同名 `.test.ts`；`packages/api/src/services/crawler-fetch.service.ts`（共 13 个）
- Delete（整包）: `packages/guide-shape/`、`packages/crawler-types/`
- Delete（运维脚本）: `scripts/{backfill-guide-destinations,backfill-structured-guide-content,batch-ai-process,clean-historical-guides,dedupe-travel-guides,generate-content-html}.ts`
- Modify: `packages/api/src/app.ts`、`packages/api/package.json`、`packages/api/flue.config.ts`

**Interfaces:**

- Produces: `/api/guides`、`/api/crawler`、`/api/crawl-jobs`、`/api/quality-reports`、`/api/training-datasets` 不复存在；`@pathfinding/guide-shape`、`@pathfinding/crawler-types` 包不复存在。后续任务（4、6、8）以此为前提。

- [ ] **Step 1: 删除文件与整包**

```bash
git rm packages/api/src/routes/crawl-jobs.ts packages/api/src/routes/crawl-jobs.test.ts \
  packages/api/src/routes/quality-reports.ts packages/api/src/routes/quality-reports.test.ts \
  packages/api/src/routes/training-datasets.ts packages/api/src/routes/training-datasets.test.ts \
  packages/api/src/routes/crawler-fetch.ts packages/api/src/routes/crawler-fetch.test.ts \
  packages/api/src/routes/guides.ts packages/api/src/routes/guides.test.ts \
  packages/api/src/services/backfill.service.ts packages/api/src/services/backfill.service.test.ts \
  packages/api/src/services/backfill-executor.service.ts packages/api/src/services/backfill-executor.service.test.ts \
  packages/api/src/services/crawler-fetch.service.ts \
  packages/api/src/services/guide-content.ts packages/api/src/services/guide-content.test.ts \
  packages/api/src/services/guide-import.service.ts packages/api/src/services/guide-import.service.test.ts \
  packages/api/src/services/guide-normalize.ts packages/api/src/services/guide-normalize.test.ts \
  packages/api/src/services/guide-writer.ts packages/api/src/services/guide-writer.test.ts \
  scripts/backfill-guide-destinations.ts scripts/backfill-structured-guide-content.ts \
  scripts/batch-ai-process.ts scripts/clean-historical-guides.ts \
  scripts/dedupe-travel-guides.ts scripts/generate-content-html.ts
git rm -r packages/guide-shape packages/crawler-types
```

- [ ] **Step 2: 清理 `packages/api/src/app.ts`**

删 import（约 L27-57 区域，按标识符找）：`crawlJobsRoutes`、`crawlerFetchRoutes`、`guidesRoutes`、`qualityReportsRoutes`、`trainingDatasetsRoutes` 及 `// Admin & crawlers` 注释行。
删挂载（按字符串找）：

```ts
app.route('/api/crawler', crawlerFetchRoutes)   // ~L118
app.route('/api/guides', guidesRoutes)          // ~L125
app.route('/api/crawl-jobs', crawlJobsRoutes)   // ~L154
app.route('/api/quality-reports', qualityReportsRoutes) // ~L155
app.route('/api/training-datasets', trainingDatasetsRoutes) // ~L156
```

- [ ] **Step 3: 清理包依赖**

`packages/api/package.json` dependencies 删两行：`"@pathfinding/crawler-types": "workspace:*"`、`"@pathfinding/guide-shape": "workspace:*"`。
`packages/api/flue.config.ts` 的 `ssr.noExternal` 数组删 `'@pathfinding/crawler-types'`、`'@pathfinding/guide-shape'` 两项。
然后：

```bash
pnpm install
```

- [ ] **Step 4: 验证残留引用为零并跑检查**

```bash
grep -rn "guide-shape\|crawler-types\|guideRoutes\|guidesRoutes\|crawlJobs\|guide-writer\|guide-import\|backfill" packages/api/src packages/database/src apps/dashboard/src --include="*.ts" | grep -v node_modules
```

预期：仅剩 dashboard 的引用（Task 6 处理）与 schema 文件内部（Task 4 处理）。`packages/api/src` 内应为零。

```bash
pnpm typecheck && pnpm --filter @pathfinding/api test
```

预期：全绿（guides 相关测试已随文件删除）。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor(api): remove crawler/guide legacy domain (routes, services, packages, scripts)"
```

---

### Task 2: 后端社区壳删除（含 users 的 follow 端点）

**Files:**

- Delete: `packages/api/src/routes/{comments,likes,favorites,collections,notifications,push-tokens,qa,travel-notes}.ts` 及同名 `.test.ts`（共 16 个）；`packages/api/src/services/push.service.ts` + `.test.ts`
- Modify: `packages/api/src/app.ts`、`packages/api/src/routes/users.ts`、`packages/api/src/routes/users.test.ts`

**Interfaces:**

- Produces: `/api/comments|collections|favorites|likes|travel-notes|notifications|push-tokens|qa` 与 `/api/users/:id/follow*` 不复存在。Task 4 删对应表，Task 8-9 删 iOS 调用方。

- [ ] **Step 1: 删除文件**

```bash
git rm packages/api/src/routes/comments.ts packages/api/src/routes/comments.test.ts \
  packages/api/src/routes/likes.ts packages/api/src/routes/likes.test.ts \
  packages/api/src/routes/favorites.ts packages/api/src/routes/favorites.test.ts \
  packages/api/src/routes/collections.ts packages/api/src/routes/collections.test.ts \
  packages/api/src/routes/notifications.ts packages/api/src/routes/notifications.test.ts \
  packages/api/src/routes/push-tokens.ts packages/api/src/routes/push-tokens.test.ts \
  packages/api/src/routes/qa.ts packages/api/src/routes/qa.test.ts \
  packages/api/src/routes/travel-notes.ts packages/api/src/routes/travel-notes.test.ts \
  packages/api/src/services/push.service.ts packages/api/src/services/push.service.test.ts
```

- [ ] **Step 2: 清理 `app.ts`**

删 import：`collectionsRoutes`、`commentsRoutes`、`favoritesRoutes`、`likesRoutes`、`notificationsRoutes`、`pushTokensRoutes`、`qaRoutes`、`travelNotesRoutes`。
删挂载：`/api/comments`、`/api/collections`、`/api/favorites`、`/api/likes`、`/api/travel-notes`、`/api/notifications`、`/api/push-tokens`、`/api/qa`。
顺带删除失效的分组注释（`// Social`、`// Communication`、`// i18n & Q&A` 等与实际不符的段落名）。

- [ ] **Step 3: `users.ts` 删 follow 端点**

- import 行（约 L6）从 `@pathfinding/database` 的解构中删 `userFollows`。
- 删五个端点整块（约 L136-310，按路径字符串定位）：`GET /:id/followers`、`GET /:id/following`、`POST /:id/follow`、`DELETE /:id/follow`、`GET /:id/follow/status`。
- `users.test.ts` 删对应 5 个 describe 块（约 L152-302：`follow/status`、`followers`、`following`、`POST follow`、`DELETE follow`）。

- [ ] **Step 4: 验证 + Commit**

```bash
grep -rn "userFollows\|pushService\|guideComments" packages/api/src --include="*.ts"
```

预期：零输出。

```bash
pnpm typecheck && pnpm --filter @pathfinding/api test
git add -A && git commit -m "refactor(api): remove community shell (comments/likes/favorites/collections/notifications/push/qa/travel-notes, user follows)"
```

---

### Task 3: 后端 translations 路由与 501 stub 删除

**Files:**

- Delete: `packages/api/src/routes/translations.ts`、`packages/api/src/routes/translations.test.ts`
- Modify: `packages/api/src/app.ts`、`packages/api/src/routes/auxiliary.ts`、`packages/api/src/routes/auxiliary.test.ts`

- [ ] **Step 1: 删除与清理**

```bash
git rm packages/api/src/routes/translations.ts packages/api/src/routes/translations.test.ts
```

`app.ts`：删 `translationsRoutes` import 与 `/api/translations` 挂载。
`auxiliary.ts`：删三个 501 stub（约 L162-164）：

```ts
app.all('/pdf/*', ...)      // 501
app.all('/flights/*', ...)  // 501
app.all('/flights', ...)    // 501
```

随后 `notMigrated` 助手函数（约 L42-44）无调用方，一并删。
`auxiliary.test.ts`：删 `returns 501 for non-migrated PDF and flight services` 测试块（约 L65-71）。

- [ ] **Step 2: 验证 + Commit**

```bash
pnpm typecheck && pnpm --filter @pathfinding/api test
git add -A && git commit -m "refactor(api): drop translations routes and 501 pdf/flights stubs"
```

---

### Task 4: schema 收缩（删 23 张表的定义）

**Files:**

- Delete: `packages/database/src/schema/{crawl,guides,mafengwo,translations,notifications,travel-notes}.ts`
- Modify: `packages/database/src/schema/index.ts`、`packages/database/src/schema/itineraries.ts`、`packages/database/src/schema/pois.ts`、`packages/database/src/schema/profiles.ts`、`packages/api/src/routes/users.ts`（+test）

**Interfaces:**

- Produces: schema 仅剩核心域（sqlite-core 方言，CF 迁移已完成方言转换）。D1 迁移文件的重生成放在 Task 5，本任务只改 TS 代码。

- [ ] **Step 1: 删 schema 文件与 barrel**

```bash
git rm packages/database/src/schema/crawl.ts packages/database/src/schema/guides.ts \
  packages/database/src/schema/mafengwo.ts packages/database/src/schema/translations.ts \
  packages/database/src/schema/notifications.ts packages/database/src/schema/travel-notes.ts
```

`index.ts` 删对应 6 行 `export * from './xxx'` 及 `// ── Content & discovery` 注释行。

- [ ] **Step 2: 块删除**

- `itineraries.ts`：删 `commentReports`、`itineraryLikes`、`favoriteCollections`、`itineraryFavorites` 四个表定义及区块注释（约 L97-174）；删除后 `boolean`、`timestamp` import 若未使用则移除（`uniqueIndex` 仍被 `itinerary_collabs_uniq` 用，保留）；文件头注释改写。
- `pois.ts`：删 `poiQuestions`、`poiAnswers`（约 L71-149 至文件尾）；未使用的 `timestamp` import 移除（`boolean`/`json` 仍被 pois 表用）；头注释改写。
- `profiles.ts`：删 `userFollows` 表（约 L38-52）；删 `followersCount`/`followingCount` 死计数列（约 L26-27）；未使用的 `uniqueIndex` import 移除；头注释改写。
- `packages/api/src/routes/users.ts`（约 L56-57）：响应中引用 `profiles.followersCount/followingCount` 的字段直接移除（不要返回常量 0——字段就此消失）；`users.test.ts` 中相应 mock/断言（约 L71/83）同步删。

- [ ] **Step 3: 验证 + Commit**

```bash
grep -rn "travelGuides\|guideDestinations\|mafengwo\|crawlJobs\|rawCrawlRecords\|trainingDatasets\|dataQualityReports\|travelBlogPosts\|poiQuestions\|poiAnswers\|itineraryLikes\|itineraryFavorites\|favoriteCollections\|commentReports\|userFollows\|followersCount" packages/ --include="*.ts" | grep -v node_modules
```

预期：零输出。

```bash
pnpm check
git add -A && git commit -m "refactor(db): shrink schema to core domain (drop crawler/social/translation/notification tables)"
```

---

### Task 5: D1 baseline 迁移重生成

**Files:**

- Modify/Regenerate: `packages/database/drizzle/0000_*.sql`、`packages/database/drizzle/0001_updated_at_triggers.sql`、`packages/database/drizzle/meta/`

**Interfaces:**

- Consumes: Task 4 收缩后的 schema。
- Produces: 干净的 D1 baseline（约 25 张表，不含任何遗留表）。生产 D1 尚未创建、无任何已应用迁移（CF 迁移 spec §0：无数据迁移），因此**重生成而非追加 DROP 迁移**是安全且正确的。原 spec §6 的「rename 冷备」随旧 TiDB 整体废弃而作废。

- [ ] **Step 1: 删旧迁移、重新生成**

```bash
rm packages/database/drizzle/0000_*.sql
rm -rf packages/database/drizzle/meta
pnpm --filter @pathfinding/database db:generate
```

预期：生成新的 `0000_*.sql`，其中 `CREATE TABLE` 数量 ≈ 25，且 grep 不到
`travel_guides|mafengwo|crawl_jobs|user_follows|notifications|translation` 等已删表名。

- [ ] **Step 2: 修剪 updatedAt 触发器**

`packages/database/drizzle/0001_updated_at_triggers.sql` 为手工维护的补丁：删除所有针对
已退役表的 `CREATE TRIGGER ... AFTER UPDATE` 块，只保留核心表的触发器。核验：

```bash
grep -o "ON [a-z_]*" packages/database/drizzle/0001_updated_at_triggers.sql | sort -u
```

预期：输出的表名全部存在于新 `0000_*.sql` 中。

- [ ] **Step 3: 本地 D1 应用验证（若本地已有 wrangler d1 环境则执行，否则跳过并注明）**

```bash
cd packages/api && npx wrangler d1 migrations apply pathfinding --local 2>/dev/null || echo "本地 D1 未配置，跳过（CF 迁移 Stage 5 后自然覆盖）"
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor(db): regenerate clean D1 baseline without legacy tables"
```

---

### Task 6: dashboard 爬虫代理与孤儿页面清理

**Files:**

- Delete: `src/app/api/crawler/` 整目录（14 条路由 + `route-handlers.test.ts`）；页面 `src/app/(dashboard)/{jobs,guides,datasets,pois}/` 整目录（含 `jobs/[id]`、`guides/[id]`、`pois/page.test.tsx` 等）；`src/lib/api/{crawler,crawler.test,backend,backend.test,proxy,proxy.test}.ts`；`src/components/{poi-editor,poi-editor.test,geocoding-confidence-badge}.tsx`；孤儿组件 `src/components/safe-html.tsx`、`src/components/ui/status-badge.tsx`、`src/components/ui/platform-badge.tsx`（均以 grep 复核零引用后删）
- Modify: `src/hooks/use-health-status.ts`、`src/lib/api/index.ts`、`src/lib/api/pois.ts`、`src/types/api.ts`（孤儿类型 `GuideWithAI`/`AiDay`）

（以下路径均相对 `apps/dashboard/`。）

**Interfaces:**

- Consumes: Task 1 已删后端 `/api/crawler/*` 等端点。
- Produces: `src/lib/api/index.ts` 不再 re-export crawler/backend 符号；`use-health-status.ts` 自带 `getHealth`。

- [ ] **Step 1: 先搬 `getHealth`（crawler.ts 整删的前提）**

`src/hooks/use-health-status.ts`：删 `import { getHealth } from '@/lib/api';`，在文件内加（原 `crawler.ts` L70-76 的实现，打的是保留的 `/api/health`）：

```ts
async function getHealth(): Promise<{ status: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
```

（以实际原实现为准——先读 `crawler.ts` 的 `getHealth` 原文再搬，保持行为一致。）

- [ ] **Step 2: 删除文件**

```bash
cd apps/dashboard
git rm -r src/app/api/crawler src/app/\(dashboard\)/jobs src/app/\(dashboard\)/guides \
  src/app/\(dashboard\)/datasets src/app/\(dashboard\)/pois
git rm src/lib/api/crawler.ts src/lib/api/crawler.test.ts src/lib/api/backend.ts \
  src/lib/api/backend.test.ts src/lib/api/proxy.ts src/lib/api/proxy.test.ts \
  src/components/poi-editor.tsx src/components/poi-editor.test.tsx \
  src/components/geocoding-confidence-badge.tsx
```

孤儿组件先复核再删：

```bash
grep -rn "safe-html\|status-badge\|platform-badge" src --include="*.tsx" --include="*.ts" | grep -v "\.test\."
```

预期：删除上述页面后零生产引用；随后 `git rm` 三个组件及其测试（若有）。

- [ ] **Step 3: 清理 re-export 与部分删除**

- `src/lib/api/index.ts`：删 backend 注释块与 re-export（约 L16-24）；删 crawler 注释块与全部函数/类型 re-export（约 L51-90，含 `getHealth`/`getPOIs`/`CrawlJob`/`TravelGuide` 等）；`export { getPois, updateGuidePoiCoordinates } from './pois'` 改为 `export { getPois } from './pois'`；删 `export type { UpdateGuidePoiCoordinatesInput }`。
- `src/lib/api/pois.ts`：删 `guidesClient`（约 L14-16）与 `UpdateGuidePoiCoordinatesInput` + `updateGuidePoiCoordinates`（约 L44-64）；保留 `poisClient` 与 `getPois`；docstring 中 `/api/guides` 描述改掉。
- `src/types/api.ts`：删孤儿类型 `GuideWithAI`、`AiDay`（先 grep 复核零引用）。

- [ ] **Step 4: 验证 + Commit**

```bash
cd ../.. && pnpm typecheck && pnpm --filter dashboard test && pnpm lint
git add -A && git commit -m "refactor(dashboard): remove crawler proxy chain, orphan pages and components"
```

---

### Task 7: dashboard 坏承诺与导航收尾

**Files:**

- Modify: `src/app/(dashboard)/itineraries/[id]/page.tsx`、`src/app/page.tsx`、`src/app/auth/signin/page.tsx`、`src/components/sidebar.tsx`、`src/components/sidebar.test.tsx`、`src/app/(dashboard)/overview/page.tsx`、`src/app/(dashboard)/settings/page.tsx`
- Delete: `src/components/pdf-export-button.tsx`

- [ ] **Step 1: 逐处删除**

- `git rm src/components/pdf-export-button.tsx`；`itineraries/[id]/page.tsx` 删 `import { PdfExportButton }`（约 L24）与 `<PdfExportButton itineraryId={id} />`（约 L364）。
- `src/app/page.tsx` 删「忘记密码？」死按钮（约 L225-230，`type="button"` 无 onClick）。
- `src/app/auth/signin/page.tsx` 删同样的死按钮（约 L109-114）。
- `sidebar.tsx` 删 `{ name: '兴趣点', href: '/pois', icon: MapPin },`（约 L21）及 `MapPin` import；`sidebar.test.tsx` 删「兴趣点」文案断言（约 L45）与 href='/pois' 断言（约 L81-83）。
- `overview/page.tsx`：删兴趣点 MetricCard 的 `href='/pois'` footer（约 L59-65，计数本体保留——走保留的 `getPois`）；「整理地点」DashboardCard（约 L91-97）删除整卡（其唯一动作是跳 /pois）。
- `settings/page.tsx`：`crawlerApiUrl` 变量改名 `apiUrl`（约 L5-6、L32；值本就是保留的 `NEXT_PUBLIC_API_URL`）；描述文案「配置 Sunpebble Trips 控制台」改为「配置 Sunpebble Trips」（全面品牌文案属 Phase 3，这里只消掉「控制台」+「crawler」字样）。

- [ ] **Step 2: 验证 + Commit**

```bash
grep -rn "pois\|crawler\|忘记密码" apps/dashboard/src --include="*.tsx" --include="*.ts" | grep -v "getPois\|/api/pois\|pois.ts"
```

预期：无死链/死按钮残留（`pois.ts` 与 rewrite 相关保留项除外）。

```bash
pnpm typecheck && pnpm --filter dashboard test && pnpm lint
git add -A && git commit -m "refactor(dashboard): drop broken pdf export & forgot-password buttons, /pois nav, crawler wording"
```

---

### Task 8: iOS 发现/攻略死代码树删除 + BlogPost 收缩

**Files:**（均相对 `apps/ios/Pathfinding/`）

- Delete: `Pathfinding/Features/DiscoverView.swift`、`Features/Search/SearchView.swift`、`Features/PublicItineraryDiscoveryView.swift`、`Features/BlogDetailView.swift`、`Features/BlogDetail/`（13 文件）、`Features/CityEncyclopediaView.swift`、`Features/Encyclopedia/`（5 文件）、`Features/PdfExportSheet.swift`、`Features/DebugMenuView.swift`、`Core/GuideStore.swift`、`Core/Network/Clients/{GuideAPIClient,CityAPIClient,PDFAPIClient}.swift`、`Features/Components/{GuideComponents,MarkdownContentView,RichTextContentView,PlainTextContentView,HTMLContentParser,ImageViewer,ShimmerView,ActivityShareSheet}.swift`、`Models/{City,CityEncyclopedia,PdfExport}.swift`、`PathfindingTests/{SearchViewQueryTests,CityEncyclopediaReachabilityTests,MarkdownContentParserTests}.swift`
- Modify: `Models/BlogPost.swift`、`Models/SavedItinerary.swift`、`Core/ItineraryStore.swift`、`Core/Network/Clients/ItineraryAPIClient.swift`、`Core/ShareManager.swift`、`Core/ShareImageGenerator.swift`、`Features/Share/ShareSheet.swift`、`Features/Share/ShareCardView.swift`、`Features/CopyItinerarySheet.swift`、`Features/Settings/CacheSettingsView.swift`、`Core/PreferenceStore.swift`

**Interfaces:**

- Produces: `BlogPost`、`GuideStore` 等类型消失；`AiDay`/`AiPoi`/`TransportInfo` 保留于 `Models/BlogPost.swift`（**不要**整删该文件）。

- [ ] **Step 1: 删除死代码树**

按上面 Delete 清单 `git rm`（`Features/Components/` 下 8 个文件删前各自 grep 复核仅被死树引用；`ShimmerView`/`ImageViewer` 若有保留代码引用则保留并记录）。

- [ ] **Step 2: `BlogPost.swift` 类型收缩**

删 `struct BlogPost`（约 L3-75）与 `BlogListResponse`/`Pagination`/`PopularDestination`（约 L154-174）；保留 `AiDay`/`AiPoi`/`TransportInfo`（约 L77-152）。

- [ ] **Step 3: 修理 BlogPost 引用点（全部是删除）**

- `SavedItinerary.swift`：删 `init(id:from guide: BlogPost)` 整个（约 L40-59）。**保留** `blogId`/`sourcePlatform` 字段。
- `ItineraryStore.swift`：删 `save(from guide: BlogPost)`（约 L86-95）、`isSaved(blogId:)`（约 L97-100）、`copyFromGuide`（约 L195-237）、`getCopyHistory`（约 L304-311）、`getPublicItineraries`（约 L320-339）、`saveWithSync(from guide:)`（约 L493-512）。
- `ItineraryAPIClient.swift`：删 `getCopyHistory`（约 L47-69）与 `listPublicItineraries`（约 L80-109）。保留 `copyItinerary`/`copyItineraryPartial`/`getItineraryCopyStats`。
- `ShareManager.swift`：删 `buildShareContent(from blogPost:)`（约 L445-460）。
- `ShareImageGenerator.swift`：删 `generateShareCard(from blogPost:)`（约 L115-130）、`BlogPostShareCard`（约 L272-407）、含 xiaohongshu 硬编码的 `#Preview`（约 L691-724）。
- `ShareSheet.swift`：删 `case blogPost(BlogPost)`（约 L377）及三处 switch 分支（约 L250-259、L282-288、L319-320）。
- `ShareCardView.swift`：删六处 `case .blogPost` 分支（约 L148-149、L159-160、L170-171、L184-194、L412-413、L423-424）。
- `CopyItinerarySheet.swift`：删 `extension BlogPost: CopyableSource`（约 L167-205）、`CopyGuideSheet`（约 L562-571）、`CopyPublicItinerarySheet`（约 L573-582）、两个含 xiaohongshu 的 `#Preview`（约 L730-793）。`extension APIItinerary: CopyableSource`（约 L207-285）保留（最小改动）。
- `CacheSettingsView.swift`：删 `GuideStore.shared.clearCache()` 一行（约 L48）。
- `PreferenceStore.swift`：删 `recordGuideView`（约 L184-197）、`recordGuideSave`（约 L199-207）。**不要删 `PreferencesAPIClient.swift`**。

- [ ] **Step 4: 编译验证 + Commit**

```bash
cd apps/ios/Pathfinding && xcodegen generate && \
xcodebuild -project Pathfinding.xcodeproj -scheme Pathfinding-Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

预期：BUILD SUCCEEDED。

```bash
git add -A && git commit -m "refactor(ios): remove discover/guide/encyclopedia dead tree, shrink BlogPost to AiDay/AiPoi"
```

---

### Task 9: iOS 社区壳 + 保险删除（ProfileView 手术）

**Files:**（相对 `apps/ios/Pathfinding/`）

- Delete: `Core/{FollowStore,CommentStore,TravelNoteStore,FavoriteStore,InsuranceStore}.swift`、`Features/Follow/{FollowViews,UserProfileView}.swift`、`Features/Comments/CommentSectionView.swift`、`Features/Favorites/{FavoriteCollectionsView,LikeFavoriteComponents,MyFavoritesView,MyLikesView}.swift`、`Features/Insurance/InsuranceView.swift`、`Models/{ActivityFeed,Follow,Comment,Favorite,TravelNote,Insurance}.swift`
- Modify: `Features/ProfileView.swift`

- [ ] **Step 1: 删除文件**（`git rm` 上述清单）

- [ ] **Step 2: ProfileView 手术**（按符号定位，行号为提示）

- 删 `@State` 的 `followStore`/`followStats`/`favoriteStore`（约 L8-10）与 `navigateToFavorites/Likes/FollowManagement`（约 L14-16）。
- 删「点赞收藏」Section（约 L62-101）与「旅行服务」Section（含 InsuranceListView，约 L103-118）。
- hero 统计区：删 收藏+点赞 两个 Button（约 L263-288）与 关注者+关注 两个 Button（约 L299-323）；保留「足迹」EnhancedStatItem，简化外层 HStack。
- 删三个 `navigationDestination`（约 L235-243）。
- `task` 块删 `loadFollowStats`/`loadFavoriteStats` 调用（约 L245-246，保留 footprintStore 行）；删这两个函数定义（约 L388-406）。

- [ ] **Step 3: 编译验证 + Commit**

同 Task 8 的 xcodebuild 命令，预期 BUILD SUCCEEDED。

```bash
git add -A && git commit -m "refactor(ios): remove community shell (follow/comment/favorite/travel-note) and insurance"
```

---

### Task 10: iOS 死模块清理（协作/翻译死模型）

**Files:**（相对 `apps/ios/Pathfinding/`）

- Delete: `Features/Collaboration/{CollaborationModifiers,CollaborationViews}.swift`、`Core/CollaborationManager.swift`、`Core/Network/Clients/CollaborationAPIClient.swift`、`Models/Collaboration.swift`、`Models/Translation.swift`、`Core/Network/Models/APIRequestTypes.swift`

- [ ] **Step 1: 删除 + 复核**

`git rm` 上述文件。然后：

```bash
grep -rn "collaborativeEditing\|CollaborationManager\|TranslationResult\|MarkAllReadResponse" apps/ios/Pathfinding/Pathfinding --include="*.swift"
```

预期：零输出（这些符号在保留代码中零引用，若有输出则该引用点本身属于死代码链，一并删除并记录）。

- [ ] **Step 2: 编译验证 + Commit**

同 Task 8 的 xcodebuild 命令。

```bash
git add -A && git commit -m "refactor(ios): remove dead collaboration module and translation models"
```

---

### Task 11: iOS 登录残留清理

**Files:**（相对 `apps/ios/Pathfinding/`）

- Modify: `Features/Auth/LoginView.swift`、`Core/AuthManager.swift`、`Features/Settings/APISettingsSheet.swift`、`Features/ProfileView.swift`、`PathfindingUITests/EmailLoginFlowUITests.swift`

- [ ] **Step 1: LoginView 收敛为「邮箱 + Apple」**

- 删 `LoginMethod` 枚举（约 L3-21）、`loginMethod` state（约 L28-29）、手机号/验证码/倒计时相关 state（约 L31-35、L43、L47-48）。
- 删登录方式切换 Picker（约 L104-141）；`if/else` 改为直接渲染 `emailLoginForm`。
- 删 `phoneLoginForm`（约 L319-397）、`sendVerificationCode`+`startCountdown`（约 L478-512）、`isValidPhoneNumber`（约 L460-463）、`onDisappear` 倒计时清理（约 L304-306）。
- `isLoginDisabled` 改为 `isLoading || email.isEmpty || password.isEmpty`；`handleLogin` 的 switch 改为直接 `signIn(email:password:)`。
- 删微信 Button（约 L224-242）；**保留 Apple 按钮与 `handleSocialLogin`**（真实现属 Phase 3；现状按钮报 `oauthNotImplemented`，可接受的中间态——若要中间态更干净可在按钮上加 `.disabled(true)` 并注明 Phase 3 启用）。
- 删「忘记密码」TODO Button（约 L433-441）。

- [ ] **Step 2: AuthManager 清理**

删 `requestVerificationCode`（约 L121-152）、`signInWithPhone`（约 L154-182）、`isValidPhoneNumber`（约 L184-188）；`OAuthProvider` 删 `case wechat`（约 L544）；`AuthError` 删 `invalidPhoneNumber`/`invalidVerificationCode`/`verificationCodeExpired` 三个 case 及描述（约 L557-559、L592-597）。

- [ ] **Step 3: API 设置页 DEBUG 化**

`APISettingsSheet.swift` 整个 struct 用 `#if DEBUG` / `#endif` 包裹；`ProfileView.swift` 中对应 NavigationLink 入口（约 L175-185）同样用 `#if DEBUG` 包裹。

- [ ] **Step 4: UI 测试调整**

`EmailLoginFlowUITests.swift` 删 `login-method-picker` 分段控件的 3 行（约 L17-19）；邮箱表单成为默认，其余断言不动。

- [ ] **Step 5: 编译验证 + Commit**

同 Task 8 的 xcodebuild 命令。

```bash
git add -A && git commit -m "refactor(ios): drop phone/wechat login and dead forgot-password, gate API settings behind DEBUG"
```

---

### Task 12: iOS 文案清理 + 全量测试

**Files:**（相对 `apps/ios/Pathfinding/`）

- Modify: `Pathfinding/Resources/zh-Hans.lproj/Localizable.strings`、`Pathfinding/Resources/en.lproj/Localizable.strings`

- [ ] **Step 1: 删聚合器文案 key**（两个语言文件行号一致）

删：`tab.discover`（L35）、`tab.search`（L39）、Discover 块（L41-48）、Search 块（L50-52）、Home 块（L54-67，`home.*` 全部零引用）、Guides 块（L69-78）。
再删本阶段变孤儿的 key：`login.method.*`、`login.phone*`、`login.code*`、`login.wechat`、`profile.my_favorites`、`profile.my_likes`、`profile.collections`、`profile.insurance`、`profile.followers`、`profile.following`（每个删前 grep 复核零引用）。

- [ ] **Step 2: 全量验证**

```bash
grep -rn "mafengwo\|xiaohongshu" apps/ios/Pathfinding/Pathfinding --include="*.swift"
```

预期：零输出（Task 8 已清 preview 硬编码；若有残留逐个处理——`SavedItinerary.sourcePlatform` 字段本身可留，字面量不可留）。

```bash
cd apps/ios/Pathfinding && xcodegen generate && \
xcodebuild -project Pathfinding.xcodeproj -scheme Pathfinding-Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
```

预期：单元测试全过（被删功能的测试已随树删除）。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor(ios): purge aggregator-era strings and orphan localization keys"
```

---

### Task 13: 文档失效引用清理 + 终验

**Files:**

- Modify: `CLAUDE.md`、`CONTEXT.md`、`README.md`

（全面重写属 Phase 3；本任务只删「描述已不存在代码」的内容，防误导。）

- [ ] **Step 1: 文档手术**

- `CLAUDE.md`：首行架构描述删「Nx monorepo」「Go server」，改为「pnpm workspace monorepo: API (Hono + Drizzle + TiDB), Dashboard (Next.js), iOS (SwiftUI)」；性能规则中引用 `guideDestinations`/`travelGuides` 辅助表的条目删除。
- `CONTEXT.md`：删「Guide ingest domain」整节与引用 D2/D4/D5/D7/D13 的 Cross-cutting invariants 中涉及 guide 的条目（文件顶部加一行：`> 2026-07-07：guide ingest 域已随产品收缩删除，见 specs/2026-07-07-product-refocus-design.md`）。
- `README.md`：功能列表删「Smart Recommendations」「Reminders（推送）」两条（本地通知提醒属 Phase 3 交付后再写回）；Project Structure 的 packages 清单改为实际存在的 `api/database/types`；删 `/api/guides/*` 端点文档段。

- [ ] **Step 2: 终验（Phase 1 Definition of Done）**

```bash
pnpm check
grep -rn "crawl\|mafengwo\|guide-shape\|crawler-types" packages/ apps/dashboard/src --include="*.ts" --include="*.tsx" | grep -v node_modules
```

预期：`pnpm check` 全绿；grep 零业务代码命中（docs/specs 历史文档中的提及不算）。

运行时冒烟**推迟到 CF 迁移 Stage 5**（`flue dev --target cloudflare`）完成后统一做——
当前 dev 入口处于迁移中间态（node target + D1 中间件不匹配），Phase 1 不修它。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: strip references to removed crawler domain and dead features"
```

---

## Self-Review 记录

1. **Spec 覆盖**：spec §9 Phase 1 的四项——爬虫遗留整树（Task 1/4/6/8）、社区壳（Task 2/4/9）、坏承诺（Task 3/7/11）、iOS 死代码树与死模块（Task 8/10）、表退役（Task 5，因 CF 迁移改为 D1 baseline 重生成，rename 冷备作废）、dashboard 孤儿清理（Task 6/7）——全部有对应任务。`share_links` 历史行清理作废（无存量数据）；resourceType 枚举收敛属 Phase 2 路由校验。
2. **Placeholder 扫描**：无 TBD/TODO；Task 6 Step 1 的 `getHealth` 代码块标注了「以原实现为准」，这是搬迁指令而非占位。
3. **一致性**：`PreferencesAPIClient` 在 Global Constraints 与 Task 8 Step 3 口径一致（保留）；`AiDay/AiPoi` 保留口径在 Task 8 两处一致；Apple 登录按钮 Phase 1 保留、Phase 3 真实现，与 spec §4 一致。
