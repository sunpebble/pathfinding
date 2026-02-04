## ADDED Requirements

### Requirement: 马蜂窝游记列表爬取 API
系统 SHALL 提供 Motia API 端点 `POST /api/crawler/mafengwo/list`，接收城市名称并返回该城市的游记 URL 列表。

#### Scenario: 成功爬取城市游记列表
- **WHEN** 调用 `/api/crawler/mafengwo/list` 并传入 `{ "city": "成都" }`
- **THEN** 返回包含游记 URL 数组的响应，格式为 `{ "success": true, "urls": ["https://m.mafengwo.cn/i/xxx.html", ...], "count": 18 }`

#### Scenario: 城市名称无效
- **WHEN** 调用 `/api/crawler/mafengwo/list` 并传入 `{ "city": "" }` 或无效城市
- **THEN** 返回 400 错误 `{ "success": false, "error": "Invalid city name" }`

#### Scenario: Kernel.sh 连接失败
- **WHEN** Kernel.sh API 不可用或超时
- **THEN** 返回 503 错误 `{ "success": false, "error": "Browser service unavailable" }`

### Requirement: 马蜂窝游记详情爬取 API
系统 SHALL 提供 Motia API 端点 `POST /api/crawler/mafengwo/detail`，接收游记 URL 并返回完整游记内容。

#### Scenario: 成功爬取游记详情
- **WHEN** 调用 `/api/crawler/mafengwo/detail` 并传入 `{ "url": "https://m.mafengwo.cn/i/24648165.html" }`
- **THEN** 返回游记内容 `{ "success": true, "data": { "title": "...", "content": "...", "author": "...", ... } }`

#### Scenario: 游记不存在
- **WHEN** 传入的 URL 对应的游记已被删除
- **THEN** 返回 404 错误 `{ "success": false, "error": "Guide not found" }`

#### Scenario: 游记内容过短
- **WHEN** 爬取到的内容长度小于 100 字符
- **THEN** 系统判定为 WAF 拦截，自动重试最多 3 次

### Requirement: 使用 Kernel.sh 云浏览器
系统 SHALL 使用 Kernel.sh 云浏览器执行爬取，启用 Stealth 模式以绑过反爬虫检测。

#### Scenario: 创建 Stealth 浏览器会话
- **WHEN** 执行爬取任务
- **THEN** 系统通过 `@onkernel/sdk` 创建浏览器实例，设置 `{ stealth: true, timeout: 60000 }`

#### Scenario: 爬取完成后释放浏览器
- **WHEN** 爬取任务完成（成功或失败）
- **THEN** 系统 SHALL 调用 `kernel.browsers.deleteByID()` 释放浏览器资源

#### Scenario: 环境变量缺失
- **WHEN** `KERNEL_API_KEY` 环境变量未设置
- **THEN** 服务启动时 SHALL 记录错误日志并返回明确的配置错误

### Requirement: 使用移动版网站
系统 SHALL 爬取马蜂窝移动版 `m.mafengwo.cn` 而非 PC 版，以获得更高的成功率。

#### Scenario: 列表页 URL 格式
- **WHEN** 爬取城市游记列表
- **THEN** 访问 `https://m.mafengwo.cn/note/` 并通过滚动加载更多内容

#### Scenario: 详情页 URL 格式
- **WHEN** 爬取游记详情
- **THEN** 访问 `https://m.mafengwo.cn/i/{id}.html` 格式的 URL

### Requirement: 发出爬取完成事件
系统 SHALL 在成功爬取游记后发出 Motia 事件，供下游处理。

#### Scenario: 列表爬取完成事件
- **WHEN** 成功爬取游记列表
- **THEN** 发出事件 `{ topic: "crawler.mafengwo.list.completed", data: { city, urls, count } }`

#### Scenario: 详情爬取完成事件
- **WHEN** 成功爬取游记详情
- **THEN** 发出事件 `{ topic: "crawler.mafengwo.detail.completed", data: { url, guide } }`
