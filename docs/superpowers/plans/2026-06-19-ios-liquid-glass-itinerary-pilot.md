# iOS 26 Liquid Glass 重设计(底座 + 行程样板)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Pathfinding iOS App 抬到 iOS 26、建立一套可复用的 Liquid Glass 设计底座,并把行程流程端到端迁到新设计语言作为后续页面的样板。

**Architecture:** 底座先行 + 垂直样板。先做全局安全的外壳玻璃化(部署目标 / appearance 代理 / TabView),再新增共享原语(`cardSurface`、玻璃按钮),然后把行程流程逐屏迁移并接通孤儿页,最后做逻辑修复与(拉伸)去重。共享旧符号采用「弃用而非删除」,只物理删除迁移后 grep 验证无消费者的符号。

**Tech Stack:** SwiftUI(iOS 26 SDK)、Swift 6、XcodeGen、XCTest、MapKit、Swift Charts。

## Global Constraints

> 每个 Task 的要求都隐含包含本节。值均逐字取自 spec(`docs/superpowers/specs/2026-06-19-ios-liquid-glass-itinerary-pilot-design.md`)。

- **部署目标**:iOS `26.0`(最低);Swift `6.0`。全面采用 Liquid Glass,**不写** `if #available(iOS 26, *)` 分支。
- **设计原则(硬性)**:
  1. 玻璃不叠玻璃 —— `List`/`Form` 行由系统自动玻璃化,**不**再给行/卡显式 `.glassEffect`;仅**自由悬浮**表面上玻璃,同簇包进**一个** `GlassEffectContainer`,不嵌套 Container。
  2. tint 只表达「选中 / 主操作」,信息卡用无 tint `.regular`。
  3. `.interactive()` 仅给真交互元素(按钮、选中段),不给静态卡/标签。
  4. 删除工具栏背后的 Canvas 暗化/装饰背景。
  5. `.glassEffect(in:)` 在 `padding`/`frame` **之后**应用。
  6. 装饰移除与玻璃接入**同一 Task 内合入**;`glassEffectID` morph 守 `accessibilityReduceMotion`。
  7. 任何 sheet **不得**设 `.presentationBackground(_:)`(否则分级 sheet 丢失自动玻璃)。
- **弃用而非删除(关键)**:`cardStyle`/`subtleCardStyle`/`adaptiveCardStyle`/`glowCardStyle`/`borderedCardStyle`/`elevatedCardStyle`、`PrimaryButtonStyle`/`SecondaryButtonStyle`/`OutlineButtonStyle`、`VisualEffects.swift` 装饰、`heroGradient`/`meshGradient`/`primaryGradient`/`Terrain`/`Expedition` 调色板、`DesignTokens.Shadow`、`appleShadow`、`useTrueBlack`/`reduceContrastInDark` 这些**全 App 共用**符号,本计划一律加 `@available(*, deprecated, message: "iOS 26: use cardSurface / .buttonStyle(.glass*) / system glass")`,**保持可编译**。仅当某符号经 `grep -rn "<symbol>" Pathfinding Shared` 验证**零非测试消费者**时,才在对应 Task 末尾物理删除。
- **工程**:用 XcodeGen 管理。改 `project.yml` / `Config/*.xcconfig` 后运行 `xcodegen generate` 重生成 `.xcodeproj`;**绝不手改** `project.pbxproj`。
- **构建闸门命令**(下文记作 *BUILD*):
  ```bash
  cd apps/ios/Pathfinding && xcodegen generate && \
  xcodebuild build -scheme Pathfinding-Debug -destination 'generic/platform=iOS Simulator' -quiet
  ```
- **测试命令**(下文记作 *TEST <Class>*;先 `xcrun simctl list devices available` 选一台 iOS 26 模拟器,把 `iPhone 17 Pro` 换成实际可用名):
  ```bash
  cd apps/ios/Pathfinding && \
  xcodebuild test -scheme Pathfinding-Debug \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:PathfindingTests/<Class> -quiet
  ```
- **测试约定**:XCTest,`@testable import Pathfinding`,文件放 `PathfindingTests/`,2 空格缩进,AAA 模式,中文测试内容可用。
- **手动 a11y 目检**:凡视觉 Task,在「降低透明度 / 增强对比度 / Reduce Motion」三档下目检 chrome 不破、对比正常。
- **提交**:Conventional Commits;已在分支 `docs/ios-liquid-glass-itinerary-pilot`,实现请切到 `feat/ios-liquid-glass-itinerary-pilot`(`git checkout -b feat/ios-liquid-glass-itinerary-pilot`)。提交信息结尾加 `Claude-Session: https://claude.ai/code/session_01KPQLVQvfiFQdJCda35eYNb`。

---

## File Structure

**修改(底座 / 外壳):**
- `apps/ios/Pathfinding/project.yml` — 部署目标 / Xcode 版本
- `apps/ios/Pathfinding/Config/*.xcconfig` — 若含 `IPHONEOS_DEPLOYMENT_TARGET`
- `Pathfinding/PathfindingApp.swift` — 删 `configureAppearance()`
- `Pathfinding/ContentView.swift` — 新 `TabView { Tab(...) }` + 最小化行为 + 简化 `Tab` 枚举
- `Pathfinding/Features/Components/DesignSystem.swift` — 新增 `cardSurface`/玻璃按钮便捷;弃用旧卡片/按钮/阴影
- `Pathfinding/Features/Components/VisualEffects.swift` — 弃用装饰 API(末尾删 grep-空消费者者)
- `Pathfinding/Core/ThemeManager.swift` — 删窗口注入,环境驱动;弃用渐变生成器与多余开关

**修改 / 新增(行程流程):**
- `Pathfinding/Features/ItineraryListView.swift` — 列表重设计 + 抽离详情
- 新增 `Pathfinding/Features/Itinerary/ItineraryDetailView.swift` 及子视图 `MapHeader.swift` / `TimelineSection.swift` / `DayCard.swift` / `TipsCard.swift` / `DayEditSheet.swift`(同目录)
- `Pathfinding/Features/PoiEditView.swift` — 搜索防抖
- `Pathfinding/Features/Components/OptimizedMapView.swift` — 玻璃 pin + 索引修复
- `Pathfinding/Features/Analysis/ItineraryAnalysisView.swift` — 接通 + cardSurface + 原生态
- `Pathfinding/Features/Budget/*.swift` — 接通 + cardSurface;(拉伸)费用表单合并
- `Pathfinding/Features/CopyItinerarySheet.swift` — 玻璃 chip;(拉伸)泛型去重
- `Pathfinding/Core/ItineraryStore.swift` — 持久化防抖 + `copyItinerary` 修复

**新增(测试):**
- `PathfindingTests/ItineraryStoreCopyTests.swift`
- `PathfindingTests/PoiSearchDebounceTests.swift`
- `PathfindingTests/ItineraryDetailDestinationsTests.swift`
- (拉伸)`PathfindingTests/CopyableSourceTests.swift`、`PathfindingTests/ExpenseFormModelTests.swift`

---

## Task 1: 抬高部署目标到 iOS 26

**Files:**
- Modify: `apps/ios/Pathfinding/project.yml:4-6,19-22`
- Modify: `apps/ios/Pathfinding/Config/*.xcconfig`(若含部署目标)
- Regenerate: `Pathfinding.xcodeproj`(经 `xcodegen generate`)

**Interfaces:**
- Consumes: 无
- Produces: iOS 26 SDK 基线,后续所有 Task 可无条件使用 Liquid Glass API。

- [ ] **Step 1: 定位所有部署目标声明**

Run:
```bash
cd apps/ios/Pathfinding && grep -rn "17.0\|IPHONEOS_DEPLOYMENT_TARGET\|deploymentTarget\|xcodeVersion" project.yml Config/
```
Expected: 命中 `project.yml:5`(`iOS: '17.0'`)、`project.yml:6`(`xcodeVersion: '16.0'`)、`project.yml:22`(`IPHONEOS_DEPLOYMENT_TARGET: '17.0'`),以及 `Config/*.xcconfig` 中可能存在的同名键。

- [ ] **Step 2: 改 `project.yml`**

把第 5、6、22 行改为:
```yaml
  deploymentTarget:
    iOS: '26.0'
  xcodeVersion: '26.0'
```
```yaml
    IPHONEOS_DEPLOYMENT_TARGET: '26.0'
```

- [ ] **Step 3: 改 `Config/*.xcconfig` 中的部署目标(若 Step 1 命中)**

把命中的 `IPHONEOS_DEPLOYMENT_TARGET = 17.0` 行改为 `IPHONEOS_DEPLOYMENT_TARGET = 26.0`。若未命中则跳过。

- [ ] **Step 4: 重生成并构建**

Run: *BUILD*
Expected: `xcodegen generate` 成功;`xcodebuild build` 成功(此时尚无玻璃代码,纯验证抬版不破坏现有构建)。若报缺少 iOS 26 SDK,说明本机非 Xcode 26,需先安装。

- [ ] **Step 5: 折叠现已恒真的旧可用性判断(可选清理,限本次命中处)**

Run: `grep -rn "#available(iOS 1[567]" Pathfinding`
对每处 `if #available(iOS 16/17, *)`(min 已是 26,恒真),保留 then 分支、删 else 分支与判断壳。仅改本次命中的少数文件(Siri/Calendar/Profile)。改完重跑 *BUILD*。

- [ ] **Step 6: Commit**

```bash
git add apps/ios/Pathfinding/project.yml apps/ios/Pathfinding/Config apps/ios/Pathfinding/Pathfinding.xcodeproj
git commit -m "build(ios): raise deployment target to iOS 26"
```

---

## Task 2: 移除 UIKit appearance 代理(拿回全局玻璃)

**Files:**
- Modify: `Pathfinding/PathfindingApp.swift:9-12,25-46`

**Interfaces:**
- Consumes: Task 1 的 iOS 26 基线
- Produces: 导航栏/标签栏/sheet 自动 Liquid Glass。

- [ ] **Step 1: 删除 `configureAppearance()` 及其调用**

删掉 `init()` 中的 `configureAppearance()` 调用(`:11`)与整个 `configureAppearance()` 方法(`:25-46`)。保留 `applyUITestLaunchOverrides()`。`init()` 变为:
```swift
  init() {
    applyUITestLaunchOverrides()
  }
```

- [ ] **Step 2: 构建**

Run: *BUILD*
Expected: 成功。

- [ ] **Step 3: 手动目检**

在模拟器运行,确认导航栏/标签栏呈 Liquid Glass(半透明、滚动到边缘透明)。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/PathfindingApp.swift
git commit -m "feat(ios): drop UIKit appearance proxies for automatic Liquid Glass"
```

---

## Task 3: 声明式 TabView + 滚动最小化

**Files:**
- Modify: `Pathfinding/ContentView.swift:4-36`(`Tab` 枚举)、`:43-82`(`ContentView.body`)

**Interfaces:**
- Consumes: Task 2 的玻璃栏
- Produces: `enum Tab`(去掉 `selectedIcon`);`ContentView` 使用值绑定 `TabView`。

- [ ] **Step 1: 简化 `Tab` 枚举**

删除 `selectedIcon` 计算属性(`:28-35`)。保留 `title`、`icon`(`discover` 用 `"sparkle.magnifyingglass"`,`chat` 用 `"bubble.left.and.bubble.right"`,`itinerary` 用 `"map"`,`profile` 用 `"person"`)。

- [ ] **Step 2: 改写 `ContentView.body` 为声明式 Tab**

```swift
  var body: some View {
    TabView(selection: $appState.selectedTab) {
      Tab(Tab.discover.title, systemImage: Tab.discover.icon, value: Tab.discover) {
        DiscoverView()
      }
      Tab(Tab.chat.title, systemImage: Tab.chat.icon, value: Tab.chat) {
        ChatSessionListView(userId: AuthManager.shared.currentUserId ?? "guest")
      }
      Tab(Tab.itinerary.title, systemImage: Tab.itinerary.icon, value: Tab.itinerary) {
        ItineraryListView()
      }
      Tab(Tab.profile.title, systemImage: Tab.profile.icon, value: Tab.profile) {
        ProfileView()
      }
    }
    .tabBarMinimizeBehavior(.onScrollDown)
    .accessibilityIdentifier("authenticated-root")
    .tint(ThemeManager.shared.accentColor.color)
    .sensoryFeedback(.selection, trigger: appState.selectedTab)
    .environment(appState)
    .id(localizationManager.currentLanguage)
  }
```
(移除原 `.animation(...)`;系统玻璃标签栏自带过渡。)

- [ ] **Step 3: 构建**

Run: *BUILD*
Expected: 成功。

- [ ] **Step 4: 手动目检**

四个 Tab 可切换;选中图标自动填充;向下滚动列表时标签栏最小化。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/ContentView.swift
git commit -m "feat(ios): adopt declarative TabView with tab bar minimize behavior"
```

---

## Task 4: `cardSurface` 玻璃卡片原语

**Files:**
- Modify: `Pathfinding/Features/Components/DesignSystem.swift`(新增扩展;弃用旧卡片修饰符)

**Interfaces:**
- Consumes: 无
- Produces:
  - `func cardSurface(tint: Color? = nil, cornerRadius: CGFloat = DesignTokens.Radius.lg) -> some View`
  - 旧 `cardStyle/subtleCardStyle/adaptiveCardStyle/adaptiveSubtleCardStyle/glassCard/elevatedCardStyle/glowCardStyle/borderedCardStyle` 标注 `@available(*, deprecated, ...)`(保留实现)。

- [ ] **Step 1: 新增 `cardSurface` 扩展**

在 `extension View` 区追加:
```swift
extension View {
  /// 唯一玻璃卡片表面(iOS 26)。在 padding/frame 之后调用。
  /// - 仅用于自由悬浮表面;List/Form 行不要再套(避免玻璃叠玻璃)。
  /// - tint 仅用于"选中 / 主操作"强调,信息卡传 nil。
  func cardSurface(tint: Color? = nil, cornerRadius: CGFloat = DesignTokens.Radius.lg) -> some View {
    let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
    return self.glassEffect(
      tint.map { Glass.regular.tint($0) } ?? Glass.regular,
      in: shape
    )
  }
}
```
> 注:`.glassEffect` 仅有 `.regular`/`.clear` 等变体;强调通过 `.tint()` 表达,不存在 `.prominent` 玻璃变体。若编译器报 `Glass` 命名空间不符,改用 `.regular`/`.regular.tint($0)` 字面量(以 SDK 实际签名为准)。

- [ ] **Step 2: 新增 `cardSurface` 的 `#Preview`**

在文件末尾追加,覆盖无 tint / 有 tint:
```swift
#Preview("cardSurface") {
  VStack(spacing: 16) {
    Text("Info card").padding().frame(maxWidth: .infinity).cardSurface()
    Text("Selected").padding().frame(maxWidth: .infinity)
      .cardSurface(tint: .accentColor.opacity(0.3))
  }
  .padding()
  .background(Color(.systemGroupedBackground))
}
```

- [ ] **Step 3: 弃用旧卡片修饰符**

给 `cardStyle`/`subtleCardStyle`/`adaptiveCardStyle`/`adaptiveSubtleCardStyle`/`glassCard`/`elevatedCardStyle`/`glowCardStyle`/`borderedCardStyle` 各加一行(保留方法体):
```swift
  @available(*, deprecated, message: "iOS 26: use cardSurface(tint:) backed by system glass")
```

- [ ] **Step 4: 构建 + 预览**

Run: *BUILD*;Xcode 打开 `cardSurface` 预览,Light/Dark + 降低透明度 三态目检。
Expected: 构建成功(旧调用点因弃用仅告警,不报错);预览中卡片为系统玻璃、无手写阴影。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/Components/DesignSystem.swift
git commit -m "feat(ios): add cardSurface glass primitive and deprecate legacy card styles"
```

---

## Task 5: 玻璃按钮样式

**Files:**
- Modify: `Pathfinding/Features/Components/DesignSystem.swift`(弃用 3 个自定义 ButtonStyle 与 `.primary/.secondary/.outline` 便捷)

**Interfaces:**
- Consumes: 无
- Produces: 约定 —— 主操作用 `.buttonStyle(.glassProminent)`,次级用 `.buttonStyle(.glass)`;`PrimaryButtonStyle/SecondaryButtonStyle/OutlineButtonStyle` 标注弃用。

- [ ] **Step 1: 弃用自定义 ButtonStyle**

给 `PrimaryButtonStyle`、`SecondaryButtonStyle`、`OutlineButtonStyle` 三个 struct 各加:
```swift
@available(*, deprecated, message: "iOS 26: use .buttonStyle(.glassProminent) for primary, .buttonStyle(.glass) for secondary")
```
并给 `extension ButtonStyle where Self == ...` 的三个静态便捷各加同样弃用标注(保留实现以免破坏现有调用)。

- [ ] **Step 2: 构建**

Run: *BUILD*
Expected: 成功(现有 `.primary/.secondary` 调用点仅告警)。

- [ ] **Step 3: Commit**

```bash
git add Pathfinding/Features/Components/DesignSystem.swift
git commit -m "feat(ios): deprecate custom button styles in favor of system glass buttons"
```

---

## Task 6: ThemeManager 环境化 + 弃用渐变生成器

**Files:**
- Modify: `Pathfinding/Core/ThemeManager.swift:236-243,315-358`

**Interfaces:**
- Consumes: Task 3 的 `.tint`
- Produces: 外观仅经 `ThemeModifier`(`preferredColorScheme` + `.tint`)驱动;`applyTheme/applyAccentColor/applyThemeImmediately` 的窗口遍历删除。

- [ ] **Step 1: 删除 UIKit 窗口注入**

把 `applyTheme()`(`:315-333`)、`applyThemeImmediately()`(`:335-347`)、`applyAccentColor()`(`:349-358`)三处对 `connectedScenes`/`window.overrideUserInterfaceStyle`/`window.tintColor` 的遍历删除。`setTheme`/`setAccentColor` 中改为只 `saveSettings()` + `notifyThemeChange()`(去掉 `applyTheme()`/`applyAccentColor()` 调用)。外观由 `ThemeModifier`(`:449-458`,已 `preferredColorScheme` + `.tint`)负责,SwiftUI 自动响应 `@Observable` 变化。

- [ ] **Step 2: 弃用渐变生成器与多余开关**

给 `primaryGradient`(`:236-243`)加弃用标注;给 `useTrueBlack`/`reduceContrastInDark` 相关的 `setTrueBlack`/`setReduceContrast` 与属性加弃用标注(保留,Preferences UI 仍引用)。`DesignTokens.Colors.heroGradient/meshGradient/primaryGradient`(`DesignSystem.swift:464-517`)同样加弃用标注。

- [ ] **Step 3: 构建 + 手动目检**

Run: *BUILD*;运行后在设置里切换 浅/深色 与强调色,确认全 App(含未迁移 Tab)即时生效。
Expected: 成功;主题切换正常(经 SwiftUI 环境而非窗口注入)。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/Core/ThemeManager.swift Pathfinding/Features/Components/DesignSystem.swift
git commit -m "refactor(ios): drive theming via SwiftUI environment, deprecate gradient generators"
```

---

## Task 7: 抽离并拆分 `SavedItineraryDetailView`(行为保持)

**Files:**
- Modify: `Pathfinding/Features/ItineraryListView.swift`(移出 `:397-741`)
- Create: `Pathfinding/Features/Itinerary/ItineraryDetailView.swift`、`MapHeader.swift`、`TimelineSection.swift`、`DayCard.swift`、`TipsCard.swift`、`DayEditSheet.swift`

**Interfaces:**
- Consumes: `SavedItinerary`(`Models/SavedItinerary.swift`)、`ItineraryStore`、`OptimizedMapView`
- Produces: `struct ItineraryDetailView: View { let itinerary: SavedItinerary }`,内部子视图 `MapHeader`/`TimelineSection`/`DayCard`/`TipsCard`/`DayEditSheet`。列表的 `navigationDestination(for: SavedItinerary.self)`(`ItineraryListView.swift:80`)改路由到 `ItineraryDetailView`。

- [ ] **Step 1: 整体搬运**

将 `SavedItineraryDetailView`(`:397-741`)整段剪切到新文件 `Features/Itinerary/ItineraryDetailView.swift`,改名 `ItineraryDetailView`(保留原逻辑不变),`import SwiftUI`/`import MapKit` 按需补齐。`navigationDestination`(`:80`)目标改为 `ItineraryDetailView(itinerary: $0)`。

- [ ] **Step 2: 按职责拆出子视图(行为不变)**

把原 body 内联块抽成同目录独立 struct,**逐字搬运**现有视图代码,不改样式:
- `MapHeader`:地图头(原 `:442` 附近)
- `TimelineSection` + `DayCard`:时间轴与日卡(原 `:491-577`)
- `TipsCard`:贴士块(原 `:594-595`)
- `DayEditSheet`:内联日编辑 sheet(原 `:641-691`)
`ItineraryDetailView.body` 改为组合这些子视图,数据/绑定通过初始化参数传入。

- [ ] **Step 3: 构建 + 预览**

Run: *BUILD*;为 `ItineraryDetailView` 加一个用示例 `SavedItinerary` 的 `#Preview`。
Expected: 构建成功;详情屏外观/交互与重构前一致(纯结构搬运)。

- [ ] **Step 4: 手动目检**

列表点入详情,确认地图头、时间轴、日编辑 sheet、保存均与之前一致。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/ItineraryListView.swift Pathfinding/Features/Itinerary
git commit -m "refactor(ios): extract ItineraryDetailView into composed subviews"
```

---

## Task 8: 行程列表重设计

**Files:**
- Modify: `Pathfinding/Features/ItineraryListView.swift:11-90,109-157,182-184,229-230`

**Interfaces:**
- Consumes: Task 7 的 `ItineraryDetailView`
- Produces: 玻璃化列表入口(系统玻璃行 + 分组工具栏 + 单主操作空态)。

- [ ] **Step 1: 移除自定义背景,恢复系统玻璃列表**

删除包裹列表的 `ExplorerPageBackground`(`:15` 附近)与 `.scrollContentBackground(.hidden)` + 自定义 `.background(...)`(`:182-184`)。`ItineraryCard`(`:229-230`)去掉 `subtleCardStyle()` —— 列表行由系统自动玻璃化(原则 1,不再显式上玻璃)。

- [ ] **Step 2: 分组工具栏**

把 leading 省略号 Menu 与 trailing plus(`:26-63`)改为离散 `ToolbarItem`,在「AI/语音/发现」菜单与「新建」主操作之间插 `ToolbarSpacer(.fixed)`:
```swift
    .toolbar {
      ToolbarItem(placement: .topBarLeading) { itineraryActionsMenu }
      ToolbarSpacer(.fixed, placement: .topBarTrailing)
      ToolbarItem(placement: .topBarTrailing) {
        Button { showCreateSheet = true } label: { Image(systemName: "plus") }
          .accessibilityLabel("tab.itinerary.create".localized)
      }
    }
```
(`itineraryActionsMenu` 为原 Menu 内容抽出的计算属性。)

- [ ] **Step 3: 收敛空态为单主操作**

把空态 5 个 CTA(`:109-157`)改为一个 `ContentUnavailableView`,label 内置一个 `.buttonStyle(.glassProminent)` 主操作(AI 生成行程)与至多一个 `.buttonStyle(.glass)` 次操作(浏览公开行程);其余入口移到工具栏菜单:
```swift
ContentUnavailableView {
  Label("itinerary.empty.title".localized, systemImage: "map")
} description: {
  Text("itinerary.empty.subtitle".localized)
} actions: {
  Button("itinerary.empty.ai".localized) { showAIPlanner = true }
    .buttonStyle(.glassProminent)
  Button("itinerary.empty.browse".localized) { showPublicDiscovery = true }
    .buttonStyle(.glass)
}
```

- [ ] **Step 4: 构建 + 手动目检 + a11y 目检**

Run: *BUILD*;运行确认列表行为系统玻璃、工具栏成正确玻璃胶囊分组、空态单一主操作。三档 a11y 目检。
Expected: 成功且观感符合内容优先。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/ItineraryListView.swift
git commit -m "feat(ios): redesign itinerary list with system glass and grouped toolbar"
```

---

## Task 9: 行程详情重设计(地图头 + 玻璃卡 + 选中日 morph)

**Files:**
- Modify: `Pathfinding/Features/Itinerary/ItineraryDetailView.swift`、`MapHeader.swift`、`TimelineSection.swift`、`DayCard.swift`、`TipsCard.swift`

**Interfaces:**
- Consumes: Task 4 `cardSurface`、Task 7 子视图
- Produces: 玻璃化详情样板。

- [ ] **Step 1: 地图头玻璃化滚动边缘**

`MapHeader`:移除固定 350pt + cornerRadius 0 + `.ignoresSafeArea(edges: .top)` 的对抗式写法;改为:
```swift
OptimizedMapView(/* 原参数 */)
  .frame(height: 320)
  .backgroundExtensionEffect()
```
并在详情根 `ScrollView` 上加 `.scrollEdgeEffectStyle(.soft, for: .top)`。

- [ ] **Step 2: 卡片走 `cardSurface`**

`DayCard`/`TipsCard`:把 `.background(Color(.secondarySystemBackground).opacity(0.5))`/`.background(.green.opacity(0.1))` + clipShape 改为内容 `.padding(...)` 之后 `.cardSurface()`(贴士可 `cardSurface(tint: .green.opacity(0.15))`)。

- [ ] **Step 3: 选中日 tint 玻璃 + morph**

`TimelineSection` 顶部声明 `@Namespace private var glassNS` 与 `@Environment(\.accessibilityReduceMotion) private var reduceMotion`。选中日:
```swift
dayCard
  .cardSurface(tint: isSelected ? .accentColor.opacity(0.3) : nil)
  .glassEffectID("day-\(index)", in: glassNS)
```
把整个时间轴的卡片簇包进 `GlassEffectContainer(spacing: DesignTokens.Spacing.sm) { ... }`(全详情仅此一个 Container)。展开/收起 `withAnimation(reduceMotion ? nil : DesignTokens.Animation.spring)`。

- [ ] **Step 4: 工具栏拆分**

详情 trailing 的 `HStack` 单 `ToolbarItem`(原 `ItineraryListView.swift:604-616`,现位于 `ItineraryDetailView`)拆成两个 `ToolbarItem`(Copy / CalendarSync)+ 之间 `ToolbarSpacer()`。

- [ ] **Step 5: 构建 + 预览 + a11y 目检**

Run: *BUILD*;预览三态;运行目检地图头玻璃栏浮动、选中日 morph、Reduce Motion 下无动画。
Expected: 成功。

- [ ] **Step 6: Commit**

```bash
git add Pathfinding/Features/Itinerary
git commit -m "feat(ios): redesign itinerary detail with glass cards and morphing selected day"
```

---

## Task 10: 接通孤儿页(预算 / 分析入口 + 数据通路)

**Files:**
- Modify: `Pathfinding/Features/Itinerary/ItineraryDetailView.swift`(新增入口)
- Modify: `Pathfinding/Features/Budget/AddExpenseView.swift:185`(替换硬编码 userId)
- Create: `PathfindingTests/ItineraryDetailDestinationsTests.swift`

**Interfaces:**
- Consumes: `ItineraryAnalysisView(itineraryId:)`、`BudgetOverviewView(...)`(以其现有 init 签名为准,搬运时核对)、`AuthManager.shared.currentUserId`
- Produces: 详情可达分析/预算;预算真实 `userId`。

- [ ] **Step 1: 写失败测试(分析/预算可达性)**

`PathfindingTests/ItineraryDetailDestinationsTests.swift`:
```swift
import XCTest
@testable import Pathfinding

@MainActor
final class ItineraryDetailDestinationsTests: XCTestCase {
  func testDetailExposesAnalysisAndBudgetDestinations() {
    let itinerary = SavedItinerary.previewSample  // 见 Step 2
    let destinations = ItineraryDetailView(itinerary: itinerary).availableDestinations
    XCTAssertTrue(destinations.contains(.analysis))
    XCTAssertTrue(destinations.contains(.budget))
  }
}
```

- [ ] **Step 2: 运行,确认失败**

Run: *TEST ItineraryDetailDestinationsTests*
Expected: 编译失败 / FAIL —— `availableDestinations`、`SavedItinerary.previewSample`、`ItineraryDetail.Destination` 未定义。

- [ ] **Step 3: 实现入口与可测枚举**

在 `ItineraryDetailView` 增加:
```swift
enum Destination: Hashable { case analysis, budget }

var availableDestinations: [Destination] {
  var result: [Destination] = []
  if itinerary.apiItineraryId != nil { result.append(.analysis) }
  result.append(.budget)
  return result
}
```
工具栏加 overflow `Menu`,按 `availableDestinations` 生成 `NavigationLink`:分析 → `ItineraryAnalysisView(itineraryId: itinerary.apiItineraryId ?? "")`;预算 → `BudgetOverviewView(itineraryId: itinerary.id, userId: AuthManager.shared.currentUserId ?? "guest")`(以两视图实际 init 为准)。在 `Models/SavedItinerary.swift`(或测试目标可见处)加 `static var previewSample: SavedItinerary`。

- [ ] **Step 4: 替换硬编码 userId**

`AddExpenseView.swift:185` 的 `userId: "current-user"` 改为从初始化注入的 `userId`(由 `BudgetOverviewView` 传入 `AuthManager.shared.currentUserId`)。

- [ ] **Step 5: 运行测试通过 + 构建**

Run: *TEST ItineraryDetailDestinationsTests* → PASS;*BUILD* → 成功。

- [ ] **Step 6: 手动目检**

详情进入分析、预算,确认能加载(网络/本地数据通路打通,非仅换皮)。

- [ ] **Step 7: Commit**

```bash
git add Pathfinding/Features/Itinerary Pathfinding/Features/Budget/AddExpenseView.swift Pathfinding/Models/SavedItinerary.swift PathfindingTests/ItineraryDetailDestinationsTests.swift
git commit -m "feat(ios): wire budget and analysis into itinerary detail with real userId"
```

---

## Task 11: 预算 / 分析页玻璃化与原生态

**Files:**
- Modify: `Pathfinding/Features/Analysis/ItineraryAnalysisView.swift:59-97,132-157` 及各卡片块
- Modify: `Pathfinding/Features/Budget/BudgetOverviewView.swift:159-330` 各卡片块

**Interfaces:**
- Consumes: Task 4 `cardSurface`
- Produces: 统一玻璃卡 + 原生加载/空态。

- [ ] **Step 1: 卡片改 `cardSurface` + 容器分组**

把两文件中重复的 `.padding().background(.background).clipShape(RoundedRectangle).shadow(DesignTokens.Shadow.sm)`(分析 ~14 处、预算 4 处)替换为内容 `.padding()` 之后 `.cardSurface()`;同一滚动区相邻卡片簇包进**一个** `GlassEffectContainer`。

- [ ] **Step 2: 原生加载/空态**

`LoadingAnalysisView` 手搓 trimmed-Circle spinner(`:59-97`)→ `ProgressView()`;数据骨架用 `.redacted(reason: .placeholder)`。临时空态 VStack(`:132-157`,以及 Budget 对应处)→ `ContentUnavailableView`。

- [ ] **Step 3: 构建 + 预览 + a11y 目检**

Run: *BUILD*;预览分析/预算的加载/空/有数据三态 + 三档 a11y。
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/Features/Analysis Pathfinding/Features/Budget
git commit -m "feat(ios): glassify budget and analysis cards with native loading and empty states"
```

---

## Task 12: 拷贝 / 选择 sheet 的玻璃 chip + 背景审计

**Files:**
- Modify: `Pathfinding/Features/CopyItinerarySheet.swift:254-257`(`DaySelectionChip`)
- Audit: `Pathfinding/Features/ItineraryListView.swift:64-79,687` 及流程内所有 `.sheet/.fullScreenCover`

**Interfaces:**
- Consumes: 无
- Produces: 玻璃化选择 chip;无 `presentationBackground` 覆盖。

- [ ] **Step 1: chip 玻璃化**

`DaySelectionChip` 的 `RoundedRectangle().fill(isSelected ? Color.accentColor : Color(.systemGray6))` 改为:
```swift
chipLabel
  .padding(.horizontal, DesignTokens.Spacing.sm)
  .padding(.vertical, DesignTokens.Spacing.xs)
  .glassEffect(
    .regular.tint(isSelected ? .accentColor : .clear).interactive(),
    in: .capsule
  )
```
`APIDaySelectionChip` 同样处理。

- [ ] **Step 2: presentationBackground 审计**

Run: `grep -rn "presentationBackground" Pathfinding/Features`
对行程流程内命中的 `.sheet/.fullScreenCover`,删除任何 `.presentationBackground(_:)`,保留 `.presentationDetents([...])`。

- [ ] **Step 3: 构建 + 手动目检**

Run: *BUILD*;运行拷贝 sheet,确认 chip 选中态由玻璃 tint 表达、sheet 为系统玻璃背景。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/Features/CopyItinerarySheet.swift Pathfinding/Features/ItineraryListView.swift
git commit -m "feat(ios): glassify day-selection chips and keep automatic sheet glass"
```

---

## Task 13: 地图 Pin 玻璃化 + O(n) 索引修复

**Files:**
- Modify: `Pathfinding/Features/Components/OptimizedMapView.swift:44,47-62`

**Interfaces:**
- Consumes: 无
- Produces: 玻璃 / 原生 marker;预计算索引映射。

- [ ] **Step 1: 修 O(n) firstIndex**

在 body 外用 `Dictionary(uniqueKeysWithValues:)` 预计算 `annotationID -> index` 映射,替换 `:44` 的 `firstIndex` 调用。

- [ ] **Step 2: pin 玻璃化**

把手搓 `ZStack { Circle().fill().shadow().overlay(stroke); Text(index) }`(`:47-62`)改为玻璃徽章:
```swift
Text("\(index + 1)")
  .font(DesignTokens.Typography.MapLegend.duration)
  .foregroundStyle(.white)
  .padding(8)
  .glassEffect(.regular.tint(typeColor), in: .circle)
```
(或用原生 `Marker` 的 tint,取本流程一致者。)

- [ ] **Step 3: 构建 + 手动目检**

Run: *BUILD*;详情地图确认编号 pin 为玻璃徽章、选中态清晰、滚动/缩放流畅。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/Features/Components/OptimizedMapView.swift
git commit -m "perf(ios): precompute pin indices and glassify map annotations"
```

---

## Task 14: POI 搜索防抖

**Files:**
- Modify: `Pathfinding/Features/PoiEditView.swift:63-84`
- Create: `PathfindingTests/PoiSearchDebounceTests.swift`

**Interfaces:**
- Consumes: 无
- Produces: `PoiSearchDebouncer`(可测的纯防抖器),`PoiEditView` 用它驱动 `MKLocalSearch`。

- [ ] **Step 1: 写失败测试**

```swift
import XCTest
@testable import Pathfinding

final class PoiSearchDebounceTests: XCTestCase {
  func testRapidInputsCollapseToOneQuery() async throws {
    var queries: [String] = []
    let debouncer = PoiSearchDebouncer(interval: .milliseconds(50)) { queries.append($0) }
    debouncer.send("a"); debouncer.send("ab"); debouncer.send("abc")
    try await Task.sleep(for: .milliseconds(120))
    XCTAssertEqual(queries, ["abc"])
  }
}
```

- [ ] **Step 2: 运行,确认失败**

Run: *TEST PoiSearchDebounceTests*
Expected: FAIL —— `PoiSearchDebouncer` 未定义。

- [ ] **Step 3: 实现防抖器**

新增 `PoiSearchDebouncer`(`PoiEditView.swift` 同文件或 `Core/`):
```swift
@MainActor
final class PoiSearchDebouncer {
  private let interval: Duration
  private let onFire: (String) -> Void
  private var task: Task<Void, Never>?
  init(interval: Duration, onFire: @escaping (String) -> Void) {
    self.interval = interval; self.onFire = onFire
  }
  func send(_ text: String) {
    task?.cancel()
    task = Task { [interval, onFire] in
      try? await Task.sleep(for: interval)
      guard !Task.isCancelled else { return }
      onFire(text)
    }
  }
}
```
把 `PoiEditView` 中 `.onChange(of: name)` 每键直接 `MKLocalSearch` 改为 `debouncer.send(name)`,在回调里发起搜索。

- [ ] **Step 4: 运行测试通过 + 构建**

Run: *TEST PoiSearchDebounceTests* → PASS;*BUILD* → 成功。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/PoiEditView.swift PathfindingTests/PoiSearchDebounceTests.swift
git commit -m "perf(ios): debounce POI MKLocalSearch input"
```

---

## Task 15: ItineraryStore 持久化防抖 + copyItinerary 修复

**Files:**
- Modify: `Pathfinding/Core/ItineraryStore.swift:122-128,138-...,364-371`
- Modify: `Pathfinding/Features/Itinerary/ItineraryDetailView.swift`(标题保存改 onSubmit/防抖)
- Create: `PathfindingTests/ItineraryStoreCopyTests.swift`

**Interfaces:**
- Consumes: 无
- Produces: `copyItinerary` 正确按 `newStartDate` 调整日期且只构建一次;标题不再每键全量持久化。

- [ ] **Step 1: 写失败测试(copyItinerary 日期调整)**

```swift
import XCTest
@testable import Pathfinding

@MainActor
final class ItineraryStoreCopyTests: XCTestCase {
  func testCopyShiftsDatesToNewStart() throws {
    let store = ItineraryStore.makeForTesting()  // 见 Step 3
    let original = SavedItinerary.previewSample    // 复用 Task 10 样例
    let newStart = Calendar.current.date(byAdding: .day, value: 30, to: original.startDate)!
    let copy = store.copyItinerary(original, newStartDate: newStart)
    XCTAssertEqual(Calendar.current.startOfDay(for: copy.startDate),
                   Calendar.current.startOfDay(for: newStart))
    XCTAssertEqual(copy.days.count, original.days.count)
  }
}
```

- [ ] **Step 2: 运行,确认失败**

Run: *TEST ItineraryStoreCopyTests*
Expected: FAIL —— 当前 `copyItinerary` 忽略 `newStartDate`(且 `makeForTesting` 未定义)。

- [ ] **Step 3: 修复 copyItinerary + 加测试工厂**

`ItineraryStore.copyItinerary`(`:138`)删除重复构建 `newItinerary` 的死代码,按 `newStartDate` 与原 `startDate` 的差值平移每天日期,只构建一次返回。加:
```swift
  #if DEBUG
  static func makeForTesting() -> ItineraryStore { ItineraryStore() }
  #endif
```
(若构造器私有,提供测试可达入口。)

- [ ] **Step 4: 持久化防抖**

`update()`(`:122-128`)保持单次语义;**取消**详情标题 `.onChange` 每键 `saveChanges()`(原 `ItineraryListView.swift:462-464`,现 `ItineraryDetailView`),改为 `.onSubmit` 或 100ms 防抖后再 `store.update()`。`persist()`(`:364-371`)逻辑不变。

- [ ] **Step 5: 运行测试通过 + 构建**

Run: *TEST ItineraryStoreCopyTests* → PASS;*BUILD* → 成功。

- [ ] **Step 6: 手动目检**

详情连续输入标题不卡顿;退出/重进标题已保存;拷贝行程日期正确平移。

- [ ] **Step 7: Commit**

```bash
git add Pathfinding/Core/ItineraryStore.swift Pathfinding/Features/Itinerary PathfindingTests/ItineraryStoreCopyTests.swift
git commit -m "fix(ios): debounce itinerary persistence and correct copyItinerary date shift"
```

---

## Task 16(拉伸): 拷贝 sheet 三胞胎收敛为泛型

**Files:**
- Modify: `Pathfinding/Features/CopyItinerarySheet.swift`(全文件)
- Create: `PathfindingTests/CopyableSourceTests.swift`

**Interfaces:**
- Consumes: `SavedItinerary`、`BlogPost`、`APIItinerary`
- Produces: `protocol CopyableSource`(暴露 `days`/`poiCount`/`title`/`performCopy`)+ 单一泛型 `CopyItinerarySheet<Source: CopyableSource>`。

- [ ] **Step 1: 写失败测试(三源计数一致)**

```swift
import XCTest
@testable import Pathfinding

final class CopyableSourceTests: XCTestCase {
  func testDayAndPoiCountsAcrossSources() {
    let local: any CopyableSource = SavedItinerary.previewSample
    XCTAssertEqual(local.dayCount, local.days.count)
    XCTAssertEqual(local.poiCount, local.days.reduce(0) { $0 + $1.pois.count })
  }
}
```

- [ ] **Step 2: 运行,确认失败**

Run: *TEST CopyableSourceTests*
Expected: FAIL —— `CopyableSource`/`dayCount`/`poiCount` 未定义。

- [ ] **Step 3: 抽象协议并让三源实现**

定义 `protocol CopyableSource`(`days`、`dayCount`、`poiCount`、`title`、`func performCopy(selectedDays:) async throws`),让 `SavedItinerary`/`BlogPost`/`APIItinerary` 各 `extension` 实现。把三个 sheet 的共享 `daySelectionView`/`copyPreviewView`/计数/`performCopy` 收进泛型 `CopyItinerarySheet<Source: CopyableSource>`;原三个入口改为该泛型的特化别名,调用点不变。

- [ ] **Step 4: 运行测试通过 + 构建 + 手动目检**

Run: *TEST CopyableSourceTests* → PASS;*BUILD* → 成功;三条拷贝入口(本地/Guide/公开)逐一手测功能不变。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/CopyItinerarySheet.swift PathfindingTests/CopyableSourceTests.swift
git commit -m "refactor(ios): unify three copy sheets behind a CopyableSource protocol"
```

---

## Task 17(拉伸): 费用表单合并

**Files:**
- Modify: `Pathfinding/Features/Budget/AddExpenseView.swift`、`EditExpenseView`(同文件或 `Budget/`)
- Create: `PathfindingTests/ExpenseFormModelTests.swift`

**Interfaces:**
- Consumes: 费用模型
- Produces: 共享 `ExpenseForm`(create/edit 双模),`AddExpenseView`/`EditExpenseView` 成薄包装。

- [ ] **Step 1: 写失败测试(表单模型双模)**

```swift
import XCTest
@testable import Pathfinding

final class ExpenseFormModelTests: XCTestCase {
  func testEditModePrefillsFromExpense() {
    let expense = Expense.previewSample
    let model = ExpenseFormModel(mode: .edit(expense))
    XCTAssertEqual(model.amount, expense.amount)
    XCTAssertEqual(model.category, expense.category)
  }
  func testCreateModeStartsEmpty() {
    let model = ExpenseFormModel(mode: .create)
    XCTAssertEqual(model.amount, 0)
  }
}
```

- [ ] **Step 2: 运行,确认失败**

Run: *TEST ExpenseFormModelTests*
Expected: FAIL —— `ExpenseFormModel`/`mode` 未定义。

- [ ] **Step 3: 提取共享表单**

新增 `ExpenseFormModel`(`enum Mode { case create; case edit(Expense) }`)与共享 `ExpenseForm` 视图(承载原 `AddExpenseView.swift:27-200` 的 Form 主体)。`AddExpenseView`/`EditExpenseView` 改为以不同 `mode` 包装 `ExpenseForm`;删除 `EditExpenseView` 重复 Form(`:307-509`)。

- [ ] **Step 4: 运行测试通过 + 构建 + 手动目检**

Run: *TEST ExpenseFormModelTests* → PASS;*BUILD* → 成功;新增与编辑费用各手测一次。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/Budget PathfindingTests/ExpenseFormModelTests.swift
git commit -m "refactor(ios): share one ExpenseForm across add and edit expense"
```

---

## Task 18: 收尾 —— grep 删除无消费者符号 + 全量校验

**Files:**
- Modify: `Pathfinding/Features/Components/VisualEffects.swift`、`DesignSystem.swift`、`Core/ThemeManager.swift`(仅删 grep-空消费者者)

**Interfaces:**
- Consumes: 前述全部 Task
- Produces: 物理删除迁移后无引用的死装饰;全量测试通过。

- [ ] **Step 1: 逐符号 grep 验证**

对每个弃用符号运行,例如:
```bash
cd apps/ios/Pathfinding && for s in ExplorerPageBackground ExplorerCardStyle AnimatedBorderGradient GradientMeshBackground NoiseTextureOverlay; do
  echo "== $s =="; grep -rn "\b$s\b" Pathfinding Shared --include=*.swift | grep -v "VisualEffects.swift"; done
```
**仅**对输出为空(无非定义处引用)的符号,删除其定义及相关 `View` 扩展便捷。**有任何非测试消费者(如 Discover/Profile)则保留弃用、不删**,留待对应 Tab 的 spec。

- [ ] **Step 2: 构建 + 全量测试**

Run: *BUILD*;然后全量测试:
```bash
cd apps/ios/Pathfinding && xcodebuild test -scheme Pathfinding-Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -quiet
```
Expected: 构建成功、全部测试通过。

- [ ] **Step 3: 全流程手动回归(三档 a11y)**

列表 → 详情 → 分析/预算 → 编辑保存 → 拷贝;在 降低透明度/增强对比度/Reduce Motion 下各走一遍,确认无低对比 chrome、无玻璃叠玻璃、无残留装饰。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(ios): remove now-unused Explorer decorations after itinerary migration"
```

---

## Self-Review(作者自查记录)

- **Spec 覆盖**:Step 0 闸门→T1;appearance 代理→T2;TabView→T3;cardSurface→T4;玻璃按钮→T5;ThemeManager→T6;拆巨石→T7;列表→T8;详情→T9;接通孤儿页→T10;预算/分析玻璃化→T11;sheet chip+背景审计→T12;地图 pin+索引→T13;POI 防抖→T14;持久化防抖+copyItinerary→T15;拉伸去重→T16/T17;退役装饰(增量、grep 安全)→T18。设计原则 §3 落为全局约束并在各视觉 Task 的 a11y 目检与 T18 回归校验。
- **占位符扫描**:无 TBD/TODO;每个改代码步骤含具体代码或精确 file:line 与替换内容。大文件(详情/分析)采用"精确定位 + 代表性代码 + 行为保持搬运",不复制整文件。
- **类型一致**:`cardSurface(tint:cornerRadius:)`、`PoiSearchDebouncer.send`、`ItineraryDetailView.availableDestinations`/`Destination`、`SavedItinerary.previewSample`、`CopyableSource`/`dayCount`/`poiCount`、`ExpenseFormModel.Mode` 跨 Task 命名一致。
- **已知前置项**:`SavedItinerary.previewSample`(T10 引入,T15/T16 复用);`ItineraryStore.makeForTesting()`(T15 引入)。`BudgetOverviewView`/`ItineraryAnalysisView` 的真实 init 签名在 T10 搬运时以源码为准核对。
- **与 spec "退役整文件" 的调和**:已在全局约束声明"弃用而非删除,仅 grep-空消费者者物理删";spec 的整文件退役是整个工程终态,本计划完成第一增量(T18 仅删迁移后真正无引用者)。
