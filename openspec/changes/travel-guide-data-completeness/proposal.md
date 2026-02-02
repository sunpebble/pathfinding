## Why

爬虫采集的旅游指南数据存在严重的字段缺失和内容不完整问题。当前 `TravelGuideRaw` 只有 `content` 是必填字段，导致大量数据缺少标题、封面图、作者等 iOS 展示必需的字段。同时，内容截断检测只是警告级别，不完整的文章内容仍会入库，影响用户体验。

## What Changes

- 新增数据完整性分级机制，将数据标记为 `complete`/`usable`/`incomplete` 三个等级
- 实现内容截断检测后的二次爬取机制，自动获取完整文章内容
- 提升数据验证门槛，阻止低质量数据入库
- 新增 AI 内容补全功能，自动生成缺失的标题和摘要
- **BREAKING**: `qualityScore` 计算逻辑变更，从简单分数改为综合评分

## Capabilities

### New Capabilities

- `data-completeness-level`: 数据完整性分级系统，根据字段填充情况自动标记数据等级
- `content-refetch`: 内容截断检测与二次爬取机制，确保文章内容完整
- `ai-content-enhancement`: AI 驱动的缺失字段补全，包括标题生成和摘要提取

### Modified Capabilities

- `travel-guide-validation`: 提升验证门槛，最小内容长度从 200 提升到 500，标题和图片变为必填

## Impact

- `packages/crawler-types/src/validators.ts`: 验证规则变更
- `packages/crawler-types/src/travel-guide.ts`: 新增 `completenessLevel` 字段
- `apps/ai-service/src/lib/crawlers/`: 新增二次爬取逻辑
- `apps/ai-service/src/routes/ai.ts`: 新增 AI 补全接口
- `convex/travelGuides.ts`: 查询时支持按完整性等级筛选
- iOS 客户端需适配新的 `completenessLevel` 字段进行展示策略调整
