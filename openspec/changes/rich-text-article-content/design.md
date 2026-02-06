## Context

当前 iOS App 的 `BlogDetailView` 展示攻略文章时，只显示 AI 处理后的结构化数据（摘要、行程、贴士等），完全没有展示原始文章内容。`travelGuides` 表中已有 `contentHtml` 字段（马蜂窝爬虫已抓取 HTML），以及 `content` 纯文本字段，但 iOS 端的 `BlogPost` 模型未解析这些字段用于展示。

现状：
- **数据层**：`contentHtml` 已在 schema 中定义，马蜂窝爬虫已存储 HTML 内容
- **API 层**：`convertKeysToSnakeCase` 会自动将 `contentHtml` 转为 `content_html` 传给 iOS
- **iOS 模型**：`BlogPost.swift` 有 `content` 字段但无 `contentHtml`
- **iOS 视图**：`BlogDetailView.swift` 不展示原始文章内容，只展示 AI 提取的结构化信息

## Goals / Non-Goals

**Goals:**
- iOS App 能展示格式化的文章原始内容（HTML 渲染）
- 优先使用 `contentHtml`，fallback 到纯文本 `content`
- 支持常见 HTML 标签：段落、标题、图片、列表、加粗/斜体、链接
- 渲染性能可接受（大文章不卡顿）
- 与现有 AI 结构化内容（摘要、行程等）共存，放在合适的位置

**Non-Goals:**
- 不实现完整的 Web 浏览器级 HTML 渲染（不需要支持 CSS、JavaScript）
- 不为缺少 `contentHtml` 的旧数据做 AI 生成富文本（后续迭代）
- 不修改爬虫逻辑（已有 HTML 抓取能力）
- 不支持 HTML 中的视频嵌入（复杂度高，后续考虑）

## Decisions

### Decision 1: HTML 渲染方案 — 使用 `AttributedString` 原生渲染

**选择**：将 HTML 转换为 `AttributedString`，用 SwiftUI `Text` 渲染。

**备选方案**：
- **WKWebView**：完整 HTML 渲染，但高度计算复杂、与 SwiftUI ScrollView 集成困难、内存开销大
- **第三方库（如 SwiftSoup + 自定义渲染）**：灵活但引入外部依赖
- **AttributedString（选择）**：iOS 15+ 原生支持从 HTML 初始化，无外部依赖，与 SwiftUI 集成好

**理由**：`AttributedString` 从 iOS 15 起支持 `init(html:)` 方法，可直接将 HTML 转为富文本。对于文章内容（段落、标题、加粗、列表等）足够。图片需要单独处理（从 HTML 中提取 `<img>` 标签，在 SwiftUI 中用 `AsyncImage` 渲染）。

### Decision 2: 图片处理策略 — HTML 中提取图片单独渲染

HTML 中的 `<img>` 标签无法通过 `AttributedString` 渲染。方案：
1. 解析 HTML，提取 `<img>` 标签的 `src` 属性和位置
2. 将 HTML 按图片位置分割为多个文本段
3. 在 SwiftUI 中交替渲染文本段和图片（`CachedAsyncImage`）

这样既保留了图片在文章中的位置语义，又利用了已有的图片缓存组件。

### Decision 3: 内容展示位置 — AI 摘要之后、行程之前

在 `BlogDetailView` 中，原始文章内容放在：
- AI 摘要（aiSummarySection）之后
- 行程安排（itinerarySection）之前

用可折叠的 `DisclosureGroup` 包裹，默认展开，标题为"原文内容"。这样不影响现有的 AI 结构化内容展示。

### Decision 4: 内容优先级 — contentHtml > content > 不展示

```
if contentHtml != nil → 富文本渲染
else if content != nil → 纯文本展示（保留换行）
else → 不展示该区域
```

## Risks / Trade-offs

- **[性能] 超长 HTML 内容** → 使用 `LazyVStack` 延迟渲染；对超过 50KB 的 HTML 截断并提供"查看更多"按钮
- **[兼容性] AttributedString 不支持所有 HTML 标签** → 对不支持的标签做 graceful degradation，fallback 到纯文本
- **[数据] 部分平台无 contentHtml** → 已有 fallback 到纯文本 content 的策略
- **[安全] HTML 注入风险** → `AttributedString(html:)` 本身会做 sanitization，不执行 JavaScript

## Open Questions

- 是否需要支持文章内容中的外链跳转（`<a>` 标签）？初步建议支持，用 `Link` 组件在 Safari 中打开
- 后续是否需要为纯文本 content 做 Markdown 风格的简单格式化？
