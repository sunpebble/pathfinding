## ADDED Requirements

### Requirement: Separate AI data table

系统 SHALL 将 AI 处理结果存储在独立的 travelGuideAiData 表中，与原始攻略数据解耦。

#### Scenario: Store AI processing result

- **WHEN** AI 处理完成一条攻略
- **THEN** 系统在 travelGuideAiData 表中创建新记录
- **THEN** 记录包含 guideId、version、aiSummary、aiDays 等字段
- **THEN** 原始 travelGuides 表不存储 AI 处理结果

#### Scenario: Query guide with AI data

- **WHEN** 调用 `getGuideWithAiData(guideId)`
- **THEN** 系统返回攻略基础信息和最新版本的 AI 数据
- **THEN** 单次查询返回联合结果

### Requirement: AI data versioning

系统 SHALL 支持 AI 处理结果的版本管理。

#### Scenario: Reprocess guide with new model

- **WHEN** 使用新版本 AI 模型重新处理攻略
- **THEN** 系统创建新版本的 AI 数据记录（version +1）
- **THEN** 保留旧版本数据不删除

#### Scenario: Query specific version

- **WHEN** 调用 `getAiData(guideId, version=2)`
- **THEN** 系统返回指定版本的 AI 处理结果

#### Scenario: Get latest version

- **WHEN** 调用 `getAiData(guideId)` 不指定版本
- **THEN** 系统返回最新版本的 AI 处理结果

### Requirement: AI data migration

系统 SHALL 提供从现有 travelGuides 表迁移 AI 字段的能力。

#### Scenario: Migrate existing AI data

- **WHEN** 执行迁移脚本
- **THEN** 系统将所有 aiProcessedAt 非空的攻略的 AI 字段复制到 travelGuideAiData 表
- **THEN** version 设为 1
- **THEN** 迁移过程分批执行，每批 100 条

#### Scenario: Verify migration integrity

- **WHEN** 迁移完成后执行验证
- **THEN** travelGuideAiData 表记录数等于原表 aiProcessedAt 非空的记录数
- **THEN** 随机抽样 100 条验证数据一致性

### Requirement: Geocoding metrics tracking

系统 SHALL 在 AI 数据表中跟踪地理编码质量指标。

#### Scenario: Store geocoding metrics

- **WHEN** AI 处理包含 POI 地理编码
- **THEN** 系统计算并存储 geocodingMetrics：totalPois、averageConfidence、lowConfidenceCount

#### Scenario: Query low confidence guides

- **WHEN** 调用 `getGuidesWithLowConfidence(threshold=0.5)`
- **THEN** 系统返回 averageConfidence < 0.5 的攻略列表
- **THEN** 使用索引查询，不全表扫描
