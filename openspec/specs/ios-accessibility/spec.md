## ADDED Requirements

### Requirement: VoiceOver Labels for Tab Bar

TabView 的每个 tab item SHALL 提供描述性的 accessibilityLabel。

#### Scenario: VoiceOver reads tab name and purpose

- **WHEN** VoiceOver 焦点移到 tab item 上
- **THEN** 系统 SHALL 朗读 tab 的本地化名称（如"发现"、"聊天"、"行程"、"个人"）

### Requirement: VoiceOver Labels for Toolbar Buttons

所有 toolbar 按钮 SHALL 提供 accessibilityLabel 和 accessibilityHint。

#### Scenario: Icon-only button has descriptive label

- **WHEN** toolbar 中存在仅有图标的按钮（如 sparkles、mic、plus）
- **THEN** 每个按钮 SHALL 有 accessibilityLabel 描述其功能（如"AI 规划"、"语音输入"、"新建行程"）

#### Scenario: Button hint describes action result

- **WHEN** VoiceOver 焦点在 toolbar 按钮上
- **THEN** 按钮 SHALL 有 accessibilityHint 描述点击后的结果（如"打开 AI 行程规划器"）

### Requirement: VoiceOver for Statistical Labels

StatLabel 组件 SHALL 将图标和数值合并为单个 accessibility element。

#### Scenario: StatLabel announces combined meaning

- **WHEN** VoiceOver 焦点移到 StatLabel 上
- **THEN** 系统 SHALL 朗读组合语义（如"浏览量 1200"而非分别朗读图标和数字）

### Requirement: VoiceOver for Card Components

Explorer 卡片组件 SHALL 作为单个 accessibility element 提供摘要信息。

#### Scenario: Featured card announces title and key info

- **WHEN** VoiceOver 焦点移到攻略卡片上
- **THEN** 系统 SHALL 朗读标题、作者、目的地等关键信息

#### Scenario: Card announces actionability

- **WHEN** VoiceOver 焦点在可点击的卡片上
- **THEN** 卡片 SHALL 有 accessibilityHint 提示"双击查看详情"

### Requirement: VoiceOver for Timeline POIs

行程详情页的 timeline POI 列表 SHALL 支持 VoiceOver 导航。

#### Scenario: POI item announces sequence and name

- **WHEN** VoiceOver 焦点移到 timeline 中的 POI 上
- **THEN** 系统 SHALL 朗读"第 N 站，[POI名称]"

#### Scenario: Selected POI announces state

- **WHEN** POI 处于选中状态
- **THEN** 系统 SHALL 通过 accessibilityValue 告知"已选中"

### Requirement: VoiceOver for Map Annotations

地图上的标注 SHALL 提供 accessibility 信息。

#### Scenario: Map annotation announces POI name

- **WHEN** VoiceOver 焦点移到地图标注上
- **THEN** 系统 SHALL 朗读 POI 名称和类型

### Requirement: Dynamic Type Support for Custom Fonts

DesignTokens.Typography 中的自定义字体 SHALL 支持 Dynamic Type 缩放。

#### Scenario: Display font scales with accessibility settings

- **WHEN** 用户在系统设置中调大字体
- **THEN** Display/Card/MapLegend 字体 SHALL 按比例缩放
- **THEN** 缩放范围 SHALL 限制在 `.accessibility1` 以内，防止布局溢出

#### Scenario: Numeric font maintains readability

- **WHEN** 用户使用最大 Dynamic Type 设置
- **THEN** Numeric 字体 SHALL 缩放但不超过屏幕宽度的 80%

### Requirement: Reduced Motion Support

所有动画 SHALL 尊重系统的 Reduced Motion 设置。

#### Scenario: Animations disabled when Reduce Motion is on

- **WHEN** 用户开启了"减弱动态效果"
- **THEN** DesignTokens.Animation 的所有动画 SHALL 替换为即时过渡（duration 为 0）

#### Scenario: Spring animations simplified

- **WHEN** 用户开启了"减弱动态效果"
- **THEN** spring/bouncy 动画 SHALL 替换为 `.easeOut(duration: 0.1)`

### Requirement: Accessibility Element Grouping

相关的 UI 元素 SHALL 合理分组以减少 VoiceOver 导航步骤。

#### Scenario: Badge group announces combined info

- **WHEN** 多个 Badge 组件相邻排列
- **THEN** 系统 SHALL 将它们合并为一个 accessibility element，朗读所有标签

#### Scenario: Profile stats row grouped

- **WHEN** 个人页面的统计行包含多个数值
- **THEN** 系统 SHALL 将整行合并为一个 element，朗读"N 个行程，N 个收藏，N 个关注"
