## 1. DesignSystem 扩展 — Accessibility 基础设施

- [x] 1.1 在 DesignTokens.Animation 中添加 Reduced Motion 支持：读取 `accessibilityReduceMotion`，提供 `.adaptiveAnimation()` ViewModifier，开启时将动画 duration 设为 0
- [x] 1.2 为 StatLabel 组件添加 `.accessibilityElement(children: .combine)`，使 VoiceOver 朗读组合语义（如"浏览量 1200"）
- [x] 1.3 为 Badge 组件添加 accessibilityLabel，朗读 badge 文字和类型

## 2. Tab Bar 和 Toolbar Accessibility

- [x] 2.1 在 ContentView.swift 的 TabView 中为每个 tab item 添加 accessibilityLabel（使用已有的 localized title）
- [x] 2.2 在 ItineraryListView 中将 leading toolbar 的 3 个按钮（AI Planner、语音、发现）收入一个 Menu，trailing 仅保留"新建行程"按钮
- [x] 2.3 为所有 toolbar 图标按钮添加 accessibilityLabel 和 accessibilityHint（ItineraryListView、DiscoverView、ChatSessionListView、BlogDetailView）

## 3. 卡片和列表 Accessibility

- [x] 3.1 为 Explorer 卡片组件（ExplorerCards.swift）添加 `.accessibilityElement(children: .combine)` 和 accessibilityLabel（标题+作者+目的地）
- [x] 3.2 为可点击卡片添加 accessibilityHint "双击查看详情"
- [x] 3.3 为列表行的 swipe action 添加 long-press context menu 作为替代操作入口（ChatSessionListView）

## 4. Timeline 和 Map Accessibility

- [x] 4.1 为 SavedItineraryDetailView 的 timeline POI 列表项添加 accessibilityLabel "第 N 站，[POI名称]"
- [x] 4.2 为选中状态的 POI 添加 accessibilityValue "已选中"
- [x] 4.3 为 OptimizedMapView 的地图标注添加 accessibilityLabel（POI 名称和类型）

## 5. Dynamic Type 支持

- [x] 5.1 将 DesignTokens.Typography.Display 字体改为使用 `@ScaledMetric` 或 `UIFontMetrics` 支持缩放，限制最大为 `.accessibility1`
- [x] 5.2 将 DesignTokens.Typography.Card 和 MapLegend 字体改为支持 Dynamic Type 缩放
- [x] 5.3 将 DesignTokens.Typography.Numeric 字体改为支持缩放，限制最大不超过屏幕宽度 80%

## 6. 交互模式优化

- [x] 6.1 为所有小于 44pt 的图标按钮添加 `.contentShape(Rectangle())` 和 padding 扩大点击区域至 44x44
- [x] 6.2 为可点击卡片添加按压反馈（scaleEffect 0.98）
- [x] 6.3 统一空状态使用 ContentUnavailableView，文案格式为"暂无[内容类型]"+ 引导操作
- [x] 6.4 统一按钮样式层级：主操作用 `.primary`，辅助用 `.secondary`/`.outline`，破坏性用 `role: .destructive`

## 7. 表单体验优化

- [x] 7.1 创建 FocusedFieldStyle ViewModifier：焦点时显示 accent 色 2pt 边框，失焦恢复默认
- [x] 7.2 在 CreateItinerarySheet 中添加日期范围验证（结束日期不能早于开始日期），无效时显示红色提示
- [x] 7.3 在 CreateItinerarySheet 中为必填字段添加空值验证，提交时显示红色提示文字和边框
- [x] 7.4 为有长度限制的 TextField 添加字符计数指示器（当前/最大），接近限制时变色

## 8. Swipe Action 可发现性

- [x] 8.1 在 ChatSessionListView 中为首次使用的用户添加一次性左滑动画提示（使用 @AppStorage 记录是否已展示）

## 9. Profile 页面 Accessibility

- [x] 9.1 为 ProfileView 的统计行添加 `.accessibilityElement(children: .combine)`，朗读"N 个行程，N 个收藏，N 个关注"
