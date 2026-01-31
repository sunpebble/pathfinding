## ADDED Requirements

### Requirement: Type converter functions
系统 SHALL 提供 snake_case 和 camelCase 之间的双向类型转换函数。

#### Scenario: Convert crawler data to convex format
- **WHEN** 爬虫返回 `{ source_platform: "xiaohongshu", source_external_id: "123" }`
- **THEN** 调用 `toCamelCase()` 转换为 `{ sourcePlatform: "xiaohongshu", sourceExternalId: "123" }`

#### Scenario: Convert convex data to API format
- **WHEN** 需要返回 API 响应
- **THEN** 调用 `toSnakeCase()` 将 camelCase 数据转换为 snake_case

#### Scenario: Nested object conversion
- **WHEN** 转换包含嵌套对象的数据 `{ ai_days: [{ day_number: 1, pois: [...] }] }`
- **THEN** 递归转换所有嵌套层级的键名

### Requirement: Type definitions alignment
系统 SHALL 在 crawler-types 包中提供与 convex schema 对齐的类型定义。

#### Scenario: Import crawler types in convex
- **WHEN** convex 代码需要使用爬虫数据类型
- **THEN** 从 `@pathfinding/crawler-types` 导入类型
- **THEN** 类型与 convex schema 定义兼容

#### Scenario: Type safety on conversion
- **WHEN** 使用 `toCamelCase<TravelGuide>(crawlerData)`
- **THEN** TypeScript 编译器验证转换结果类型正确
- **THEN** 缺失必填字段时编译报错

### Requirement: Platform enum consistency
系统 SHALL 保持平台枚举值在所有层的一致性。

#### Scenario: Valid platform value
- **WHEN** 爬虫提交 sourcePlatform = "xiaohongshu"
- **THEN** 该值在 crawler-types、convex schema、API 响应中均有效

#### Scenario: Invalid platform rejection
- **WHEN** 提交无效的 sourcePlatform = "unknown_platform"
- **THEN** convex validator 拒绝该数据
- **THEN** 返回明确的验证错误信息

### Requirement: Conversion at boundaries
系统 SHALL 仅在系统边界（API 入口/出口）执行类型转换。

#### Scenario: Crawler API receives data
- **WHEN** 爬虫 API 接收 snake_case 格式数据
- **THEN** 在 API 路由层转换为 camelCase
- **THEN** 后续所有内部处理使用 camelCase

#### Scenario: Internal function calls
- **WHEN** convex 内部函数相互调用
- **THEN** 全部使用 camelCase，不进行转换
