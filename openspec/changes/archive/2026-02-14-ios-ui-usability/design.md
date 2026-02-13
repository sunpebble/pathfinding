## Context

Pathfinding 是一个旅行规划 iOS App，使用 SwiftUI 构建，支持 iOS 16+。App 包含 4 个主 Tab（发现、聊天、行程、个人），约 30+ 个 View 文件。当前已有完善的 DesignSystem（DesignTokens），包含 spacing、radius、shadow、typography、colors、button styles 等 token。

当前问题：
- 零 accessibility 支持（无 accessibilityLabel/Hint/Value）
- 工具栏按钮密集（ItineraryListView leading 有 3 个按钮）
- 自定义字体使用固定 size（Display/Numeric/Card/MapLegend），不支持 Dynamic Type
- 动画未尊重 Reduced Motion 设置
- 表单缺少验证反馈和焦点状态
- swipe action 无可发现性提示

## Goals / Non-Goals

**Goals:**
- 为核心交互元素添加 VoiceOver 支持（accessibilityLabel/Hint/Value）
- 优化工具栏布局，减少按钮密度，增大点击区域
- 在 DesignSystem 中添加 accessibility 相关的 ViewModifier 和工具方法
- 表单添加验证反馈和焦点状态样式
- 动画尊重 `accessibilityReduceMotion` 设置
- swipe action 添加可发现性提示

**Non-Goals:**
- 不做完整的 WCAG 合规审计（需要人工辅助测试）
- 不重构现有导航架构（NavigationStack 结构保持不变）
- 不修改后端 API
- 不添加 VoiceControl 或 Switch Control 支持
- 不修改 Watch/Widget 的 UI

## Decisions

### D1: Accessibility 实现方式 — ViewModifier 封装

在 DesignSystem.swift 中新增 accessibility ViewModifier，而非在每个 View 中直接添加 `.accessibilityLabel()`。

理由：集中管理，减少遗漏，便于后续维护。例如 `StatLabel` 组件自身添加 `.accessibilityElement(children: .combine)`，而非在每个使用处添加。

替代方案：直接在各 View 中逐个添加 — 更灵活但容易遗漏，维护成本高。

### D2: 工具栏优化 — Menu 收纳次要操作

将 ItineraryListView 的 leading toolbar 3 个按钮（AI Planner、语音、发现）收入一个 Menu，仅保留最常用的"创建"按钮在 trailing。

理由：减少视觉噪音，增大点击区域，符合 Apple HIG 的工具栏设计指南。

替代方案：保留所有按钮但增大间距 — 空间不足，在小屏设备上仍然拥挤。

### D3: Dynamic Type 支持 — 自定义字体使用 @ScaledMetric

DesignTokens.Typography 中的 Display/Numeric/Card/MapLegend 字体使用固定 size，改为通过 `@ScaledMetric` 或 `.dynamicTypeSize()` 限制范围来支持 Dynamic Type。

理由：固定 size 字体在大字体模式下不会缩放，影响视障用户。

替代方案：全部改用系统 TextStyle — 会失去当前的视觉设计特色。

### D4: Reduced Motion — 条件动画 wrapper

在 DesignTokens.Animation 中添加 `reducedMotion` 变体，使用 `@Environment(\.accessibilityReduceMotion)` 判断。提供 `.adaptiveAnimation()` ViewModifier。

理由：统一处理，避免在每个动画处单独判断。

### D5: 表单焦点状态 — FocusedFieldStyle ViewModifier

新增 `FocusedFieldStyle` ViewModifier，在 TextField 获得焦点时显示 accent 色边框。

理由：当前 TextField 无焦点视觉反馈，用户不确定输入焦点在哪。

## Risks / Trade-offs

- [Accessibility 标签维护成本] → 通过组件级封装减少散落的标签，新组件模板中包含 accessibility
- [Dynamic Type 可能破坏布局] → 使用 `.dynamicTypeSize(...:.xxxLarge)` 限制最大缩放范围
- [Menu 收纳降低功能可发现性] → Menu 使用描述性标题和图标，首次使用可考虑 tooltip
- [自定义字体 ScaledMetric 性能] → ScaledMetric 是轻量级 property wrapper，性能影响可忽略
