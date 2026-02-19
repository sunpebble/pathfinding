## Why

将实验性的马蜂窝爬虫 (`mafengwo_scraper/`) 集成到现有的 Motia 爬虫服务中，使其成为生产可用的爬虫组件。当前马蜂窝爬虫已验证可行（通过移动版网站获取游记数据），但作为独立脚本存在，未与主系统数据流集成。

## What Changes

- 创建 Motia Step 将马蜂窝爬虫集成为 API 端点
- 实现 Convex 数据存储，将爬取结果写入 `travelGuides` 表
- 支持按城市/关键词批量爬取游记列表
- 支持单篇游记详情获取
- 复用现有 Stagehand + Kernel.sh 云浏览器方案

## Capabilities

### New Capabilities

- `mafengwo-crawler-service`: Motia 服务层，提供 API 端点和事件驱动的爬取流程
- `mafengwo-data-converter`: 将爬取的原始数据转换为 TravelGuide 格式并存储到 Convex

### Modified Capabilities

_无需修改现有规格_

## Impact

- **新增代码**:
  - `/apps/motia/src/api/mafengwo-crawler.step.ts` - Motia API 端点
  - `/apps/motia/src/api/mafengwo-sync.step.ts` - 批量同步 step
  - `/packages/crawler-types/src/mafengwo.ts` - 马蜂窝特定类型

- **依赖**:
  - `@browserbasehq/stagehand` - AI 浏览器自动化
  - `@onkernel/sdk` - Kernel.sh 云浏览器
  - `zod` - 数据验证

- **Convex**:
  - 使用现有 `travelGuides` 表（已支持 `mafengwo` 平台）
  - 调用 `travelGuides.upsert` mutation

- **环境变量**:
  - `KERNEL_API_KEY` - Kernel.sh API 密钥
  - `OPENAI_API_KEY` (可选) - AI 提取增强
