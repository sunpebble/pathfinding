## Why

iOS App 当前存在多个可用性问题：零 accessibility 支持（VoiceOver 完全不可用）、工具栏按钮过于密集导致误触、交互元素缺乏视觉反馈、表单无验证提示、导航模式不一致。这些问题影响了所有用户的操作效率，尤其对辅助功能用户构成使用障碍。

## What Changes

- 为所有交互元素添加 accessibilityLabel、accessibilityHint 和 accessibilityValue
- 优化工具栏布局：将次要操作收入 Menu，减少按钮密度，增大点击区域
- 统一导航模式：明确 sheet vs NavigationLink 的使用场景，添加可点击行的视觉提示
- 改进表单体验：添加实时验证反馈、字符限制提示、焦点状态样式
- 添加 swipe action 的可发现性提示（首次使用引导）
- 支持 Reduced Motion：动画尊重系统辅助功能设置
- 统一空状态文案和按钮样式层级

## Capabilities

### New Capabilities
- `ios-accessibility`: 全局辅助功能支持，包括 VoiceOver 标签、动态类型适配、Reduced Motion 支持
- `ios-interaction-patterns`: 工具栏布局优化、按钮点击区域、swipe action 可发现性、视觉反馈一致性
- `ios-form-ux`: 表单验证反馈、焦点状态、输入约束提示

### Modified Capabilities
（无需修改现有 spec 级别的需求）

## Impact

- iOS App 全部 SwiftUI View 文件（约 30+ 文件）
- DesignSystem.swift 需扩展按钮样式和焦点样式 token
- 不影响后端 API 或数据层
- 不涉及 breaking change
