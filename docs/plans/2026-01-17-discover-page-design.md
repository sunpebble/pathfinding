# 发现页面设计

将首页和攻略页合并为统一的「发现」页面，支持全文搜索和多维度筛选。

## Tab 结构变更

从 5 个 Tab 减少到 4 个：

| 原 Tab        | 新 Tab              |
| ------------- | ------------------- |
| Home + Guides | **发现** (Discover) |
| Chat          | 助手 (不变)         |
| Itinerary     | 行程 (不变)         |
| Profile       | 我的 (不变)         |

## 页面组件结构

```
DiscoverView
├── 搜索栏 (始终显示)
├── 筛选区域
│   ├── 热门城市标签栏 (横滑)
│   └── 筛选按钮组 (AI行程 | 时间范围)
├── 内容区域 (根据搜索状态切换)
│   ├── [非搜索模式] 卡片布局
│   │   ├── 精选攻略 (横滑大卡片)
│   │   └── 最近攻略 (纵向小卡片)
│   └── [搜索模式] 列表布局
│       └── 搜索结果列表
```

## 搜索功能

### 搜索范围

全文搜索，包含：

- 标题
- 目的地
- 作者
- 标签
- 正文内容

### 搜索栏设计

- 位置：导航栏下方，始终可见
- 样式：圆角矩形，左侧放大镜图标，右侧清除按钮
- 占位符：「搜索目的地、攻略标题...」
- 行为：点击激活键盘，输入时实时搜索（300ms 防抖）

## 筛选功能

### 热门城市标签栏

```
[全部] [北京] [上海] [成都] [杭州] [西安] [重庆] [更多...]
```

- 数据来源：从已有攻略的 `destinations` 字段统计，取 Top 10
- 「全部」默认选中，点击其他城市切换筛选
- 「更多」展开完整城市列表（Sheet 弹窗）

### 筛选按钮组

```
[仅AI行程 ○] [时间 ▼]
```

- AI 行程：Toggle 开关，筛选 `aiProcessedAt != nil` 的攻略
- 时间范围：下拉菜单
  - 全部时间（默认）
  - 最近一周
  - 最近一月
  - 最近三月

## 布局切换逻辑

### 非搜索模式（默认）

保留原 HomeView 的卡片式布局：

```
┌─────────────────────────────────┐
│ 🔍 搜索目的地、攻略标题...        │
├─────────────────────────────────┤
│ [全部] [北京] [上海] [成都] →    │
│ [仅AI行程 ○]  [时间: 全部 ▼]    │
├─────────────────────────────────┤
│ ⭐ 精选攻略                      │
│ ┌────────┐ ┌────────┐           │
│ │ 大卡片  │ │ 大卡片  │ →        │
│ │ 横滑   │ │        │           │
│ └────────┘ └────────┘           │
├─────────────────────────────────┤
│ 🕐 最近更新                      │
│ ┌─────────────────────────┐     │
│ │ 小卡片行                  │     │
│ └─────────────────────────┘     │
└─────────────────────────────────┘
```

### 搜索模式

当任一筛选条件激活时，切换为列表式布局：

```
┌─────────────────────────────────┐
│ 🔍 成都                    [✕]  │
├─────────────────────────────────┤
│ [全部] [成都✓] [上海] [杭州] →  │
│ [仅AI行程 ●]  [时间: 一周 ▼]    │
├─────────────────────────────────┤
│ 找到 23 条结果                   │
├─────────────────────────────────┤
│ ┌─────────────────────────┐     │
│ │ 列表行 + 缩略图           │     │
│ └─────────────────────────┘     │
└─────────────────────────────────┘
```

### 切换条件

```swift
var isSearchMode: Bool {
  !searchText.isEmpty ||
  selectedCity != nil ||
  onlyAiGuides ||
  timeFilter != .all
}
```

## 数据流与状态管理

### DiscoverView 状态

```swift
struct DiscoverView: View {
  @State private var searchText = ""
  @State private var selectedCity: String? = nil
  @State private var onlyAiGuides = false
  @State private var timeFilter: TimeFilter = .all
  @State private var store = GuideStore.shared

  enum TimeFilter: String, CaseIterable {
    case all = "全部"
    case week = "一周内"
    case month = "一月内"
    case threeMonths = "三月内"
  }
}
```

### GuideStore 扩展

```swift
func searchGuides(
  query: String,
  city: String?,
  onlyAi: Bool,
  timeFilter: TimeFilter
) async -> [BlogPost]

var popularCities: [String]  // 从 destinations 统计
```

### API 调用流程

```
用户操作 → 更新本地状态 → 防抖 300ms → 调用 API → 更新 store.guides
```

## 后端变更

### Convex 搜索索引

```typescript
// convex/schema.ts
travelGuides: defineTable({...})
  .searchIndex("search_content", {
    searchField: "content",
    filterFields: ["destinations", "aiProcessedAt"]
  })
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["destinations", "aiProcessedAt"]
  })
```

### 搜索 API

```typescript
// convex/travelGuides.ts
export const search = query({
  args: {
    query: v.optional(v.string()),
    destination: v.optional(v.string()),
    hasAiData: v.optional(v.boolean()),
    daysAgo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 使用搜索索引
  },
});
```

## 文件变更清单

| 文件                     | 变更类型                                       |
| ------------------------ | ---------------------------------------------- |
| `ContentView.swift`      | 修改：移除 guides Tab，重命名 home 为 discover |
| `DiscoverView.swift`     | 新建：合并 HomeView + BlogListView             |
| `HomeView.swift`         | 删除                                           |
| `BlogListView.swift`     | 删除                                           |
| `GuideStore.swift`       | 修改：添加搜索方法和热门城市属性               |
| `convex/schema.ts`       | 修改：添加搜索索引                             |
| `convex/travelGuides.ts` | 修改：添加 search query                        |
| `convex/http.ts`         | 修改：添加搜索端点                             |
| `Localizable.strings`    | 修改：添加发现相关文案                         |

## 实现顺序

1. 后端：Convex 搜索索引和 API
2. iOS：GuideStore 搜索方法
3. iOS：DiscoverView 组件
4. iOS：ContentView Tab 变更
5. 清理：删除旧文件

## 代码量预估

- 新增：~400 行 (DiscoverView + 搜索 API)
- 修改：~50 行 (ContentView, GuideStore)
- 删除：~500 行 (HomeView, BlogListView)
