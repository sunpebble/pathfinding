# Crawler Data Quality Fix

## What This Is

修复 Pathfinding 旅行应用的爬虫系统，解决从携程、马蜂窝、小红书、去哪儿、同程五个平台爬取的攻略数据不完整的问题。目标是让每个平台都能完整抓取核心字段，数据同时用于 App 展示和 AI 服务。

## Core Value

**每个平台的爬虫都能稳定抓取完整的攻略内容（正文、高清图片、视频、作者信息、发布时间、互动数据），确保数据可用于用户展示和 AI 处理。**

## Requirements

### Validated

- ✓ 爬虫框架已搭建 — existing
- ✓ 五个平台的爬虫入口已实现 — existing
- ✓ CrawlResult 接口已定义完整字段 — existing
- ✓ 支持 Chrome DevTools MCP 进行浏览器自动化 — existing

### Active

- [ ] 诊断每个平台爬虫数据缺失的根本原因
- [ ] 修复携程爬虫 — 完整抓取 6 个核心字段
- [ ] 修复马蜂窝爬虫 — 完整抓取 6 个核心字段
- [ ] 修复小红书爬虫 — 完整抓取 6 个核心字段
- [ ] 修复去哪儿爬虫 — 完整抓取 6 个核心字段
- [ ] 修复同程爬虫 — 完整抓取 6 个核心字段
- [ ] 实现登录态管理 — 支持手动登录后保存 cookie
- [ ] 验证所有平台数据完整性

### Out of Scope

- 新增其他平台爬虫 — 先修复现有的
- 自动登录/验证码破解 — 接受手动登录
- 爬虫性能优化 — 先确保数据完整
- 数据清洗/去重逻辑 — 不在本次范围

## Context

**现有代码结构：**

- 爬虫位于 `apps/ai-service/src/lib/crawlers/`
- 使用 Chrome DevTools MCP 进行浏览器自动化
- CrawlResult 接口已定义：content, contentBlocks, imageUrls, videoUrls, authorName, authorAvatar, likesCount, savesCount, commentsCount, viewsCount

**问题现状：**

- 页面能访问，但解析出的内容不完整
- 小红书和马蜂窝数据质量最差
- 携程相对完整，可作为参照
- 不确定是获取阶段还是解析阶段的问题

**核心字段清单（6 个）：**

1. 正文内容 — 完整文章文字
2. 高清图片 — 原图 URL
3. 视频 — 视频 URL
4. 作者信息 — 昵称、头像
5. 发布时间
6. 互动数据 — 点赞、收藏、评论数

## Constraints

- **登录态**: 部分平台需要登录才能获取完整内容，支持手动登录后保存 cookie
- **图片质量**: 需要高清原图，不是缩略图
- **技术栈**: 继续使用 Chrome DevTools MCP，不切换到其他方案

## Key Decisions

| Decision                   | Rationale                      | Outcome   |
| -------------------------- | ------------------------------ | --------- |
| 使用手动登录 + cookie 保存 | 避免自动登录的复杂性和风险     | — Pending |
| 先诊断再修复               | 不清楚问题出在获取还是解析阶段 | — Pending |
| 五个平台全部修复           | 用户需要完整数据覆盖           | — Pending |

---

_Last updated: 2026-01-25 after initialization_
