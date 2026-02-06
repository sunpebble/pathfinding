## 1. Convex 数据层确认

- [x] 1.1 确认 `ensureDisplayFields` 函数不会过滤掉 `contentHtml` 字段（检查 `convex/lib/displayFields.ts`）
- [x] 1.2 确认 HTTP API 的 `convertKeysToSnakeCase` 正确将 `contentHtml` 转为 `content_html`（验证现有逻辑即可）
- [x] 1.3 验证数据库中已有 `contentHtml` 数据的攻略数量（运行查询确认数据可用性）

## 2. iOS BlogPost 模型更新

- [x] 2.1 在 `BlogPost.swift` 中新增 `contentHtml: String?` 属性
- [x] 2.2 在 `CodingKeys` 中添加 `contentHtml = "content_html"` 映射
- [x] 2.3 验证 JSON 解码兼容性（有/无 `content_html` 字段的响应都能正确解码）

## 3. HTML 内容解析器

- [x] 3.1 创建 `HTMLContentParser.swift`，定义 `ContentBlock` 枚举（`.richText(AttributedString)` / `.image(URL)`）
- [x] 3.2 实现 `parse(html: String) -> [ContentBlock]` 方法：使用正则提取 `<img>` 标签，按图片位置分割 HTML 为多个文本段
- [x] 3.3 实现文本段的 `AttributedString(html:)` 转换，处理转换失败的 fallback
- [x] 3.4 实现 malformed HTML 的容错处理（未闭合标签、无效字符等）

## 4. RichTextContentView 组件

- [x] 4.1 创建 `RichTextContentView.swift` SwiftUI 组件，接收 `html: String` 参数
- [x] 4.2 实现内容块渲染：遍历 `[ContentBlock]`，文本块用 `Text(attributedString)` 渲染，图片块用 `CachedAsyncImage` 渲染
- [x] 4.3 实现图片样式：保持宽高比、最大宽度为容器宽度、圆角、加载占位符
- [x] 4.4 实现链接点击处理：`<a>` 标签在系统浏览器中打开
- [x] 4.5 实现长内容截断：超过 10000 字符时显示"查看更多"按钮

## 5. 纯文本 Fallback 组件

- [x] 5.1 创建 `PlainTextContentView.swift`，接收 `content: String` 参数，保留换行符展示

## 6. BlogDetailView 集成

- [x] 6.1 在 `BlogDetailView.swift` 中新增 `articleContentSection` 视图方法
- [x] 6.2 实现内容优先级逻辑：`contentHtml` → `RichTextContentView`，`content` → `PlainTextContentView`，都无 → 不展示
- [x] 6.3 用 `DisclosureGroup` 包裹内容区域，标题"原文内容"，默认展开
- [x] 6.4 将 `articleContentSection` 插入到 AI 摘要之后、行程安排之前
- [x] 6.5 添加 `@State private var isArticleExpanded = true` 状态管理

## 7. 测试与验证

- [x] 7.1 在 iOS 模拟器中测试有 `contentHtml` 的攻略详情页，确认富文本渲染正确
- [x] 7.2 测试只有纯文本 `content` 的攻略，确认 fallback 展示正常
- [x] 7.3 测试无内容的攻略，确认内容区域不显示
- [x] 7.4 测试长文章的滚动性能
- [x] 7.5 测试包含多张图片的文章，确认图片延迟加载和布局正确
