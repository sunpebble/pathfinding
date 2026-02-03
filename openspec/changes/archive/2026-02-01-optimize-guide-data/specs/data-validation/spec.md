## ADDED Requirements

### Requirement: Required fields definition
系统 SHALL 定义攻略数据的必填字段，拒绝不完整的数据。

#### Scenario: Valid guide with all required fields
- **WHEN** 提交包含 sourcePlatform, sourceExternalId, content, destinations 的攻略
- **THEN** 系统接受并存储该数据

#### Scenario: Missing required field
- **WHEN** 提交缺少 content 字段的攻略
- **THEN** 系统拒绝该数据
- **THEN** 返回错误 `{ field: "content", error: "required" }`

#### Scenario: Empty required array
- **WHEN** 提交 destinations: [] 空数组
- **THEN** 系统拒绝该数据
- **THEN** 返回错误 `{ field: "destinations", error: "must have at least one item" }`

### Requirement: Content quality validation
系统 SHALL 验证内容字段的质量，拒绝低质量数据。

#### Scenario: Content too short
- **WHEN** 提交 content 长度小于 200 字符的攻略
- **THEN** 系统拒绝该数据
- **THEN** 返回错误 `{ field: "content", error: "minimum length is 200 characters" }`

#### Scenario: Truncated content detection
- **WHEN** 提交 content 以 "..." 或 "[查看更多]" 结尾
- **THEN** 系统标记 qualityScore 降低
- **THEN** 记录 contentTruncated: true 标志

#### Scenario: Duplicate content detection
- **WHEN** 提交与现有攻略 contentHash 相同的内容
- **THEN** 系统拒绝插入新记录
- **THEN** 返回现有记录的 ID

### Requirement: Numeric fields validation
系统 SHALL 验证数值字段的合理范围。

#### Scenario: Negative count rejected
- **WHEN** 提交 likesCount: -1
- **THEN** 系统拒绝该数据
- **THEN** 返回错误 `{ field: "likesCount", error: "must be non-negative" }`

#### Scenario: Quality score range
- **WHEN** 提交 qualityScore: 1.5（超出 0-1 范围）
- **THEN** 系统拒绝该数据
- **THEN** 返回错误 `{ field: "qualityScore", error: "must be between 0 and 1" }`

### Requirement: Validation at crawler layer
系统 SHALL 在爬虫 API 入口执行数据验证，在入库前拒绝无效数据。

#### Scenario: Crawler API validation
- **WHEN** 爬虫 API `/api/crawler/guides` 接收数据
- **THEN** 在调用 convex mutation 前执行验证
- **THEN** 无效数据返回 400 Bad Request

#### Scenario: Batch validation
- **WHEN** 批量提交 10 条攻略，其中 2 条无效
- **THEN** 系统拒绝整个批次
- **THEN** 返回所有验证错误的列表

### Requirement: Validation error reporting
系统 SHALL 提供详细的验证错误报告。

#### Scenario: Multiple validation errors
- **WHEN** 提交同时缺少 content 和 destinations 的数据
- **THEN** 返回包含两个错误的数组
- **THEN** 每个错误包含 field, error, received 字段
