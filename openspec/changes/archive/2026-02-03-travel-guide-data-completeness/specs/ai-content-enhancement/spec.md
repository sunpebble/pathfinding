## ADDED Requirements

### Requirement: AI title generation

系统 SHALL 使用 AI 为缺失标题的攻略生成标题。

#### Scenario: Generate title from content

- **WHEN** 攻略 title 为空或 null
- **WHEN** 调用 AI 补全接口
- **THEN** 从 content 前 1000 字符提取/生成标题
- **THEN** 标题长度不超过 50 字符

#### Scenario: Title already exists

- **WHEN** 攻略已有 title
- **WHEN** 调用 AI 补全接口
- **THEN** 保留原有标题，不覆盖

### Requirement: AI summary generation

系统 SHALL 使用 AI 为长文章生成摘要。

#### Scenario: Generate summary for long content

- **WHEN** 攻略 content 超过 500 字符
- **WHEN** summary 字段为空
- **THEN** 生成 100-200 字符的摘要
- **THEN** 摘要保存到 summary 字段

#### Scenario: Short content no summary

- **WHEN** 攻略 content 不超过 500 字符
- **THEN** 不生成摘要（content 本身足够短）

### Requirement: Batch enhancement API

系统 SHALL 提供批量 AI 增强接口，减少 API 调用次数。

#### Scenario: Batch enhance multiple guides

- **WHEN** 调用 POST /api/ai/enhance 传入最多 10 个攻略 ID
- **THEN** 批量处理所有攻略
- **THEN** 返回每个攻略的增强结果

#### Scenario: Partial batch failure

- **WHEN** 批量处理中部分攻略失败
- **THEN** 成功的攻略正常更新
- **THEN** 返回结果包含每个攻略的状态（success/failed）

### Requirement: Enhancement triggers completeness recalculation

系统 SHALL 在 AI 增强后重新计算完整性等级。

#### Scenario: Level upgrade after enhancement

- **WHEN** AI 补全了缺失的 title
- **WHEN** 原 completenessLevel 为 "incomplete"
- **THEN** 重新计算 completenessLevel
- **THEN** 如满足条件，升级为 "usable" 或 "complete"

### Requirement: Enhancement priority

系统 SHALL 优先增强 "usable" 级别的数据。

#### Scenario: Prioritize usable over incomplete

- **WHEN** 触发批量增强任务
- **THEN** 优先处理 completenessLevel 为 "usable" 的攻略
- **THEN** "incomplete" 级别攻略优先触发二次爬取而非 AI 补全
