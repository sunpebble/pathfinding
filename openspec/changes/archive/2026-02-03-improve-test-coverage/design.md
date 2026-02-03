## Context

当前项目有 90+ 个 Convex 模块文件，但仅有 3 个测试文件覆盖。AI Service 有 70+ 个源文件，测试文件 6 个。核心业务逻辑（travelGuides、guideDestinations、guideAggregates）和爬虫模块（xiaohongshu、mafengwo 等）缺乏测试保护。

现有测试分布：
- `packages/crawler-types`: 76 tests (validators, converters)
- `packages/utils`: 40 tests (geoUtils, dateUtils)
- `apps/ai-service`: 65 tests (rate-limiter, retry-strategy, parallel-crawler)
- `convex/`: 65 tests (refetchTasks, travelGuides.query, displayFields)
- `apps/dashboard`: 30 tests (components)

## Goals / Non-Goals

**Goals:**
- 为 Convex 核心模块建立测试基线
- 为爬虫平台适配器添加单元测试
- 配置 CI 覆盖率门槛，防止覆盖率下降
- 建立测试编写规范

**Non-Goals:**
- 不追求 100% 覆盖率（目标 60-80%）
- 不为纯 schema 定义文件写测试
- 不为第三方 API 调用写集成测试（mock 即可）

## Decisions

### Decision 1: 优先覆盖核心业务逻辑

**选择**: 先覆盖 travelGuides、guideDestinations、guideAggregates 模块

**理由**: 
- 这些模块变更频繁，风险最高
- 已有 completenessLevel 等复杂逻辑需要保护
- 其他模块多为 CRUD 操作，风险较低

### Decision 2: 使用 Vitest 统一测试框架

**选择**: 所有包使用 Vitest，配置 workspace 级别覆盖率

**理由**:
- 项目已使用 Vitest
- 支持 ESM、TypeScript 开箱即用
- 与 Vite 生态集成良好

### Decision 3: CI 覆盖率门槛设为 60%

**选择**: 新代码 80%，整体 60%

**理由**:
- 现有代码覆盖率低，不能一步到位
- 60% 是合理的起点，可逐步提升
- 新代码要求更高，防止技术债务增长

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 测试编写耗时影响开发速度 | 优先覆盖核心模块，边际效益最大化 |
| Convex 模块测试需要 mock 数据库 | 使用纯函数提取逻辑，减少 DB 依赖 |
| 爬虫测试依赖外部页面结构 | 使用固定 HTML fixtures，不依赖实时爬取 |
