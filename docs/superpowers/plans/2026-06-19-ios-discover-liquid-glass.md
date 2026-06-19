# iOS 26 Liquid Glass Phase 2 — 发现(Discover)流程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Discover 流程(入口 + BlogDetail + CityEncyclopedia)迁到 iOS 26 Liquid Glass,新增 `Tab(role:.search)` 搜索 Tab,接通孤儿城市百科页,删死代码与孤儿装饰。

**Architecture:** 复用 Phase 1 已合并的玻璃底座(`cardSurface`、玻璃按钮、玻璃纪律)。先删死代码缩小依赖图 → 迁外壳搜索 → 重建 Discover 浏览 feed → 接通 CityEnc 入口 → 拆+玻璃化两个千行详情页 → 收尾弃用标注+删孤儿。共享旧符号 deprecate-not-delete,只删 grep 确认零消费者者。

**Tech Stack:** SwiftUI(iOS 26 SDK / Xcode 27)、Swift 6、XcodeGen、XCTest、MapKit、Swift Charts。

## Global Constraints

> 每个 Task 隐含包含本节。值取自 spec `docs/superpowers/specs/2026-06-19-ios-discover-liquid-glass-design.md` 与 Phase 1 已验证约定。

- **平台**:iOS 26 最低,Swift 6,全面 Liquid Glass,**不写** `#available`。
- **玻璃纪律(硬性,沿用 Phase 1)**:① 不叠玻璃——`List`/`Form` 行系统自动玻璃化,**不**显式上玻璃;仅**自由悬浮**表面用 `.glassEffect`/`cardSurface`,同簇进**一个** `GlassEffectContainer`,**不嵌套**。② tint 只表「选中/AI 主操作」,信息卡无 tint。③ `.interactive()` 仅给真交互元素。④ `cardSurface`/`.glassEffect` 在 `padding`/`frame` **之后**。⑤ 装饰移除与玻璃接入同 Task 内合入;morph 守 `accessibilityReduceMotion`。⑥ sheet **不**设 `.presentationBackground`。
- **已验证 API(Phase 1)**:玻璃卡片 `.cardSurface(tint: Color? = nil, cornerRadius: CGFloat = DesignTokens.Radius.lg)`(`DesignSystem.swift:739`);按钮 `.buttonStyle(.glassProminent)`(主)/`.buttonStyle(.glass)`(次);`.glassEffect(.regular[.tint(_)][.interactive()], in: <Shape>)`(`Glass.regular` 命名空间成立)。
- **命名遮蔽**:项目有自有 `enum Tab`,引用 SwiftUI 的须写 `SwiftUI.Tab`。新建类型若与既有重名(如 `DayCard` 已在 BlogDetailView 用过)须改名避让。
- **deprecate-not-delete + grep 闸门**:`ExplorerSectionHeader`/`ExplorerDivider`/`ExplorerPageBackground`/`TopographicLinesView`/`CompassRoseDecoration`/`NoiseTextureOverlay` 仍被 Chat/Profile/Auth 用——加 `@available(*, deprecated, message: "iOS 26: use cardSurface / system glass")` **保留**。物理删除某符号前必须 `grep -rn "\bSYMBOL\b" Pathfinding Shared --include='*.swift'`(排除其定义文件与测试)确认零消费者。
- **工程**:XcodeGen 管理。新增 `.swift` 后 `xcodegen generate` 自动纳入;**绝不手改** `project.pbxproj`。
- **BUILD 闸门**:`cd apps/ios/Pathfinding && xcodegen generate && xcodebuild build -scheme Pathfinding-Debug -destination 'generic/platform=iOS Simulator' -quiet`
- **TEST**(用具体 sim id 避免同名歧义;先 `xcrun simctl list devices available | grep 'iPhone 17 Pro ('` 取一个 id):`cd apps/ios/Pathfinding && xcodebuild test -scheme Pathfinding-Debug -destination "platform=iOS Simulator,id=<SIMID>" -only-testing:PathfindingTests/<Class> -quiet`
- **测试约定**:XCTest,`@testable import Pathfinding`,`PathfindingTests/`,2 空格,AAA,中文内容可用,`@MainActor` 按需。
- **本地化**:新 label 用 `"key".localized`,键加到 `Pathfinding/Resources/{zh-Hans,en}.lproj/Localizable.strings` **双文件**,不 ship 原始 key。
- **a11y 目检**(视觉 Task):降低透明度 / 增强对比度 / Reduce Motion 三档目检。
- **git**:Conventional Commits;提交信息结尾 `Claude-Session: https://claude.ai/code/session_01KPQLVQvfiFQdJCda35eYNb`。**显式 `git add` 改动文件,禁用 `git add -A`/`.`**(`.claude/worktrees/` 未跟踪不可入栈;`.superpowers/` 已 gitignore)。已在 `docs/ios-discover-liquid-glass`,实现请切 `feat/ios-discover-liquid-glass`(`git checkout -b feat/ios-discover-liquid-glass`)。SourceKit 跨目标诊断是噪声,`xcodebuild exit 0` 为准。

---

## File Structure

**修改(外壳/入口)**:`ContentView.swift`(enum Tab + 搜索 Tab)、`Features/DiscoverView.swift`(剥离搜索 + 玻璃浏览 feed + 热门城市 Section)。
**新增**:`Features/Search/SearchView.swift`;`Features/BlogDetail/`(媒体/头部/正文/行程子视图 + 提取的卡片/sheet);`Features/Encyclopedia/`(4 tab 子视图 + 复用卡组件)。
**修改(详情)**:`Features/BlogDetailView.swift`(瘦身为壳)、`Features/CityEncyclopediaView.swift`(瘦身为壳 + 接线)。
**删除**:`Features/EnhancedDiscoverView.swift`;`ExplorerCards`/`ExplorerComponents`/`VisualEffects` 中的孤儿符号(见 T9)。
**测试**:`PathfindingTests/SearchViewQueryTests.swift`、`PathfindingTests/CityEncyclopediaReachabilityTests.swift`。

---

## Task 1: 删除死代码 EnhancedDiscoverView

**Files:** Delete `Pathfinding/Features/EnhancedDiscoverView.swift`

**Interfaces:** Consumes 无;Produces 无(纯删除,缩小 Explorer* 消费者图)。

- [ ] **Step 1: 确认零消费者**

Run: `cd apps/ios/Pathfinding && grep -rn "EnhancedDiscoverView" Pathfinding Shared --include='*.swift' | grep -v "Features/EnhancedDiscoverView.swift"`
Expected: 空输出(仅其自身文件引用)。若有命中则停下报告。

- [ ] **Step 2: 删除文件**

Run: `cd apps/ios/Pathfinding && git rm Pathfinding/Features/EnhancedDiscoverView.swift`

- [ ] **Step 3: 构建**

Run: *BUILD*  Expected: exit 0(`xcodegen generate` 自动从工程移除该源)。

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(ios): delete dead EnhancedDiscoverView (zero consumers)"
```

---

## Task 2: 新增 Tab(role:.search) + SearchView,从 DiscoverView 剥离搜索

**Files:**
- Modify: `Pathfinding/ContentView.swift`(enum Tab `:4-28`,TabView `:35-62`)
- Create: `Pathfinding/Features/Search/SearchView.swift`
- Modify: `Pathfinding/Features/DiscoverView.swift`(移除 `.searchable`/`isSearchMode`/`searchResultsView`/`filterBar`/`triggerSearch`)
- Modify: `Pathfinding/Resources/{zh-Hans,en}.lproj/Localizable.strings`(`tab.search`)
- Create: `PathfindingTests/SearchViewQueryTests.swift`

**Interfaces:**
- Consumes: `GuideStore.search(query:destination:hasAiData:daysAgo:)`(async)、`searchResults`、`isSearching`(`Core/GuideStore.swift:17,19,110`);`BlogPost`、`BlogDetailView(guide:)`。
- Produces: `enum Tab` 新增 `.search`;`struct SearchView: View`;一个纯函数 `SearchView.makeSearchParams(text:city:onlyAI:timeFilter:) -> (query:String, destination:String?, hasAiData:Bool, daysAgo:Int?)` 供测试。

- [ ] **Step 1: 写失败测试(筛选→搜索参数映射)**

`PathfindingTests/SearchViewQueryTests.swift`:
```swift
import XCTest
@testable import Pathfinding

final class SearchViewQueryTests: XCTestCase {
  func testFiltersMapToSearchParams() {
    let p = SearchView.makeSearchParams(text: "kyoto", city: "Tokyo", onlyAI: true, timeFilter: .week)
    XCTAssertEqual(p.query, "kyoto")
    XCTAssertEqual(p.destination, "Tokyo")
    XCTAssertTrue(p.hasAiData)
    XCTAssertEqual(p.daysAgo, 7)
  }
  func testEmptyFiltersAreNil() {
    let p = SearchView.makeSearchParams(text: "x", city: nil, onlyAI: false, timeFilter: .all)
    XCTAssertNil(p.destination); XCTAssertFalse(p.hasAiData); XCTAssertNil(p.daysAgo)
  }
}
```
（`timeFilter` 用 DiscoverView 现有的时间筛选枚举;实现时核对其真实 case 名与 `.week`/`.all`/daysAgo 映射,按真实枚举调整测试。）

- [ ] **Step 2: 运行,确认失败**

Run: *TEST SearchViewQueryTests*  Expected: FAIL —— `SearchView`/`makeSearchParams` 未定义。

- [ ] **Step 3: 实现 SearchView**

读 `DiscoverView.swift` 现有 `searchText`/`selectedCity`/`onlyAiGuides`/`timeFilter`/`filterBar`/`triggerSearch`(300ms 防抖)与时间枚举。新建 `Features/Search/SearchView.swift`:
```swift
import SwiftUI

struct SearchView: View {
  @State private var searchText = ""
  // + 搬来的 selectedCity / onlyAiGuides / timeFilter 状态
  @Environment(GuideStore.self) private var guideStore   // 以真实注入方式为准
  @State private var searchTask: Task<Void, Never>?

  static func makeSearchParams(text: String, city: String?, onlyAI: Bool, timeFilter: TimeFilter)
    -> (query: String, destination: String?, hasAiData: Bool, daysAgo: Int?) {
    (query: text,
     destination: (city?.isEmpty == false) ? city : nil,
     hasAiData: onlyAI,
     daysAgo: timeFilter.daysAgo)   // .all -> nil, .week -> 7, 以真实枚举为准
  }

  var body: some View {
    NavigationStack {
      List { /* 结果行:系统行,不显式上玻璃 */ }
        .navigationTitle("tab.search".localized)
        .searchable(text: $searchText)
        // 搬来的 filterBar 作为 .searchScopes 或工具栏筛选
        .navigationDestination(for: BlogPost.self) { BlogDetailView(guide: $0) }
        .overlay { if guideStore.searchResults.isEmpty && !searchText.isEmpty {
          ContentUnavailableView.search } }
        .onChange(of: searchText) { _, _ in debouncedSearch() }
    }
  }

  private func debouncedSearch() {
    searchTask?.cancel()
    searchTask = Task {
      try? await Task.sleep(for: .milliseconds(300))
      guard !Task.isCancelled else { return }
      let p = Self.makeSearchParams(text: searchText, city: selectedCity, onlyAI: onlyAiGuides, timeFilter: timeFilter)
      await guideStore.search(query: p.query, destination: p.destination, hasAiData: p.hasAiData, daysAgo: p.daysAgo)
    }
  }
}
```
（以 `GuideStore` 真实注入方式 / `search` 真实签名 / 时间枚举为准微调;结果 `List` 行复用现有行视图但不加显式玻璃。）

- [ ] **Step 4: 扩展 enum Tab + 加搜索 Tab**

`ContentView.swift`:`enum Tab` 加 `case search`,在 `title`(`:12-16`)加 `case .search: return "tab.search".localized`,在 `icon`(`:19-26`)加 `case .search: return "magnifyingglass"`。TabView 末位(profile 之后)追加:
```swift
SwiftUI.Tab(Tab.search.title, systemImage: Tab.search.icon, value: .search, role: .search) {
  SearchView()
}
```

- [ ] **Step 5: 从 DiscoverView 剥离搜索**

移除 `.searchable`(`:84`)、`isSearchMode`(`:30-32`)及其 body 分支(`:43-49`)、`searchResultsView`(`:380-432`)、`filterBar`/`destinationFilterBadge`(`:178-313`,搬到 SearchView)、`triggerSearch`/`performSearch`(`:461-477`)。DiscoverView 仅保留浏览(featured + recent),保留 `.navigationDestination(for: BlogPost.self)`。

- [ ] **Step 6: 加本地化键**

`zh-Hans`:`"tab.search" = "搜索";`  `en`:`"tab.search" = "Search";`

- [ ] **Step 7: 运行测试 + 构建 + 手动**

Run: *TEST SearchViewQueryTests* → PASS;*BUILD* → exit 0。运行:确认尾部出现搜索 Tab、Discover 不再有内联搜索、搜索结果可点进详情。

- [ ] **Step 8: Commit**

```bash
git add Pathfinding/ContentView.swift Pathfinding/Features/Search Pathfinding/Features/DiscoverView.swift Pathfinding/Resources/zh-Hans.lproj/Localizable.strings Pathfinding/Resources/en.lproj/Localizable.strings PathfindingTests/SearchViewQueryTests.swift apps/ios/Pathfinding/Pathfinding.xcodeproj
git commit -m "feat(ios): add dedicated search tab and relocate Discover search into SearchView"
```
（`git add` 路径相对仓库根,按实际改动列全;不可 `-A`。）

---

## Task 3: 玻璃化 DiscoverView 浏览 feed

**Files:** Modify `Pathfinding/Features/DiscoverView.swift`

**Interfaces:** Consumes `cardSurface`、`GlassEffectContainer`;Produces 纯浏览玻璃 feed。

- [ ] **Step 1: 删装饰背景,改系统 List**

删 `explorerBackground` 5 层栈(`:119-174`)及其调用。feed 改为系统 `List`,两个 `Section`(精选 / 最近);用 `Section` header 取代 `ExplorerDivider`。移除任何 `.scrollContentBackground(.hidden)`。

- [ ] **Step 2: 精选卡玻璃化**

精选区横向卡片:内容(图/标签/标题/统计)布局后 `.cardSurface(cornerRadius: DesignTokens.Radius.lg)`,轮播兄弟卡包进**一个** `GlassEffectContainer { ForEach … }`;`NavigationLink` 用 `.buttonStyle(.glass)`;删 `ExplorerFeaturedCard` 的手搓 bg/描边/阴影/reveal(暂保留旧类型定义,T9 再删)。可新建轻量 `FeaturedGuideCard` 内容视图,或就地内联。

- [ ] **Step 3: 指南行用系统行**

最近区改 List 行,**不**显式上玻璃(避免叠玻璃);缩略图保留裁切;AI 标改一个扁平 `Label("guide.ai".localized, systemImage: "sparkles").foregroundStyle(.white).padding(.horizontal,8).padding(.vertical,4).glassEffect(.regular.tint(.purple), in: .capsule)`。

- [ ] **Step 4: 加载/空态原生化**

加载 → `.redacted(reason: .placeholder)` 套在真实卡片布局上(删旋转罗盘 `ExplorerLoadingIndicator` 与手搓 shimmer 的调用);无内容空态 → `ContentUnavailableView`。

- [ ] **Step 5: 构建 + 预览 + a11y**

Run: *BUILD* → exit 0。预览三态 + 三档 a11y。确认无装饰背景、精选卡为玻璃且同簇一个 Container、行无显式玻璃。

- [ ] **Step 6: Commit**

```bash
git add Pathfinding/Features/DiscoverView.swift  # + 若新增 FeaturedGuideCard 文件 / 本地化键
git commit -m "feat(ios): rebuild Discover browse feed with system glass list and cards"
```

---

## Task 4: 接通 CityEncyclopedia 入口(Discover 热门城市 Section)

**Files:**
- Modify: `Pathfinding/Features/DiscoverView.swift`(新增「热门城市」Section)
- Create: `PathfindingTests/CityEncyclopediaReachabilityTests.swift`
- (可能)Modify: `Pathfinding/Core/...`(若需城市列表数据)

**Interfaces:** Consumes `CityEncyclopediaView(cityId:cityName:)`(以其真实 init 为准核对)、城市数据;Produces Discover 可达 CityEnc。

- [ ] **Step 1: 核对城市列表数据源**

Run: `cd apps/ios/Pathfinding && grep -rn "fetchCities\|cityList\|func.*[Cc]ities\|City(" Pathfinding/Core/Network Pathfinding/Models/City.swift --include='*.swift' | head -20`
判定:**有**城市列表接口 → 数据驱动热门城市;**无** → 该 Section 用一组静态精选城市常量(`[(cityId, cityName)]`,不新增服务端契约)。在 Step 3 按结论实现,并在报告说明走了哪条。

- [ ] **Step 2: 写失败测试(Section 数据非空 + 路由值类型)**

`PathfindingTests/CityEncyclopediaReachabilityTests.swift`:
```swift
import XCTest
@testable import Pathfinding

@MainActor
final class CityEncyclopediaReachabilityTests: XCTestCase {
  func testHotCitiesAreNonEmpty() {
    // DiscoverView.hotCities is the source for the 热门城市 Section
    XCTAssertFalse(DiscoverView.hotCities.isEmpty)
    XCTAssertFalse(DiscoverView.hotCities[0].cityId.isEmpty)
  }
}
```
（若改为实例属性/异步加载,改测断言为对应的纯数据入口;关键是断言"有可点进 CityEnc 的城市数据"。）

- [ ] **Step 3: 运行 RED → 实现热门城市 Section**

Run: *TEST CityEncyclopediaReachabilityTests* → FAIL（`hotCities` 未定义）。
实现:`static let hotCities: [(cityId: String, cityName: String)]`（或数据驱动的等价入口）。在 Discover feed 加一个 `Section`,横向卡片/行,每项 `NavigationLink(value:)` 或 `NavigationLink { CityEncyclopediaView(cityId:cityName:) }`。卡片用 `.cardSurface()`(同簇进一个 GlassEffectContainer)。补 `.navigationDestination` 若用 value 路由(路由值 `cityId: String`)。

- [ ] **Step 4: 运行 GREEN + 构建 + 手动**

Run: *TEST* → PASS;*BUILD* → exit 0。运行:Discover 出现热门城市,点击进入 CityEncyclopedia(此时仍为旧样式,T8 再玻璃化),数据真实加载。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/DiscoverView.swift PathfindingTests/CityEncyclopediaReachabilityTests.swift  # + 城市数据文件(若有)
git commit -m "feat(ios): wire CityEncyclopedia entry from Discover hot-cities section"
```

---

## Task 5: 拆分 BlogDetailView(行为保持)

**Files:**
- Modify: `Pathfinding/Features/BlogDetailView.swift`(瘦身为壳)
- Create: `Pathfinding/Features/BlogDetail/BlogDetailMediaSection.swift`、`BlogDetailHeaderSection.swift`、`BlogDetailContentSection.swift`、`BlogDetailItinerarySection.swift`,并把 `QuickInfoCard`/`DayCard`/`PoiRow`/`MapMarkerByDay`/`MapPoiListRow`/`DayDetailSheet`/`BlogDetailPoiSheet` 各提到 `Features/BlogDetail/` 独立文件

**Interfaces:** Consumes `BlogPost`;Produces `BlogDetailView(guide:)` 不变 + 子视图。

- [ ] **Step 1: 先读后搬**

读 `BlogDetailView.swift` 全文,识别状态(`isArticleExpanded`、MediaMode、`isLiked`/`isSaved`、selection)、9 个同居类型、11 个 section builder。

- [ ] **Step 2: 逐字搬运为子视图**

把媒体区(picker+gallery+map+POI list)→ `BlogDetailMediaSection`;标题/meta/quickInfo/aiSummary → `BlogDetailHeaderSection`;文章 DisclosureGroup → `BlogDetailContentSection`;天数+tips+import → `BlogDetailItinerarySection`。**代码逐字搬运、样式行为不变**(玻璃化是 T6)。同居类型各提独立文件;若类型名与他处冲突(如 `DayCard` 已被占用)按命名遮蔽规则改名(如 `BlogDayCard`)并一致引用。共享状态留在 `BlogDetailView`,经参数/`@Binding` 下传。`navigationDestination`/toolbar 留壳。

- [ ] **Step 3: 构建 + 预览 + 手动**

Run: *BUILD* → exit 0。为 `BlogDetailView` 加 `#Preview`(用示例 `BlogPost`)。手动:从搜索/Discover 进入详情,媒体切换、文章展开、地图、POI、import、评论与重构前一致。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/Features/BlogDetailView.swift Pathfinding/Features/BlogDetail
git commit -m "refactor(ios): extract BlogDetailView into composed subviews"
```

---

## Task 6: 玻璃化 BlogDetail + 修双重折叠 + 目的地城市入口

**Files:** Modify `Pathfinding/Features/BlogDetail/*.swift`(+ 壳)

**Interfaces:** Consumes `cardSurface`/玻璃按钮/`CityEncyclopediaView`;Produces 玻璃化详情。

- [ ] **Step 1: 卡片玻璃化**

`BlogDetailHeaderSection`:aiSummary → `.cardSurface(tint: DesignTokens.Colors.aiPurple)`;`QuickInfoCard` 4 卡 → `.cardSurface()` 无 tint,放进 `LazyVGrid` 外**一个** `GlassEffectContainer`。`BlogDetailItinerarySection`:tips → `.cardSurface()`;`DayCard`(/`BlogDayCard`)弃用 `.subtleCardStyle()` → `.cardSurface()`,日卡列表进一个 `GlassEffectContainer`。删这些处的手搓 opacity 背景/clipShape/shadow。

- [ ] **Step 2: 按钮 + HUD 玻璃化**

import / PoiSheet navigate 的 `.borderedProminent` → `.buttonStyle(.glassProminent)`;工具栏图标按钮 → `.buttonStyle(.glass)`(保留 a11y label);图片 HUD `.black.opacity(0.3)` 胶囊 → `.glassEffect(.regular, in: .capsule)`;`MapPoiListRow` 仅选中行 `.cardSurface(tint: dayColor)`;`MapMarkerByDay` 手阴影**保留**(地图层例外)。删 `ExplorerPageBackground(.minimal)` 包裹与 `.scrollContentBackground(.hidden)`(`ExplorerPageBackground` 符号保留)。

- [ ] **Step 3: 修双重折叠 + 目的地城市入口**

文章折叠:`BlogDetailView` 持单一 `isArticleExpanded`,渲染器传 `truncateAt: .max`(以渲染器真实参数为准),删渲染器内部 truncate/expand,只剩一套机制。`BlogDetailHeaderSection` 的目的地城市加 `NavigationLink { CityEncyclopediaView(cityId:cityName:) }`(以真实 init 为准)。

- [ ] **Step 4: 构建 + 预览 + a11y + 手动**

Run: *BUILD* → exit 0。预览各 section 三态 + 三档 a11y。手动:卡片玻璃、CTA、HUD、文章只一套折叠、目的地城市可进百科。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/BlogDetail Pathfinding/Features/BlogDetailView.swift
git commit -m "feat(ios): glassify BlogDetail, unify article collapse, link destination city"
```

---

## Task 7: 拆分 CityEncyclopediaView + Picker.segmented + 删死代码(行为保持)

**Files:**
- Modify: `Pathfinding/Features/CityEncyclopediaView.swift`(瘦身为壳)
- Create: `Pathfinding/Features/Encyclopedia/OverviewTab.swift`、`HistoryTab.swift`、`CustomsTab.swift`、`PracticalTab.swift`、`EncyclopediaCard.swift`(+ `EncyclopediaChip`/`EncyclopediaEmptyState`)

**Interfaces:** Consumes `CityWithEncyclopedia`、`APIClient.shared.fetchCityWithEncyclopedia(cityId:)`、`FlowLayout`(`QASearchView.swift:233`);Produces `CityEncyclopediaView(cityId:cityName:)` 不变 + 4 tab 子视图。

- [ ] **Step 1: 删死代码**

删 `createSampleData()`(`:1060-1183`)。Run: `grep -rn "createSampleData" Pathfinding --include='*.swift'` 确认仅其定义(零调用)后删。

- [ ] **Step 2: tab 选择器换 Picker.segmented**

自定义 Capsule 横向 scroller(`:78-106`)→ `Picker(selection: $selectedTab){ … }.pickerStyle(.segmented)`,对标 `ItineraryAnalysisView.swift:142-149`。

- [ ] **Step 3: 逐字搬运 4 个 tab 为子视图**

概览/历史文化/风俗禁忌/实用信息四段及其 builder **逐字搬运**(样式不变,玻璃化是 T8)到 `Features/Encyclopedia/{Overview,History,Customs,Practical}Tab.swift`;复用 `FlowLayout`(不复制);共享数据经参数下传。壳保留 `.task` 拉取与 Picker。

- [ ] **Step 4: 构建 + 预览 + 手动**

Run: *BUILD* → exit 0。手动(经 T4 入口进入):四 tab 切换、内容与重构前一致;Picker 为系统分段控件。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/CityEncyclopediaView.swift Pathfinding/Features/Encyclopedia
git commit -m "refactor(ios): split CityEncyclopedia into per-tab subviews, segmented picker, drop dead fixture"
```

---

## Task 8: 玻璃化 CityEncyclopedia

**Files:** Modify `Pathfinding/Features/Encyclopedia/*.swift`(+ 壳)

**Interfaces:** Consumes `cardSurface`/玻璃按钮/`ShimmerView`;Produces 玻璃化百科。

- [ ] **Step 1: 卡片玻璃化 + 扁平化嵌套**

每个 section 容器 → `.cardSurface()`(信息卡无 tint;taboo/customs 卡 `tint: .red.opacity(...)`)。嵌套 `factCard`/`infoCard` 瓦片**扁平化**:作为普通内容放进**一个**外层 `cardSurface`,或同簇瓦片进 `GlassEffectContainer`(子项**非玻璃**)——杜绝叠玻璃。删手搓 `RoundedRectangle.fill().shadow()`。

- [ ] **Step 2: 按钮 + 占位玻璃化**

`emergencyButton`(拨 `tel:`)→ `.buttonStyle(.glass)` + `.interactive()` + a11y label;`errorView` retry `.borderedProminent` → `.buttonStyle(.glassProminent)`。4 套加载/空/错 → 一个 `cardSurface` 背景共享占位组件 `EncyclopediaEmptyState`;加载用 `ShimmerView`(Components 已有)替裸 `ProgressView`。FlowLayout chip 保持轻 tint Capsule 放 section `cardSurface` 内,**不**逐 chip 上玻璃。

- [ ] **Step 3: 构建 + 预览 + a11y + 手动**

Run: *BUILD* → exit 0。预览四 tab + 加载/空/错三态 + 三档 a11y。手动确认无叠玻璃、急救按钮可拨号且有玻璃反馈。

- [ ] **Step 4: Commit**

```bash
git add Pathfinding/Features/Encyclopedia Pathfinding/Features/CityEncyclopediaView.swift
git commit -m "feat(ios): glassify CityEncyclopedia cards, buttons, and placeholders"
```

---

## Task 9: Explorer* 弃用标注 + 删孤儿 + 迁移后重 grep 删 + 全量校验

**Files:** Modify `Features/Components/{ExplorerCards,ExplorerComponents}.swift`、`Features/Components/VisualEffects.swift`、`Features/DesignSystem.swift`(仅按 grep 结果)

**Interfaces:** Consumes 前述全部;Produces 干净的组件层 + 全量绿。

- [ ] **Step 1: 给跨 Tab 共享符号加弃用标注**

给 `ExplorerSectionHeader`、`ExplorerDivider`、`ExplorerPageBackground`、`TopographicLinesView`、`CompassRoseDecoration`、`NoiseTextureOverlay` 各加:
```swift
@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
```
（保留实现,不删——Chat/Profile/Auth 仍用。）

- [ ] **Step 2: 删确认零消费者的孤儿**

对每个候选 grep(排除其定义文件 + 测试),仅输出为空者删:
```bash
cd apps/ios/Pathfinding && for s in ExplorerHeroHeader ExplorerFeaturedCardCarousel ExplorerSkeletonCard FloatingActionButton DestinationBadge TravelStatusIndicator SwipeHintView ExplorerCardStyle WavePatternView MountainSilhouetteView SunburstView MapGridOverlay GradientMeshBackground GrainOverlay AnimatedBorderGradient FloatingParticles; do
  echo "== $s =="; grep -rn "\b$s\b" Pathfinding Shared --include='*.swift' | grep -vE "VisualEffects.swift|ExplorerCards.swift|ExplorerComponents.swift"; done
```
删空结果者的定义 + 相关 `.explorerCardStyle()` 扩展。

- [ ] **Step 3: 迁移后重 grep 删「再删」组**

对 `ExplorerFeaturedCard`、`ExplorerGuideRow`、`ExplorerAIBadge`、`ExplorerFeaturedCardSkeleton`、`ExplorerLoadingIndicator`、`ExplorerEmptyState`、`StarFieldView` 各 grep(排除定义文件+测试)。Discover 重建后应已无消费者 → 删;**若仍有命中则保留并加弃用标注**,在报告说明。

- [ ] **Step 4: 构建 + 全量测试 + 全流程手动回归**

Run: *BUILD* → exit 0。全量测试:`cd apps/ios/Pathfinding && xcodebuild test -scheme Pathfinding-Debug -destination "platform=iOS Simulator,id=<SIMID>" -only-testing:PathfindingTests -quiet` → 全过。手动回归(三档 a11y):Discover 浏览 → 搜索 Tab → 指南详情 → 目的地城市/热门城市百科。

- [ ] **Step 5: Commit**

```bash
git add Pathfinding/Features/Components Pathfinding/Features/DesignSystem.swift  # 仅实际改动文件,显式列全
git commit -m "chore(ios): deprecate shared Explorer symbols and delete now-unused decorations"
```

---

## Self-Review(作者自查记录)

- **Spec 覆盖**:删 EnhancedDiscoverView→T1;Tab(role:.search)+SearchView+剥离搜索→T2;Discover 玻璃 feed→T3;CityEnc 入口(Discover 热门城市)→T4,(BlogDetail 目的地城市)→T6;拆 BlogDetail→T5,玻璃化+修双折叠→T6;拆 CityEnc+Picker.segmented+删 createSampleData→T7,玻璃化→T8;Explorer* 弃用+删孤儿+迁移后删→T9。玻璃纪律落为全局约束 + 各视觉 Task 的 a11y 目检 + T9 回归。城市列表数据源应急(静态常量)在 T4 Step1 处理。
- **占位符扫描**:无 TBD/TODO;新原语/逻辑(SearchView、makeSearchParams、热门城市、Picker.segmented、AI Label、弃用 grep)给了具体代码;大文件用"精确 file:line + 代表性代码 + 逐字搬运"而非整文件复制。
- **类型一致**:`SearchView.makeSearchParams(...)`、`enum Tab.search`、`DiscoverView.hotCities`、`CityEncyclopediaView(cityId:cityName:)`、`EncyclopediaEmptyState` 跨 Task 命名一致。
- **已知前置以实物为准**:`GuideStore.search` 真实签名/注入方式、`timeFilter` 枚举真实 case、`CityEncyclopediaView` 真实 init、渲染器 truncate 参数、城市列表 API 是否存在——均在对应 Task 标注"以真实为准核对"。
- **与 spec 调和**:Explorer* 本次**实际写**弃用标注(更正 carryover);"再删"组迁移后重新 grep 才删。
