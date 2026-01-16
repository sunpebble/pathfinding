# Pathfinding Data Crawler

A high-performance POI data crawler and ML training dataset generation service. Part of the Pathfinding travel planning platform.

## Features

- **Multi-Platform Crawling**: Support for OpenStreetMap and Amap (Gaode) APIs
- **Data Normalization**: Unified POI schema across platforms
- **Deduplication**: Levenshtein + geo-distance based entity resolution
- **Quality Scoring**: Automated completeness and freshness scoring
- **ML Dataset Export**: JSON, JSON Lines, and CSV export with train/val/test splits
- **Pipeline Monitoring**: Quality reports, anomaly detection, and alerting
- **Incremental Updates**: Content hash-based change detection

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL with PostGIS extension
- Supabase account (or self-hosted Supabase)

## Quick Start

### 1. Install Dependencies

```bash
cd apps/crawler
pnpm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# API Keys (optional, for specific platforms)
AMAP_API_KEY=your-amap-key

# Sentry (optional, for error tracking)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 3. Run Database Migrations

```bash
pnpm supabase db push
```

### 4. Start Development Server

```bash
pnpm dev
```

The API will be available at `http://localhost:3001`.

## API Endpoints

### Crawl Jobs

| Method | Endpoint                           | Description              |
| ------ | ---------------------------------- | ------------------------ |
| GET    | `/api/crawl-jobs`                  | List all crawl jobs      |
| POST   | `/api/crawl-jobs`                  | Create a new crawl job   |
| GET    | `/api/crawl-jobs/:id`              | Get job details          |
| POST   | `/api/crawl-jobs/:id/start`        | Start a crawl job        |
| POST   | `/api/crawl-jobs/:id/cancel`       | Cancel a running job     |
| GET    | `/api/crawl-jobs/:id/records`      | Get raw records from job |
| DELETE | `/api/crawl-jobs/:id`              | Delete a crawl job       |
| GET    | `/api/crawl-jobs/scheduler/status` | Get scheduler status     |

### POIs

| Method | Endpoint                | Description                |
| ------ | ----------------------- | -------------------------- |
| GET    | `/api/pois`             | Search normalized POIs     |
| GET    | `/api/pois/stats`       | Get aggregated statistics  |
| GET    | `/api/pois/:id`         | Get POI details            |
| GET    | `/api/pois/:id/reviews` | Get POI reviews            |
| GET    | `/api/pois/:id/nearby`  | Get nearby POIs            |
| POST   | `/api/pois/normalize`   | Run normalization pipeline |

### Training Datasets

| Method | Endpoint                              | Description           |
| ------ | ------------------------------------- | --------------------- |
| GET    | `/api/training-datasets`              | List all datasets     |
| POST   | `/api/training-datasets`              | Create a new dataset  |
| GET    | `/api/training-datasets/:id`          | Get dataset details   |
| GET    | `/api/training-datasets/:id/download` | Download dataset file |
| DELETE | `/api/training-datasets/:id`          | Delete a dataset      |

### Quality Reports

| Method | Endpoint                             | Description          |
| ------ | ------------------------------------ | -------------------- |
| GET    | `/api/quality-reports`               | List quality reports |
| POST   | `/api/quality-reports/generate`      | Generate new report  |
| GET    | `/api/quality-reports/:id`           | Get report details   |
| GET    | `/api/quality-reports/alerts/active` | Get active alerts    |

### Health

| Method | Endpoint  | Description           |
| ------ | --------- | --------------------- |
| GET    | `/health` | Health check endpoint |

## Creating a Crawl Job

```bash
curl -X POST http://localhost:3001/api/crawl-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beijing POIs",
    "platform": "osm",
    "job_type": "full",
    "config": {
      "geographic_scope": {
        "cities": ["beijing"]
      },
      "categories": ["restaurant", "attraction"],
      "rate_limit": {
        "requests_per_second": 1,
        "max_concurrent": 3
      }
    }
  }'
```

## Generating Training Dataset

```bash
curl -X POST http://localhost:3001/api/training-datasets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "beijing-restaurants-v1",
    "version": "1.0.0",
    "generation_params": {
      "geographic_scope": ["beijing"],
      "categories": ["restaurant"],
      "min_quality_score": 0.6,
      "sampling": {
        "method": "stratified",
        "train_ratio": 0.8,
        "val_ratio": 0.1,
        "test_ratio": 0.1
      }
    },
    "output_format": "json"
  }'
```

## Architecture

```
apps/crawler/
├── src/
│   ├── index.ts              # Hono server entry point
│   ├── crawlers/             # Platform-specific crawlers
│   │   ├── base.crawler.ts   # Abstract base class
│   │   ├── osm.crawler.ts    # OpenStreetMap crawler
│   │   └── amap.crawler.ts   # Amap (Gaode) crawler
│   ├── processors/           # Data processing pipeline
│   │   ├── normalizer.ts     # Raw -> normalized conversion
│   │   ├── deduplication.ts  # Entity resolution
│   │   ├── quality-scorer.ts # Quality scoring
│   │   └── pipeline.ts       # Orchestration
│   ├── exporters/            # Dataset exporters
│   │   ├── json.exporter.ts
│   │   └── csv.exporter.ts
│   ├── services/             # Business logic
│   ├── routes/               # API routes
│   ├── jobs/                 # Background jobs
│   │   ├── worker.ts         # Crawl job executor
│   │   └── scheduler.ts      # Cron scheduling
│   ├── monitoring/           # Metrics & alerts
│   └── lib/                  # Utilities
└── package.json
```

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Crawlers  │ ──► │  Raw Data   │ ──► │  Normalize  │
│  (OSM/Amap) │     │   (Bronze)  │     │   (Silver)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌─────────────┐            │
                    │  Training   │ ◄──────────┤
                    │  Datasets   │            │
                    │   (Gold)    │            │
                    └─────────────┘            │
                                               ▼
                                        ┌─────────────┐
                                        │ Quality     │
                                        │ Reports     │
                                        └─────────────┘
```

## Development

### Run Tests

```bash
pnpm test
```

### Build for Production

```bash
pnpm build
```

### Docker

```bash
docker build -t pathfinding-crawler .
docker run -p 3001:3001 --env-file .env pathfinding-crawler
```

## License

MIT License - see [LICENSE](../../LICENSE) for details.
