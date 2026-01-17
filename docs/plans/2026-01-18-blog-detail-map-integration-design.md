# 攻略详情页集成地图视图 - 设计文档

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将导入行程页面的地图功能整合到攻略详情页，通过图片/地图切换查看

**Architecture:** 在 BlogDetailView 顶部媒体区域添加 Segmented Control，支持在图片轮播和地图视图之间切换。地图显示所有天的 POI，用对比色区分天数。合并后删除独立的 ImportedItineraryView。

**Tech Stack:** SwiftUI, MapKit

---

## 1. 整体架构

### 视图结构

```
BlogDetailView
├── Segmented Control ("图片" | "地图")
├── 媒体区域 (根据选择切换)
│   ├── 图片模式: 图片轮播 (现有逻辑)
│   └── 地图模式:
│       ├── Map (显示所有天 POI，对比色区分)
│       └── POI 列表 (按天数分组，固定高度)
├── 标题 & 元信息
├── AI 摘要、行程安排、贴士等
├── 导入按钮 (保持原位置)
└── 评论区
```

### 状态管理

```swift
enum MediaMode: String, CaseIterable {
  case images = "图片"
  case map = "地图"
}

@State private var mediaMode: MediaMode = .images
```

## 2. 地图视图组件

### 地图区域

- 高度与图片轮播区域一致（16:9 比例）
- 显示所有天的 POI 标记，每天用不同对比色
- 点击标记时，滚动 POI 列表到对应项并高亮
- 包含地图控件：指南针、比例尺、用户位置按钮

### POI 列表

- 固定高度 220pt
- 按天数分组，每组有"Day X - 主题"标题
- 每个 POI 项左侧圆形标记使用对应天数的颜色
- 点击 POI 项时，地图居中到该位置

### 颜色方案（对比色系）

```swift
let dayColors: [Color] = [
  .blue,    // Day 1
  .orange,  // Day 2
  .green,   // Day 3
  .purple,  // Day 4
  .pink,    // Day 5
  .teal,    // Day 6
  .red,     // Day 7+
]
```

## 3. Segmented Control 交互

### 位置与样式

- 放在媒体区域上方，与内容区左右边距一致
- 使用系统原生 `Picker` 的 `.segmented` 样式
- 两个选项："图片" 和 "地图"
- 仅当攻略有 AI 行程数据（`aiDays` 不为空）时显示

### 切换动画

- 使用 `withAnimation(.easeInOut(duration: 0.3))` 平滑过渡
- 地图模式首次进入时自动缩放到包含所有 POI 的区域

### 代码示意

```swift
// 仅当有 AI 行程数据时显示选择器
if guide.aiDays != nil && !guide.aiDays!.isEmpty {
  Picker("", selection: $mediaMode) {
    ForEach(MediaMode.allCases, id: \.self) { mode in
      Text(mode.rawValue).tag(mode)
    }
  }
  .pickerStyle(.segmented)
  .padding(.horizontal, DesignTokens.Spacing.lg)
}
```

## 4. 文件清理与影响范围

### 删除的文件

- `ImportedItineraryView.swift`

### 需要修改的文件

- `BlogDetailView.swift` - 添加地图模式、Segmented Control、POI 列表
- 导航相关文件 - 移除对 `ImportedItineraryView` 的引用
- `project.yml` - 移除文件引用

### 可复用组件（从 ImportedItineraryView 迁移）

- `MapMarker` - 地图标记组件（改为按天数颜色）
- `PoiListItem` - POI 列表项组件
- `PoiDetailSheet` - POI 详情弹窗
- `PoiAnnotation` - 标注数据结构
- `updateCamera()` - 相机位置计算逻辑

## 5. 边界情况处理

### 无 AI 数据时

- 不显示 Segmented Control
- 只显示图片轮播（保持原有行为）
- 不显示"导入行程"按钮

### 无有效坐标的 POI

- 地图上不显示该 POI 标记
- POI 列表中仍显示，但无定位图标
- 点击时不触发地图居中

### 单天行程

- 正常显示，只有一种颜色
- POI 列表只有一个分组

### POI 数量很多时

- POI 列表可滚动
- 地图自动缩放以包含所有标记

## 6. 用户体验流程

1. 用户进入攻略详情页，默认显示图片模式
2. 如有 AI 行程数据，顶部显示"图片 | 地图"切换器
3. 切换到地图模式，显示所有 POI 标记（按天数颜色区分）
4. 底部 POI 列表按天分组显示
5. 点击地图标记 → POI 列表滚动到对应项
6. 点击 POI 列表项 → 地图居中到该位置
7. 点击"导入行程"按钮保存到我的旅程
