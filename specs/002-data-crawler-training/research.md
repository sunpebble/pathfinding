# Research: Data Crawler & Training Dataset

**Branch**: `002-data-crawler-training` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)

## Executive Summary

本研究评估了构建大规模旅游数据爬虫和训练数据集系统的技术选型。推荐使用 **Crawlee (Node.js/TypeScript)** 作为核心爬虫框架，配合 **Playwright** 处理动态页面，以及 **Supabase PostgreSQL** 存储原始和标准化数据。

## Technology Decision Matrix

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Crawlee + Playwright** | TypeScript 原生、与现有技术栈一致、完善的队列管理、自动重试 | 需要学习 Crawlee API | ⭐⭐⭐⭐⭐ |
| Puppeteer | 成熟稳定、文档丰富 | 需要手动实现队列、重试逻辑 | ⭐⭐⭐ |
| Scrapy (Python) | 功能强大、生态丰富 | 与项目技术栈不一致 (Python) | ⭐⭐ |
| Crawl4AI (Python) | LLM 集成强大 | Python 技术栈、需要额外运维 | ⭐⭐⭐ |

## Recommended Architecture

### 爬虫框架: Crawlee

Crawlee 是 Apify 开发的 TypeScript/JavaScript 爬虫框架，提供：

- **多种 Crawler 类型**: `BasicCrawler`, `CheerioCrawler`, `PlaywrightCrawler`
- **内置队列管理**: `RequestQueue` 自动去重、优先级排序
- **自动重试**: 配置化的重试策略和指数退避
- **数据存储**: 内置 Dataset 和 KeyValueStore
- **代理轮换**: 内置代理管理器

```typescript
import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, enqueueLinks, log }) {
        log.info(`Processing ${request.url}`);
        // 提取 POI 数据
        const data = await page.evaluate(() => {
            // 页面数据提取逻辑
        });
        await pushData(data);
        await enqueueLinks(); // 自动发现新链接
    },
    maxRequestsPerCrawl: 1000,
    maxConcurrency: 5,
});
```

### 为什么选择 Crawlee 而不是 Puppeteer/Playwright 直接使用

1. **队列管理**: Crawlee 内置 `RequestQueue`，支持持久化、断点续爬
2. **速率限制**: 内置 `autoscaledPool` 自动调整并发
3. **数据存储**: 内置 `Dataset` 支持 JSON、CSV 导出
4. **监控**: 内置统计和日志
5. **TypeScript 原生**: 与项目技术栈完美匹配

### 数据存储策略

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Storage Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│  Raw Layer (Bronze)     │  Normalized (Silver)  │  Training (Gold)  │
│  ─────────────────────  │  ─────────────────   │  ────────────────  │
│  raw_crawl_records      │  normalized_pois      │  training_datasets │
│  - source_url           │  - unified schema     │  - version         │
│  - raw_html/json        │  - deduped            │  - features        │
│  - crawl_timestamp      │  - quality_score      │  - labels          │
│  - platform_id          │                       │  - splits          │
└─────────────────────────────────────────────────────────────────┘
```

## Platform Analysis (Target Data Sources)

### 可选数据源评估

| 平台类型 | 示例 | 数据丰富度 | 爬取难度 | 法律风险 |
|---------|------|-----------|---------|---------|
| **官方旅游门户** | 各地旅游局网站 | 中 | 低 | 低 |
| **POI 数据 API** | 高德/百度地图开放平台 | 高 | 低 (API) | 低 |
| **旅游点评** | 大众点评、马蜂窝 | 高 | 高 | 中-高 |
| **社交媒体** | 小红书、微博 | 高 | 高 | 高 |
| **OTA 平台** | 携程、去哪儿 | 高 | 高 | 高 |

### 推荐优先级

1. **P1 - 官方 API**: 高德/百度地图 POI API (合规、结构化)
2. **P2 - 开放数据**: OpenStreetMap、WikiData (开源、合规)
3. **P3 - 官方门户**: 政府旅游网站 (公开数据)
4. **P4 - 用户授权数据**: 用户主动分享的行程数据

## Data Model Design Principles

### 1. 原始数据层 (Bronze Layer)

保留完整的爬取记录，用于审计和重新处理：

```typescript
interface RawCrawlRecord {
  id: string;
  source_platform: string;  // 'amap' | 'baidu' | 'mafengwo' | etc
  source_url: string;
  raw_content: string;      // 原始 HTML/JSON
  content_hash: string;     // 用于增量检测
  crawl_timestamp: Date;
  crawler_version: string;
  http_status: number;
  parse_status: 'pending' | 'success' | 'failed';
  error_message?: string;
}
```

### 2. 标准化数据层 (Silver Layer)

统一 schema，支持跨平台查询：

```typescript
interface NormalizedPOI {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  category: string;          // 统一分类体系
  subcategory?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    district?: string;
  };
  ratings: {
    overall: number;
    count: number;
    breakdown?: Record<string, number>;
  };
  operating_hours?: string;
  price_range?: string;
  photos_count: number;
  reviews_count: number;
  sources: SourceAttribution[];  // 多源归因
  quality_score: number;         // 数据质量分
  updated_at: Date;
}

interface SourceAttribution {
  platform: string;
  external_id: string;
  url: string;
  last_crawled: Date;
  confidence: number;  // 0-1
}
```

### 3. 训练数据层 (Gold Layer)

针对 ML 模型优化的特征格式：

```typescript
interface TrainingDataset {
  id: string;
  version: string;
  name: string;
  description: string;
  generation_params: {
    time_range: DateRange;
    geographic_scope: string[];
    categories: string[];
    min_quality_score: number;
  };
  statistics: {
    total_records: number;
    train_size: number;
    val_size: number;
    test_size: number;
  };
  output_format: 'json' | 'parquet' | 'csv';
  created_at: Date;
  source_data_cutoff: Date;
}
```

## Entity Resolution Strategy

### 去重算法

1. **精确匹配**: `source_platform + external_id`
2. **模糊匹配**: 
   - 名称相似度 (编辑距离 < 3)
   - 地理距离 < 50m
   - 分类匹配

```typescript
interface DeduplicationResult {
  canonical_id: string;      // 主记录 ID
  merged_sources: string[];  // 被合并的源
  confidence: number;        // 合并置信度
  conflicts: ConflictDetail[];  // 冲突字段
}
```

## Rate Limiting & Compliance

### 爬取策略

```typescript
const crawlerConfig = {
  // 并发控制
  maxConcurrency: 5,
  minConcurrency: 1,
  
  // 请求间隔
  requestHandlerTimeoutSecs: 30,
  navigationTimeoutSecs: 60,
  
  // 重试策略
  maxRequestRetries: 3,
  
  // 自定义 User-Agent
  userAgent: 'PathfindingBot/1.0 (+https://pathfinding.app/bot)',
  
  // robots.txt 遵守
  respectRobotsTxt: true,
};
```

### 合规检查清单

- [ ] 检查并遵守 robots.txt
- [ ] 实现合理的请求间隔 (≥1s)
- [ ] 使用标识性 User-Agent
- [ ] 不绕过访问控制
- [ ] 优先使用官方 API
- [ ] 数据仅用于内部训练，不公开发布

## Project Structure

```text
apps/
├── crawler/                    # 新增: 爬虫服务
│   ├── src/
│   │   ├── crawlers/           # 平台特定爬虫
│   │   │   ├── base.crawler.ts
│   │   │   ├── amap.crawler.ts
│   │   │   └── opendata.crawler.ts
│   │   ├── processors/         # 数据处理器
│   │   │   ├── normalizer.ts
│   │   │   └── deduplicator.ts
│   │   ├── jobs/              # 任务调度
│   │   │   └── scheduler.ts
│   │   ├── exporters/         # 数据导出
│   │   │   └── training-dataset.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
packages/
├── crawler-types/              # 新增: 爬虫相关类型
│   └── src/
│       ├── raw-data.ts
│       ├── normalized.ts
│       └── training.ts

supabase/
├── migrations/
│   ├── 009_create_raw_crawl_records.sql
│   ├── 010_create_normalized_pois.sql
│   ├── 011_create_poi_reviews.sql
│   ├── 012_create_crawl_jobs.sql
│   ├── 013_create_training_datasets.sql
│   └── 014_create_data_quality_reports.sql
```

## Technology Stack Summary

| 组件 | 技术选型 | 理由 |
|-----|---------|------|
| 爬虫框架 | Crawlee | TypeScript 原生、完善的队列/重试机制 |
| 浏览器自动化 | Playwright | Crawlee 内置集成、跨浏览器支持 |
| 数据存储 | Supabase PostgreSQL | 与现有架构一致、支持 JSON 字段 |
| 任务调度 | Node-cron / Supabase Edge Functions | 轻量级、与现有架构集成 |
| 数据导出 | 自定义 exporter | 支持 JSON/CSV/Parquet 格式 |
| 监控 | OpenTelemetry + Sentry | 与项目现有监控一致 |

## Dependencies to Add

```json
{
  "dependencies": {
    "crawlee": "^3.13.0",
    "playwright": "^1.51.0",
    "@crawlee/playwright": "^3.13.0",
    "fast-levenshtein": "^3.0.0",
    "geolib": "^3.3.4",
    "parquet-js": "^0.11.2"
  }
}
```

## Risks & Mitigations

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 平台反爬 | 高 | 优先使用官方 API、合规爬取、代理轮换 |
| 数据质量差 | 中 | 多源验证、质量评分、人工抽检 |
| 法律合规 | 高 | 法务审核、仅用于内部训练、优先开放数据 |
| 存储成本 | 中 | 数据生命周期管理、原始数据定期归档 |
| 技术复杂度 | 中 | 分阶段实施、P1 先验证核心流程 |

## References

1. [Crawlee Documentation](https://crawlee.dev/docs/quick-start)
2. [高德开放平台 - POI 搜索](https://lbs.amap.com/api/webservice/guide/api/search)
3. [百度地图开放平台](https://lbsyun.baidu.com/index.php?title=webapi/guide/webservice-placeapi)
4. [OpenStreetMap API](https://wiki.openstreetmap.org/wiki/API)
