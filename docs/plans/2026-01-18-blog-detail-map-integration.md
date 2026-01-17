# 攻略详情页集成地图视图 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将导入行程页面的地图功能整合到攻略详情页，支持图片/地图切换查看

**Architecture:** 在 BlogDetailView 添加 Segmented Control 和地图视图，删除 ImportedItineraryView

**Tech Stack:** SwiftUI, MapKit

---

## Task 1: 添加 MediaMode 枚举和状态

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 添加 MediaMode 枚举**

在文件顶部（struct 外部）添加：

```swift
enum MediaMode: String, CaseIterable {
  case images = "图片"
  case map = "地图"
}
```

**Step 2: 添加状态变量**

在 `BlogDetailView` 的 `@State` 变量区域添加：

```swift
@State private var mediaMode: MediaMode = .images
@State private var mapCameraPosition: MapCameraPosition = .automatic
@State private var mapCameraInitialized = false
@State private var selectedMapPoi: AiPoi?
```

**Step 3: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): add MediaMode enum and state for BlogDetailView"
```

---

## Task 2: 添加 Segmented Control

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 创建 mediaModePicker 视图**

在 `BlogDetailView` 中添加计算属性：

```swift
@ViewBuilder
private var mediaModePicker: some View {
  if let days = guide.aiDays, !days.isEmpty {
    Picker("", selection: $mediaMode) {
      ForEach(MediaMode.allCases, id: \.self) { mode in
        Text(mode.rawValue).tag(mode)
      }
    }
    .pickerStyle(.segmented)
    .padding(.horizontal, DesignTokens.Spacing.lg)
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}
```

**Step 2: 在 body 中添加 picker**

在 `ScrollView` 内部，`imageGallery` 之前添加：

```swift
mediaModePicker
```

**Step 3: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): add Segmented Control for image/map switching"
```

---

## Task 3: 迁移地图相关组件

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 添加 dayColors 颜色数组**

在文件顶部或 BlogDetailView 内添加：

```swift
private let dayColors: [Color] = [
  .blue,    // Day 1
  .orange,  // Day 2
  .green,   // Day 3
  .purple,  // Day 4
  .pink,    // Day 5
  .teal,    // Day 6
  .red,     // Day 7+
]

private func colorForDay(_ dayNumber: Int) -> Color {
  let index = min(dayNumber - 1, dayColors.count - 1)
  return dayColors[max(0, index)]
}
```

**Step 2: 添加 PoiAnnotation 结构（如果不存在）**

```swift
struct BlogDetailPoiAnnotation: Identifiable {
  let id = UUID()
  let poi: AiPoi
  let dayNumber: Int
  let index: Int
  let coordinate: CLLocationCoordinate2D
}
```

**Step 3: 添加 allAnnotations 计算属性**

```swift
private var allAnnotations: [BlogDetailPoiAnnotation] {
  guard let days = guide.aiDays else { return [] }
  var annotations: [BlogDetailPoiAnnotation] = []
  var globalIndex = 0

  for day in days {
    for poi in day.pois {
      guard let lat = poi.latitude, let lng = poi.longitude,
            lat != 0 && lng != 0,
            lat >= -90 && lat <= 90,
            lng >= -180 && lng <= 180
      else { continue }

      globalIndex += 1
      annotations.append(BlogDetailPoiAnnotation(
        poi: poi,
        dayNumber: day.dayNumber,
        index: globalIndex,
        coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
      ))
    }
  }
  return annotations
}
```

**Step 4: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(ios): add day colors and POI annotation structures"
```

---

## Task 4: 创建地图视图组件

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 添加 MapMarkerByDay 组件**

```swift
private struct MapMarkerByDay: View {
  let index: Int
  let dayColor: Color
  let isSelected: Bool

  var body: some View {
    ZStack {
      Circle()
        .fill(dayColor.gradient)
        .frame(width: isSelected ? 40 : 32, height: isSelected ? 40 : 32)
        .shadow(color: dayColor.opacity(0.5), radius: isSelected ? 8 : 4, y: 2)

      Text("\(index)")
        .font(isSelected ? .headline : .caption)
        .fontWeight(.bold)
        .foregroundStyle(.white)
    }
    .animation(.spring(response: 0.3), value: isSelected)
  }
}
```

**Step 2: 添加 mapContentView 计算属性**

```swift
@ViewBuilder
private var mapContentView: some View {
  VStack(spacing: 0) {
    // Map
    Map(position: $mapCameraPosition) {
      ForEach(allAnnotations) { annotation in
        Annotation(
          annotation.poi.name,
          coordinate: annotation.coordinate,
          anchor: .bottom
        ) {
          MapMarkerByDay(
            index: annotation.index,
            dayColor: colorForDay(annotation.dayNumber),
            isSelected: selectedMapPoi?.name == annotation.poi.name
          )
        }
      }

      // Route lines per day
      if let days = guide.aiDays {
        ForEach(days) { day in
          let dayAnnotations = allAnnotations.filter { $0.dayNumber == day.dayNumber }
          if dayAnnotations.count > 1 {
            MapPolyline(coordinates: dayAnnotations.map(\.coordinate))
              .stroke(colorForDay(day.dayNumber).opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [8, 4]))
          }
        }
      }
    }
    .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .including([.restaurant, .hotel, .museum, .park])))
    .mapControls {
      MapCompass()
      MapScaleView()
      MapUserLocationButton()
    }
    .frame(maxWidth: .infinity)
    .aspectRatio(16/9, contentMode: .fill)
    .clipped()
    .task {
      updateMapCamera()
    }

    // POI List
    mapPoiListView
      .frame(height: 220)
  }
}
```

**Step 3: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): add map content view with markers and route lines"
```

---

## Task 5: 创建 POI 列表视图

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 添加 mapPoiListView**

```swift
private var mapPoiListView: some View {
  ScrollView {
    LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      if let days = guide.aiDays {
        ForEach(days) { day in
          // Day header
          HStack {
            Circle()
              .fill(colorForDay(day.dayNumber).gradient)
              .frame(width: 24, height: 24)
              .overlay {
                Text("\(day.dayNumber)")
                  .font(.caption2)
                  .fontWeight(.bold)
                  .foregroundStyle(.white)
              }

            Text("Day \(day.dayNumber)")
              .font(.subheadline)
              .fontWeight(.semibold)

            if let theme = day.theme {
              Text("- \(theme)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
          .padding(.top, day.dayNumber == 1 ? 0 : DesignTokens.Spacing.sm)

          // POIs for this day
          ForEach(day.pois) { poi in
            MapPoiListRow(
              poi: poi,
              dayColor: colorForDay(day.dayNumber),
              isSelected: selectedMapPoi?.name == poi.name
            ) {
              selectedMapPoi = poi
              centerMapOnPoi(poi)
            }
          }
        }
      }
    }
    .padding(.horizontal, DesignTokens.Spacing.md)
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
  .background(.background)
}
```

**Step 2: 添加 MapPoiListRow 组件**

```swift
private struct MapPoiListRow: View {
  let poi: AiPoi
  let dayColor: Color
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        Circle()
          .fill(dayColor.opacity(0.2))
          .frame(width: 8, height: 8)

        VStack(alignment: .leading, spacing: 2) {
          Text(poi.name)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.primary)

          if let type = poi.type {
            Text(type)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        if poi.latitude != nil && poi.latitude != 0 {
          Image(systemName: "location.fill")
            .font(.caption)
            .foregroundStyle(.green)
        }
      }
      .padding(.vertical, DesignTokens.Spacing.xs)
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
          .fill(isSelected ? dayColor.opacity(0.1) : Color.clear)
      )
    }
    .buttonStyle(.plain)
  }
}
```

**Step 3: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): add POI list view grouped by day"
```

---

## Task 6: 添加相机控制方法

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 添加 updateMapCamera 方法**

```swift
private func updateMapCamera() {
  guard !allAnnotations.isEmpty else { return }

  let coords = allAnnotations.map(\.coordinate)
  let lats = coords.map(\.latitude)
  let lngs = coords.map(\.longitude)

  let minLat = lats.min()!
  let maxLat = lats.max()!
  let minLng = lngs.min()!
  let maxLng = lngs.max()!

  let center = CLLocationCoordinate2D(
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2
  )

  let latDelta = min(max((maxLat - minLat) * 1.5, 0.01), 2.0)
  let lngDelta = min(max((maxLng - minLng) * 1.5, 0.01), 2.0)

  let region = MKCoordinateRegion(
    center: center,
    span: MKCoordinateSpan(latitudeDelta: latDelta, longitudeDelta: lngDelta)
  )

  if !mapCameraInitialized {
    mapCameraPosition = .region(region)
    mapCameraInitialized = true
  } else {
    withAnimation(.easeInOut(duration: 0.5)) {
      mapCameraPosition = .region(region)
    }
  }
}
```

**Step 2: 添加 centerMapOnPoi 方法**

```swift
private func centerMapOnPoi(_ poi: AiPoi) {
  guard let lat = poi.latitude, let lng = poi.longitude,
        lat != 0, lng != 0 else { return }

  withAnimation(.easeInOut(duration: 0.3)) {
    mapCameraPosition = .region(
      MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
      )
    )
  }
}
```

**Step 3: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): add map camera control methods"
```

---

## Task 7: 整合媒体区域切换

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 创建 mediaArea 视图**

替换 body 中的 `imageGallery` 调用为新的 `mediaArea`：

```swift
@ViewBuilder
private var mediaArea: some View {
  switch mediaMode {
  case .images:
    imageGallery
  case .map:
    mapContentView
  }
}
```

**Step 2: 更新 body**

在 body 中，将 `imageGallery` 替换为：

```swift
// MARK: - Media Mode Picker
mediaModePicker

// MARK: - Media Area (Images or Map)
mediaArea
```

**Step 3: 添加切换动画**

在 Picker 的 selection binding 中添加动画：

```swift
Picker("", selection: Binding(
  get: { mediaMode },
  set: { newValue in
    withAnimation(.easeInOut(duration: 0.3)) {
      mediaMode = newValue
    }
  }
)) {
  // ...
}
```

**Step 4: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(ios): integrate media area switching between images and map"
```

---

## Task 8: 添加 POI 详情 Sheet

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`

**Step 1: 添加 sheet 修饰符**

在 body 的 sheet 修饰符区域添加：

```swift
.sheet(item: $selectedMapPoi) { poi in
  BlogDetailPoiSheet(poi: poi)
}
```

**Step 2: 添加 BlogDetailPoiSheet 组件**

```swift
private struct BlogDetailPoiSheet: View {
  @Environment(\.dismiss) private var dismiss
  let poi: AiPoi

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
          // Header
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let type = poi.type {
              Badge(type, style: .info)
            }

            Text(poi.name)
              .font(.title2)
              .fontWeight(.bold)

            if let address = poi.address {
              Label(address, systemImage: "mappin.and.ellipse")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
          }

          if let description = poi.description {
            Divider()
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
              Text("简介")
                .font(.headline)
              Text(description)
                .font(.body)
                .foregroundStyle(.secondary)
            }
          }

          // Mini map
          if let lat = poi.latitude, let lng = poi.longitude, lat != 0, lng != 0 {
            Divider()
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
              Text("位置")
                .font(.headline)

              Map(initialPosition: .region(
                MKCoordinateRegion(
                  center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                  span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                )
              )) {
                Marker(poi.name, coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng))
              }
              .frame(height: 200)
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
          }

          // Navigate button
          if let lat = poi.latitude, let lng = poi.longitude {
            Button {
              openInMaps(name: poi.name, lat: lat, lng: lng)
            } label: {
              Label("导航到这里", systemImage: "arrow.triangle.turn.up.right.diamond")
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
          }
        }
        .padding(DesignTokens.Spacing.lg)
      }
      .navigationTitle("地点详情")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
    }
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
  }

  private func openInMaps(name: String, lat: Double, lng: Double) {
    let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
    let placemark = MKPlacemark(coordinate: coordinate)
    let mapItem = MKMapItem(placemark: placemark)
    mapItem.name = name
    mapItem.openInMaps(launchOptions: [
      MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
    ])
  }
}
```

**Step 3: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(ios): add POI detail sheet for map view"
```

---

## Task 9: 删除 ImportedItineraryView 并更新引用

**Files:**

- Delete: `apps/ios/Pathfinding/Pathfinding/Features/ImportedItineraryView.swift`
- Modify: `apps/ios/Pathfinding/Pathfinding/Features/BlogDetailView.swift`
- Modify: `apps/ios/Pathfinding/Pathfinding.xcodeproj/project.pbxproj` (自动)

**Step 1: 移除导入按钮的 NavigationLink**

在 BlogDetailView 中，将 `importButton` 改为直接保存到行程：

```swift
private var importButton: some View {
  Button {
    ItineraryStore.shared.save(from: guide)
    // Show success feedback
  } label: {
    HStack {
      Image(systemName: "square.and.arrow.down")
      Text("导入行程到我的旅程")
    }
    .font(.headline)
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.md)
  }
  .buttonStyle(.borderedProminent)
  .tint(.indigo)
}
```

**Step 2: 删除 ImportedItineraryView.swift**

```bash
rm apps/ios/Pathfinding/Pathfinding/Features/ImportedItineraryView.swift
```

**Step 3: 更新 project.yml（如有）**

移除对 ImportedItineraryView.swift 的引用。

**Step 4: 构建验证**

Run: `pnpm ios:build 2>&1 | tail -10`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add -A && git commit -m "refactor(ios): remove ImportedItineraryView, integrate into BlogDetailView"
```

---

## Task 10: 最终测试和验证

**Step 1: TypeCheck**

Run: `pnpm typecheck 2>&1 | tail -10`
Expected: Successfully ran target typecheck

**Step 2: iOS Build**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 3: 功能验证清单**

- [ ] 有 AI 数据的攻略显示 Segmented Control
- [ ] 无 AI 数据的攻略只显示图片
- [ ] 图片模式正常显示轮播
- [ ] 地图模式显示所有 POI，按天数颜色区分
- [ ] POI 列表按天分组
- [ ] 点击 POI 列表项地图居中
- [ ] 点击地图标记显示详情
- [ ] 导入按钮正常工作

**Step 4: Commit any fixes if needed**
