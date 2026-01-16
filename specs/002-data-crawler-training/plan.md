# Implementation Plan: Data Crawler & Training Dataset

**Branch**: `002-data-crawler-training` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-data-crawler-training/spec.md`

## Summary

构建大数据爬虫和训练数据集系统，用于收集、整合多平台旅游数据（POI、评论、评分）并生成 ML 模型训练数据。采用 **Crawlee + Playwright** 作为爬虫框架，**Supabase PostgreSQL** 存储数据，实现三层数据架构（Bronze/Silver/Gold）。

## Technical Context

**Language/Version**: Node.js 20+, TypeScript 5.x  
**Primary Dependencies**: Crawlee 3.13+, Playwright 1.51+, Hono (API), Supabase client  
**Storage**: Supabase (PostgreSQL + Realtime), 三层数据架构  
**Testing**: Vitest (unit), Playwright Test (integration)  
**Target Platform**: Node.js runtime, Docker for production  
**Project Type**: Monorepo 新增 `apps/crawler` 包  
**Performance Goals**: 10k+ POI/小时处理速度, < 500ms API 响应, 支持增量爬取  
**Constraints**: 合规爬取 (robots.txt), 速率限制, 数据隐私保护  
**Scale/Scope**: 50+ 城市, 100k+ POI, 定时/手动爬取任务

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Monorepo Package Isolation**: 新增 `apps/crawler` 包，与现有 `apps/api` 分离，共享 `packages/types`
- [x] **Mobile-First Architecture**: N/A - 后端数据服务，不涉及 UI
- [x] **Location & Privacy Security**: 爬取数据不含用户隐私，评论作者信息脱敏处理
- [ ] **Real-Time Collaboration**: N/A - 数据处理服务，非协作功能
- [x] **Observability**: OpenTelemetry 追踪爬取任务，Sentry 错误监控
- [x] **Technology Stack Compliance**: Node.js + TypeScript + Supabase (与项目技术栈一致)
- [x] **Performance Standards**: 批量处理优化，< 500ms API 响应
- [x] **Quality Gates**: Vitest 测试覆盖 > 70%, ESLint/Prettier 强制

## Project Structure

### Documentation (this feature)

```text
specs/002-data-crawler-training/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technology research
├── data-model.md        # Phase 1: Database schema and types
├── quickstart.md        # Phase 1: Local development guide
├── contracts/           # Phase 1: API specifications
│   └── crawler-api.yaml # OpenAPI 3.1 specification
└── tasks.md             # Phase 2: Implementation tasks (TBD)
```

### Source Code (repository root)

```text
apps/
├── crawler/                      # NEW: 爬虫服务
│   ├── src/
│   │   ├── index.ts              # 服务入口
│   │   ├── crawlers/             # 平台特定爬虫
│   │   │   ├── base.crawler.ts   # 抽象基类
│   │   │   ├── amap.crawler.ts   # 高德地图 API
│   │   │   ├── osm.crawler.ts    # OpenStreetMap
│   │   │   └── registry.ts       # 爬虫注册表
│   │   ├── processors/           # 数据处理器
│   │   │   ├── normalizer.ts     # Schema 标准化
│   │   │   ├── deduplicator.ts   # 实体去重
│   │   │   └── quality-scorer.ts # 质量评分
│   │   ├── jobs/                 # 任务管理
│   │   │   ├── scheduler.ts      # Cron 调度器
│   │   │   └── worker.ts         # 任务执行器
│   │   ├── exporters/            # 数据导出
│   │   │   ├── json.exporter.ts
│   │   │   ├── csv.exporter.ts
│   │   │   └── parquet.exporter.ts
│   │   ├── routes/               # API 路由
│   │   │   ├── crawl-jobs.ts
│   │   │   ├── pois.ts
│   │   │   ├── training-datasets.ts
│   │   │   └── quality-reports.ts
│   │   └── lib/                  # 工具库
│   │       ├── supabase.ts
│   │       ├── hash.ts
│   │       └── geo.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── tsconfig.json
│
├── api/                          # 现有 API 服务
│   └── src/
│       └── routes/
│           └── crawler-proxy.ts  # 可选: 代理爬虫 API
│
packages/
├── crawler-types/                # NEW: 爬虫相关类型
│   └── src/
│       ├── index.ts
│       ├── crawl-job.ts
│       ├── raw-record.ts
│       ├── normalized-poi.ts
│       ├── training-dataset.ts
│       └── quality-report.ts
│
├── types/                        # 现有类型包
│   └── src/
│       └── poi.ts                # 扩展 POI 类型

supabase/
├── migrations/
│   ├── 009_create_crawl_jobs.sql
│   ├── 010_create_raw_crawl_records.sql
│   ├── 011_create_normalized_pois.sql
│   ├── 012_create_poi_reviews.sql
│   ├── 013_create_poi_source_mappings.sql
│   ├── 014_create_training_datasets.sql
│   └── 015_create_data_quality_reports.sql
```

**Structure Decision**: 爬虫服务作为独立的 `apps/crawler` 包实现，通过 Supabase 与主 API 共享数据。训练数据导出功能内置于爬虫服务。

## Key Technical Decisions

### 1. 爬虫框架: Crawlee

选择 **Crawlee** 而非原生 Puppeteer/Playwright：

| 特性 | Crawlee | 原生 Playwright |
|-----|---------|----------------|
| 请求队列 | ✅ 内置持久化 | ❌ 需自行实现 |
| 自动重试 | ✅ 配置化 | ❌ 需自行实现 |
| 速率限制 | ✅ AutoscaledPool | ❌ 需自行实现 |
| 数据存储 | ✅ Dataset | ❌ 需自行实现 |
| TypeScript | ✅ 原生支持 | ✅ |

### 2. 数据架构: 三层湖仓

```
Bronze Layer (原始) → Silver Layer (标准化) → Gold Layer (训练)
raw_crawl_records   → normalized_pois      → training_datasets
```

- **Bronze**: 保留原始 HTML/JSON，支持重新处理
- **Silver**: 统一 schema，跨平台去重
- **Gold**: ML 就绪的特征格式

### 3. 实体去重策略

```typescript
// 多级匹配
1. 精确匹配: platform + external_id
2. 模糊匹配: 
   - Levenshtein(name1, name2) < 3
   - geoDistance(loc1, loc2) < 50m
   - category 匹配
```

### 4. API 集成优先

优先使用官方 API 而非网页爬取：

| 数据源 | 方式 | 合规性 |
|-------|-----|--------|
| 高德地图 | REST API | ✅ |
| 百度地图 | REST API | ✅ |
| OpenStreetMap | Overpass API | ✅ |
| 政府旅游门户 | 公开数据 | ✅ |

## Dependencies

### apps/crawler/package.json

```json
{
  "name": "@pathfinding/crawler",
  "dependencies": {
    "crawlee": "^3.13.0",
    "@crawlee/playwright": "^3.13.0",
    "playwright": "^1.51.0",
    "hono": "^4.11.3",
    "@hono/node-server": "^1.19.7",
    "@supabase/supabase-js": "^2.89.0",
    "fast-levenshtein": "^3.0.0",
    "geolib": "^3.3.4",
    "node-cron": "^3.0.3",
    "zod": "^4.3.4"
  },
  "devDependencies": {
    "@types/node": "^25.0.3",
    "tsx": "^4.21.0",
    "vitest": "^3.2.0",
    "typescript": "^5.9.3"
  }
}
```

## Risks & Mitigations

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|-----|------|---------|
| 平台反爬/封禁 | 中 | 高 | 优先 API、合规爬取、代理轮换 |
| 数据质量不一致 | 中 | 中 | 多源验证、质量评分、人工抽检 |
| 法律合规风险 | 低 | 高 | 法务审核、仅内部使用、优先开放数据 |
| 存储成本超标 | 低 | 中 | 数据生命周期管理、定期归档 |
| 爬虫维护成本 | 中 | 中 | 抽象基类、监控告警、自动检测变更 |

## Success Metrics Mapping

| 规范指标 | 技术实现 |
|---------|---------|
| SC-001: 3+ 平台 95% 成功率 | CrawlJob.statistics.requests_success / total |
| SC-002: 10k+ POI/小时 | 批量处理 + 并发优化 |
| SC-003: 90% 去重准确率 | 人工抽检 + 置信度阈值 |
| SC-004: 7 天内 80% 更新 | 增量爬取 + freshness_score |
| SC-005: 2 小时内生成数据集 | 流式导出 + 分区查询 |
| SC-006: 15 分钟内告警 | OpenTelemetry + Sentry |
| SC-007: 70% 增量效率 | content_hash 变更检测 |
| SC-008: 95% ML 兼容性 | 标准化导出格式 |

## Complexity Tracking

> 本功能不违反 Constitution 原则，无需复杂度豁免。

## Related Documents

- [spec.md](./spec.md) - 功能规范
- [research.md](./research.md) - 技术研究
- [data-model.md](./data-model.md) - 数据模型
- [quickstart.md](./quickstart.md) - 快速开始
- [contracts/crawler-api.yaml](./contracts/crawler-api.yaml) - API 契约

## Next Steps

1. 运行 `/speckit.tasks` 生成实施任务
2. 创建 `apps/crawler` 目录结构
3. 实现基础爬虫框架
4. 添加第一个数据源 (OpenStreetMap)
5. 实现数据标准化管道
