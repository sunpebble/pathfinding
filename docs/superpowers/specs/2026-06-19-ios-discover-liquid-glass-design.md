# iOS 26 Liquid Glass 重设计 Phase 2 — 发现(Discover)流程

- **日期**: 2026-06-19
- **状态**: 已批准设计,待落实现计划
- **范围**: "iOS App 设计优化"工程的**第二个子项目**。延续 Phase 1(行程样板,已合并 main)。Chat / Profile / Widget·Watch·CarPlay 各自后续另开 spec。
- **关联**: Phase 1 spec/plan 在 `docs/superpowers/{specs,plans}/2026-06-19-ios-liquid-glass-itinerary-pilot*`;本 spec 基于会话内四路并行审计(Discover 入口 / BlogDetail / CityEncyclopedia / 外壳+依赖图)。

---

## 1. 背景与沿用决策

Phase 1 已建立 iOS 26 Liquid Glass 设计底座并把行程流程迁移完毕。Phase 2 用同一底座迁移 **Discover(发现)流程**。

**完全沿用 Phase 1 的元决策**:iOS 26 起步、全面 Liquid Glass、不写 `#available`;`cardSurface(tint:cornerRadius:)`(`DesignSystem.swift:739`)为唯一玻璃卡片原语;`.buttonStyle(.glassProminent/.glass)`;`ThemeManager` 环境化;**7 条玻璃纪律**(见 Phase 1 spec §3:不叠玻璃、List/Form 行不显式上玻璃、tint 仅表选中/主操作、`.interactive()` 仅交互元素、`cardSurface` 在 padding 后、装饰移除与玻璃接入同批、sheet 不覆盖背景);**deprecate-not-delete**。

**需求方本次确认**:

| 决策项 | 结论 |
| --- | --- |
| 范围 | DiscoverView 入口 + BlogDetailView 详情 + CityEncyclopediaView 城市百科 |
| 搜索交互 | 采用 **`Tab(role: .search)` 专用搜索 Tab**(5 Tab 结构) |
| CityEncyclopedia 入口 | **两者都要**:Discover「热门城市」Section + BlogDetail 目的地城市 |
| 死代码 | 删除 `EnhancedDiscoverView`(整文件,零消费者) |

### 1.1 关键认知更正(来自审计)

Phase 1 记忆/carryover 误以为 `Explorer*` 组件结构体已带 `@available(deprecated)`。**审计 grep 证实:`ExplorerCards.swift`/`ExplorerComponents.swift`/`VisualEffects.swift` 上零 `@available`**——只有 `DesignSystem.swift` 的卡片/按钮助手带了。所以本 spec 要**实际写上** Explorer* 的弃用标注(而非假设已有)。

### 1.2 现状核心问题(按杠杆排序)

1. **搜索焊死在浏览 Tab 里**:`isSearchMode`(`DiscoverView.swift:30-32`)只要 searchText/city/AI/time 任一非空就为真,在同一 `NavigationStack` 内整体热切换 browse↔results,挡住干净的搜索 Tab 拆分,且造成双搜索入口。
2. **5 层装饰背景与玻璃打架**:`explorerBackground`(`DiscoverView.swift:119-174`)手叠 systemGroupedBackground + StarField + 全页渐变 + 400pt 地形线 + 150pt 罗盘 + 噪点。
3. **卡片绕开玻璃原语**:`ExplorerFeaturedCard`/`ExplorerGuideRow` 手搓 bg+地形+渐变描边+双阴影;BlogDetail 三套不一致卡片(opacity-0.08 / 弃用 `.subtleCardStyle()` / clear);CityEncyclopedia **24 个手搓 RoundedRectangle、零玻璃 API**。
4. **CityEncyclopediaView 是孤儿**:零消费者(只 `:6` 声明 + `:1190` Preview),功能完整但无法打开——所有玻璃工作不可见,直到接通。
5. **AI 过度装饰**:`ExplorerAIBadge` 三层 Capsule(渐变+移动 shimmer+描边)+ 双色辉光 + **两个 `repeatForever`** 常驻动画。
6. **弃用 API 仍在用**:`.buttonStyle(.primary)`、`.subtleCardStyle()`、`.borderedProminent`(各处)。
7. **巨石文件**:BlogDetailView 1028 行 + 9 个同居类型;CityEncyclopediaView 1192 行 + ~20 builder 方法。
8. **结构 bug**:BlogDetail 评论区 `ScrollView` 嵌在页面 `ScrollView` 内;文章正文有 `DisclosureGroup` 与渲染器内部 truncate 两套竞争折叠态。
9. **死代码**:`EnhancedDiscoverView`(407 行)、CityEnc `createSampleData()`(`:1060-1183`,124 行)。

---

## 2. 目标与非目标

### 2.1 目标
- 新增 `Tab(role: .search)` 搜索 Tab + 抽出 `SearchView`,把搜索从 DiscoverView 剥离。
- Discover 入口 / BlogDetail / CityEncyclopedia 三屏迁到 Liquid Glass。
- 接通 CityEncyclopedia 的两个入口(Discover 热门城市 Section + BlogDetail 目的地城市)。
- 拆分两个巨石文件;删除死代码;清理弃用 API。
- 应用 Explorer* 弃用标注,物理删除零消费者孤儿符号。

### 2.2 非目标(YAGNI)
- Chat / Profile Tab 重设计(后续 spec)。
- Widget / Watch / CarPlay 玻璃化。
- 数据层/服务端改动(仅复用既有 `GuideStore.search`、`APIClient.fetchCityWithEncyclopedia`、城市列表 API;新增入口只接线不改契约)。
- 跨文件遗留(见 §8)不在本次承诺,仅显式标注。

---

## 3. App 外壳:`Tab(role: .search)`(5 Tab)

**结构:保留 Discover 浏览 Tab,末位追加专用搜索 Tab。** iOS 26 下 `Tab(role: .search)` 在标签栏尾部搁置/分隔渲染,并与已有 `.tabBarMinimizeBehavior(.onScrollDown)`(`ContentView.swift:55`)协同。不要做成普通第 5 Tab——`role` 才给系统搜索表现。

**承重改动(唯一可能编译失败处)**:给 `CaseIterable` 的 `enum Tab` 加 `case search`,必须补 `title`(`:12-16`)/`icon`(`:19-26`,用 `"magnifyingglass"`)分支保持 switch 穷尽,并加本地化键 `tab.search`(中英双文件)。

```swift
SwiftUI.Tab(Tab.search.title, systemImage: "magnifyingglass",
            value: .search, role: .search) { SearchView() }   // 末位
```

**新建 `Features/Search/SearchView.swift`**:薄 `NavigationStack`,持 `.searchable(text:)` + 从 Discover 搬来的 `filterBar`(城市/AI/时间作为搜索 scope);**复用** `GuideStore.search(query:destination:hasAiData:daysAgo:)`(async,`Core/GuideStore.swift:110`)写 `searchResults`/`isSearching`,保留 300ms 防抖;`.navigationDestination(for: BlogPost.self){ BlogDetailView }`;结果走系统 `List`(行自动玻璃化,**删** `.scrollContentBackground(.hidden)`+`.listRowBackground(.clear)`)。

**从 DiscoverView 移除**:`.searchable`(`:84`)、`isSearchMode`(`:30-32,43-49`)、`searchResultsView`(`:380-432`)、`filterBar`(`:178-258`)、`triggerSearch`/`performSearch`(`:461-477`)。Discover 变纯浏览。(Chat/Profile 自有的 `.searchable` 不受影响。)

---

## 4. 逐屏 before → after

### 4.1 DiscoverView(482 → 更小的纯浏览 feed)
- 删整个 `explorerBackground` 5 层栈 → 系统 grouped 背景 + 系统 `List`。
- feed 改单一 `List`,两个 `Section`(精选 / 最近);section header 取代 `ExplorerDivider`。
- 精选卡:内容布局后 `.cardSurface(cornerRadius: .lg)`,轮播兄弟卡进**一个** `GlassEffectContainer`;按压用 `.buttonStyle(.glass)`;去掉手搓 reveal 动画。
- 指南行:系统 `List` 行,**不显式上玻璃**(避免叠玻璃);缩略图保留裁切。
- AI 标:三层动画徽章 → 一个扁平 `Label("AI", systemImage:"sparkles").glassEffect(.regular.tint(.purple), in:.capsule)`。
- 加载/骨架:旋转罗盘 + 手搓 shimmer → `.redacted(reason: .placeholder)`。
- 空态:`ContentUnavailableView`。
- **新增「热门城市」Section**(本次 CityEnc 入口之一):一行/横向卡片,数据走既有城市列表 API(实现时核对 `CityAPIClient`/`City` 模型),`NavigationLink` → `CityEncyclopediaView(cityId:cityName:)`。

### 4.2 BlogDetailView(1028,拆分 + 玻璃化)
- 删 `ExplorerPageBackground(.minimal)` + `.scrollContentBackground(.hidden)`(`:134-137,188`)→ 系统背景。`ExplorerPageBackground` 符号保留(Chat/Profile 仍用)。
- AI 摘要 → `.cardSurface(tint: DesignTokens.Colors.aiPurple)`;贴士 → `.cardSurface()` 无 tint;`QuickInfoCard` 4 卡 → `.cardSurface()` 无 tint,进一个 `GlassEffectContainer`;`DayCard` 弃用 `.subtleCardStyle()` → `.cardSurface()`。
- CTA(import / PoiSheet navigate)`.borderedProminent` → `.buttonStyle(.glassProminent)`;工具栏 4 个图标按钮 → `.buttonStyle(.glass)`(已有 a11y label)。
- 图片 HUD `.black.opacity(0.3)` 胶囊 → `.glassEffect(.regular, in:.capsule)`;`MapPoiListRow` 仅**选中**行 `.cardSurface(tint: dayColor)`;`MapMarkerByDay` 手阴影**保留**(地图层标记,非悬浮 chrome,易读性例外)。
- **目的地城市 → CityEncyclopedia 入口**(本次 CityEnc 入口之二):header/info 区的目的地城市加 `NavigationLink` → `CityEncyclopediaView(...)`。
- 拆到 `Features/BlogDetail/`:`BlogDetailMediaSection` / `BlogDetailHeaderSection` / `BlogDetailContentSection` / `BlogDetailItinerarySection`,并把 `QuickInfoCard`/`DayCard`/`PoiRow`/`MapMarkerByDay`/`MapPoiListRow`/两个 sheet 提到独立文件。
- **修结构 bug**:文章折叠统一为 BlogDetailView 单一 expand 态(渲染器传 `truncateAt:.max`);评论区嵌入时不再内套 ScrollView(跨文件,见 §8 标注)。

### 4.3 CityEncyclopediaView(1192,接通 + 玻璃化 + 拆分)
- **先接通入口**(§4.1 + §4.2 两处),route value 用 `cityId: String`(+ `cityName`),`CityWithEncyclopedia` 经 `APIClient.shared.fetchCityWithEncyclopedia(cityId:)`(`.task`)拉取。
- 自定义 Capsule tab scroller(`:78-106`)→ `Picker(selection:).pickerStyle(.segmented)`,对标 `ItineraryAnalysisView.swift:142-149`。
- 24 个手搓 `RoundedRectangle.fill().shadow()` → `.cardSurface()`(信息卡无 tint;taboo 卡 `tint: .red.opacity(...)`)。
- 嵌套 `factCard`/`infoCard` 瓦片扁平化:作为普通内容放进**一个**外层 `cardSurface`,或同簇瓦片进 `GlassEffectContainer`(子项**非玻璃**),杜绝叠玻璃。
- `emergencyButton`(拨 `tel:`)→ `.buttonStyle(.glass).interactive()` + a11y label;`errorView` retry `.borderedProminent` → `.glassProminent`。
- 4 套近似 加载/空/错 → 一个 `cardSurface` 背景的共享占位组件 + `ShimmerView`(Components 已有)。
- `FlowLayout`(`QASearchView.swift:233` 的共享实现)**保留复用**;chip 仍为轻 tint Capsule,放在 section `cardSurface` 内,**不**逐 chip 上玻璃。
- 删死代码 `createSampleData()`(`:1060-1183`)。
- 拆到 `Features/Encyclopedia/`:`OverviewTab`/`HistoryTab`/`CustomsTab`/`PracticalTab` + 复用 `EncyclopediaCard`/`EncyclopediaChip`/`EncyclopediaEmptyState`。

---

## 5. Explorer* 删 / 留(本次**实际写**弃用标注)

**保留并加 `@available(*, deprecated, message: "iOS 26: …")`**(仍有 Chat/Profile/Auth 消费者):
`ExplorerSectionHeader`(Profile)、`ExplorerDivider`(Profile `:108`)、`ExplorerPageBackground`(Profile `:33`、Chat `:20`)、`TopographicLinesView`/`CompassRoseDecoration`/`NoiseTextureOverlay`(Login/Signup)。

**立即物理删**(零消费者,grep 确认):
`EnhancedDiscoverView.swift`(整文件)、`ExplorerHeroHeader`、`ExplorerFeaturedCardCarousel`、`ExplorerSkeletonCard`、`FloatingActionButton`、`DestinationBadge`、`TravelStatusIndicator`、`SwipeHintView`、`ExplorerCardStyle`+`.explorerCardStyle()`、VisualEffects 孤儿(`WavePatternView`/`MountainSilhouetteView`/`SunburstView`/`MapGridOverlay`/`GradientMeshBackground`/`GrainOverlay`/`AnimatedBorderGradient`/`FloatingParticles`)。
> 注:`.cardStyle()` 的消费者(`GuideComponents.swift:127`、`InsuranceView.swift:104`)是 **DesignSystem** 的 `cardStyle`(`:749`),**不是** `ExplorerCardStyle`,勿混。

**迁移后重新 grep 再删**(Discover 重建切断其最后消费者后):
`ExplorerFeaturedCard`、`ExplorerGuideRow`、`ExplorerAIBadge`、`ExplorerFeaturedCardSkeleton`、`ExplorerLoadingIndicator`、`ExplorerEmptyState`、`StarFieldView`。

---

## 6. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| `Tab(role:.search)` 编译承重(枚举加 case) | 同步补两个 switch 分支 + `tab.search` 键;先单独编译验证 |
| `role:.search` 真机表现未知 | 在 iOS 26 真机/模拟器验证尾部搁置 + 与 minimize 协同;以 SDK 实际行为为准 |
| GlassEffectContainer 边界 | 同簇一个、不嵌套、不套在 List 行上;CityEnc 瓦片用非玻璃子项 |
| tint 纪律 | tint 仅 AI 摘要/taboo 卡/选中 POI 行/激活筛选 chip;信息卡一律无 tint |
| 弃用标注触发跨 Tab 警告 | 预期(Chat/Profile/Auth 未迁移);message 指向替代 API |
| 「迁移后再删」符号 | 迁移完**重新 grep 确认零消费者**再删,不提前删 |
| CityEnc 数据通路 | 接通时做功能性验证(真拉取),非仅换皮 |
| 「热门城市」缺城市列表数据源 | 审计仅确认单城 `fetchCityWithEncyclopedia(cityId:)`,城市**列表** API 未验证。实现首步先核对 `CityAPIClient`/`City` 是否有列表接口:**有**则数据驱动;**无**则该 Section 退化为一组静态精选城市常量(不新增服务端契约,属非目标),并在计划中标明 |

---

## 7. 验证策略
- **构建闸门**:iOS 26 SDK 编译通过,无 `#available` 残留。
- **Preview**:每个重建单元(SearchView、Discover feed、BlogDetail 4 子视图、Encyclopedia 4 tab + 卡组件)Light/Dark + 降低透明度 + Reduce Motion 预览。
- **单元测试**(XCTest,`__tests__`/AAA):搜索 scope→`GuideStore.search` 参数映射、CityEnc 入口可达性(仿 Phase 1 `availableDestinations` 测试)、城市列表数据加载。
- **手动**:Discover 浏览 → 搜索 Tab → 指南详情 → 目的地城市百科 / 热门城市百科 → 拨号按钮;三档 a11y 目检 chrome 不破。
- 覆盖率不低于 60%。

---

## 8. 不做什么 / 显式标注的跨文件遗留(本次之外)
- Chat / Profile Tab 迁移;Widget·Watch·CarPlay。
- **显式标注、不静默吸收**:`CommentSectionView` 的内套 ScrollView + `.subtleCardStyle()`(`CommentSectionView.swift:359`);BlogDetail 的 like/save 目前是本地 `@State` + 空操作成功 alert(真持久化另议);CityEnc 的 `MainActor.run` 三跳 `.task` 清理。本次仅在文档记录,供后续 spec 处理。

---

## 9. 实现顺序(高层;细化由 writing-plans 产出)
1. 删 `EnhancedDiscoverView.swift`(零风险,缩小消费者图)。
2. `Tab(role:.search)` + `SearchView`(复用 GuideStore,零数据改动)。
3. 从 DiscoverView 剥离搜索,重建为 `List` 纯浏览 feed(含玻璃化)。
4. 接通 CityEncyclopedia 两个入口(Discover 热门城市 Section + BlogDetail 目的地城市)。
5. 拆 + 玻璃化 BlogDetail(`Features/BlogDetail/`)。
6. 拆 + 玻璃化 CityEncyclopedia(`Features/Encyclopedia/`,Picker.segmented、删 createSampleData)。
7. 弃用 API 清扫 + AI 信号统一(扁平 tint Label)。
8. 应用 Explorer* 弃用标注 + 删孤儿;迁移后重新 grep 删「再删」组。

每步可独立编译、预览、验证。
