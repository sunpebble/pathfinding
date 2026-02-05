## Why

当前项目测试覆盖率不均衡：部分核心模块（如 `convex/` 下的 90+ 个文件）几乎没有测试，而 `packages/` 下的工具库覆盖较好。关键业务逻辑缺乏测试保护，增加了重构和迭代的风险。

## What Changes

- 为 Convex 核心模块添加单元测试（travelGuides、guideDestinations、guideAggregates 等）
- 为 AI Service 的爬虫模块补充测试（xiaohongshu、mafengwo、ctrip 等平台爬虫）
- 为 LLM 集成层添加测试（claude、ollama、openai providers）
- 建立测试覆盖率基线和 CI 门槛

## Capabilities

### New Capabilities

- `test-coverage-standards`: 定义测试覆盖率标准和 CI 集成规范

### Modified Capabilities

（无需修改现有 spec 级别的行为）

## Impact

- **代码**: `convex/*.ts`, `apps/ai-service/src/**/*.ts`
- **CI**: 需要配置覆盖率报告和门槛检查
- **开发流程**: 新增代码需要满足覆盖率要求
