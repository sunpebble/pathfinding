## ADDED Requirements

### Requirement: AICrawlerBase 基类提供统一的爬取流程
系统 SHALL 提供一个抽象基类 `AICrawlerBase`，封装所有平台通用的爬取逻辑，包括浏览器初始化、页面导航、内容滚动、AI 提取和结果转换。

#### Scenario: 平台爬虫继承基类
- **WHEN** 开发者创建新的平台爬虫
- **THEN** 只需继承 `AICrawlerBase` 并实现 3 个抽象方法即可完成爬虫开发

#### Scenario: 基类处理通用流程
- **WHEN** 调用平台爬虫的 `crawl(city)` 方法
- **THEN** 基类自动处理浏览器初始化、列表页遍历、详情页提取和结果汇总

### Requirement: 平台适配器实现最小接口
每个平台爬虫 SHALL 只需实现以下 3 个抽象方法：
- `getListPageUrl(city, page)`: 生成列表页 URL
- `getCityId(city)`: 城市名称到平台 ID 的映射
- `getSourceExternalId(url)`: 从 URL 提取文章唯一标识

#### Scenario: 马蜂窝适配器实现
- **WHEN** 创建马蜂窝爬虫类
- **THEN** 只需实现城市 ID 映射（如 "成都" -> "10332"）和 URL 模板

#### Scenario: 添加新平台
- **WHEN** 需要支持新的旅游网站
- **THEN** 创建一个新类继承 `AICrawlerBase`，实现 3 个方法，无需复制粘贴任何爬取逻辑

### Requirement: AI 驱动的内容提取
系统 SHALL 使用 LLM 进行结构化数据提取，通过 Zod schema 定义期望的数据结构，替代硬编码的 CSS 选择器。

#### Scenario: 列表页提取
- **WHEN** 访问游记列表页
- **THEN** 使用 `extractWithDirectLLM()` 配合 `AISchemas.guideListItem` schema 提取文章链接列表

#### Scenario: 详情页提取
- **WHEN** 访问游记详情页
- **THEN** 使用 `extractWithDirectLLM()` 配合 `AISchemas.guideDetail` schema 提取完整文章内容

#### Scenario: Schema 验证失败
- **WHEN** LLM 返回的数据不符合 Zod schema
- **THEN** 系统记录错误日志并返回空结果，不中断爬取流程

### Requirement: 统一的错误处理和重试逻辑
基类 SHALL 提供统一的错误处理机制，包括页面加载失败重试、内容验证和反检测策略。

#### Scenario: 页面内容过短检测
- **WHEN** 获取到的页面内容小于 10KB
- **THEN** 系统判定为 WAF 拦截，自动重试最多 3 次

#### Scenario: 导航重试
- **WHEN** 页面导航失败或超时
- **THEN** 使用指数退避策略重试，最多 3 次

### Requirement: 保持输出接口不变
重构后的爬虫 SHALL 保持 `CrawlResult` 接口不变，确保下游代码（数据存储、API）无需修改。

#### Scenario: 返回类型兼容
- **WHEN** 调用任何平台爬虫的 `crawl()` 方法
- **THEN** 返回 `CrawlResult[]` 类型，包含 title, content, sourceUrl, authorName 等标准字段
