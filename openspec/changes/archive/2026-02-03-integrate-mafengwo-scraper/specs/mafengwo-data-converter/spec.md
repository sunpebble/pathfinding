## ADDED Requirements

### Requirement: 将爬取数据转换为 TravelGuide 格式
系统 SHALL 将从马蜂窝爬取的原始数据转换为 `TravelGuide` 类型，符合 Convex schema 定义。

#### Scenario: 字段映射
- **WHEN** 收到爬取的游记原始数据
- **THEN** 系统 SHALL 执行以下映射：
  - `title` → `title`
  - `content` → `content`
  - `author` → `authorName`
  - `url` → `sourceUrl`
  - 从 URL 提取 `/i/(\d+).html` → `sourceExternalId`
  - `views` → `viewsCount` (转换 "1.2万" 为 12000)
  - `likes` → `likesCount`
  - `cover_image` → `coverImageUrl`
  - `images` → `imageUrls`

#### Scenario: 浏览量格式转换
- **WHEN** 浏览量为 "1.2万" 格式
- **THEN** 系统 SHALL 转换为数字 12000

#### Scenario: 缺失字段处理
- **WHEN** 某些非必需字段缺失
- **THEN** 系统 SHALL 使用默认值（数字字段为 0，数组字段为 []）

### Requirement: 存储到 Convex travelGuides 表
系统 SHALL 将转换后的游记数据存储到 Convex `travelGuides` 表。

#### Scenario: 使用 upsert 防止重复
- **WHEN** 存储游记数据
- **THEN** 系统 SHALL 调用 `travelGuides.upsert` mutation，使用 `sourcePlatform` + `sourceExternalId` 作为去重键

#### Scenario: 更新已存在的游记
- **WHEN** 存储的游记 `sourceExternalId` 已存在
- **THEN** 系统 SHALL 更新已有记录而非创建新记录

#### Scenario: 设置必需的元数据
- **WHEN** 存储游记
- **THEN** 系统 SHALL 设置：
  - `sourcePlatform` = "mafengwo"
  - `crawledAt` = 当前时间戳
  - `qualityScore` = 基于内容长度和字段完整度计算 (0-1)
  - `completenessLevel` = 根据字段完整度判断 ("complete" | "usable" | "incomplete")

### Requirement: 计算数据质量分数
系统 SHALL 自动计算爬取数据的质量分数。

#### Scenario: 完整数据
- **WHEN** 游记包含 title、content(>=500字)、至少1张图片、作者信息
- **THEN** `qualityScore` >= 0.8，`completenessLevel` = "complete"

#### Scenario: 可用数据
- **WHEN** 游记包含 title、content(>=100字)、至少1张图片
- **THEN** `qualityScore` >= 0.5，`completenessLevel` = "usable"

#### Scenario: 不完整数据
- **WHEN** 游记缺少 title 或 content < 100 字
- **THEN** `qualityScore` < 0.5，`completenessLevel` = "incomplete"

### Requirement: 批量存储支持
系统 SHALL 支持批量存储多条游记数据。

#### Scenario: 批量 upsert
- **WHEN** 一次爬取返回多条游记
- **THEN** 系统 SHALL 使用 `travelGuides.bulkUpsert` mutation 批量存储

#### Scenario: 部分失败处理
- **WHEN** 批量存储中部分记录失败
- **THEN** 系统 SHALL 记录失败的记录并返回成功/失败计数

### Requirement: 监听爬取完成事件
系统 SHALL 订阅爬取完成事件并自动触发数据转换和存储。

#### Scenario: 响应详情爬取事件
- **WHEN** 收到 `crawler.mafengwo.detail.completed` 事件
- **THEN** 系统 SHALL 自动将游记数据转换并存储到 Convex

#### Scenario: 记录存储结果
- **WHEN** 存储完成
- **THEN** 系统 SHALL 发出 `crawler.mafengwo.saved` 事件，包含 `{ sourceExternalId, success, guideId }`
