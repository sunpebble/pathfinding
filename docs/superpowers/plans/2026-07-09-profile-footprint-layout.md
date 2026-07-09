# Profile Footprint Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move footprints out of the lonely Profile hero stat into a travel-data list row that opens StatsView.

**Architecture:** Thin ProfileView edit only: slim hero to identity row; add NavigationLink for footprints at top of travel-data section; drop unused FootprintStore load on this screen; delete dead EnhancedStatItem if unreferenced.

**Tech Stack:** SwiftUI iOS, Localizable.strings

## Global Constraints

- Do not change StatsView / StatsStore / FootprintStore business logic
- Do not create a dedicated footprints page
- Do not show dynamic city count on the list subtitle
- Keep existing ExplorerSettingsRow / DesignTokens patterns

---

### Task 1: ProfileView layout + strings + dead code

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/ProfileView.swift`
- Modify: `apps/ios/Pathfinding/Pathfinding/Resources/zh-Hans.lproj/Localizable.strings`
- Modify: `apps/ios/Pathfinding/Pathfinding/Resources/en.lproj/Localizable.strings`
- Delete (if EnhancedStatItem becomes unused): `apps/ios/Pathfinding/Pathfinding/Features/Profile/ProfileStatsSection.swift`
- Possibly modify: `apps/ios/Pathfinding/Pathfinding.xcodeproj/project.pbxproj` if Swift file deleted

**Interfaces:**

- Consumes: existing `ExplorerSettingsRow`, `StatsView`, `DesignTokens`, localization keys
- Produces: hero without footprint stat; travel-data first row → StatsView

- [ ] **Step 1: Add localization strings**

In `zh-Hans.lproj/Localizable.strings`, after `"profile.footprints" = "足迹";` add:

```
"profile.footprints_subtitle" = "查看去过的城市与旅行轨迹";
```

In `en.lproj/Localizable.strings`, after `"profile.footprints" = "Footprints";` add:

```
"profile.footprints_subtitle" = "Cities you've visited and travel trails";
```

- [ ] **Step 2: Slim hero + add footprints list row in ProfileView**

Remove:

- `@State private var footprintStore = FootprintStore.shared`
- `.task { await footprintStore.loadVisitedCities() }`
- In `heroView`: `Divider`, stats `HStack`/`EnhancedStatItem`; keep only `headerIdentityRow` inside the padded `VStack` + `.cardSurface()`

In travel-data `Section`, insert **first** (before travel stats):

```swift
NavigationLink {
  StatsView()
} label: {
  ExplorerSettingsRow(
    icon: "shoeprints.fill",
    title: "profile.footprints".localized,
    subtitle: "profile.footprints_subtitle".localized,
    iconColor: .orange,
    terrainColor: DesignTokens.Colors.Terrain.forest
  )
}
```

- [ ] **Step 3: Remove dead EnhancedStatItem**

If `EnhancedStatItem` has zero references after Step 2, delete `ProfileStatsSection.swift` and remove it from `project.pbxproj` (or leave file only if other types remain — currently file only has EnhancedStatItem, so delete entire file + pbxproj refs).

- [ ] **Step 4: Verify**

```bash
# zero EnhancedStatItem / footprintStore in ProfileView
rg -n "EnhancedStatItem|footprintStore" apps/ios/Pathfinding/Pathfinding --include='*.swift'
```

Expected: no EnhancedStatItem; footprintStore only in FootprintStore / models if still used elsewhere.

Manual: open Profile → hero is identity only; 旅行数据 first row 足迹 → StatsView.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Features/ProfileView.swift \
  apps/ios/Pathfinding/Pathfinding/Resources/zh-Hans.lproj/Localizable.strings \
  apps/ios/Pathfinding/Pathfinding/Resources/en.lproj/Localizable.strings \
  apps/ios/Pathfinding/Pathfinding/Features/Profile/ProfileStatsSection.swift \
  apps/ios/Pathfinding/Pathfinding.xcodeproj/project.pbxproj
git commit -m "fix(ios): move profile footprints into travel-data list row"
```

---

## Spec coverage

| Spec item                            | Task            |
| ------------------------------------ | --------------- |
| Hero slim (no divider/stat)          | Task 1 Step 2   |
| Footprints list row → StatsView      | Task 1 Step 2   |
| Localizable subtitle                 | Task 1 Step 1   |
| No Stats/FootprintStore logic change | Global + Task 1 |
| Delete EnhancedStatItem if unused    | Task 1 Step 3   |
