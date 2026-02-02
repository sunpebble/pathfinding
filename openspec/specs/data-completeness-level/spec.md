## ADDED Requirements

### Requirement: Completeness level calculation
系统 SHALL 根据字段填充情况自动计算数据完整性等级。

#### Scenario: Complete level assignment
- **WHEN** 数据满足以下全部条件：title 非空、content ≥ 500 字符、coverImageUrl 或 imageUrls 非空、authorName 非空、destinations 非空、无截断标记
- **THEN** 系统标记 completenessLevel: "complete"

#### Scenario: Usable level assignment
- **WHEN** 数据满足：title 非空、content ≥ 200 字符、imageUrls 至少一张图片
- **WHEN** 但不满足 complete 级别的全部条件
- **THEN** 系统标记 completenessLevel: "usable"

#### Scenario: Incomplete level assignment
- **WHEN** 数据缺少 title 或 content < 200 字符或无任何图片
- **THEN** 系统标记 completenessLevel: "incomplete"

### Requirement: Completeness level storage
系统 SHALL 将 completenessLevel 作为持久化字段存储在数据库中。

#### Scenario: Field persisted on insert
- **WHEN** 新攻略数据通过验证并入库
- **THEN** completenessLevel 字段与数据一起存储
- **THEN** 可通过索引查询该字段

#### Scenario: Field updated on data change
- **WHEN** 攻略数据被更新（如二次爬取补全内容）
- **THEN** 系统重新计算 completenessLevel
- **THEN** 更新存储的值

### Requirement: Query by completeness level
系统 SHALL 支持按完整性等级筛选查询攻略数据。

#### Scenario: Filter complete guides only
- **WHEN** 查询参数 completenessLevel: "complete"
- **THEN** 只返回 completenessLevel 为 "complete" 的攻略

#### Scenario: Filter multiple levels
- **WHEN** 查询参数 completenessLevel: ["complete", "usable"]
- **THEN** 返回 completenessLevel 为 "complete" 或 "usable" 的攻略

#### Scenario: Default query behavior
- **WHEN** 查询不指定 completenessLevel 参数
- **THEN** 返回所有等级的攻略（向后兼容）
