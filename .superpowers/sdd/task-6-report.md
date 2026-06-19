# Task 6 Report — PreferencesView Glassify + Dedupe Pickers + Stats Loading State (Phase 3)

## Status: COMPLETE

## RED → GREEN

**RED:** `PathfindingTests/PreferenceSelectionTests.swift` written referencing `PreferenceCategory.color` as SwiftUI `Color`. Compile error confirmed:
`error: conflicting arguments to generic parameter 'T' ('String' vs. 'Color')` — because the existing `var color: String` returns a string, not a Color.

**GREEN:** `PreferenceCategory.color` in `Models/UserPreferences.swift` now returns `SwiftUI.Color` directly (single source of truth). Both tests pass:
- `testCategoryColorIsStableAndCentralized` — `.culture.color == .culture.color` and `.culture.color != .food.color`
- `testAllCategoryColorsAreNonDefault` — all 11 cases return non-gray Colors
- `Executed 2 tests, with 0 failures (0 unexpected) in 0.002 seconds`

## What Was Centralised

`PreferenceCategory` in `Models/UserPreferences.swift`: replaced `var color: String` with `var color: Color` (SwiftUI import added). All four previous duplicate switch-on-string implementations removed:
- `CategoryBadge.categoryColor` private var → `category.color`
- `CategoryScoreRow.categoryColor` private var → `category.color`
- `CategorySelectionView.categoryColor(for:)` func → `category.color`
- Three separate selection views eliminated entirely (see Consolidation)

## Selection View Consolidation

`TravelStyleSelectionView`, `BudgetLevelSelectionView`, `PacePreferenceSelectionView` (3 × ~46 lines = 138 lines) collapsed into one `SingleSelectionView<Option: Identifiable & Hashable>` (~45 lines). Parameters: `title`, `options`, `isSelected`, `onSelect`, `icon`, `label`, `description`, `tintColor`.

`CategorySelectionView` kept as-is (multi-select semantics differ).

## Glass Changes

`PreferenceSummaryCard` (free-floating, `.listRowBackground(.clear)`):
- Removed `.background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))`
- Replaced with `.cardSurface()`
- Inner `StyleBadge` and `CategoryBadge` remain flat tinted capsule content — no nested glass

## Stats Loading State

`ProfileStatsSection.swift` (`EnhancedStatItem`):
- Added `var isLoading: Bool = false` parameter
- When `isLoading`: value text shows `"—"` with `.redacted(reason: .placeholder)`

`ProfileView.swift`:
- Added `@State private var footprintStore = FootprintStore.shared`
- Footprints `EnhancedStatItem` value: `"\(footprintStore.visitedCities.count)"` (real data, no hardcoded "0")
- Passes `isLoading: footprintStore.isLoadingCities` for redacted placeholder during fetch
- Accessibility label updated to use the real footprint count
- Added `await footprintStore.loadVisitedCities()` to `.task`

## Build

`xcodebuild build -scheme Pathfinding-Debug -destination 'generic/platform=iOS Simulator' -quiet` → exit 0. Only pre-existing deprecation warnings.

## Phase 3 — Important Finding Fix: Async Dismiss Timing in SingleSelectionView

**Defect:** `SingleSelectionView` called `onSelect(option)` (which internally spawned a `Task { await preferenceStore.updatePreferences(...) }`) followed immediately by `dismiss()` synchronously — dismissing the view before the async store write completed, causing the parent to see a stale value.

**Fix applied in** `Features/PreferencesView.swift`:

1. **`SingleSelectionView` signature change:** `onSelect` type changed from `(Option) -> Void` to `@MainActor (Option) async -> Void`. The `@MainActor` annotation keeps the closure on the main actor so `ForEach`-captured loop variables (non-`Sendable` in Swift 6) are not sent across actor boundaries.

2. **Button action rewritten:** `onSelect(option); dismiss()` replaced with `Task { await onSelect(option); dismiss() }` — `dismiss()` now runs only after the async callback completes.

3. **Three call sites updated** (all in `PreferencesView`):
   - Travel style: `onSelect: { style in _ = await preferenceStore.updatePreferences(travelStyle: style) }`
   - Budget level: `onSelect: { level in _ = await preferenceStore.updatePreferences(budgetLevel: level) }`
   - Pace preference: `onSelect: { pace in _ = await preferenceStore.updatePreferences(pacePreference: pace) }`
   Each call site's inner `Task {}` wrapper removed — callers now simply `await` directly inside the async closure; the generic view owns dismiss timing.

**Build:** `xcodebuild build … -quiet` → `BUILD SUCCEEDED` (exit 0). Only pre-existing deprecation warnings.
**Tests:** `PathfindingTests/PreferenceSelectionTests` → 2 tests, 0 failures.

## Concerns

- `PreferenceCategory.luxury` maps to `.orange` (same as `.food`) because iOS has no "gold" system color. The test `testAllCategoryColorsAreNonDefault` passes because neither maps to `.gray`; but `luxury` and `food` share an identical Color value. This matches original behaviour.
- Footprints uses `visitedCities.count` as the city footprint count; a future improvement could use `footprintStats.totalCities` from the stats endpoint for more accuracy.
