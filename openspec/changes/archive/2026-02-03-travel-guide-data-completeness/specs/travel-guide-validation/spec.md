## MODIFIED Requirements

### Requirement: Content quality validation
系统 SHALL 验证内容字段的质量，拒绝低质量数据。

#### Scenario: Content too short
- **WHEN** 提交 content 长度小于 500 字符的攻略
- **THEN** 系统标记 completenessLevel 为 "incomplete"
- **THEN** 数据仍可入库，但不作为优先展示

#### Scenario: Truncated content detection
- **WHEN** 提交 content 以 "..."、"[查看更多]"、"展开全文" 等模式结尾
- **THEN** 系统标记 contentTruncated: true
- **THEN** 系统标记 completenessLevel 为 "incomplete"
- **THEN** 触发二次爬取任务

#### Scenario: Duplicate content detection
- **WHEN** 提交与现有攻略 contentHash 相同的内容
- **THEN** 系统拒绝插入新记录
- **THEN** 返回现有记录的 ID

## ADDED Requirements

### Requirement: Title validation
系统 SHALL 验证标题字段，缺失标题影响完整性等级。

#### Scenario: Missing title
- **WHEN** 提交 title 为空或 null 的攻略
- **THEN** 数据可入库
- **THEN** completenessLevel 不能为 "complete"

#### Scenario: Title too long
- **WHEN** 提交 title 超过 100 字符
- **THEN** 自动截断到 100 字符
- **THEN** 记录 titleTruncated: true

### Requirement: Image validation
系统 SHALL 验证图片字段，无图片影响完整性等级。

#### Scenario: No images provided
- **WHEN** 提交 coverImageUrl 为空且 imageUrls 为空数组
- **THEN** 数据可入库
- **THEN** completenessLevel 不能为 "complete" 或 "usable"

#### Scenario: Cover image fallback
- **WHEN** coverImageUrl 为空但 imageUrls 非空
- **THEN** 自动将 imageUrls[0] 设置为 coverImageUrl

### Requirement: Author validation
系统 SHALL 验证作者字段，缺失作者影响完整性等级。

#### Scenario: Missing author
- **WHEN** 提交 authorName 为空或 null
- **THEN** 数据可入库
- **THEN** completenessLevel 不能为 "complete"

### Requirement: Validation severity levels
系统 SHALL 区分验证错误和验证警告。

#### Scenario: Error level validation
- **WHEN** 缺少 sourcePlatform、sourceExternalId、content、destinations 任一字段
- **THEN** 返回 400 Bad Request
- **THEN** 数据不入库

#### Scenario: Warning level validation
- **WHEN** 缺少 title、coverImageUrl、authorName 等非核心字段
- **THEN** 记录警告日志
- **THEN** 数据正常入库，completenessLevel 相应降低
