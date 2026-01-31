## ADDED Requirements

### Requirement: Atomic upsert deduplication
系统 SHALL 在 upsert 操作时利用唯一索引实现即时去重，无需事后清理。

#### Scenario: Insert new guide
- **WHEN** upsert 一条 sourcePlatform="xiaohongshu", sourceExternalId="abc123" 的新攻略
- **THEN** 系统通过 by_platform_external 索引检查不存在后插入
- **THEN** 返回新创建的 guideId

#### Scenario: Update existing guide
- **WHEN** upsert 一条已存在的 sourcePlatform + sourceExternalId 组合
- **THEN** 系统更新现有记录而非创建新记录
- **THEN** 保留原有的 _id 和 _creationTime

#### Scenario: Concurrent upsert same guide
- **WHEN** 两个并发请求 upsert 相同的 sourcePlatform + sourceExternalId
- **THEN** 只有一个请求成功插入，另一个执行更新
- **THEN** 最终数据库只有一条记录

### Requirement: Remove legacy duplicate cleanup
系统 SHALL 移除事后去重逻辑，减少不必要的数据库操作。

#### Scenario: Upsert without duplicate check
- **WHEN** 调用 upsert 插入数据
- **THEN** 不触发 removeDuplicates 函数
- **THEN** 不遍历其他平台的数据

### Requirement: Bulk upsert optimization
系统 SHALL 提供批量 upsert 功能，支持高效的批量数据导入。

#### Scenario: Bulk upsert 100 guides
- **WHEN** 调用 `bulkUpsert` 批量插入 100 条攻略
- **THEN** 对每条记录执行 upsert 逻辑（检查存在则更新，否则插入）
- **THEN** 返回 { inserted: N, updated: M } 统计

#### Scenario: Bulk upsert with duplicates in batch
- **WHEN** 批量 upsert 包含 2 条相同 sourcePlatform + sourceExternalId 的数据
- **THEN** 第一条插入，第二条更新第一条的结果
- **THEN** 最终只有 1 条记录

### Requirement: Migration cleanup
系统 SHALL 提供一次性清理现有重复数据的迁移功能。

#### Scenario: One-time duplicate cleanup
- **WHEN** 执行迁移脚本 `cleanupExistingDuplicates`
- **THEN** 扫描所有存在重复的 sourcePlatform + sourceExternalId 组合
- **THEN** 保留内容最长、质量分最高、有 AI 数据的版本
- **THEN** 删除其他重复记录
- **THEN** 迁移完成后该函数可以移除
