## Context

当前 `apps/ai-service/src/lib/crawlers/` 目录下存在多个平台特定爬虫实现：

- `mafengwo.ts`, `qunar.ts`, `qyer.ts`, `tongcheng.ts`, `ctrip.ts`, `xiaohongshu.ts`

这些爬虫存在以下问题：

1. 大量重复代码（导航、滚动、错误处理）
2. 硬编码的 CSS 选择器，网站结构变化时容易失效
3. 不一致的实现模式和错误处理
4. 难以添加新平台

已有的基础设施：

- `AICrawlerBase` 基类提供了统一的 AI 提取能力
- `AntiDetectionBrowserClient` 提供了反检测浏览器客户端
- `extractWithDirectLLM()` 支持自定义 LLM API

## Goals / Non-Goals

**Goals:**

- 统一所有平台爬虫继承自 `AICrawlerBase`
- 使用 AI 驱动的内容提取替代硬编码选择器
- 简化平台适配器，只需实现 URL 生成和城市映射
- 保持现有的 `CrawlResult` 接口不变

**Non-Goals:**

- 不改变外部 API 接口
- 不添加新的爬虫平台
- 不修改数据存储逻辑

## Decisions

### 1. 采用模板方法模式

**决策**: 平台爬虫只需实现抽象方法，基类处理通用逻辑

**原因**: 减少代码重复，确保一致的行为

**替代方案**: 组合模式 - 但会增加复杂度，不适合当前规模

### 2. 使用 LLM 提取而非 CSS 选择器

**决策**: 通过 `extractWithDirectLLM()` 使用 Zod schema 驱动的 LLM 提取

**原因**:

- 对网站结构变化更具鲁棒性
- 减少维护成本
- 已验证可行（mafengwo 已实现）

**替代方案**: 保留 CSS 选择器 - 但维护成本高

### 3. 平台适配器最小化

**决策**: 每个平台只需实现 3 个方法：

- `getListPageUrl(city, page)` - 生成列表页 URL
- `getCityId(city)` - 城市名到 ID 映射
- `getSourceExternalId(url)` - 从 URL 提取文章 ID

**原因**: 最大化代码复用，简化新平台添加

## Risks / Trade-offs

| 风险             | 缓解措施                               |
| ---------------- | -------------------------------------- |
| LLM 提取成本增加 | 使用缓存、批量处理、选择性价比高的模型 |
| LLM 响应不稳定   | Schema 验证 + 重试逻辑                 |
| 迁移期间功能回归 | 保留原有爬虫代码直到新实现验证通过     |
