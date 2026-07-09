# Profile 足迹布局优化

**Date:** 2026-07-09
**Status:** Approved
**Scope:** iOS Profile 页 hero 足迹区

## Problem

Phase 1 收缩后，Profile hero 统计区只剩单独一个「足迹」`EnhancedStatItem`，仍按多列均分布局渲染，视觉上空旷、像残缺多指标条。

## Decision

将足迹从 hero 内联统计改为「旅行数据」Section 的列表入口，与「旅行统计」「偏好设置」同级；点击进入现有 `StatsView`。

## Changes

### 1. Hero 瘦身（`ProfileView.swift`）

- 移除 `Divider` + `EnhancedStatItem` 足迹统计块
- 移除 `@State footprintStore` 与 `.task { loadVisitedCities() }`（本页不再展示数量）
- Hero 仅保留 `headerIdentityRow`（头像 + 名称/副标题 + 未登录 chevron）+ `.cardSurface()`

### 2. 旅行数据 Section 新增足迹行

顺序：

1. **足迹** → `NavigationLink { StatsView() }`
   - icon: `shoeprints.fill`
   - title: `profile.footprints`
   - subtitle: `profile.footprints_subtitle`（新增）
   - iconColor / terrainColor: 与足迹语义一致（如 `.orange` / forest 或 desert）
2. 旅行统计（现有）
3. 偏好设置（现有）

### 3. 文案（Localizable.strings）

| Key                           | zh-Hans                  | en                                      |
| ----------------------------- | ------------------------ | --------------------------------------- |
| `profile.footprints_subtitle` | 查看去过的城市与旅行轨迹 | Cities you've visited and travel trails |

已有 `profile.footprints` = 足迹 / Footprints，复用 title。

### 4. 明确不做

- 不改 `StatsView` / `StatsStore` / `FootprintStore` 业务逻辑
- 不新建足迹专用页
- 不在列表行副标题动态显示城市数（避免本页再拉 footprint API）
- `EnhancedStatItem`：改完后若全工程零引用，删除 `ProfileStatsSection.swift` 中该组件（或整文件若仅含该组件）

## Files

- `apps/ios/Pathfinding/Pathfinding/Features/ProfileView.swift`
- `apps/ios/Pathfinding/Pathfinding/Features/Profile/ProfileStatsSection.swift`（若 `EnhancedStatItem` 成死代码则删）
- `apps/ios/Pathfinding/Pathfinding/Resources/zh-Hans.lproj/Localizable.strings`
- `apps/ios/Pathfinding/Pathfinding/Resources/en.lproj/Localizable.strings`
- Xcode `project.pbxproj`（仅在删除 Swift 文件时）

## Acceptance

- Profile hero 无居中大图标足迹块，仅身份行
- 「旅行数据」首行是「足迹」，可点进 `StatsView`
- 中英文 subtitle 正常
- 无 footprint 相关编译错误 / 死引用
