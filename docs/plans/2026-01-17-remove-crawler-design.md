# 移除 Crawler 服务设计文档

## 概述

**目标**：简化架构，降低成本，移除 Crawler REST API 层，让 iOS 直接调用 Convex。

**策略**：

- 将纯数据 CRUD 端点迁移到 Convex HTTP Actions
- 保留需要外部 API 的功能作为独立的轻量级 AI 服务
- iOS 应用改为直接调用 Convex

## 当前状态

### Crawler 端点统计

- **总路由文件**：20 个
- **总端点数**：170+
- **外部 API 依赖**：Ollama、高德地图、OpenWeatherMap、汇率 API、Nominatim 等

### 端点分类

| 分类        | 端点数 | 外部依赖           | 迁移目标            |
| ----------- | ------ | ------------------ | ------------------- |
| 纯数据 CRUD | ~80    | 无                 | Convex HTTP Actions |
| AI/LLM 功能 | ~25    | Ollama             | AI 服务 (保留)      |
| 天气服务    | 7      | OpenWeatherMap     | AI 服务 (保留)      |
| 汇率服务    | 10     | Exchange Rate API  | AI 服务 (保留)      |
| 交通规划    | 11     | 高德地图           | AI 服务 (保留)      |
| 地理编码    | 10     | Nominatim/Overpass | AI 服务 (保留)      |
| 纯计算      | ~20    | 无                 | Convex HTTP Actions |

---

## 第一部分：迁移到 Convex HTTP Actions

### 1.1 Guides 路由 (`guides.ts`)

| 端点                            | 方法 | 迁移方案                                       |
| ------------------------------- | ---- | ---------------------------------------------- |
| `/api/guides`                   | GET  | → Convex HTTP: `/api/guides`                   |
| `/api/guides/:id`               | GET  | → Convex HTTP: `/api/guides/:id`               |
| `/api/guides/search`            | GET  | → Convex HTTP: `/api/guides/search`            |
| `/api/guides/recommendations`   | GET  | → Convex HTTP: `/api/guides/recommendations`   |
| `/api/guides/trending`          | GET  | → Convex HTTP: `/api/guides/trending`          |
| `/api/guides/destination/:name` | GET  | → Convex HTTP: `/api/guides/destination/:name` |
| `/api/guides/stats`             | GET  | → Convex HTTP: `/api/guides/stats`             |

**Convex 模块**：`travelGuides` (已存在)

### 1.2 Chat 会话管理 (`chat.ts` - 数据部分)

| 端点                              | 方法   | 迁移方案                                         |
| --------------------------------- | ------ | ------------------------------------------------ |
| `/api/chat/sessions`              | GET    | → Convex HTTP: `/api/chat/sessions`              |
| `/api/chat/sessions`              | POST   | → Convex HTTP: `/api/chat/sessions`              |
| `/api/chat/sessions/:id`          | GET    | → Convex HTTP: `/api/chat/sessions/:id`          |
| `/api/chat/sessions/:id`          | PATCH  | → Convex HTTP: `/api/chat/sessions/:id`          |
| `/api/chat/sessions/:id`          | DELETE | → Convex HTTP: `/api/chat/sessions/:id`          |
| `/api/chat/sessions/:id/messages` | GET    | → Convex HTTP: `/api/chat/sessions/:id/messages` |
| `/api/chat/sessions/:id/messages` | DELETE | → Convex HTTP: `/api/chat/sessions/:id/messages` |

**Convex 模块**：`chat` (已存在)

### 1.3 翻译存储 (`translations.ts` - 数据部分)

| 端点                                   | 方法     | 迁移方案                 |
| -------------------------------------- | -------- | ------------------------ |
| `/api/translations/categories`         | GET      | → Convex HTTP            |
| `/api/translations/phrases`            | GET      | → Convex HTTP            |
| `/api/translations/phrases/search`     | GET      | → Convex HTTP            |
| `/api/translations/saved`              | GET/POST | → Convex HTTP            |
| `/api/translations/saved/:id`          | DELETE   | → Convex HTTP            |
| `/api/translations/saved/:id/favorite` | POST     | → Convex HTTP            |
| `/api/translations/packs`              | GET      | → Convex HTTP            |
| `/api/translations/languages`          | GET      | → Convex HTTP (静态数据) |

**Convex 模块**：`translations` (已存在)

### 1.4 分享功能 (`share.ts`)

| 端点                        | 方法 | 迁移方案                 |
| --------------------------- | ---- | ------------------------ |
| `/api/share/link`           | POST | → Convex HTTP            |
| `/api/share/track`          | POST | → Convex HTTP            |
| `/api/share/stats/:guideId` | GET  | → Convex HTTP            |
| `/api/share/platforms`      | GET  | → Convex HTTP (静态数据) |

**Convex 模块**：`shareEvents` (已存在)

### 1.5 POI 数据 (`pois.ts`)

| 端点                    | 方法 | 迁移方案      |
| ----------------------- | ---- | ------------- |
| `/api/pois`             | GET  | → Convex HTTP |
| `/api/pois/:id`         | GET  | → Convex HTTP |
| `/api/pois/:id/reviews` | GET  | → Convex HTTP |
| `/api/pois/:id/nearby`  | GET  | → Convex HTTP |
| `/api/pois/stats`       | GET  | → Convex HTTP |

**Convex 模块**：`pois` (已存在)

### 1.6 路线优化 (`route-optimization.ts`)

纯本地计算，可迁移到 Convex：

| 端点                        | 方法 | 迁移方案                        |
| --------------------------- | ---- | ------------------------------- |
| `/optimize/day`             | POST | → Convex HTTP Action (内部计算) |
| `/optimize/itinerary`       | POST | → Convex HTTP Action (内部计算) |
| `/optimize/compare`         | POST | → Convex HTTP Action            |
| `/optimize/transport-modes` | GET  | → Convex HTTP (静态数据)        |

### 1.7 天文数据 (`astronomy.ts`)

纯本地计算：

| 端点                          | 方法 | 迁移方案                 |
| ----------------------------- | ---- | ------------------------ |
| `/astronomy/sun-times`        | GET  | → Convex HTTP Action     |
| `/astronomy/moon-phase`       | GET  | → Convex HTTP Action     |
| `/astronomy/events`           | GET  | → Convex HTTP Action     |
| `/astronomy/stargazing-spots` | GET  | → Convex HTTP (静态数据) |

### 1.8 社交功能 (`itinerary-social.ts`)

已有部分 Convex HTTP Actions，需补充：

| 端点               | 状态      |
| ------------------ | --------- |
| `/api/comments`    | ✅ 已迁移 |
| `/api/collections` | ✅ 已迁移 |
| `/api/favorited`   | ✅ 已迁移 |
| `/api/liked`       | ✅ 已迁移 |

### 1.9 爬虫任务 (`crawl-jobs.ts`)

仅 Dashboard 使用，可迁移：

| 端点                        | 方法       | 迁移方案             |
| --------------------------- | ---------- | -------------------- |
| `/api/crawl-jobs`           | GET/POST   | → Convex HTTP        |
| `/api/crawl-jobs/:id`       | GET/DELETE | → Convex HTTP        |
| `/api/crawl-jobs/:id/start` | POST       | → Convex HTTP Action |

**Convex 模块**：`crawlJobs` (已存在)

### 1.10 质量报告 (`quality-reports.ts`)

| 端点                           | 方法       | 迁移方案      |
| ------------------------------ | ---------- | ------------- |
| `/api/quality-reports`         | GET/POST   | → Convex HTTP |
| `/api/quality-reports/:id`     | GET/DELETE | → Convex HTTP |
| `/api/quality-reports/summary` | GET        | → Convex HTTP |

**Convex 模块**：`dataQualityReports` (已存在)

### 1.11 训练数据集 (`training-datasets.ts`)

| 端点                                  | 方法       | 迁移方案                    |
| ------------------------------------- | ---------- | --------------------------- |
| `/api/training-datasets`              | GET/POST   | → Convex HTTP               |
| `/api/training-datasets/:id`          | GET/DELETE | → Convex HTTP               |
| `/api/training-datasets/:id/download` | GET        | → Convex HTTP Action (文件) |

**Convex 模块**：`trainingDatasets` (已存在)

---

## 第二部分：保留为 AI 服务

需要外部 API 的功能保留为独立的轻量级服务。

### 2.1 AI/LLM 功能 (`ai.ts`, `chat.ts` AI 部分)

| 端点                                   | 外部依赖 |
| -------------------------------------- | -------- |
| `/api/ai/process/guide`                | Ollama   |
| `/api/ai/summarize`                    | Ollama   |
| `/api/ai/extract-pois`                 | Ollama   |
| `/api/chat/query`                      | Ollama   |
| `/api/chat/sessions/:id/messages` POST | Ollama   |
| `/api/ai-itinerary/generate`           | Ollama   |

### 2.2 天气服务 (`weather.ts`)

| 端点                    | 外部依赖       |
| ----------------------- | -------------- |
| `/api/weather/forecast` | OpenWeatherMap |
| `/api/weather/daily`    | OpenWeatherMap |
| `/api/weather/alerts`   | OpenWeatherMap |

### 2.3 汇率服务 (`currency.ts`)

| 端点                    | 外部依赖          |
| ----------------------- | ----------------- |
| `/api/currency/rates`   | Exchange Rate API |
| `/api/currency/convert` | Exchange Rate API |
| `/api/currency/history` | Exchange Rate API |

### 2.4 交通规划 (`transport.ts`)

| 端点                     | 外部依赖 |
| ------------------------ | -------- |
| `/api/transport/compare` | 高德地图 |
| `/api/transport/walking` | 高德地图 |
| `/api/transport/transit` | 高德地图 |

### 2.5 翻译服务 (`translations.ts` AI 部分)

| 端点                       | 外部依赖        |
| -------------------------- | --------------- |
| `/api/translations/text`   | Ollama/百度翻译 |
| `/api/translations/photo`  | Ollama (Vision) |
| `/api/translations/detect` | Ollama          |

### 2.6 地理编码 (`guide-enrichment.ts`)

| 端点                        | 外部依赖           |
| --------------------------- | ------------------ |
| `/api/guides/:id/enrich`    | Ollama + Nominatim |
| `/api/guides/:id/regeocode` | Nominatim/高德     |

### 2.7 PDF 导出 (`pdf-export.ts`)

| 端点                 | 依赖                |
| -------------------- | ------------------- |
| `/api/pdf/guide/:id` | PDFKit (Node.js 库) |
| `/api/pdf/itinerary` | PDFKit              |

### 2.8 分享卡片生成 (`share.ts` 图片部分)

| 端点                 | 依赖                      |
| -------------------- | ------------------------- |
| `/api/share/card`    | 图片处理库 (Sharp/Canvas) |
| `/api/share/preview` | 图片处理库                |

### 2.9 航班服务 (`flights.ts`)

| 端点                  | 外部依赖 |
| --------------------- | -------- |
| `/api/flights/lookup` | 航班 API |
| `/api/flights/status` | 航班 API |

---

## 第三部分：iOS 应用修改

### 3.1 APIClient 修改

将 `AppConfig.apiBaseURL` 从 Crawler 改为 Convex：

```swift
// 当前
static var apiBaseURL: String {
    return "http://127.0.0.1:3001"  // Crawler
}

// 修改后
static var convexURL: String {
    return "https://convex.kunish.org"  // Convex
}

static var aiServiceURL: String {
    return "http://127.0.0.1:3001"  // AI Service (仅 AI 功能)
}
```

### 3.2 端点路径映射

| 当前路径 (Crawler)             | 新路径 (Convex)                 |
| ------------------------------ | ------------------------------- |
| `/api/guides`                  | `/api/guides`                   |
| `/v1/itineraries/:id/comments` | `/api/comments?itineraryId=:id` |
| `/v1/follows/*`                | `/api/follows/*`                |
| `/v1/pois/*`                   | `/api/pois/*`                   |
| `/api/chat/query`              | AI Service: `/api/chat/query`   |
| `/api/weather/*`               | AI Service: `/api/weather/*`    |

### 3.3 Store 修改清单

| Store             | 修改内容                                |
| ----------------- | --------------------------------------- |
| `GuideStore`      | 改用 Convex URL                         |
| `CommentStore`    | 改用 Convex HTTP Actions                |
| `FavoriteStore`   | 改用 Convex HTTP Actions                |
| `ChatStore`       | 会话管理用 Convex，AI 查询用 AI Service |
| `QAStore`         | 改用 Convex HTTP Actions                |
| `TravelNoteStore` | 改用 Convex HTTP Actions                |
| `FollowStore`     | 新建 Convex HTTP Actions                |

---

## 第四部分：实施计划

### Phase 1：Convex HTTP Actions 扩展 (1-2 周)

**任务**：

1. 扩展 `convex/http.ts`，添加所有纯数据端点
2. 确保 API 响应格式与 Crawler 兼容
3. 添加认证中间件到 HTTP Actions
4. 单元测试

**新增 HTTP Actions**：

- `/api/guides/*` (8 个端点)
- `/api/chat/sessions/*` (7 个端点)
- `/api/translations/*` (12 个端点)
- `/api/pois/*` (5 个端点)
- `/api/follows/*` (11 个端点)
- `/api/travel-notes/*` (18 个端点)
- `/api/budgets/*` (10 个端点)
- `/api/qa/*` (20 个端点)
- 其他 (20+ 个端点)

### Phase 2：AI 服务精简 (1 周)

**任务**：

1. 创建 `apps/ai-service` 新项目
2. 只保留需要外部 API 的路由
3. 移除所有 CRUD 逻辑
4. 保持与 Convex 的连接（用于读写数据）

**保留路由**：

- `ai.ts` - AI 处理
- `weather.ts` - 天气
- `currency.ts` - 汇率
- `transport.ts` - 交通
- `translations.ts` (AI 部分) - 翻译
- `guide-enrichment.ts` - 富化
- `pdf-export.ts` - PDF
- `flights.ts` - 航班
- `share.ts` (图片部分) - 分享卡片

### Phase 3：iOS 应用迁移 (1 周)

**任务**：

1. 修改 `AppConfig.swift` 添加双 URL 配置
2. 更新 `APIClient.swift` 支持路由到不同服务
3. 逐个修改 Store 文件
4. 测试所有功能

### Phase 4：清理与部署 (3 天)

**任务**：

1. 删除 `apps/crawler` 目录
2. 更新 `package.json` 和 NX 配置
3. 更新 CLAUDE.md 文档
4. 部署 Convex 和 AI Service
5. 更新 iOS 配置文件

---

## 第五部分：风险与缓解

### 风险 1：Convex HTTP Actions 限制

**问题**：Convex HTTP Actions 有执行时间限制（通常 10 秒）

**缓解**：

- 路线优化等计算密集任务可能需要优化算法
- 或保留在 AI Service 中

### 风险 2：API 兼容性

**问题**：iOS 现有代码依赖特定的响应格式

**缓解**：

- Convex HTTP Actions 保持与 Crawler 相同的响应格式
- 使用适配器模式处理差异

### 风险 3：认证传递

**问题**：iOS 使用 Bearer Token 认证

**缓解**：

- Convex HTTP Actions 已支持从 Authorization header 提取用户
- 使用 `ctx.auth.getUserIdentity()` 验证

---

## 附录：完整端点迁移表

见 [endpoint-migration-matrix.md](./endpoint-migration-matrix.md)（待生成）

---

## 决策记录

| 决策项              | 选择           | 说明                               |
| ------------------- | -------------- | ---------------------------------- |
| AI Service 部署方式 | Node.js 进程   | 保持现有部署方式，最小改动         |
| 迁移优先级          | 全部一起迁移   | 一次性完成所有 Convex HTTP Actions |
| Dashboard 处理      | 迁移到 Next.js | 将功能合并到 `apps/dashboard`      |

---

## 最终架构

```
┌─────────────────────────────────────────────────────────────┐
│                         iOS App                              │
├─────────────────────────────────────────────────────────────┤
│  数据操作 (CRUD)          │  AI/外部服务                    │
│  ↓                        │  ↓                              │
│  Convex HTTP Actions      │  AI Service (Node.js)           │
│  https://convex.kunish.org│  http://localhost:3001          │
├─────────────────────────────────────────────────────────────┤
│                    Convex Database                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Next.js Dashboard                         │
│                    (apps/dashboard)                          │
│  - 爬虫任务管理                                              │
│  - 数据质量报告                                              │
│  - AI 富化控制                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 实施检查清单

### Phase 1: Convex HTTP Actions (预计 80+ 端点)

- [ ] Guides API (`/api/guides/*`)
- [ ] Chat Sessions API (`/api/chat/sessions/*`)
- [ ] Translations Data API (`/api/translations/*`)
- [ ] POIs API (`/api/pois/*`)
- [ ] Follows API (`/api/follows/*`)
- [ ] Travel Notes API (`/api/travel-notes/*`)
- [ ] Budgets API (`/api/budgets/*`)
- [ ] QA API (`/api/qa/*`)
- [ ] Notifications API (`/api/notifications/*`)
- [ ] Route Optimization API (`/api/optimize/*`)
- [ ] Astronomy API (`/api/astronomy/*`)
- [ ] Crawl Jobs API (`/api/crawl-jobs/*`)
- [ ] Quality Reports API (`/api/quality-reports/*`)
- [ ] Training Datasets API (`/api/training-datasets/*`)

### Phase 2: AI Service 精简

- [ ] 创建 `apps/ai-service` 目录
- [ ] 迁移 AI 相关路由
- [ ] 迁移外部 API 路由 (天气、汇率、交通、航班)
- [ ] 迁移 PDF 导出
- [ ] 迁移分享卡片生成
- [ ] 更新 package.json 依赖
- [ ] 配置独立启动脚本

### Phase 3: iOS 应用修改

- [ ] 更新 `AppConfig.swift` (双 URL)
- [ ] 更新 `APIClient.swift` (路由逻辑)
- [ ] 修改所有 Store 文件
- [ ] 更新 xcconfig 配置
- [ ] 端到端测试

### Phase 4: Dashboard 迁移

- [ ] 爬虫任务管理页面
- [ ] 数据质量报告页面
- [ ] AI 富化控制页面
- [ ] 训练数据集管理页面

### Phase 5: 清理

- [ ] 删除 `apps/crawler` 目录
- [ ] 更新 NX workspace 配置
- [ ] 更新 CLAUDE.md
- [ ] 更新 README.md
- [ ] 提交并部署
