## ADDED Requirements

### Requirement: Coverage threshold enforcement
系统 SHALL 在 CI 中强制执行测试覆盖率门槛。

#### Scenario: New code coverage check
- **WHEN** PR 包含新增代码
- **THEN** 新代码覆盖率 SHALL 不低于 80%

#### Scenario: Overall coverage check
- **WHEN** 运行 CI 测试流程
- **THEN** 整体代码覆盖率 SHALL 不低于 60%

#### Scenario: Coverage regression prevention
- **WHEN** PR 导致覆盖率下降超过 2%
- **THEN** CI SHALL 失败并提示覆盖率变化

### Requirement: Core module test coverage
系统 SHALL 为核心业务模块提供测试覆盖。

#### Scenario: Convex travelGuides module
- **WHEN** 修改 `convex/travelGuides.ts`
- **THEN** 相关测试 SHALL 覆盖 upsert、查询筛选、completenessLevel 计算逻辑

#### Scenario: Convex guideDestinations module
- **WHEN** 修改 `convex/guideDestinations.ts`
- **THEN** 相关测试 SHALL 覆盖目的地同步、删除逻辑

#### Scenario: Convex guideAggregates module
- **WHEN** 修改 `convex/guideAggregates.ts`
- **THEN** 相关测试 SHALL 覆盖聚合更新逻辑

### Requirement: Crawler module test coverage
系统 SHALL 为爬虫模块提供测试覆盖。

#### Scenario: Platform crawler tests
- **WHEN** 修改平台爬虫（xiaohongshu、mafengwo、ctrip 等）
- **THEN** 相关测试 SHALL 使用 HTML fixtures 验证解析逻辑

#### Scenario: Content extraction tests
- **WHEN** 爬虫提取标题、内容、图片等字段
- **THEN** 测试 SHALL 验证各字段正确提取

### Requirement: LLM provider test coverage
系统 SHALL 为 LLM 集成层提供测试覆盖。

#### Scenario: Provider initialization
- **WHEN** 初始化 LLM provider（claude、ollama、openai）
- **THEN** 测试 SHALL 验证配置正确加载

#### Scenario: Provider fallback
- **WHEN** 主 provider 不可用
- **THEN** 测试 SHALL 验证 fallback 逻辑正确执行

### Requirement: Test file organization
测试文件 SHALL 遵循统一的组织规范。

#### Scenario: Co-located test files
- **WHEN** 为模块编写测试
- **THEN** 测试文件 SHALL 放在 `__tests__/` 目录或与源文件同级（`.test.ts` 后缀）

#### Scenario: Test naming convention
- **WHEN** 命名测试文件
- **THEN** 文件名 SHALL 为 `<module>.test.ts` 格式
