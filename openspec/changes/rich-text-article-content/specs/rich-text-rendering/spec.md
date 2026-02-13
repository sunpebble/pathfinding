## ADDED Requirements

### Requirement: HTML Content Rendering Component

系统 SHALL 提供一个 SwiftUI 组件 `RichTextContentView`，将 HTML 字符串渲染为原生格式化视图。

#### Scenario: Render basic HTML with paragraphs and headings

- **WHEN** 传入包含 `<p>`, `<h1>`-`<h6>` 标签的 HTML 字符串
- **THEN** 组件 SHALL 渲染段落和标题，标题使用对应的字体大小和粗体样式

#### Scenario: Render bold and italic text

- **WHEN** HTML 包含 `<b>`, `<strong>`, `<i>`, `<em>` 标签
- **THEN** 组件 SHALL 渲染对应的粗体和斜体文本样式

#### Scenario: Render unordered and ordered lists

- **WHEN** HTML 包含 `<ul>/<li>` 或 `<ol>/<li>` 标签
- **THEN** 组件 SHALL 渲染带有项目符号（•）或数字序号的列表

#### Scenario: Render inline images

- **WHEN** HTML 包含 `<img>` 标签且 `src` 属性为有效 URL
- **THEN** 组件 SHALL 在对应位置渲染图片，使用 `CachedAsyncImage` 异步加载
- **THEN** 图片 SHALL 保持原始宽高比，最大宽度为容器宽度

#### Scenario: Render links

- **WHEN** HTML 包含 `<a>` 标签且 `href` 属性为有效 URL
- **THEN** 组件 SHALL 渲染可点击的链接文本
- **THEN** 点击链接 SHALL 在系统浏览器中打开目标 URL

#### Scenario: Unsupported HTML tags graceful degradation

- **WHEN** HTML 包含不支持的标签（如 `<video>`, `<iframe>`, `<table>`）
- **THEN** 组件 SHALL 提取标签内的纯文本内容进行展示，不崩溃

#### Scenario: Empty or nil HTML

- **WHEN** 传入 nil 或空字符串
- **THEN** 组件 SHALL 不渲染任何内容（返回 `EmptyView`）

### Requirement: HTML Content Parsing

系统 SHALL 提供 HTML 解析能力，将 HTML 字符串分割为结构化的内容块（文本段、图片）。

#### Scenario: Parse HTML into content blocks

- **WHEN** 传入 HTML 字符串
- **THEN** 解析器 SHALL 返回有序的内容块数组，每个块为文本块（`AttributedString`）或图片块（URL 字符串）

#### Scenario: Extract image URLs from HTML

- **WHEN** HTML 包含多个 `<img>` 标签
- **THEN** 解析器 SHALL 按出现顺序提取所有图片 URL
- **THEN** 图片块 SHALL 保持在原始 HTML 中的相对位置

#### Scenario: Handle malformed HTML

- **WHEN** HTML 格式不完整或有未闭合标签
- **THEN** 解析器 SHALL 尽力解析，不抛出异常
- **THEN** 至少 SHALL 返回纯文本内容作为 fallback

### Requirement: Content Display Priority

系统 SHALL 按优先级选择文章内容的展示方式。

#### Scenario: contentHtml available

- **WHEN** `BlogPost` 的 `contentHtml` 字段非 nil 且非空
- **THEN** 系统 SHALL 使用 `RichTextContentView` 渲染富文本内容

#### Scenario: Only plain text content available

- **WHEN** `contentHtml` 为 nil 或空，但 `content` 字段非 nil 且非空
- **THEN** 系统 SHALL 使用 SwiftUI `Text` 展示纯文本，保留换行符

#### Scenario: No content available

- **WHEN** `contentHtml` 和 `content` 均为 nil 或空
- **THEN** 系统 SHALL 不展示文章内容区域

### Requirement: Article Content Section in BlogDetailView

系统 SHALL 在 `BlogDetailView` 中新增"原文内容"展示区域。

#### Scenario: Content section placement

- **WHEN** 文章有可展示的内容（contentHtml 或 content）
- **THEN** 内容区域 SHALL 显示在 AI 摘要之后、行程安排之前

#### Scenario: Content section with collapsible control

- **WHEN** 文章内容区域展示
- **THEN** 区域 SHALL 使用 `DisclosureGroup` 包裹，标题为"原文内容"
- **THEN** 默认状态 SHALL 为展开

#### Scenario: Long content truncation

- **WHEN** 文章内容超过 10000 字符
- **THEN** 系统 SHALL 默认只展示前 10000 字符
- **THEN** 系统 SHALL 显示"查看更多"按钮，点击后展示完整内容

### Requirement: Rich Text Rendering Performance

系统 SHALL 确保富文本渲染不影响页面滚动流畅度。

#### Scenario: Large HTML content scrolling

- **WHEN** 渲染超过 5000 字符的 HTML 内容
- **THEN** 页面滚动 SHALL 保持流畅（无明显卡顿）

#### Scenario: Multiple images lazy loading

- **WHEN** 文章包含多张图片
- **THEN** 图片 SHALL 延迟加载（仅在即将进入可视区域时加载）
