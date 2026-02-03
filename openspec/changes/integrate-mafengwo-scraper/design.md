## Context

当前项目使用 Motia 事件驱动框架作为后端服务。现有的爬虫 API (`/api/crawler/fetch`) 使用简单的 HTTP fetch，无法处理需要 JavaScript 渲染的页面（如马蜂窝）。

已在 `mafengwo_scraper/` 目录验证了多种爬取方案：
- 本地 Puppeteer + Stealth：可获取 32 条游记
- Kernel.sh 云浏览器 + Stagehand：可获取 18 条游记
- 移动版网站 (`m.mafengwo.cn`) 反爬虫保护较弱，是最佳入口

现有 Convex schema 已支持 `mafengwo` 平台，可直接写入 `travelGuides` 表。

## Goals / Non-Goals

**Goals:**
- 将马蜂窝爬虫集成为 Motia API 端点
- 支持按城市批量爬取游记列表
- 支持单篇游记详情获取
- 爬取结果自动存储到 Convex
- 使用 Kernel.sh 云浏览器，无需本地安装

**Non-Goals:**
- 不实现完整的 AICrawlerBase 基类（留待后续重构）
- 不支持 PC 版网站（反爬虫太强）
- 不实现 AI 内容增强（使用现有流程）
- 不实现定时爬取（使用现有 cron 机制）

## Decisions

### Decision 1: 使用 Kernel.sh 云浏览器

**选择**: Kernel.sh + Stagehand 框架

**替代方案**:
- ❌ 本地 Puppeteer：需要服务器安装 Chromium，部署复杂
- ❌ Apify：需要额外平台账号，成本较高
- ❌ Browserbase：Stagehand 官方方案，但 Kernel.sh 更便宜

**理由**:
- Kernel.sh 提供 Stealth 模式，内置反检测
- 按需创建/销毁浏览器，无长期成本
- 通过 CDP WebSocket 连接，与 Playwright 兼容

### Decision 2: 使用移动版网站

**选择**: `m.mafengwo.cn` 移动版

**替代方案**:
- ❌ PC 版 `www.mafengwo.cn`：有腾讯验证码 + CHAOS 混淆

**理由**:
- 移动版反爬虫保护较弱
- 数据结构更简单，提取更可靠
- 已验证可获取完整游记内容

### Decision 3: 分离列表爬取和详情爬取

**选择**: 两个独立的 Motia Step

- `mafengwo-list.step.ts`：爬取游记列表，返回 URL 列表
- `mafengwo-detail.step.ts`：爬取单篇详情，存储到 Convex

**替代方案**:
- ❌ 单一 Step 处理全部：逻辑复杂，超时风险高

**理由**:
- 职责分离，便于重试和监控
- 可并行处理详情页
- 列表可缓存，减少重复爬取

### Decision 4: 数据格式转换

**选择**: 在 Step 中直接转换为 TravelGuide 格式

**数据映射**:
```
爬取字段           →  TravelGuide 字段
title              →  title
content            →  content
author             →  authorName
url                →  sourceUrl
/i/(\d+).html      →  sourceExternalId
浏览量             →  viewsCount
点赞数             →  likesCount
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| Kernel.sh API 不稳定 | 实现重试逻辑，失败时回退到队列 |
| 马蜂窝更新页面结构 | 使用灵活的 CSS 选择器，定期验证 |
| 单次爬取超时 | 设置 60s 超时，超时任务进入重试队列 |
| 环境变量未配置 | 启动时检查，缺少时返回明确错误 |

## Migration Plan

1. **Phase 1**: 添加新 Step 文件，不影响现有 `/api/crawler/fetch`
2. **Phase 2**: 部署后手动测试几个城市
3. **Phase 3**: 接入现有的 crawlJobs 调度系统

**回滚策略**: 删除新增的 Step 文件即可，不影响其他功能

## Open Questions

1. ~~Kernel.sh 免费额度是否足够？~~ 已确认有 API Key
2. 是否需要实现代理 IP 轮换？（暂不需要，Kernel.sh 已处理）
3. 爬取频率限制？（建议每城市间隔 5 秒）
