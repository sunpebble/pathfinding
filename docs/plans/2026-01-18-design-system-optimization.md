# Design System Optimization Plan

## Overview

This document outlines the plan to unify the design language and optimize layout/styling across the Pathfinding iOS app.

## Goals

1. **Consistency Fix**: Replace all hardcoded style values with `DesignTokens`
2. **Information Hierarchy Optimization**: Emphasize core travel data (destination, duration, budget, best time)

---

## Part 1: Consistency Fix

### Replacement Mapping

| Hardcoded Value             | Replace With                        | Notes          |
| --------------------------- | ----------------------------------- | -------------- |
| `.padding(4)`               | `DesignTokens.Spacing.xxs`          | 4pt            |
| `.padding(8)`               | `DesignTokens.Spacing.xs`           | 8pt            |
| `.padding(12)`              | `DesignTokens.Spacing.sm`           | 12pt           |
| `.padding(16)`              | `DesignTokens.Spacing.md`           | 16pt           |
| `.cornerRadius(4)`          | `DesignTokens.Radius.xxs`           | 4pt            |
| `.cornerRadius(6)`          | `DesignTokens.Radius.xs`            | 6pt            |
| `.cornerRadius(8)` or `10`  | `DesignTokens.Radius.sm`            | 10pt           |
| `.cornerRadius(12)` or `14` | `DesignTokens.Radius.md`            | 14pt           |
| `.cornerRadius(24)`         | `DesignTokens.Radius.xl`            | 24pt           |
| `Color.blue`                | `DesignTokens.Colors.info`          | Semantic       |
| `Color.red`                 | `DesignTokens.Colors.error`         | Semantic       |
| `Color.green`               | `DesignTokens.Colors.success`       | Semantic       |
| `Color.orange`              | `DesignTokens.Colors.warning`       | Semantic       |
| `Color.purple`              | `DesignTokens.Colors.aiPurple`      | AI features    |
| `Color.indigo`              | `DesignTokens.Colors.accent`        | Primary accent |
| `.font(.system(size: N))`   | `DesignTokens.Typography.Display.*` | Display fonts  |

### Files to Modify

**P0 - High Priority:**

- `ChatView.swift` - ~20+ hardcoded values
- `ItineraryAnalysisView.swift` - ~15+ hardcoded values
- `LoginView.swift` / `SignupView.swift` - ~10+ hardcoded values

**P1 - Medium Priority:**

- `BlogDetailView.swift` - ~5 hardcoded colors
- `VoiceInputView.swift` - ~8 hardcoded values
- `ShimmerView.swift` - ~6 hardcoded corner radius

**P2 - Low Priority:**

- `DiscoverView.swift` - ~3 hardcoded values
- `GuideComponents.swift` - ~3 hardcoded values

---

## Part 2: Information Hierarchy Optimization

### 2.1 DiscoverView - FeaturedCard & GuideListRow

**Current Issue:**

- Title, author, and stats have similar visual weight
- Core travel data (days, budget) not directly visible

**Solution:**

- Add core data badge bar at bottom of cover image: `[AI ✨] [3 days] [¥2000]`
- Increase title font weight
- Add destination tags with Capsule style

### 2.2 BlogDetailView - QuickInfoSection

**Current Issue:**

- `QuickInfoCard` uses horizontal scroll, easily overlooked
- AI summary visual hierarchy not prominent enough

**Solution:**

- Change QuickInfoCards to 2x2 grid layout (no scrolling)
- Add icon background color blocks for recognition
- Add gradient left border decoration to AI summary card
- Increase visual weight of POI count in DayCard

### 2.3 LoginView

**Solution:**

- Unify all styles using DesignTokens
- Use `PrimaryButtonStyle` for main button
- Add visual grouping for form sections

---

## Implementation Order

1. Consistency fixes (all hardcoded values)
2. FeaturedCard info hierarchy
3. GuideListRow info hierarchy
4. QuickInfoSection grid layout
5. AI summary card enhancement
6. LoginView cleanup

---

## Success Criteria

- [ ] Zero hardcoded padding/margin values in modified files
- [ ] Zero hardcoded cornerRadius values in modified files
- [ ] Zero hardcoded Color.\* values (except semantic colors already in DesignTokens)
- [ ] Core travel data visible within first viewport on cards
- [ ] Consistent visual language across all screens
