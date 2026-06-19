# iOS 26 Liquid Glass 重设计 Phase 3 — 我的(Profile)流程

- **日期**: 2026-06-19
- **状态**: 已批准设计,待落实现计划
- **范围**: "iOS App 设计优化"工程的**第三个子项目**。延续 Phase 1(行程)、Phase 2(发现),均已合并 main。Chat、Auth 各自后续另开 spec。
- **关联**: 基于会话内四路并行审计(ProfileView 根 / 设置子页 / chrome+依赖 / iOS 26 设置类玻璃)。

---

## 1. 背景与沿用

Phase 1/2 已建立 iOS 26 Liquid Glass 底座并迁移行程、发现流程。Phase 3 用同一底座迁移 **我的(Profile)流程**——全 App 最大的代码债(`ProfileView` 1896 行)。

**完全沿用元决策**:iOS 26 起步、全面 Liquid Glass、**不写 `#available`**(部署目标已确为 iOS 26,迁移过的 Tab 均无条件调用玻璃 API);`cardSurface(tint:cornerRadius:)`(`DesignSystem.swift:739`);`.buttonStyle(.glassProminent/.glass)`;`ThemeManager` 环境化;**7 条玻璃纪律**;**deprecate-not-delete**。

**需求方本次确认**:

| 决策项 | 结论 |
| --- | --- |
| 范围 | ProfileView + 设置子页(API/About/iCloud/Theme)+ PreferencesView + LanguageSettingsSheet |
| 主题子系统 | **上 accent 选色器**(接通休眠的 `setAccentColor`,玻璃色板)+ **删 map-style 半边**(无任何地图消费) |
| Profile 头部 | **整个头部悬浮 Hero**(把头部+统计从 List 抬出为悬浮玻璃 Hero) |

### 1.1 审计纠正的事实(本会话已验证)
- 部署目标 **iOS 26.0**(`project.pbxproj` 三 config);全 App **0** 处 `#available(iOS 26`。AboutSheet 的 "iOS 17.0"(`:1013`)是过时显示文案,需修。
- `useTrueBlack`/`reduceContrastInDark`/`setTrueBlack`/`setReduceContrast` **不存在**(早已彻底删除)——无开关可删。残留的是 `DesignTokens.Colors.trueBlackBackground(for:enabled:)`(`DesignSystem.swift:257`,零调用,删)。
- 死结构(零调用):`EnhancedStatDivider`(`:760`)、`FollowStatItem`(`:797`)、`SettingsRow`(`:824`)、legacy `StatItem`。`AboutRow`(`:1032`)**活着**(AboutSheet 4 处用),保留。

### 1.2 现状核心问题(按杠杆排序)
1. **1896 行巨石**:根 List + 5 个子 sheet + 冲突解决流 + 主题预览件 + ~16 个 helper struct 全在一个文件。
2. **List 上盖弃用全页 chrome**:`ExplorerPageBackground(.list, .purple)` + `.scrollContentBackground(.hidden)`(`:31-33,379`)盖在会自动玻璃化的 `List(.insetGrouped)` 上。
3. **每个设置行是手搓深度卡**(玻璃叠玻璃风险):`ExplorerSettingsRow`(`:667-735`)重建了 List 行本就免费提供的渐变图标块/描边/阴影/按压,×13。
4. **导航不一致 + 手绘 chevron**:部分 `NavigationLink`、部分 `Button{showSheet}+手绘 chevron`。
5. **手绘设备 mock 预览与玻璃打架**:`ThemeMiniPreview`/`LanguageMiniPreview` 用近黑 `Color(white:0.1)` 填充 + 描边环 + 阴影。
6. **悬浮卡是不透明 tint 面板**:`VersionCard`/`ResolutionButton`/`PreferenceSummaryCard`。
7. **子 sheet 玻璃被遮**:Form/List 未 `.scrollContentBackground(.hidden)`;APISettingsSheet/ConflictResolverSheet 无 detent。
8. **缺加载/空/错态**:stats `.task` 期间无骨架;footprints 硬编码 "0";错误被吞。
9. **闲置 accent/map 子系统**:`AccentColorOption`/`MapStyleOption`/`setAccentColor`/`setMapStyle`/`currentMapStyle`/`ThemedMapStyleModifier`(空体)有实现+持久化但无 UI;accent 只被 `.tint` 读、无法被用户改。
10. 死代码 + 过时元数据。

---

## 2. 目标与非目标

### 2.1 目标
- 拆 `ProfileView` 1896 行到 `Features/Profile/` + 子 sheet 移到 `Features/Settings/`。
- 设置行/子页走原生 Form/List 自动玻璃化(行上**不**加显式玻璃);删 `ExplorerPageBackground` 用法。
- **头部悬浮玻璃 Hero**(头部+统计抬出 List)。
- **接通 accent 选色器**(玻璃色板,tint 表选中);**删 map-style 半子系统**。
- 子 sheet 修玻璃遮挡(`.scrollContentBackground(.hidden)` + 补 detent)。
- 删死代码(4 结构 + `trueBlackBackground` + 整个 `ExplorerComponents.swift` + `ExplorerSectionHeaderLabel`/`ExplorerStatDivider`);修 AboutSheet 元数据;加 stats 加载/空态。
- (顺手)PreferencesView 去重。

### 2.2 非目标(YAGNI)
- Chat Tab(保留 `ExplorerPageBackground`,后续 spec)、Auth 登录/注册(保留 Topographic/Compass/Noise)。
- Widget/Watch/CarPlay。
- 服务端/数据契约改动。

---

## 3. 核心原则(设置类屏)
1. **设置行原生 Form/List 自动玻璃化,行上不加 `cardSurface`/`.glassEffect`**(玻璃叠玻璃)。删全页 `ExplorerPageBackground` + `.scrollContentBackground(.hidden)`;`ExplorerSettingsRow` 拍平为 `Label(systemImage:)` + 前景色着色;Button+手绘 chevron 的设置入口(目标是设置屏者)改 `NavigationLink`,仅 `LoginView` 留 `.sheet`。
2. **悬浮表面才上玻璃**:头部 Hero、ScrollView 内的 VersionCard/ResolutionButton/PreferenceSummaryCard/预览卡——同簇进**一个** `GlassEffectContainer`,不嵌套;tint 仅表选中/主操作/危险。
3. **子 sheet**:保留/补 `presentationDetents`,加 `.scrollContentBackground(.hidden)`,绝不设 `.presentationBackground`;工具栏 Done/Cancel 留系统 Button(自动玻璃)。

---

## 4. 逐屏 before → after

### 4.1 ProfileView 根 + 拆分 + 悬浮 Hero
拆到 `Features/Profile/`:`ProfileView.swift`(根协调器:布局 + sheet/destination 绑定 + `.task` 加载)、`ProfileHeaderView.swift`、`ProfileStatsSection.swift`、`ProfileSettingsRows.swift`;子 sheet 移到 `Features/Settings/`:`APISettingsSheet.swift`、`CacheSettingsView.swift`、`AboutSheet.swift`(含活的 `AboutRow`)、`ThemeSettingsSheet.swift`(+ 主题预览件)、`CloudSyncSettingsSheet.swift`(含 `iCloudStatusCard`/`ConflictResolverSheet`/`VersionCard`/`ResolutionButton`)。

- **悬浮 Hero**:根从 `ZStack{ExplorerPageBackground; List}` 改为头部+统计抬出为悬浮玻璃 Hero(`GlassEffectContainer` + `.glassEffect(.regular.tint(.purple.opacity(...)))`,头像去 radial-glow/blur/pulse 堆叠),其下为系统 grouped `List`(设置区)。Hero 可用 `.backgroundExtensionEffect()` 让其延伸到安全区。删 `ExplorerPageBackground` 用法 + `.scrollContentBackground(.hidden)`。
- 设置行:`ExplorerSettingsRow` → `Label(title, systemImage: icon).foregroundStyle(iconColor)`,行不加玻璃;Theme/iCloud/API/About/Cache 的 Button+sheet 改 `NavigationLink`(系统 disclosure),删 `showChevron`。
- 分隔:`ExplorerStatDivider`/`ExplorerDivider(.topographic)` → 系统 `Divider()`;`ExplorerSectionHeaderLabel` 5 处 → 纯 `Text` section header。
- 删 4 个死结构;去掉逐行 `staggeredAnimation` 与 `repeatForever` 辉光/脉冲/呼吸。
- 加 stats `.redacted(.placeholder)` 加载态;真实 footprints 值或空态(替硬编码 "0");`loadFollowStats`/`loadFavoriteStats` 失败有所反馈。

### 4.2 PreferencesView
- Toggle / NavigationLink 行**不动**(自动玻璃)。
- `PreferenceSummaryCard`(`.listRowBackground(.clear)` 悬浮)→ `.cardSurface()`;内部 `StyleBadge`/`CategoryBadge` 作为**扁平 tint 内容**留在该玻璃卡内(不逐个上玻璃)。
- (去重,非玻璃)`categoryColor(String)->Color`(4 处重复)抽到 `PreferenceCategory`;3 个雷同 Travel/Budget/Pace 选择视图合并为一个泛型 List 选择器。

### 4.3 ThemeSettingsSheet(移到 Features/Settings/)
- shell 保留 detents,**加 `.scrollContentBackground(.hidden)`**。
- `ThemeModeRow` 手搓按钮列 → 原生 `Picker(selection: $themeManager.currentMode){...}.pickerStyle(.inline 或 .segmented)`。
- **新增 accent 玻璃色板选色器**:`AccentColorOption.allCases` 色板,选中 `.glassEffect(.regular.tint(option.color).interactive())`、其余 plain,接 `setAccentColor`(接通休眠子系统;tint 表选中,去描边环)。同簇进一个 `GlassEffectContainer`。
- `ThemeMiniPreview` 近黑填充/阴影 → `cardSurface`/`.regularMaterial`(若原生 Picker 已足够,可删预览件——见 §7)。

### 4.4 LanguageSettingsSheet
- 加 `.scrollContentBackground(.hidden)`。
- `LanguageMiniPreview` 卡 → `cardSurface()`,选中 `cardSurface(tint: accent.opacity(0.3))`(去描边环/阴影),同簇一个 `GlassEffectContainer`;`LanguageRow` 留原生 List 行。

### 4.5 子 sheet 玻璃修复 + AboutSheet
- `APISettingsSheet`:补 `.presentationDetents([.medium,.large])` + `.scrollContentBackground(.hidden)`;in-body 主操作(Save)`.buttonStyle(.glassProminent)`。
- `iCloudSyncSettingsSheet`:加 `.scrollContentBackground(.hidden)`(保留 detents)。
- `ConflictResolverSheet`:补 detents;`VersionCard`/`ResolutionButton`(ScrollView 内悬浮)同簇一个 `GlassEffectContainer`,`VersionCard`→`cardSurface(tint:)`、`ResolutionButton`→`.buttonStyle(.glass/.glassProminent)`;`iCloudStatusCard`(List 行)去手搓背景靠自动玻璃。
- `AboutSheet`:修 "iOS 17.0"(`:1013`)→ iOS 26、核对 Swift 版本字符串(理想从 `AppConfig` 取)。

---

## 5. ThemeManager 清理(accent 保留接通 / map-style 删)
- **保留 + 接通**:`AccentColorOption`、`setAccentColor`、`accentColor`(已被 `.tint` 消费)——经 §4.3 accent 选色器变为可用功能。
- **删除**:`MapStyleOption`(`:131`)、`setMapStyle`(`:246`)、`currentMapStyle`(`:255`)、持久化 `mapStyle`(`:193`)、`ThemedMapStyleModifier`/`themedMapStyle()`(`:359-372`,空体)——grep 确认无任何地图消费(唯一 `.mapStyle(...)` 是 `BlogDetailMediaSection.swift:259` 硬编码 `.standard`)。`resetToDefaults` 同步去掉 mapStyle 重置。
- 删 `DesignTokens.Colors.trueBlackBackground`(`DesignSystem.swift:257`,零调用)。

---

## 6. Explorer* 删 / 留(Profile 迁移后)
**立即删**(grep 确认零消费者):`ExplorerSectionHeaderLabel`(Profile 私有)、`ExplorerStatDivider`、**整个 `ExplorerComponents.swift`**(`ExplorerDivider` 最后外部消费者是 ProfileView `:108`;其余是自含 `#Preview`)、4 个死结构、`trueBlackBackground`、map-style 半子系统。
**保留 + 维持弃用**(Chat 仍用):`ExplorerPageBackground`(`VisualEffects.swift:189`)。Auth 的 `TopographicLinesView`/`CompassRoseDecoration`/`NoiseTextureOverlay` 不动。
> 删除前每个符号必须 `grep -rn "\bSYMBOL\b" Pathfinding Shared --include='*.swift'`(排除定义文件+测试)确认零消费者。`ProfileView` 自有 `ExplorerSectionHeaderLabel` ≠ 已删的 `ExplorerSectionHeader`。

---

## 7. 风险与缓解
| 风险 | 缓解 |
| --- | --- |
| 悬浮 Hero 结构改动大(滚动/布局) | Hero 为 `GlassEffectContainer` 单一玻璃面,其下系统 List;先单独验证滚动行为;若 Hero 与 List 协同异常,回退到"仅头像玻璃芯片" |
| 设置行误加玻璃 | 原则 §3.1:Form/List 行**不**显式上玻璃 |
| accent 选色器 tint 纪律 | 仅选中色板 tint + `.interactive()`;非交互不加 |
| 主题/语言预览件去留 | 原生 Picker 若已足够则删预览件;保留则必须 cardSurface/material(禁近黑填充) |
| map-style 删除遗漏消费者 | grep 确认零消费者(唯一地图 `.mapStyle` 是硬编码);删 `ThemedMapStyleModifier` 同时清 `themedMapStyle()` 调用点(应无) |
| 子 sheet 背景回归 | 加 `.scrollContentBackground(.hidden)`,绝不设 `presentationBackground` |
| Reduce Transparency | 迁移后在"降低透明度"开启下烟测 Hero 玻璃芯片 + 悬浮卡 |

---

## 8. 验证策略
- 构建闸门:iOS 26 SDK 编译通过,无 `#available` 残留。
- Preview:每个重建单元(Hero、设置区、ThemeSettingsSheet+accent 选色器、各子 sheet、PreferencesView 卡)Light/Dark + 降低透明度 + Reduce Motion 预览。
- 单元测试(XCTest/AAA):accent 选色器 → `setAccentColor` 持久化往返;PreferencesView 去重后的选择器映射;stats 加载/空态逻辑。
- 手动:Profile 滚动(Hero 悬浮) → 各设置子页 → 主题改 accent 全 App `.tint` 即时生效 → 语言切换;三档 a11y 目检。
- 覆盖率不低于 60%。

---

## 9. 实现顺序(高层;细化由 writing-plans 产出)
1. 删死代码(4 结构 + `trueBlackBackground`)+ 删 map-style 半子系统(纯减法,先清场)。
2. 拆 `ProfileView` → `Features/Profile/` + 子 sheet 移 `Features/Settings/`(行为保持,先不改样式)。
3. 根玻璃化 + **悬浮 Hero** + 设置行拍平 + 导航改 `NavigationLink` + 删 `ExplorerPageBackground` 用法 + 分隔/header 改原生。
4. ThemeSettingsSheet 原生 Picker + **accent 玻璃选色器**(接通 setAccentColor)+ 预览件处理。
5. LanguageSettingsSheet + 各子 sheet 玻璃修复(scrollContentBackground/detents)+ 悬浮卡 cardSurface + AboutSheet 元数据。
6. PreferencesView 悬浮卡 cardSurface + 去重 + stats 加载/空态。
7. 收尾:grep 删 `ExplorerSectionHeaderLabel`/`ExplorerStatDivider`/整个 `ExplorerComponents.swift`;全量校验。

每步可独立编译、预览、验证。
