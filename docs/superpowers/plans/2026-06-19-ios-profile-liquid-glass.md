# iOS 26 Liquid Glass Phase 3 — 我的(Profile)流程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Profile 流程(1896 行 ProfileView + 设置子页 + Preferences + Language)迁到 iOS 26 Liquid Glass:原生 Form/List 自动玻璃化、悬浮玻璃 Hero、接通 accent 玻璃选色器、删 map-style 子系统与死代码。

**Architecture:** 以减法为主。先删死代码/map-style 清场 → 行为保持拆分 1896 行巨石 → 玻璃化根+悬浮 Hero+原生设置行 → 主题/语言/子 sheet 玻璃化 + accent 选色器 → 偏好去重 → 收尾 grep 删整个 ExplorerComponents.swift。设置行走原生 Form/List 自动玻璃化(行上不加显式玻璃);仅悬浮面上玻璃。

**Tech Stack:** SwiftUI(iOS 26 SDK / Xcode 27)、Swift 6、XcodeGen、XCTest。

## Global Constraints

> 每个 Task 隐含包含本节。值取自 spec `docs/superpowers/specs/2026-06-19-ios-profile-liquid-glass-design.md` 与 Phase 1/2 已验证约定。

- **平台**:iOS 26 最低,Swift 6,全面 Liquid Glass,**不写** `#available`(部署目标已 26,全 App 无条件用玻璃 API)。
- **玻璃纪律(硬性)**:① **设置类屏的 `List`/`Form` 行系统自动玻璃化——行上绝不加 `cardSurface`/`.glassEffect`(玻璃叠玻璃)**;删全页 `ExplorerPageBackground` + `.scrollContentBackground(.hidden)`。② 仅**自由悬浮**面上玻璃(Profile Hero、ScrollView 内的 VersionCard/ResolutionButton/PreferenceSummaryCard/预览卡),同簇进**一个** `GlassEffectContainer`,**不嵌套**。③ tint 仅表选中/主操作/危险;`.interactive()` 是 `Glass` 方法(用于 `.glassEffect`),**不是** Button 修饰符——`.buttonStyle(.glass)` 已可交互。④ `cardSurface`/`.glassEffect` 在 padding/frame 之后。⑤ 子 sheet 加 `.scrollContentBackground(.hidden)` + `presentationDetents`,绝不设 `.presentationBackground`。
- **已验证 API**:`.cardSurface(tint: Color? = nil, cornerRadius: CGFloat = DesignTokens.Radius.lg)`(`DesignSystem.swift:739`);`.buttonStyle(.glassProminent/.glass)`;`.glassEffect(.regular[.tint(_)][.interactive()], in: <Shape>)`。
- **deprecate-not-delete + grep 闸门**:`ExplorerPageBackground`(Chat 仍用)、Auth 的 `TopographicLinesView`/`CompassRoseDecoration`/`NoiseTextureOverlay` 保留弃用。物理删除某符号前必须 `grep -rn "\bSYMBOL\b" Pathfinding Shared --include='*.swift'`(排除定义文件+测试)确认零消费者。注意 `ProfileView` 自有 `ExplorerSectionHeaderLabel` ≠ 已删的 `ExplorerSectionHeader`。
- **工程**:XcodeGen。新增/删除 `.swift` 后 `xcodegen generate`;**绝不手改** `project.pbxproj`。
- **BUILD 闸门**:`cd apps/ios/Pathfinding && xcodegen generate && xcodebuild build -scheme Pathfinding-Debug -destination 'generic/platform=iOS Simulator' -quiet`
- **TEST**(用具体 sim id 避歧义;先 `xcrun simctl list devices available | grep 'iPhone 17 Pro ('` 取 id):`cd apps/ios/Pathfinding && xcodebuild test -scheme Pathfinding-Debug -destination "platform=iOS Simulator,id=<SIMID>" -only-testing:PathfindingTests/<Class> -quiet`
- **测试约定**:XCTest,`@testable import Pathfinding`,`PathfindingTests/`,2 空格,AAA,中文可用,`@MainActor` 按需;测 UserDefaults 依赖时在 `setUp`/`tearDown` 存档+还原相关 key。
- **本地化**:新 label 用 `"key".localized`,键加到 `Resources/{zh-Hans,en}.lproj/Localizable.strings` 双文件,不 ship 原始 key。
- **a11y 目检**(视觉 Task):降低透明度 / 增强对比度 / Reduce Motion 三档(尤其 Hero 玻璃面在"降低透明度"下不破)。
- **git**:Conventional Commits;结尾 `Claude-Session: https://claude.ai/code/session_01KPQLVQvfiFQdJCda35eYNb`。**显式 `git add` 改动文件,禁用 `git add -A`/`.`**(`.claude/worktrees/` 不可入栈;`.superpowers/` 已 gitignore)。已在 `docs/ios-profile-liquid-glass`,实现请切 `feat/ios-profile-liquid-glass`。SourceKit 跨目标诊断是噪声,`xcodebuild exit 0` 为准。

---

## File Structure

**删除**:`ProfileView` 内 4 个死结构(`EnhancedStatDivider`/`FollowStatItem`/`SettingsRow`/legacy `StatItem`)、`DesignTokens.Colors.trueBlackBackground`、ThemeManager map-style 半子系统、(收尾)`ExplorerSectionHeaderLabel`/`ExplorerStatDivider`/整个 `Features/Components/ExplorerComponents.swift`。
**新增(拆分)**:`Features/Profile/{ProfileView,ProfileHeaderView,ProfileStatsSection,ProfileSettingsRows}.swift`;`Features/Settings/{APISettingsSheet,CacheSettingsView,AboutSheet,ThemeSettingsSheet,CloudSyncSettingsSheet}.swift`。
**修改**:`Core/ThemeManager.swift`(删 map-style;accent 不动)、`Features/PreferencesView.swift`、`Features/Settings/LanguageSettingsSheet.swift`、`Features/Components/DesignSystem.swift`(删 trueBlackBackground)。
**测试**:`PathfindingTests/AccentColorPersistenceTests.swift`、`PathfindingTests/PreferenceSelectionTests.swift`。

---

## Task 1: 清场 — 删死代码 + 删 map-style 子系统

**Files:** Modify `Pathfinding/Features/ProfileView.swift`(删 4 死结构)、`Pathfinding/Features/Components/DesignSystem.swift:257`(删 `trueBlackBackground`)、`Pathfinding/Core/ThemeManager.swift`(删 map-style)

**Interfaces:** Consumes 无;Produces ThemeManager 不再有 `MapStyleOption`/`setMapStyle`/`currentMapStyle`/`mapStyle`/`ThemedMapStyleModifier`/`themedMapStyle()`。

- [ ] **Step 1: grep 确认零消费者**

Run:

```bash
cd apps/ios/Pathfinding
for s in EnhancedStatDivider FollowStatItem SettingsRow trueBlackBackground MapStyleOption setMapStyle currentMapStyle ThemedMapStyleModifier themedMapStyle; do
  echo "== $s =="; grep -rn "\b$s\b" Pathfinding Shared --include='*.swift' | grep -vE "ProfileView.swift|DesignSystem.swift|ThemeManager.swift"; done
echo "== legacy StatItem call sites (should be EnhancedStatItem/TimeStatItem/DayStatItem only) =="; grep -rn "StatItem(" Pathfinding --include='*.swift' | head
echo "== mapStyle consumers (only hardcoded .standard expected) =="; grep -rn "\.mapStyle(\|\.themedMapStyle()\|currentMapStyle" Pathfinding --include='*.swift'
```

Expected: 各符号无外部消费者(`.mapStyle(` 唯一命中是 `BlogDetailMediaSection.swift` 硬编码 `.standard`)。若有意外消费者则停下报告。

- [ ] **Step 2: 删 4 个死结构**

在 `ProfileView.swift` 删除 `EnhancedStatDivider`(~`:760`)、`FollowStatItem`(~`:797`)、`SettingsRow`(~`:824`)、legacy `StatItem`(~`:770`)的整段定义。保留 `AboutRow`(活的)、`EnhancedStatItem`/`TimeStatItem`/`DayStatItem`。

- [ ] **Step 3: 删 trueBlackBackground**

`DesignSystem.swift:257` 删 `static func trueBlackBackground(for:enabled:)` 整个函数。

- [ ] **Step 4: 删 map-style 半子系统**

`ThemeManager.swift`:删 `MapStyleOption` 枚举、`mapStyle` 存储属性 + 其持久化 key、`setMapStyle`、`currentMapStyle(for:)`、`ThemedMapStyleModifier` + `themedMapStyle()` 扩展;`resetToDefaults` 去掉 mapStyle 重置行;`loadSettings`/`saveSettings` 去掉 mapStyle 读写。**保留** `AccentColorOption`/`accentColor`/`setAccentColor`/`currentMode`/`setTheme`(accent 在 Task 4 接通)。

- [ ] **Step 5: 构建**

Run: _BUILD_ → exit 0。

- [ ] **Step 6: Commit**

```bash
git add Pathfinding/Features/ProfileView.swift Pathfinding/Features/Components/DesignSystem.swift Pathfinding/Core/ThemeManager.swift
git commit -m "chore(ios): remove dead Profile structs, trueBlackBackground, and inert map-style subsystem"
```

---

## Task 2: 拆分 ProfileView(行为保持)

**Files:**

- Modify: `Pathfinding/Features/ProfileView.swift`(瘦身为根协调器)
- Create: `Pathfinding/Features/Profile/{ProfileHeaderView,ProfileStatsSection,ProfileSettingsRows}.swift`;`Pathfinding/Features/Settings/{APISettingsSheet,CacheSettingsView,AboutSheet,ThemeSettingsSheet,CloudSyncSettingsSheet}.swift`(把 ProfileView 内联的 sheet/helper 各移出)

**Interfaces:** Consumes 无;Produces `ProfileView` 不变对外行为;子视图/子 sheet 成独立类型(保留原名)。

- [ ] **Step 1: 先读后搬**

读 `ProfileView.swift` 全文,列出根 List 结构、6 个 sheet 绑定、~16 个 helper struct 及其依赖与共享 `@State`/`.task`。

- [ ] **Step 2: 逐字搬运为独立文件(样式行为不变)**

把内联类型**逐字搬运**(保留 `ExplorerPageBackground`/`ExplorerSettingsRow`/`.subtleCardStyle` 等旧样式——玻璃化是 Task 3+),按 File Structure 分到 `Features/Profile/` 与 `Features/Settings/`:

- `ProfileHeaderView`、`EnhancedStatItem`+`ExplorerStatDivider`(→ ProfileStatsSection.swift)、`ExplorerSettingsRow`+`ExplorerVersionRow`+`OfflineMapSettingsRow`+`iCloudSyncSettingsRow`(→ ProfileSettingsRows.swift)、`ExplorerSectionHeaderLabel`(暂留,Task 7 删)。
- `APISettingsSheet`、`CacheSettingsView`、`AboutSheet`+`AboutRow`、`ThemeSettingsSheet`+`ThemePreviewCard`+`ThemeMiniPreview`+`ThemeModeRow`、`iCloudSyncSettingsSheet`+`iCloudStatusCard`+`ConflictResolverSheet`+`VersionCard`+`ResolutionButton`。
  `private` 类型跨文件移动后改 `internal`(若其消费者在别的新文件)。`ProfileView.swift` 留根 List + sheet/destination 绑定 + `.task`。`import` 按需补齐。

- [ ] **Step 3: 构建 + 预览 + 手动**

Run: _BUILD_ → exit 0。为 `ProfileView` 加 `#Preview`。手动:Profile 各区、6 个 sheet、iCloud 冲突解决与重构前一致。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/Features/ProfileView.swift Pathfinding/Features/Profile Pathfinding/Features/Settings
git commit -m "refactor(ios): decompose ProfileView into Profile/ + Settings/ subviews"
```

---

## Task 3: 玻璃化根 + 悬浮 Hero + 原生设置行

**Files:** Modify `Pathfinding/Features/Profile/{ProfileView,ProfileHeaderView,ProfileStatsSection,ProfileSettingsRows}.swift`

**Interfaces:** Consumes `cardSurface`/`GlassEffectContainer`;Produces 玻璃化 Profile。

- [ ] **Step 1: 删全页 chrome,List 自动玻璃化**

`ProfileView`:删 `ZStack{ ExplorerPageBackground(.list,.purple) ... }` 包裹与 `.scrollContentBackground(.hidden)`;保留 `List { ... }.listStyle(.insetGrouped)`,直接在系统 grouped 背景上。app 级 `.tint` 已在 `ContentView`,不在此加。

- [ ] **Step 2: 悬浮 Hero**

把头部 + 统计抬出 List 作为悬浮玻璃 Hero:用 `.safeAreaInset(edge: .top)` 或外层 `VStack { hero; List }` 让 Hero 不随设置区一起 inset;Hero 内容(头像 + 名 + 统计)包进**一个** `GlassEffectContainer`,头像 `.glassEffect(.regular.tint(.purple.opacity(0.25)))`,去掉 `ProfileHeaderView` 的 radial-glow/blur/pulse 堆叠(`:457-516` 区)。Hero 可 `.backgroundExtensionEffect()` 延伸安全区。若 Hero 与 List 滚动协同异常,回退为"仅头像玻璃芯片留在 List section 内"并在报告说明。

- [ ] **Step 3: 设置行拍平为原生**

`ExplorerSettingsRow`:把手搓 ZStack(渐变图标块 + 地形描边 + 阴影 + `scaleEffect(isPressed)`)替换为:

```swift
Label(title, systemImage: icon)
  .foregroundStyle(iconColor)   // 仅着色 SF Symbol
// 副标题用第二个 Text;行上不加 glassEffect/cardSurface
```

Theme/iCloud/API/About/Cache 的 `Button{ show…=true } label:{ ExplorerSettingsRow(showChevron:true) }` 改为 `NavigationLink`(系统 disclosure);仅 `LoginView` 留 `.sheet`。删所有 `showChevron` 手绘 chevron。

- [ ] **Step 4: 分隔/section header 原生化**

`ExplorerStatDivider` / `ExplorerDivider(style:.topographic)` → 系统 `Divider()`;`ExplorerSectionHeaderLabel` 5 处调用 → 纯 `Text(...)` section header。去掉逐行 `staggeredAnimation(index:)` 与 `repeatForever` 辉光/脉冲/呼吸。

- [ ] **Step 5: 构建 + 预览 + a11y + 手动**

Run: _BUILD_ → exit 0。预览 + 三档 a11y。手动:Profile 滚动时 Hero 悬浮玻璃、设置行为系统玻璃无显式玻璃、NavigationLink 系统 disclosure。

- [ ] **Step 6: Commit**

```bash
git add Pathfinding/Features/Profile
git commit -m "feat(ios): glassify Profile with floating hero and native settings rows"
```

---

## Task 4: ThemeSettingsSheet 原生 Picker + accent 玻璃选色器(TDD)

**Files:**

- Modify: `Pathfinding/Features/Settings/ThemeSettingsSheet.swift`
- Create: `PathfindingTests/AccentColorPersistenceTests.swift`

**Interfaces:** Consumes `ThemeManager.shared.setAccentColor(_:)` / `accentColor` / `AccentColorOption.allCases`;Produces 主题模式 Picker + accent 玻璃色板选色器。

- [ ] **Step 1: 写失败测试(accent 持久化往返)**

`PathfindingTests/AccentColorPersistenceTests.swift`:

```swift
import XCTest
@testable import Pathfinding

@MainActor
final class AccentColorPersistenceTests: XCTestCase {
  private let key = "app_accent_color"   // 以 ThemeManager 真实 key 为准核对
  private var saved: String?
  override func setUp() { saved = UserDefaults.standard.string(forKey: key) }
  override func tearDown() { UserDefaults.standard.set(saved, forKey: key) }

  func testSetAccentColorPersistsAndUpdates() {
    let tm = ThemeManager.shared
    tm.setAccentColor(.teal)
    XCTAssertEqual(tm.accentColor, .teal)
    XCTAssertEqual(UserDefaults.standard.string(forKey: key), AccentColorOption.teal.rawValue)
  }
}
```

（以 `ThemeManager` 真实 accent 持久化 key 与 `setAccentColor` 签名为准核对调整。）

- [ ] **Step 2: 运行,确认失败/通过基线**

Run: _TEST AccentColorPersistenceTests_。若 `setAccentColor` 已正确持久化则可能直接 PASS——此时该测试作为"接通 accent"的回归护栏保留;若 key 名不符则 RED,先对齐。

- [ ] **Step 3: 主题模式 Picker**

`ThemeModeRow` 手搓按钮列(`:1834` 区)→

```swift
Picker("theme.mode".localized, selection: Binding(get: { themeManager.currentMode }, set: { themeManager.setTheme($0) })) {
  ForEach(ThemeMode.allCases) { Text($0.displayName).tag($0) }
}
.pickerStyle(.inline)
```

（`themeManager` 注入方式以现有为准;`setTheme` 真实签名为准。）

- [ ] **Step 4: accent 玻璃色板选色器**

新增一个 Section,`AccentColorOption.allCases` 色板(`LazyVGrid` 或 HStack),同簇进**一个** `GlassEffectContainer`:

```swift
ForEach(AccentColorOption.allCases) { option in
  Circle().fill(option.color).frame(width: 28, height: 28)
    .padding(6)
    .glassEffect(.regular.tint(option == themeManager.accentColor ? option.color : .clear).interactive(), in: .circle)
    .overlay { if option == themeManager.accentColor { Image(systemName: "checkmark").font(.caption.bold()).foregroundStyle(.white) } }
    .onTapGesture { themeManager.setAccentColor(option) }
    .accessibilityLabel(option.displayName)
}
```

去掉任何旧描边选中环。

- [ ] **Step 5: ThemeMiniPreview 处理**

若原生 Picker + accent 色板已足够表达,删 `ThemePreviewCard`/`ThemeMiniPreview`;若保留,则把近黑 `Color(white:0.1)` 填充与 `.black.opacity` 阴影换成 `cardSurface()`/`.regularMaterial`(禁近黑)。在报告说明取舍。

- [ ] **Step 6: sheet 玻璃**

shell 保留 `.presentationDetents([.medium,.large])`,**加 `.scrollContentBackground(.hidden)`**。

- [ ] **Step 7: 运行测试 + 构建 + 手动**

Run: _TEST AccentColorPersistenceTests_ → PASS;_BUILD_ → exit 0。手动:改 accent → 全 App `.tint` 即时变;主题模式切换正常。

- [ ] **Step 8: Commit**

```bash
git add Pathfinding/Features/Settings/ThemeSettingsSheet.swift PathfindingTests/AccentColorPersistenceTests.swift  # + 本地化键(若加)
git commit -m "feat(ios): native theme picker and glass accent-color picker wiring setAccentColor"
```

---

## Task 5: LanguageSettingsSheet + 子 sheet 玻璃修复 + AboutSheet 元数据

**Files:** Modify `Features/Settings/LanguageSettingsSheet.swift`、`Features/Settings/APISettingsSheet.swift`、`Features/Settings/CloudSyncSettingsSheet.swift`、`Features/Settings/AboutSheet.swift`

**Interfaces:** Consumes `cardSurface`/玻璃按钮;Produces 玻璃化子 sheet。

- [ ] **Step 1: LanguageSettingsSheet**

加 `.scrollContentBackground(.hidden)`(已 detents)。`LanguageMiniPreview` 卡(`:90-161` 区)→ `cardSurface()`,选中卡 `cardSurface(tint: accent.opacity(0.3))`(去描边环/阴影),两张卡同簇进**一个** `GlassEffectContainer`;`LanguageRow` 留原生 List 行。

- [ ] **Step 2: APISettingsSheet**

`Form` 加 `.presentationDetents([.medium,.large])` + `.scrollContentBackground(.hidden)`;in-body 主操作(Save)`.buttonStyle(.glassProminent)`。

- [ ] **Step 3: CloudSyncSettingsSheet**

`iCloudSyncSettingsSheet` 加 `.scrollContentBackground(.hidden)`(保留 detents);`ConflictResolverSheet` 补 `.presentationDetents([.medium,.large])`;`VersionCard`/`ResolutionButton`(ScrollView 内悬浮)同簇进**一个** `GlassEffectContainer`:`VersionCard`→`.cardSurface(tint:)`、`ResolutionButton`→`.buttonStyle(.glass)`(确认/主解析用 `.glassProminent`);`iCloudStatusCard`(List 行)去手搓 `.background/.stroke` 靠自动玻璃。

- [ ] **Step 4: AboutSheet 元数据**

修 "iOS 17.0"(`AboutSheet` 内,原 `ProfileView.swift:1013`)→ "iOS 26.0";核对 Swift 版本字符串。理想从 `AppConfig`/构建常量取。

- [ ] **Step 5: 构建 + 预览 + a11y + 手动**

Run: _BUILD_ → exit 0。预览各 sheet 三档 a11y。手动:各 sheet 玻璃背景透出、悬浮卡玻璃、语言/冲突解决正常。

- [ ] **Step 6: Commit**

```bash
git add Pathfinding/Features/Settings
git commit -m "feat(ios): glassify language/api/cloud-sync sheets and fix About metadata"
```

---

## Task 6: PreferencesView 玻璃化 + 去重 + stats 态(TDD 去重)

**Files:**

- Modify: `Pathfinding/Features/PreferencesView.swift`、`Pathfinding/Features/Profile/ProfileStatsSection.swift`(stats 态)
- Create: `PathfindingTests/PreferenceSelectionTests.swift`

**Interfaces:** Consumes `cardSurface`;Produces 共享 `categoryColor`(挂在 `PreferenceCategory` 或一处)+ 泛型选择视图。

- [ ] **Step 1: 写失败测试(集中化 categoryColor 映射)**

`PathfindingTests/PreferenceSelectionTests.swift`:

```swift
import XCTest
@testable import Pathfinding

final class PreferenceSelectionTests: XCTestCase {
  func testCategoryColorIsStableAndCentralized() {
    // PreferenceCategory.color (集中化后) 对同一类别恒定且非默认灰
    XCTAssertEqual(PreferenceCategory.culture.color, PreferenceCategory.culture.color)
    XCTAssertNotEqual(PreferenceCategory.culture.color, PreferenceCategory.food.color)
  }
}
```

（以 PreferencesView 真实类别类型/值为准；若类别是 String 常量,改测集中化的 `categoryColor(_:)` 纯函数。）

- [ ] **Step 2: 运行 RED**

Run: _TEST PreferenceSelectionTests_ → FAIL(`PreferenceCategory.color` / 集中化映射未定义)。

- [ ] **Step 3: 集中化 categoryColor + 合并选择视图**

把重复 4 处的 `categoryColor(String)->Color`(`:287/364/482` + `CategoryBadge`)集中到一个 `PreferenceCategory.color`(或单一 `static func`);把雷同的 Travel/Budget/Pace 三个选择视图(`:502-547/551-594/598-641`)合并为一个泛型 List 选择器(`Button(.plain)` 行 + `checkmark.circle.fill`,原生 List 自动玻璃)。

- [ ] **Step 4: 玻璃化悬浮卡 + stats 态**

`PreferenceSummaryCard`(`.listRowBackground(.clear)` 悬浮)→ `.cardSurface()`;内部 `StyleBadge`/`CategoryBadge` 作为扁平 tint 内容留在卡内(不逐个上玻璃)。`ProfileStatsSection`:`.task` 期间用 `.redacted(reason: .placeholder)`;footprints 用真实值或空态(替硬编码 "0")。Toggle/NavigationLink 行不动。

- [ ] **Step 5: 运行测试 + 构建 + a11y**

Run: _TEST PreferenceSelectionTests_ → PASS;_BUILD_ → exit 0;三档 a11y 预览。

- [ ] **Step 6: Commit**

```bash
git add Pathfinding/Features/PreferencesView.swift Pathfinding/Features/Profile/ProfileStatsSection.swift PathfindingTests/PreferenceSelectionTests.swift
git commit -m "feat(ios): glassify Preferences cards, dedupe pickers, add stats loading state"
```

---

## Task 7: 收尾 — grep 删 ExplorerComponents + 全量校验

**Files:** Modify `Features/Profile/*`（去 `ExplorerSectionHeaderLabel`/`ExplorerStatDivider` 残留）;Delete `Features/Components/ExplorerComponents.swift`

**Interfaces:** Consumes 前述全部;Produces 干净组件层 + 全量绿。

- [ ] **Step 1: 确认 Profile 已不用 ExplorerDivider / ExplorerSectionHeaderLabel / ExplorerStatDivider**

Run:

```bash
cd apps/ios/Pathfinding
for s in ExplorerDivider ExplorerSectionHeaderLabel ExplorerStatDivider; do
  echo "== $s =="; grep -rn "\b$s\b" Pathfinding Shared --include='*.swift'; done
```

Expected:`ExplorerDivider` 仅剩 `ExplorerComponents.swift` 自身(定义+#Preview);`ExplorerSectionHeaderLabel`/`ExplorerStatDivider` 仅剩各自定义(Task 3 已替换调用)。若仍有外部调用,先回到对应文件替换为系统 `Divider()`/`Text`。

- [ ] **Step 2: 删定义**

删 `ProfileView`/`Features/Profile/*` 内的 `ExplorerSectionHeaderLabel`、`ExplorerStatDivider` 定义。`grep` 确认 `ExplorerComponents.swift` 零外部消费者后,`git rm Pathfinding/Features/Components/ExplorerComponents.swift`(其内 `ExplorerDivider` 等仅自身 #Preview 引用)。**若 `ExplorerComponents.swift` 仍有别处消费者(意外),保留并仅删确认无消费者的符号,在报告说明。**

- [ ] **Step 3: 构建 + 全量测试**

Run: _BUILD_ → exit 0。全量:`cd apps/ios/Pathfinding && xcodebuild test -scheme Pathfinding-Debug -destination "platform=iOS Simulator,id=<SIMID>" -only-testing:PathfindingTests -quiet` → 全过。

- [ ] **Step 4: 全流程手动回归(三档 a11y)**

Profile 滚动(Hero 悬浮)→ 各设置子页 → 改 accent 全 App 生效 → 语言切换 → iCloud 冲突解决;降低透明度/增强对比度/Reduce Motion 各走一遍。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/Profile Pathfinding/Features/Components Pathfinding/Features/ProfileView.swift  # 仅实际改动,显式列全
git commit -m "chore(ios): delete ExplorerComponents and remaining Profile-local legacy symbols"
```

---

## Self-Review(作者自查记录)

- **Spec 覆盖**:删死代码/map-style/trueBlackBackground→T1;拆分→T2;根玻璃化+悬浮 Hero+原生设置行+导航+分隔→T3;ThemeSettingsSheet Picker+accent 选色器→T4;Language/API/CloudSync/About→T5;Preferences 玻璃化+去重+stats 态→T6;grep 删 ExplorerComponents+全量校验→T7。玻璃纪律落为全局约束 + 各视觉 Task 的 a11y 目检 + T7 回归。
- **占位符扫描**:无 TBD/TODO;新逻辑(accent 选色器、Picker、去重、两测试)给具体代码;大文件用"精确 file:line + 代表性代码 + 逐字搬运"。
- **类型一致**:`ThemeManager.setAccentColor`/`accentColor`/`AccentColorOption.allCases`、`PreferenceCategory.color`(或集中化 `categoryColor`)、`cardSurface(tint:)` 跨 Task 一致。
- **以实物为准核对**:`ThemeManager` accent 持久化 key 名与 `setAccentColor`/`setTheme` 真实签名、`themeManager` 注入方式、PreferencesView 类别真实类型(String 常量 vs 枚举)、`ExplorerComponents.swift` 真实零消费者——均在对应 Task 标注。
- **与 spec 调和**:map-style 删、accent 接通(非删)、悬浮 Hero(确认的更进取选项,带"协同异常则回退头像芯片"的护栏);`ExplorerPageBackground` 保留弃用(Chat)。
