# Quickstart: Data Crawler & Training Dataset

**Branch**: `002-data-crawler-training` | **Date**: 2026-01-04

## Prerequisites

- Node.js 20+ (推荐 22 LTS)
- pnpm 10.x
- Docker & Docker Compose (用于本地 Supabase)
- Git

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/kunish-homelab/pathfinding.git
cd pathfinding
git checkout 002-data-crawler-training
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Supabase Local

```bash
# 安装 Supabase CLI (如果尚未安装)
brew install supabase/tap/supabase

# 启动本地 Supabase
supabase start

# 运行数据库迁移
supabase db push

# 获取本地凭证
supabase status
```

记录输出的 `API URL` 和 `anon key`。

### 4. Configure Environment

创建爬虫服务的环境变量文件：

```bash
# apps/crawler/.env
cp apps/crawler/.env.example apps/crawler/.env
```

编辑 `.env` 文件：

```env
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Crawler Settings
CRAWLER_USER_AGENT=PathfindingBot/1.0 (+https://pathfinding.app/bot)
CRAWLER_MAX_CONCURRENCY=5
CRAWLER_REQUEST_TIMEOUT_SECS=30

# External API Keys (optional for P1)
AMAP_API_KEY=<your-amap-key>
BAIDU_MAP_AK=<your-baidu-ak>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 5. Run Database Migrations

```bash
# 应用爬虫相关的迁移
supabase migration up
```

## Development

### Start Crawler Service

```bash
# 开发模式 (热重载)
pnpm --filter @pathfinding/crawler dev

# 或从根目录
pnpm dev --filter @pathfinding/crawler
```

### Start API Server

```bash
pnpm --filter @pathfinding/api dev
```

### Run Tests

```bash
# 单元测试
pnpm --filter @pathfinding/crawler test

# 集成测试 (需要本地 Supabase)
pnpm --filter @pathfinding/crawler test:integration
```

## Quick Commands

### 手动触发爬取任务

```bash
# 创建测试爬取任务
curl -X POST http://localhost:3000/api/v1/crawl-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test OpenData Crawl",
    "platform": "openstreetmap",
    "config": {
      "geographic_scope": {
        "cities": ["北京"]
      },
      "categories": ["restaurant", "attraction"]
    }
  }'

# 启动爬取任务
curl -X POST http://localhost:3000/api/v1/crawl-jobs/{job_id}/start
```

### 检查爬取状态

```bash
# 查看任务状态
curl http://localhost:3000/api/v1/crawl-jobs/{job_id}

# 查看原始记录
curl http://localhost:3000/api/v1/crawl-jobs/{job_id}/records
```

### 查询标准化数据

```bash
# 搜索 POI
curl "http://localhost:3000/api/v1/pois?city=北京&category=restaurant&limit=10"

# 获取 POI 详情
curl http://localhost:3000/api/v1/pois/{poi_id}
```

### 生成训练数据集

```bash
# 创建训练数据集
curl -X POST http://localhost:3000/api/v1/training-datasets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "beijing-restaurants",
    "version": "1.0.0",
    "generation_params": {
      "geographic_scope": ["北京"],
      "categories": ["restaurant"],
      "min_quality_score": 0.7
    },
    "output_format": "json"
  }'

# 下载数据集
curl -O http://localhost:3000/api/v1/training-datasets/{dataset_id}/download
```

## Project Structure

```
apps/crawler/
├── src/
│   ├── index.ts              # 入口点
│   ├── crawlers/             # 平台特定爬虫
│   │   ├── base.crawler.ts   # 基础爬虫类
│   │   ├── amap.crawler.ts   # 高德地图爬虫
│   │   └── osm.crawler.ts    # OpenStreetMap 爬虫
│   ├── processors/           # 数据处理器
│   │   ├── normalizer.ts     # 数据标准化
│   │   ├── deduplicator.ts   # 去重处理
│   │   └── quality.ts        # 质量评分
│   ├── jobs/                 # 任务调度
│   │   └── scheduler.ts      # 定时任务调度器
│   ├── exporters/            # 数据导出
│   │   └── training.ts       # 训练数据导出
│   └── lib/                  # 工具库
│       ├── supabase.ts       # Supabase 客户端
│       └── hash.ts           # 哈希工具
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
└── tsconfig.json
```

## Debugging

### 查看爬虫日志

```bash
# 开启详细日志
LOG_LEVEL=debug pnpm --filter @pathfinding/crawler dev
```

### 检查数据库

```bash
# 连接本地 PostgreSQL
psql postgresql://postgres:postgres@localhost:54322/postgres

# 查询原始记录
SELECT id, source_platform, parse_status, created_at 
FROM raw_crawl_records 
ORDER BY created_at DESC 
LIMIT 10;

# 查询标准化 POI
SELECT id, name, category, city, quality_score 
FROM normalized_pois 
WHERE city = '北京' 
ORDER BY quality_score DESC 
LIMIT 10;
```

### Playwright 调试

```bash
# 启用 Playwright UI 模式 (用于调试)
PWDEBUG=1 pnpm --filter @pathfinding/crawler dev
```

## Common Issues

### Issue: Supabase 连接失败

```bash
# 检查 Supabase 状态
supabase status

# 重启 Supabase
supabase stop
supabase start
```

### Issue: 爬取被限速

1. 检查 `.env` 中的 `CRAWLER_MAX_CONCURRENCY` 设置
2. 确认 `CRAWLER_USER_AGENT` 已正确设置
3. 查看目标平台的 robots.txt

### Issue: 内存溢出

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter @pathfinding/crawler dev
```

## Next Steps

1. **配置爬取目标**: 编辑 `apps/crawler/src/crawlers/` 中的爬虫配置
2. **添加新平台**: 创建新的爬虫类继承 `BaseCrawler`
3. **自定义标准化**: 修改 `apps/crawler/src/processors/normalizer.ts`
4. **监控告警**: 配置 Sentry 和 OpenTelemetry
