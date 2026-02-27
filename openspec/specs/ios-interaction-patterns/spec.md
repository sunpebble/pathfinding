## ADDED Requirements

### Requirement: Toolbar Button Density Optimization

工具栏 SHALL 限制可见按钮数量，次要操作收入 Menu。

#### Scenario: ItineraryListView toolbar consolidation

- **WHEN** 用户查看行程列表页
- **THEN** leading toolbar SHALL 显示一个 Menu 按钮（包含 AI 规划、语音输入、发现公共行程）
- **THEN** trailing toolbar SHALL 仅显示"新建行程"按钮

#### Scenario: Menu button has descriptive label

- **WHEN** 工具栏显示 Menu 按钮
- **THEN** Menu SHALL 使用 "ellipsis.circle" 或 "plus.circle" 图标
- **THEN** Menu 内每个选项 SHALL 有图标和文字标签

### Requirement: Minimum Touch Target Size

所有可交互元素 SHALL 满足最小点击区域要求。

#### Scenario: Button minimum size 44x44

- **WHEN** 任何按钮渲染到屏幕上
- **THEN** 按钮的可点击区域 SHALL 不小于 44x44 pt

#### Scenario: Small icon buttons use contentShape

- **WHEN** 图标按钮的视觉尺寸小于 44pt
- **THEN** 按钮 SHALL 使用 `.contentShape(Rectangle())` 和 padding 扩大点击区域

### Requirement: Tappable Row Visual Indicator

可点击的列表行 SHALL 提供视觉提示表明可交互。

#### Scenario: NavigationLink row shows chevron

- **WHEN** 列表行是 NavigationLink
- **THEN** 行 SHALL 在右侧显示 chevron 指示器

#### Scenario: Tappable card shows press feedback

- **WHEN** 用户按下可点击的卡片
- **THEN** 卡片 SHALL 显示按压反馈（缩放至 0.98 或背景色变化）

### Requirement: Swipe Action Discoverability

swipe action SHALL 提供可发现性提示。

#### Scenario: First-time swipe hint

- **WHEN** 用户首次进入包含 swipe action 的列表（如聊天列表）
- **THEN** 系统 SHALL 在第一行显示微妙的左滑动画提示（仅一次）

#### Scenario: Long-press alternative for swipe actions

- **WHEN** 列表行支持 swipe action（删除、归档等）
- **THEN** 行 SHALL 同时支持 long-press context menu 提供相同操作

### Requirement: Consistent Button Style Hierarchy

按钮样式 SHALL 遵循统一的视觉层级。

#### Scenario: Primary action uses PrimaryButtonStyle

- **WHEN** 页面有一个主要操作（如"创建行程"、"保存"）
- **THEN** 该按钮 SHALL 使用 `.buttonStyle(.primary)`

#### Scenario: Secondary actions use SecondaryButtonStyle

- **WHEN** 页面有辅助操作
- **THEN** 辅助按钮 SHALL 使用 `.buttonStyle(.secondary)` 或 `.buttonStyle(.outline)`

#### Scenario: Destructive actions use red tint

- **WHEN** 按钮执行破坏性操作（删除、退出）
- **THEN** 按钮 SHALL 使用 `.tint(.red)` 或 `role: .destructive`

### Requirement: Consistent Empty State Pattern

空状态 SHALL 使用统一的组件和文案风格。

#### Scenario: Empty list shows ContentUnavailableView

- **WHEN** 列表无数据
- **THEN** 系统 SHALL 使用 `ContentUnavailableView` 显示图标、标题和操作按钮

#### Scenario: Empty state text uses consistent tone

- **WHEN** 显示空状态文案
- **THEN** 标题 SHALL 使用"暂无[内容类型]"格式
- **THEN** 描述 SHALL 提供引导性操作提示
