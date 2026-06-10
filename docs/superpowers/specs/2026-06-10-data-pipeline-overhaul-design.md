# 数据链路重建设计（Data Pipeline Overhaul）

**日期:** 2026-06-10
**状态:** Approved
**前置:** [2026-06-10-data-pipeline-audit.md](./2026-06-10-data-pipeline-audit.md)（42 项确认缺口、8 大根因）

## 目标

彻底解决「数据少、缺、错」三类痛点的结构性根因：

1. **保真**：写入端不再产生重复、矛盾、空壳数据（RC2/RC3/RC4）
2. **增量**：数据能按城市自动增长、自动刷新（RC1 部分 / RC5）
3. **提质**：结构化字段（坐标等）走权威源而非幻觉（RC1 部分）
4. **防回归**：契约测试 + 可观测性兜底（RC7/RC8）

## 硬性 Gate

任何「多爬数据」的动作必须排在写入端修复之后。实施顺序不可调换：
**Phase 0 止损 → Phase 1 保真 → Phase 2 增量 → Phase 3 提质 → Phase 4 防回归**

## 架构决策

### D1. 唯一键与去重（RC2）

- `travel_guides`：`travel_guides_platform_ext_idx` 由 `index` 改为 `uniqueIndex`（`platform, external_id`）。`external_id` 为 NULL 的手工记录不受影响（MySQL 唯一索引允许多 NULL）。
- `mafengwo_destinations`：`mdd_id` 加 `uniqueIndex`；`mafengwo_guides`：`guide_id` 加 `uniqueIndex`；`mafengwo_pois`：`poi_id` 加 `uniqueIndex`；`mafengwo_qa`：`question_id` 加 `uniqueIndex`；`mafengwo_rankings`：(`ranking_type`,`mdd_id`) 或现有业务键加 `uniqueIndex`（按 schema 实际字段定）。
- 新增 `scripts/dedupe-travel-guides.ts`：按 (platform, external*id) 分组，保留「字段填充数最多、其次 updatedAt 最新」的一行，其余删除；同规则处理 mafengwo*\* 表。脚本必须 dry-run 默认、`--apply` 才执行，并输出删除清单。
- 加唯一索引前必须先跑去重脚本（文档化在脚本头部注释与本文档）。

### D2. 单一写入方（RC2）

- **Go server 只写 mafengwo\_\* 暂存表（Bronze 层），不再写 `travel_guides`**。删除 `events.go` 中对 `travel_guides` 的 INSERT。
- **TS API（guide-import.service）是 `travel_guides` 的唯一写入方（应用层）**。
- 暂存层 → 应用层的同步走 TS 侧（`syncFromMafengwoGuide` 扩展为通用 sync），保证清洗/校验只有一套。

### D3. Go 事件契约 → 同步类型化保存（RC3）

- 废除「发布方手写 map → JSON → 订阅方手写 struct」模式。爬取 handler 直接以**共享类型化 struct 同步调用保存函数**（`internal/store` 或 `internal/handler/save.go`），消除字段名/类型漂移。
- EventBus 仅保留非关键通知用途（或彻底移除保存路径依赖）。保存失败必须反映在 HTTP 响应（`saved: false, saveError: ...`），不允许仅 slog 后丢弃。
- 修复已知漂移：`rating` 统一为 string 解析后的 float64（解析失败置 NULL 而非 0）；`poiId/guideId/questionId/sourceUrl` 等键全部经 struct 字段传递。

### D4. 中文数字解析统一（RC4）

- `packages/crawler-types` 新增 `parseChineseNumber(raw: string): number | null`（支持 `1.2万`、`12万`、`3,456`、纯数字；失败返回 null 而非 0）。
- Go HTTP `/detail` 响应同时返回原始字符串（`viewsRaw/likesRaw`）与解析后数字（`views/likes`，Go 端已有正确解析）。
- TS 入库使用 Go 解析后数字；缺失时用 `parseChineseNumber` 兜底；两者都失败时置 0 并在 `enrichedData.ingestWarnings` 记录。

### D5. 校验/清洗接入主链路（RC4）

- `guide-import.service.importGuide` 入库前必须依次过：`cleanGuideContent`（轻量、行锚点规则）→ `validateGuideEnhanced` → `calculateQualityScoreUnified`。
- error 级校验失败 → 拒绝入库，写 `raw_crawl_records`（`parseStatus: 'rejected'`，含原因）。
- warning 级 → 照常入库，`enrichedData.ingestWarnings` 记录。
- 质量评分单一真相源：TS `calculateQualityScoreUnified`。Go 端 `CalculateQualityScore` 仅作为爬取侧参考值返回，不再入库。
- content-cleaner 重写删除规则：行级删除必须要求行首锚点或引流上下文（如「加微信」「关注公众号」），禁止裸词匹配整句删除；手机号改为脱敏（`138****1234`）而非删除整句。

### D6. 原始数据留底（RC4/RC6）

- 每次 `/detail` 抓取成功后，TS 侧把原始响应（title/content/contentHtml/原始计数字符串/URL）写入 `raw_crawl_records`（platform, sourceUrl, rawData JSON, contentHash, parseStatus）。
- `raw_crawl_records` schema 与 `crawler-types/raw-record.ts` 对齐（补 `content_hash`、`parse_status` 列，如缺失）。
- 解析 bug 修复后可重放（重放脚本属 Phase 4+，本期仅保证留底）。

### D7. 刷新策略：从「已存在即跳过」到「存在即刷新」（RC5）

- `importGuide` 改为 upsert 语义：按 (platform, externalId)（或 sourceUrl 兜底）命中已有行时：
  - **始终刷新**：viewCount/likeCount/commentCount、crawledAt、qualityScore
  - **更优才覆盖**：content（新内容更长且通过校验）、imageUrls（新数组非空）、coverImageUrl
  - **绝不覆盖**：enrichedData 中 AI 产物与人工修正（按 key 合并而非整列覆盖）
- 空壳记录（content 为空且 title 为「未命名」）不再占用去重名额：重抓成功后整行刷新。

### D8. AI 增强筛选与合并（RC5）

- `scripts/batch-ai-process.ts`：筛选条件由 `enrichedData IS NULL` 改为**字段级判断**（`JSON_EXTRACT(enriched_data, '$.aiDays') IS NULL` 或 TS 内存过滤）。
- 写回由 `.set({ enrichedData })` 整体覆盖改为**读-合并-写**（保留既有 key）。

### D9. guide_destinations 接通（RC6）

- `importGuide` 写入 destinations 时同步写 `guide_destinations` 辅助表。
- 新增 `scripts/backfill-guide-destinations.ts`：从存量 `travel_guides.destinations` JSON 一次性回填。
- `backfill.service` 缺口分析的 limit 截断改为全表 count/分页聚合（遵守自家性能红线：DB 级过滤）。

### D10. city 真正生效（RC1/RC5）

- Go `/list` 支持 `mddId` 参数：按 `https://m.mafengwo.cn/yj/{mddId}/` 构造城市游记列表 URL；无 mddId 时退回站内搜索页；都没有才用全站 feed，且响应中必须标注 `cityScoped: false`，TS 侧不得将非 city-scoped 结果归属到请求城市。
- `guide-import.service` 发现接口透传 mddId（来自 `mafengwo_destinations` 表）。

### D11. 空提取/反爬检测（RC4）

- Go 提取结果 title 与 content 均为空，或命中验证码页特征（页面含「验证」「安全检查」等标记）→ 判定失败：HTTP 返回 `success: false` + 失败原因，不入暂存表。
- 重试现有循环保留，但重试耗尽后必须把失败 URL 与原因返回给调用方。

### D12. 自动化调度（RC5）

- Go `batch` 端点的任务事件补上消费者：顺序执行 list/detail 爬取（带限速，默认 ≥3s 间隔），结果走 D3 类型化保存。
- Go cron 实现两个真实任务：① 每日刷新 stale 暂存数据（`crawled_at` 最旧的 N 条 mafengwo_guides 重抓详情）；② 触发 batch 队列消费。频率/开关走 env 配置，默认关闭（`CRAWLER_CRON_ENABLED=false`），避免误启动打爆配额。
- TS `destination_fill` 执行器改为真正导入：调 Go `/list`（带 mddId）拿 URL 列表 → 逐条走 `guide-import` 主链路 → `progress` 记录真实 imported/skipped/failed 计数。

### D13. 消费端契约修复（RC8）

- POIs 页面按 Hono `pois` 路由真实响应渲染（去掉 NormalizedPOI 形状假设、修 `sources.map` 崩溃、NaN%）。
- 修参数错配：dashboard 搜索参数对齐后端 `q`；offset 转发；城市筛选按后端实际能力（cityId）对齐或在后端补 city 名称查询。
- `saves_count` 不再伪造：后端无此数据时响应置 null，前端不显示该统计（而非显示 0）。
- 人工坐标修正读写路径统一：PATCH 写入与读取同一来源（enrichedData.aiDays 的 latitude/longitude），写入时同步两处或只保留一处真相源。

### D14. 坐标与地理编码三段式（RC1）

- `batch-ai-process` 的 prompt 不再要求 LLM 输出经纬度；改为三段式：**AI 提取 POI 名称+城市 → 地理编码 API 解析坐标 → 范围/城市一致性校验**。
- 新增 `packages/api/src/services/geocoding.service.ts`：provider 接口 + 高德实现（`AMAP_API_KEY` env，未配置时返回 `pending` 状态，**绝不产出 0.0 占位坐标**）。
- `packages/utils`（或 crawler-types）新增 GCJ-02 ↔ WGS-84 转换函数；高德返回 GCJ-02，入库统一 WGS-84（与 normalized-poi.ts 注释一致）。
- 产出 `geocodeConfidence`/`geocodeSource`，激活 dashboard 既有审核 UI。

### D15. 契约测试（RC7）

- Go：`events_test.go`（保存函数类型化往返：构造 struct → 保存 → 断言 SQL 参数完整）；`extract` 结果空壳检测测试。
- TS：guide-import 校验/刷新策略/raw 留底测试；parseChineseNumber 边界测试；backfill executor 真实导入测试。
- Dashboard：代理参数转发测试（q/offset/platform）。

### D16. 可观测性最小集（RC7）

- 每次 import/sync/backfill 的 `inserted/updated/rejected/failed` 计数写入 `crawl_jobs.progress`（已有列），并在 API 响应返回。
- 新增 `GET /api/crawl-jobs/ingest-stats`：近 N 天每日新增/更新行数、字段填充率（复用 gap-report 聚合）。
- Go 保存失败计数在 HTTP 响应透出（D3 已含）。

## 分阶段实施

| Phase    | 内容                                                                               | 决策项             |
| -------- | ---------------------------------------------------------------------------------- | ------------------ |
| 0 止损   | AI 覆盖改合并、清洗脚本 dry-run 化、raw 留底、空提取拒绝                           | D5(部分) D6 D8 D11 |
| 1 保真   | 唯一键+去重脚本、单一写入方、Go 类型化保存、parseChineseNumber、校验接入、刷新策略 | D1 D2 D3 D4 D5 D7  |
| 2 增量   | city 生效、batch 消费者、cron、destination_fill 真实导入、guide_destinations       | D9 D10 D12         |
| 3 提质   | 地理编码三段式、坐标系转换、消费端契约修复                                         | D13 D14            |
| 4 防回归 | 契约测试、ingest-stats                                                             | D15 D16            |

## 工作流划分（实施时的文件边界）

- **WS-A（TS 基础）**：`packages/database/src/schema/*`、`packages/crawler-types/src/*`、`scripts/dedupe-travel-guides.ts`、`scripts/backfill-guide-destinations.ts`
- **WS-B（Go）**：`apps/server/internal/*`（store/save 重构、extract 增强、batch 消费者、cron、city URL）
- **WS-C（TS 入库）**：`packages/api/src/services/guide-import.service.ts`、`backfill*.service.ts`、`packages/api/src/routes/{crawl-jobs,guides,pois}.ts`、`scripts/batch-ai-process.ts`、`geocoding.service.ts`
- **WS-D（消费端）**：`apps/dashboard/src/*`
- 依赖：WS-C 依赖 WS-A 的 schema 与 parseChineseNumber；WS-B 与 WS-A/C 通过本文档契约对齐（Go 不再写 travel_guides）；WS-D 最后对齐 API 契约。

## 验证

每个 WS 完成后：所在包 `vitest run` / `go test ./...` → 全局 `pnpm typecheck` → `pnpm lint` → `pnpm test`。
最终：`pnpm check` + `go build`，diff 审查（重复逻辑、静默兜底、吞错、死代码、安全红线）。

## 明确不做（本期）

- 第二爬虫平台（小红书/携程）接入——Gate 解除后单独立项
- 用户众包修正闭环——需先设计「人工修正防覆盖」机制
- raw_crawl_records 重放执行器——本期仅留底
- n8n 工作流修复——调度以 Go cron + API 端点为准，n8n 另行对齐
