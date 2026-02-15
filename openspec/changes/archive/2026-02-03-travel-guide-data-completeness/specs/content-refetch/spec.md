## ADDED Requirements

### Requirement: Truncation detection triggers refetch

系统 SHALL 在检测到内容截断时自动触发二次爬取任务。

#### Scenario: Truncation pattern detected

- **WHEN** 攻略 content 匹配截断模式（"..."、"[查看更多]"、"展开全文" 等）
- **THEN** 系统创建二次爬取任务
- **THEN** 任务包含 sourceUrl 和 sourceExternalId

#### Scenario: No truncation detected

- **WHEN** 攻略 content 不匹配任何截断模式
- **THEN** 系统不创建二次爬取任务

### Requirement: Async refetch queue

系统 SHALL 使用异步队列处理二次爬取任务，避免阻塞主流程。

#### Scenario: Task queued successfully

- **WHEN** 截断检测触发二次爬取
- **THEN** 任务加入 Convex scheduled function 队列
- **THEN** 首次入库流程正常完成，不等待二次爬取

#### Scenario: Task execution with rate limiting

- **WHEN** 二次爬取任务执行
- **THEN** 遵守 platform-rate-limiter 的频率限制
- **THEN** 任务间隔不少于平台配置的最小间隔

### Requirement: Refetch result merging

系统 SHALL 将二次爬取的完整内容合并到原有记录。

#### Scenario: Successful refetch merge

- **WHEN** 二次爬取成功获取完整内容
- **THEN** 更新原记录的 content 字段
- **THEN** 移除 contentTruncated 标记
- **THEN** 重新计算 completenessLevel

#### Scenario: Refetch failure handling

- **WHEN** 二次爬取失败（网络错误、页面不存在等）
- **THEN** 记录失败原因到任务日志
- **THEN** 根据 smart-retry-strategy 决定是否重试
- **THEN** 原记录保持不变

### Requirement: Refetch task status tracking

系统 SHALL 追踪二次爬取任务的状态。

#### Scenario: Task status transitions

- **WHEN** 任务创建
- **THEN** 状态为 "pending"
- **WHEN** 任务开始执行
- **THEN** 状态为 "running"
- **WHEN** 任务完成
- **THEN** 状态为 "completed" 或 "failed"

#### Scenario: Query pending refetch tasks

- **WHEN** 查询 refetch 任务列表
- **THEN** 返回任务 ID、关联攻略 ID、状态、创建时间、重试次数
