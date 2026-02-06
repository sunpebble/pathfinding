## Why

iOS App 当前展示攻略文章时只使用纯文本 `content` 字段，丢失了原始 HTML 中的格式信息（段落、标题、图片内嵌、加粗等）。爬虫已经在抓取 `contentHtml` 字段（如马蜂窝），但 iOS 端完全没有使用。需要在 iOS App 中支持富文本渲染，让用户看到格式化的文章内容，提升阅读体验。

## What Changes

- **Convex API 层**：确保 `contentHtml` 字段在 HTTP API 响应中返回给 iOS（当前 `convertKeysToSnakeCase` 已自动处理，但需确认 `ensureDisplayFields` 不会过滤掉该字段）
- **iOS BlogPost 模型**：新增 `contentHtml` / `content_html` 字段解析
- **iOS BlogDetailView**：新增富文本内容展示区域，优先使用 `contentHtml` 渲染格式化内容，fallback 到纯文本 `content`
- **iOS 富文本渲染组件**：创建 HTML → SwiftUI 的渲染组件，支持常见 HTML 标签（段落、标题、图片、列表、加粗/斜体等）
- **Convex 数据补全**：为已有数据但缺少 `contentHtml` 的攻略，考虑通过 AI 从纯文本生成结构化内容（可选，低优先级）

## Capabilities

### New Capabilities
- `rich-text-rendering`: iOS 端 HTML 富文本渲染能力，将 `contentHtml` 转换为 SwiftUI 原生视图展示

### Modified Capabilities
- `ios-display-fields`: 新增 `contentHtml` 作为可选展示字段，优先级高于纯文本 `content`

## Impact

- **iOS App**：`BlogPost.swift` 模型、`BlogDetailView.swift` 视图、新增富文本渲染组件
- **Convex**：`travelGuides.ts` 查询确认返回 `contentHtml`、`http.ts` API 确认传递该字段
- **数据**：依赖爬虫已抓取的 `contentHtml` 数据（马蜂窝已支持），其他平台爬虫后续可扩展
