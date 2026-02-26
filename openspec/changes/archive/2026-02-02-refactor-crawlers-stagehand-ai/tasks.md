## 1. 基类完善

- [x] 1.1 确认 `AICrawlerBase` 基类已包含所有必要的抽象方法定义
- [x] 1.2 添加 `isPageContentValid()` 方法用于检测 WAF 拦截
- [x] 1.3 添加 `navigateWithRetry()` 方法实现带重试的页面导航
- [x] 1.4 确保 `AISchemas.guideListItem` 和 `AISchemas.guideDetail` schema 完整

## 2. 马蜂窝爬虫重构

- [x] 2.1 确认 `MafengwoCrawler` 继承自 `AICrawlerBase`
- [x] 2.2 实现 `getListPageUrl()` 方法生成列表页 URL
- [x] 2.3 实现 `getCityId()` 城市名称到 ID 映射
- [x] 2.4 实现 `getSourceExternalId()` 从 URL 提取文章 ID
- [x] 2.5 移除旧的硬编码 CSS 选择器逻辑

## 3. 去哪儿爬虫重构

- [x] 3.1 重构 `QunarCrawler` 继承自 `AICrawlerBase`
- [x] 3.2 实现 `getListPageUrl()` 方法
- [x] 3.3 实现 `getCityId()` 城市映射
- [x] 3.4 实现 `getSourceExternalId()` 方法
- [x] 3.5 移除旧的选择器逻辑

## 4. 穷游爬虫重构

- [x] 4.1 重构 `QyerCrawler` 继承自 `AICrawlerBase`
- [x] 4.2 实现 `getListPageUrl()` 方法
- [x] 4.3 实现 `getCityId()` 城市映射
- [x] 4.4 实现 `getSourceExternalId()` 方法
- [x] 4.5 移除旧的选择器逻辑

## 5. 同程爬虫重构

- [x] 5.1 重构 `TongchengCrawler` 继承自 `AICrawlerBase`
- [x] 5.2 实现 `getListPageUrl()` 方法
- [x] 5.3 实现 `getCityId()` 城市映射
- [x] 5.4 实现 `getSourceExternalId()` 方法
- [x] 5.5 移除旧的选择器逻辑

## 6. 统一入口和测试

- [x] 6.1 更新 `crawlers/index.ts` 导出统一的 `crawlPlatform()` 函数
- [x] 6.2 确保 `CrawlResult` 接口保持不变
- [x] 6.3 验证 `crawl-all-platforms.ts` 脚本正常工作
- [x] 6.4 清理不再使用的旧代码

### 代码审查结论

以下代码保留，暂不清理：

- `ctrip.ts` - 携程爬虫，暂未迁移到 AI 架构（功能正常）
- `xiaohongshu.ts` - 小红书爬虫，有独特需求（视频提取等）
- `stagehand/` - 旧提取器，可能有其他模块依赖
- `accessibility-parser.ts` - 被 ctrip.ts 使用

四大平台（马蜂窝、去哪儿、穷游、同程）已全部迁移到 `AICrawlerBase` 架构。
