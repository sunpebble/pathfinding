## ADDED Requirements

### Requirement: Destination index lookup

系统 SHALL 提供通过目的地名称查询攻略的索引化查询能力，时间复杂度为 O(1)。

#### Scenario: Query guides by destination

- **WHEN** 用户调用 `getByDestination("北京")` 查询
- **THEN** 系统通过 guideDestinations 辅助表索引查询，返回所有包含"北京"目的地的攻略
- **THEN** 查询不使用全表扫描（不调用 `.collect()`）

#### Scenario: Destination with partial match

- **WHEN** 用户查询目的地 "京" 进行模糊匹配
- **THEN** 系统使用搜索索引或前缀匹配，返回包含 "北京"、"南京"、"东京" 的攻略

### Requirement: Guide destinations synchronization

系统 SHALL 在攻略创建或更新时，自动同步 guideDestinations 辅助表。

#### Scenario: Create guide with destinations

- **WHEN** 创建包含 destinations: ["北京", "上海"] 的攻略
- **THEN** 系统在 guideDestinations 表中插入两条记录，分别关联 "北京" 和 "上海"

#### Scenario: Update guide destinations

- **WHEN** 更新攻略的 destinations 从 ["北京"] 改为 ["上海", "广州"]
- **THEN** 系统删除 "北京" 的关联记录，插入 "上海" 和 "广州" 的关联记录

### Requirement: Efficient count query

系统 SHALL 提供 O(1) 时间复杂度的攻略计数查询。

#### Scenario: Get total guide count

- **WHEN** 调用 `count()` 查询总攻略数
- **THEN** 系统使用 Aggregates 组件返回预计算的计数值
- **THEN** 不遍历所有记录

#### Scenario: Count by platform

- **WHEN** 调用 `countByPlatform("xiaohongshu")` 查询特定平台攻略数
- **THEN** 系统返回该平台的预计算计数值

### Requirement: Count synchronization

系统 SHALL 在攻略增删时自动更新计数器。

#### Scenario: Insert new guide

- **WHEN** 插入新攻略到 xiaohongshu 平台
- **THEN** 总计数器 +1
- **THEN** xiaohongshu 平台计数器 +1

#### Scenario: Delete guide

- **WHEN** 删除一条 weibo 平台的攻略
- **THEN** 总计数器 -1
- **THEN** weibo 平台计数器 -1

### Requirement: Pagination optimization

系统 SHALL 为所有列表查询提供基于游标的分页。

#### Scenario: Paginated destination query

- **WHEN** 查询 "北京" 目的地的攻略，limit=20
- **THEN** 返回前 20 条结果和 continueCursor
- **THEN** 使用 cursor 可获取下一页，无需重新扫描已返回的数据
