## Why

当前爬虫系统存在多个平台特定的爬虫实现（mafengwo.ts, qunar.ts, qyer.ts 等），每个都有重复的代码和不一致的实现模式。通过重构为统一的 Stagehand AI 驱动架构，可以减少代码重复、提高可维护性，并利用 AI 能力处理不同网站的动态结构变化。

## What Changes

- 统一所有平台爬虫继承自 `AICrawlerBase` 基类
- 使用 Stagehand AI 的 `extract()` 和 `act()` 方法替代硬编码的 CSS 选择器
- 通过 `extractWithDirectLLM()` 方法支持自定义 LLM API（如 Gemini）
- 简化平台特定爬虫，只需实现 URL 生成和城市映射
- 统一错误处理、重试逻辑和反检测策略

## Capabilities

### New Capabilities

- `ai-crawler-architecture`: 定义基于 Stagehand AI 的统一爬虫架构，包括基类设计、LLM 提取流程和平台适配器模式

### Modified Capabilities

- 无（这是架构重构，不修改现有 spec 级别的行为要求）

## Impact

- **代码文件**:
  - `apps/ai-service/src/lib/crawlers/ai-crawler-base.ts` - 核心基类
  - `apps/ai-service/src/lib/crawlers/mafengwo.ts` - 马蜂窝适配器
  - `apps/ai-service/src/lib/crawlers/qunar.ts` - 去哪儿适配器
  - `apps/ai-service/src/lib/crawlers/qyer.ts` - 穷游适配器
  - `apps/ai-service/src/lib/crawlers/tongcheng.ts` - 同程适配器
  - `apps/ai-service/src/lib/crawlers/clients/anti-detection-client.ts` - 浏览器客户端
- **依赖**: Stagehand SDK, OpenAI SDK (用于 LLM 调用)
- **API**: 无外部 API 变更，仅内部架构重构
