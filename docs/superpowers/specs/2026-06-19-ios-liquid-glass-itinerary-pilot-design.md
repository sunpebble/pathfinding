# iOS 26 Liquid Glass 重设计 — 设计底座 + 行程流程样板

- **日期**: 2026-06-19
- **状态**: 已批准设计,待落实现计划
- **范围**: 本 spec 是"iOS App 设计优化"工程的**第一个子项目**。后续 Tab(发现/聊天/我的)、Widget/Watch/CarPlay 各自另开 spec。
- **关联审计**: 见本仓库会话内的并行审计(行程流程 / 设计系统底座 / App 外壳 / iOS 26 API),结论已并入本文。

---

## 1. 背景与决策

Pathfinding iOS App 是一个成熟的 SwiftUI 应用(233 个 Swift 文件、约 9.8 万行)。它当前构建在一套自定义的"探索者 / Explorer"重装饰设计系统上(地形线、罗盘、噪点、网格渐变、渐变 AI 徽章),并用全局 UIKit appearance 代理把导航栏/标签栏锁成不透明默认样式。部署目标仍是 iOS 17.0,**完全没有采用任何 iOS 26 Liquid Glass API**。

经与需求方确认,本次优化锁定以下决策:

| 决策项 | 结论 |
| --- | --- |
| 优化维度 | 视觉焕新 + 交互/信息架构 + 代码/设计系统重构(三合一) |
| 平台策略 | **iOS 26 起步,全面拥抱 Liquid Glass**(不写 `#available` 降级) |
| 执行策略 | **A:底座先行 + 垂直样板**(先建底座,打透一条旗舰流程作模板,再逐页铺开) |
| 旗舰样板流程 | **行程流程**(列表 → 详情:地图/POI/预算/统计/编辑) |
| 美学基调 | **内容优先 · 克制现代**(干净玻璃 chrome + 照片/地图/字体发声,保留极少签名色瞬间) |
| 代码去重 | 拷贝 sheet 三胞胎 / 费用表单复制 — **纳入本 spec,作为拉伸项** |

### 1.1 现状核心问题(按杠杆排序)

1. **全 App 对抗系统(最高杠杆,最小改动)**:`PathfindingApp.swift:25-46` 用全局 `UINavigationBarAppearance` + `UITabBarAppearance` 的 `configureWithDefaultBackground()` 强制不透明栏,扼杀了 iOS 26 自动玻璃、scroll-edge 透明与浮动/最小化标签栏。删掉 `configureAppearance()` 即免费拿回全局玻璃。
2. **两个最丰富的页面是死代码**:`BudgetOverviewView`(536 行)与 `ItineraryAnalysisView`(1334 行)只在各自 `#Preview` 中实例化(`BudgetOverviewView.swift:531`、`ItineraryAnalysisView.swift:1330`);详情工具栏(`ItineraryListView.swift:604-616`)只暴露 Copy + Calendar,用户根本进不去。
3. **部署目标卡住一切**:`project.yml:22`、`Config/Base.xcconfig:13`、`project.pbxproj:1433/1504/1621` 都钉死 iOS 17.0。任何玻璃 API 在抬到 26.0 前都无法无条件使用——这是 Step 0。
4. **没有统一表面原语**:`DesignSystem.swift` 有 8+ 个重叠卡片修饰符(`cardStyle`/`subtleCardStyle`/`adaptiveCardStyle`/`glassCard`(用 `.ultraThinMaterial`,`:837-841`)/`elevatedCardStyle`/`glowCardStyle`/`borderedCardStyle` + `ExplorerCardStyle`)。Analysis/Budget 各重复 `.padding().background(.background).clipShape().shadow(DesignTokens.Shadow.sm)` 约 14 次。手写明暗阴影表(`:39-86`)会与玻璃自带高程叠加。
5. **装饰 chrome 与内容优先/系统对抗**:`VisualEffects.swift`(993 行)几乎全是逐帧 Canvas 艺术(地形线、blur-60 网格渐变、噪点、星空、太阳爆、粒子、无 Reduce-Motion 守卫的无限旋转边框 `:538-570`)。`ExplorerPageBackground` 在工具栏后渲染繁忙背景——正是 Apple 警告与 scroll-edge effect 冲突的做法;且这些自定义层不会随"降低透明度/增强对比度"自适应。
6. **打字时写风暴**:详情标题每次按键 → `saveChanges() → store.update() → persist()`(全量 JSON 重编码所有行程 + `reloadAll()` + widget 同步)。`ItineraryListView.swift:462-464,635-639`;`ItineraryStore.swift:122-128,364-371`。`PoiEditView.swift:63-84` 每次按键触发 `MKLocalSearch` 且无防抖(注释自认)。
7. **大量重复膨胀重设计面积**:`CopyItinerarySheet.swift`(999 行)= 3 个近似 sheet,~700 行三胞胎(`103-230` vs `372-499` vs `697-836`);`EditExpenseView` 全量复制 `AddExpenseView` 的 Form(`27-200` vs `307-509`)。
8. **详情是 345 行巨石**,塞在列表文件里(`ItineraryListView.swift:397-741`),混合地图相机数学、6 层嵌套时间轴(`491-577`)、内联日编辑 sheet(`641-691`)、持久化调用——阻碍任何安全重设计。

---

## 2. 目标与非目标

### 2.1 目标(本 spec 的验收边界)

- 抬高部署目标到 iOS 26,移除所有版本降级分支与假玻璃。
- 建立**可复用的 iOS 26 设计底座**:单一玻璃卡片原语、系统玻璃按钮、原生加载/空态、精简 ThemeManager、玻璃化 App 外壳。
- 退役与内容优先/系统玻璃冲突的装饰 chrome。
- 把**行程流程**端到端迁到新设计语言,作为后续页面的模板。
- 接通孤儿页面(预算 / 分析),让流程完整。
- 拆分行程详情巨石、修复写风暴与搜索防抖。
- (拉伸)收敛拷贝 sheet 三胞胎与费用表单复制。

### 2.2 非目标(YAGNI · 明确不做)

- 发现 / 聊天 / 我的 三个 Tab 的重设计 → 各自 Phase 2+ 开 spec。
- `Tab(role: .search)` 搜索 Tab → 归 Discover spec(Discover 已持有 `.searchable`)。
- `.tabViewBottomAccessory`(活跃行程吸底条)→ 列为**候选**,本次不承诺实现。
- Widget / Watch / CarPlay 的玻璃化。
- 服务端 / API 契约改动(仅在接通孤儿页时打通既有数据通路)。

---

## 3. 设计原则(硬性规则,防止机械换皮)

这些规则写入 spec,作为每个改动的验收前提:

1. **玻璃不叠玻璃**:`List`/`Form` 行由系统自动玻璃化,**不**给每个 `ItineraryCard` 再套 `.glassEffect`。只有**自由悬浮**的表面(地图上的时间轴卡、工具栏/FAB 簇)才显式上玻璃,且同簇包进**一个** `GlassEffectContainer`。绝不嵌套 `GlassEffectContainer`。
2. **着色克制**:`.glassEffect(.regular.tint(...))` 只用于表达"选中 / 主操作意图",不做装饰;信息卡一律用无 tint 的 `.regular`。
3. **`.interactive()` 仅给真交互元素**:按钮、选中段——绝不给静态卡片或标签。
4. **chrome 让位内容**:删除工具栏背后的 Canvas 暗化/装饰背景;让系统背景与照片/地图发声。
5. **修饰符顺序**:`.glassEffect(in:)` 在 `padding`/`frame` **之后**应用。
6. **无障碍同批落地**:系统玻璃在"降低透明度 / 增强对比度"下自动转不透明,自定义 Canvas 层不会。装饰移除与玻璃接入**必须同一批合入**,避免留下系统救不回来的低对比 chrome;`glassEffectID` morph 动画需守 Reduce Motion。
7. **Sheet 不覆盖背景**:分级 sheet(`.presentationDetents`)在 iOS 26 自动获得玻璃背景;**任何** `.presentationBackground(_:)` 覆盖都会破坏它——本流程所有 sheet 需审计。

---

## 4. Phase 0 — 设计底座

### Step 0(闸门):抬高部署目标

- 将 `IPHONEOS_DEPLOYMENT_TARGET` 由 `17.0` 改为 `26.0`:`project.yml:22` + `Config/Base.xcconfig:13`,然后用 XcodeGen 重生成 `.xcodeproj`(确认 `project.pbxproj` 三处同步)。
- 删除所有 `#available(iOS 26, *)` 分支与 `.ultraThinMaterial` 假玻璃 `glassCard`,使玻璃只有单一来源。

### 4.1 保留(与玻璃正交,零调用点改动)

- `DesignTokens.Spacing` / `DesignTokens.Radius` — 卡片半径改为**同心**值喂给 `.glassEffect(in:)` 形状。
- 标准 `Typography` 文本样式别名(退役被 `maxSize` 截断的 `Display`/`Numeric` ultraLight/thin 自定义字号)。
- 语义系统色映射(`background`/`text*`/`separator`/`fill*`、`success`/`warning`/`error`/`info`、`TravelStatus`)——玻璃的着色基底。
- `ThemeManager` 的 10 色强调,但**只**经 SwiftUI `.tint()` 流转(已在 `ContentView.swift:75`)。

### 4.2 退役

- `VisualEffects.swift` 几乎整文件的 Canvas 装饰 + `ExplorerPageBackground` + `ExplorerCardStyle` + `AnimatedBorderGradient` + `GradientMeshBackground`。
- `Terrain` / `Expedition` / `Premium` / `ExplorerGradients` 调色板与所有 accent 派生渐变生成器(`heroGradient`/`meshGradient`/`primaryGradient`)。
- `DesignTokens.Shadow` 阴影表 + `appleShadow`(玻璃自带高程)。
- `ThemeManager` 的 UIKit 窗口注入(`applyTheme`/`applyAccentColor`,`:316-358`)、`useTrueBlack`、`reduceContrastInDark`。
- `AnimationSystem.swift` 中无 Reduce-Motion 守卫的 DispatchQueue 动画(`compassSpin`/`pathDraw`/`rotateIn`/`typewriter`/`animatedBorder`/`ripple`)。

### 4.3 重建

- **单一卡片原语**:`cardSurface(tint: Color? = nil)` View 扩展 → 默认 `.glassEffect(.regular, in: .rect(cornerRadius: Radius.lg))`;传入 `tint` 时用 `.regular.tint(tint)` 表达强调(仅选中/主操作场景)。padding/frame 之后应用。收掉 8+ 个旧卡片修饰符为这一个。(注:`.glassEffect` 仅有 `.regular`/`.clear` 等变体,强调通过 `.tint()` 表达,不存在 `.prominent` 玻璃变体;按钮的强调用 `.glassProminent` 按钮样式。)
- **按钮**:主操作 `.buttonStyle(.glassProminent)`,次级/轮廓 `.buttonStyle(.glass)`,accent 经 `.tint`;删 `PrimaryButtonStyle`/`SecondaryButtonStyle`/`OutlineButtonStyle`。
- **加载/空态**:统一 `.redacted(reason: .placeholder)`(+ `GlassEffectContainer` 分组)与 `ContentUnavailableView`。
- **App 外壳**:
  - `ContentView` 迁到声明式 `TabView(selection:) { Tab(title, systemImage:, value:) { ... } }`;删手动 `selectedIcon/icon` 切换(系统自动填充选中态;`discover` 当前两态同符号,证明手写逻辑脆弱)。
  - 加 `.tabBarMinimizeBehavior(.onScrollDown)`。
  - **删掉 `PathfindingApp.configureAppearance()` 两个 appearance 代理**;如个别屏需覆盖,改用 SwiftUI `.toolbarBackgroundVisibility(_:for:)`。

### 4.4 ThemeManager 简化

- 外观经 `ThemeModifier` 的 `.preferredColorScheme` + `.tint` 驱动;删窗口遍历的 `overrideUserInterfaceStyle`/`tintColor`。
- 保留 mode / accent / mapStyle 状态与持久化;删 `useTrueBlack`/`reduceContrastInDark` 与全部渐变生成器。

---

## 5. Phase 1 — 行程流程样板(before → after)

### 5.1 行程列表 `ItineraryListView`(`:11-90`)

- **Before**:`ExplorerPageBackground` Canvas 背景;split 工具栏(leading 省略号 Menu + trailing plus,`:26-63`);空态 5 个混样式 CTA(`:109-157`);`.listStyle(.plain)` + `.scrollContentBackground(.hidden)` + 不透明背景(`:182-184`)。
- **After**:移除 Canvas 背景与背景隐藏 → `List` 自动玻璃行;用 `ToolbarSpacer(.fixed)` 把"新建/AI/语音"分组为正确玻璃胶囊;空态收敛为 1 个 `ContentUnavailableView` + 单一 `.buttonStyle(.glassProminent)` 主操作("AI 生成行程"),其余 `.glass`。

### 5.2 行程详情 `SavedItineraryDetailView`(`:397-741`)

- **拆分**:抽出独立文件 `Features/Itinerary/ItineraryDetailView.swift`,分解为 `MapHeader / TimelineSection / DayCard / TipsCard / DayEditSheet`。
- 地图头 → `.backgroundExtensionEffect()` + `.scrollEdgeEffectStyle(.soft, for: .top)`,去掉手动 `ignoresSafeArea(.top)` 与固定 350pt + cornerRadius 0 对抗。
- 卡片走 `cardSurface()`;tips/日卡用无 tint `.regular` 玻璃;**只**给选中日上 `.glassEffect(.regular.tint(.accentColor.opacity(0.3)).interactive())` + `.glassEffectID("day-\(i)", in: ns)` 做选中→展开 morph(守 Reduce Motion)。
- 工具栏拆成独立 `ToolbarItem`(Copy / CalendarSync)+ `ToolbarSpacer`。
- **新增入口**:overflow Menu(或紧凑摘要行)接通 `ItineraryAnalysisView` 与 `BudgetOverviewView`,传 `apiItineraryId`/title。**单点价值最高(S 工作量)。**

### 5.3 POI 编辑 `PoiEditView`

- 保留原生 Form;`MKLocalSearch` 加 Task-based 防抖(`:63-84`)。

### 5.4 预算 / 分析(接通后)

- ~14 处重复 `.background+shadow` 卡片块 → `cardSurface()` + `GlassEffectContainer`。
- `LoadingAnalysisView` 手搓 trimmed-Circle spinner(`ItineraryAnalysisView.swift:59-97`)→ `ProgressView` + redaction;临时空态 → `ContentUnavailableView`。
- 接通时打通真实数据通路(注意 `AddExpenseView.swift:185` 的 `userId:"current-user"` TODO)。

### 5.5 拷贝 / 选择 sheet

- `DaySelectionChip` 实心强调填充(`CopyItinerarySheet.swift:254-257`)→ 玻璃胶囊 `.glassEffect(.regular.tint(isSelected ? .accentColor : .clear).interactive(), in: .capsule)`。
- 审计所有 `.sheet`/`.fullScreenCover` 无 `.presentationBackground` 覆盖(`:64-79`,`:687`)。

### 5.6 地图 Pin `OptimizedMapView`(`:47-62`)

- 手搓 `ZStack{Circle+shadow+stroke+Text}` → 原生 Map marker tint 或玻璃徽章 `.glassEffect(.regular.tint(typeColor), in: Circle())`;选中态用玻璃+tint 表达。
- 修 body 内每标注 O(n) 的 `firstIndex`(`:44`)为预计算索引映射。

---

## 6. 代码重构(随样板一起)

### 6.1 核心(本 spec 必做)

- 拆详情巨石(见 5.2)。
- **防抖持久化**:详情标题改 `onSubmit`/防抖,不再每键 `store.update()`;修 `ItineraryStore.copyItinerary`(`:138`)死代码(重复构建 `newItinerary`、忽略 `newStartDate`)。

### 6.2 拉伸(纳入,但优先级低于上述)

- `CopyItinerarySheet`(~700/999 行三胞胎)→ 收成 1 个泛型,抽象在 `CopyableSource` 协议之上(本地 / Guide / 公开 API 三源)。
- `EditExpenseView` ←→ `AddExpenseView` 的 Form 合并为共享 `ExpenseForm`。

> **净删除**:退役 `VisualEffects.swift` 装饰、阴影表、8 个卡片修饰符、3 个 ButtonStyle、appearance 代理,删除的代码远多于迁移新增。

---

## 7. 组件设计(新底座单元)

| 单元 | 职责 | 用法 | 依赖 |
| --- | --- | --- | --- |
| `cardSurface(tint:)` | 唯一玻璃卡片表面 | 自由悬浮卡片末尾调用,padding 之后 | `DesignTokens.Radius` |
| `GlassEffectContainer` 包装 | 同簇玻璃融合/morph | 工具栏簇、卡片网格、悬浮控件 | SwiftUI 原生 |
| 玻璃按钮 | 主/次操作 | `.buttonStyle(.glassProminent / .glass)` + `.tint` | SwiftUI 原生 |
| `ItineraryDetailView` + 子视图 | 详情拆分后的可测单元 | 列表 `navigationDestination` 路由 | `ItineraryStore` |
| 精简 `ThemeManager` | mode/accent/mapStyle 状态 | `ThemeModifier` 经环境注入 | UserDefaults |

每个单元应能独立回答:做什么、怎么用、依赖什么;改内部不破坏消费者。

---

## 8. 数据流与持久化

- 详情编辑:本地 `@State` 草稿 → 防抖/`onSubmit` 时一次 `store.update()`;`persist()` 仍全量编码但触发频率从"每键"降到"提交"。
- 孤儿页接通:`SavedItineraryDetailView` 通过既有 `apiItineraryId` 拉取分析/预算;接通时验证真实 `userId` 通路替换硬编码 TODO。

---

## 9. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 玻璃叠玻璃 | 原则 §3.1;List/Form 行不显式上玻璃,仅悬浮表面上,且单一 Container |
| 过度着色 | 原则 §3.2/3.3;tint 仅选中/主操作,`.interactive()` 仅交互元素 |
| 半迁移无障碍陷阱 | 原则 §3.6;装饰移除与玻璃接入同批合入,morph 守 Reduce Motion |
| 孤儿页真实数据未验证 | 接通时做功能性验证(非仅换皮),替换 `userId:"current-user"` |
| Sheet 背景回归 | 原则 §3.7;显式审计所有 sheet 无 `presentationBackground` |
| `.tabViewBottomAccessory` 范围蔓延 | 列为候选,不在本 spec 承诺 |

---

## 10. 验证策略

- **构建闸门**:`xcodebuild` 在 iOS 26 SDK 下编译通过,无 `#available` 残留、无 Swift 6 并发告警回归。
- **SwiftUI Preview**:每个重建单元(`cardSurface`、玻璃按钮、`ItineraryDetailView` 子视图、接通后的 Budget/Analysis)有 Light/Dark + Reduce Transparency + Reduce Motion 预览。
- **单元测试**:遵循项目 `__tests__`/AAA 规范——`ItineraryStore` 防抖/`copyItinerary` 修复、孤儿页数据加载路径加测试。
- **手动验证(关键路径)**:列表 → 详情 → 接通的分析/预算 → 编辑保存 → 拷贝 sheet;在"降低透明度/增强对比度/Reduce Motion"三档下逐一目检 chrome 不破。
- **覆盖率**:不低于项目 60% 阈值。

---

## 11. 受影响文件清单(实现计划据此展开)

- `project.yml`、`Config/Base.xcconfig`、`Pathfinding.xcodeproj/project.pbxproj`(部署目标)
- `PathfindingApp.swift`(删 appearance 代理)、`ContentView.swift`(新 TabView)
- `Features/Components/DesignSystem.swift`(卡片/按钮/阴影/字体精简)、`VisualEffects.swift`(退役装饰)、`AnimationSystem.swift`(精简)、`ShimmerView.swift`(改原生 redaction)
- `Core/ThemeManager.swift`(简化)
- `Features/ItineraryListView.swift`(列表 + 拆详情)、新 `Features/Itinerary/ItineraryDetailView.swift` 及子视图
- `Features/PoiEditView.swift`(防抖)、`Features/Components/OptimizedMapView.swift`(玻璃 pin + 索引)
- `Features/Analysis/ItineraryAnalysisView.swift`、`Features/Budget/*.swift`(接通 + cardSurface)
- `Features/CopyItinerarySheet.swift`(拉伸去重)、`Features/Budget/AddExpenseView.swift`+`EditExpenseView`(拉伸去重)
- `Core/ItineraryStore.swift`(防抖 + copyItinerary 修复)

---

## 12. 实现顺序(高层;细化由 writing-plans 产出)

1. **Step 0 闸门**:抬部署目标 + 删降级/假玻璃 + 删 appearance 代理(立刻拿到系统玻璃基线,可独立验证)。
2. **外壳**:`ContentView` 新 TabView + 最小化行为。
3. **底座单元**:`cardSurface`、玻璃按钮、原生加载/空态、`ThemeManager` 简化、退役装饰(同批)。
4. **行程列表 + 拆详情**:落地新设计语言到入口与详情骨架。
5. **接通孤儿页**:分析/预算入口 + 数据通路 + cardSurface。
6. **细节**:POI 防抖、地图 pin、sheet 审计、持久化防抖 + copyItinerary 修复。
7. **拉伸去重**:拷贝 sheet / 费用表单。

每一步可独立编译、预览、验证,符合"底座先行 + 垂直样板"节奏。
