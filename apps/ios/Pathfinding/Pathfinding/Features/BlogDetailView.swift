import MapKit
import SwiftUI

enum MediaMode: String, CaseIterable {
  case images = "图片"
  case map = "地图"
}

struct BlogDetailView: View {
  let guide: BlogPost
  @State private var selectedDay: AiDay?
  @State private var currentImageIndex: Int = 0
  @State private var isLiked = false
  @State private var isSaved = false
  @State private var showImageViewer = false
  @State private var showPdfExport = false
  @State private var showShareSheet = false
  @State private var mediaMode: MediaMode = .images
  @State private var mapCameraPosition: MapCameraPosition = .automatic
  @State private var mapCameraInitialized = false
  @State private var selectedMapPoi: AiPoi?

  private var displayImages: [String] {
    if let images = guide.imageUrls, !images.isEmpty {
      return Array(images.prefix(10))
    } else if let cover = guide.coverImage {
      return [cover]
    }
    return []
  }

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

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        // MARK: - Media Mode Picker
        mediaModePicker

        // MARK: - Image Gallery
        imageGallery

        // MARK: - Content
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
          // Title & Meta
          titleSection

          // Quick Info Cards
          if guide.aiProcessedAt != nil {
            quickInfoSection
          }

          // AI Summary
          if let summary = guide.aiSummary {
            aiSummarySection(summary)
          }

          // Itinerary Days
          if let days = guide.aiDays, !days.isEmpty {
            itinerarySection(days)
          }

          // Tips
          if let tips = guide.aiTips, !tips.isEmpty {
            tipsSection(tips)
          }

          // Import Button
          if guide.aiDays != nil {
            importButton
          }

          // MARK: - Comments Section
          Divider()
            .padding(.vertical, DesignTokens.Spacing.sm)

          CommentSectionView(itineraryId: guide.id)
        }
        .padding(DesignTokens.Spacing.lg)
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .topBarTrailing) {
        Button {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            isLiked.toggle()
          }
        } label: {
          Image(systemName: isLiked ? "heart.fill" : "heart")
            .foregroundStyle(isLiked ? .red : .secondary)
            .symbolEffect(.bounce, value: isLiked)
        }

        Button {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            isSaved.toggle()
          }
        } label: {
          Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
            .foregroundStyle(isSaved ? .orange : .secondary)
            .symbolEffect(.bounce, value: isSaved)
        }

        Button {
          showShareSheet = true
        } label: {
          Image(systemName: "square.and.arrow.up")
        }

        // PDF Export button
        if guide.aiDays != nil {
          Button {
            showPdfExport = true
          } label: {
            Image(systemName: "doc.richtext")
          }
        }
      }
    }
    .sheet(item: $selectedDay) { day in
      DayDetailSheet(day: day) {
        selectedDay = nil
      }
    }
    .sheet(isPresented: $showPdfExport) {
      PdfExportSheet(guide: guide) {
        showPdfExport = false
      }
    }
    .imageViewer(
      images: displayImages,
      isPresented: $showImageViewer,
      selectedIndex: $currentImageIndex
    )
    .sheet(isPresented: $showShareSheet) {
      ShareSheet(
        title: guide.title,
        subtitle: guide.author,
        content: .blogPost(guide),
        onDismiss: { showShareSheet = false }
      )
    }
  }

  // MARK: - Media Mode Picker

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

  // MARK: - Image Gallery

  @ViewBuilder
  private var imageGallery: some View {
    if displayImages.isEmpty {
      Rectangle()
        .fill(Color(.systemGray5))
        .aspectRatio(16 / 9, contentMode: .fill)
        .frame(maxWidth: .infinity)
    } else if displayImages.count == 1 {
      CachedAsyncImage(url: URL(string: displayImages[0])) { image in
        image
          .resizable()
          .aspectRatio(16 / 9, contentMode: .fill)
      } placeholder: {
        Rectangle()
          .fill(Color(.systemGray5))
          .aspectRatio(16 / 9, contentMode: .fill)
          .overlay { ProgressView() }
      }
      .frame(maxWidth: .infinity)
      .clipped()
      .contentShape(Rectangle())
      .onTapGesture {
        showImageViewer = true
      }
    } else {
      ZStack(alignment: .bottom) {
        TabView(selection: $currentImageIndex) {
          ForEach(Array(displayImages.enumerated()), id: \.offset) { index, imageUrl in
            CachedAsyncImage(url: URL(string: imageUrl)) { image in
              image
                .resizable()
                .aspectRatio(contentMode: .fill)
            } placeholder: {
              Rectangle()
                .fill(Color(.systemGray5))
                .overlay { ProgressView() }
            }
            .tag(index)
            .contentShape(Rectangle())
            .onTapGesture {
              currentImageIndex = index
              showImageViewer = true
            }
          }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .aspectRatio(16 / 9, contentMode: .fill)
        .frame(maxWidth: .infinity)
        .clipped()

        // Custom page indicator & tap hint
        HStack {
          // Page indicator
          HStack(spacing: 6) {
            ForEach(0..<displayImages.count, id: \.self) { index in
              Capsule()
                .fill(index == currentImageIndex ? Color.white : Color.white.opacity(0.5))
                .frame(width: index == currentImageIndex ? 16 : 6, height: 6)
                .animation(.spring(response: 0.3), value: currentImageIndex)
            }
          }

          Spacer()

          // Tap to view hint
          HStack(spacing: 4) {
            Image(systemName: "arrow.up.left.and.arrow.down.right")
              .font(.caption2)
            Text("点击查看")
              .font(.caption2)
          }
          .foregroundStyle(.white.opacity(0.8))
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(Capsule().fill(.black.opacity(0.3)))
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.bottom, DesignTokens.Spacing.sm)
      }
    }
  }

  // MARK: - Map Content View

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

      mapPoiListView
        .frame(height: 220)
    }
  }

  // MARK: - Map POI List View

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

  // MARK: - Title Section

  private var titleSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // AI Badge
      if guide.aiProcessedAt != nil {
        Badge("AI 智能分析", icon: "sparkles", style: .ai)
      }

      Text(guide.title)
        .font(.title2)
        .fontWeight(.bold)

      // Author & Stats
      HStack(spacing: DesignTokens.Spacing.md) {
        if let author = guide.author {
          Label(author, systemImage: "person.circle.fill")
        }
        Spacer()
        if let views = guide.viewCount {
          StatLabel(icon: "eye", value: "\(views)")
        }
        if let likes = guide.likeCount {
          StatLabel(icon: "heart.fill", value: "\(likes)", color: .red.opacity(0.7))
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
  }

  // MARK: - Quick Info Section

  private var quickInfoSection: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        if let duration = guide.aiDuration {
          QuickInfoCard(icon: "clock", title: "时长", value: duration, color: .blue)
        }
        if let budget = guide.aiBudget {
          QuickInfoCard(icon: "yensign.circle", title: "预算", value: budget, color: .green)
        }
        if let bestTime = guide.aiBestTime {
          QuickInfoCard(icon: "calendar", title: "最佳时间", value: bestTime, color: .orange)
        }
        if let days = guide.aiDays {
          QuickInfoCard(
            icon: "map",
            title: "行程",
            value: "\(days.count)天",
            color: .purple
          )
        }
        // Safety info card with navigation
        if let destination = guide.destinations?.first {
          NavigationLink {
            SafetyRatingView(destinationName: destination)
          } label: {
            QuickInfoCard(icon: "shield.fill", title: "安全", value: "查看", color: .red)
          }
          .buttonStyle(.plain)
        }
      }
    }
    .scrollClipDisabled()
  }

  // MARK: - AI Summary Section

  private func aiSummarySection(_ summary: String) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("AI 摘要", systemImage: "sparkles")
        .font(.headline)
        .foregroundStyle(.purple)

      Text(summary)
        .font(.body)
        .lineSpacing(4)
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.purple.opacity(0.08))
    )
  }

  // MARK: - Itinerary Section

  private func itinerarySection(_ days: [AiDay]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("行程安排", systemImage: "map")
        .font(.headline)

      VStack(spacing: DesignTokens.Spacing.xs) {
        ForEach(days) { day in
          Button {
            selectedDay = day
          } label: {
            DayCard(day: day)
          }
          .buttonStyle(.plain)
        }
      }
    }
  }

  // MARK: - Tips Section

  private func tipsSection(_ tips: [String]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("旅行贴士", systemImage: "lightbulb.fill")
        .font(.headline)
        .foregroundStyle(.orange)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        ForEach(Array(tips.enumerated()), id: \.offset) { _, tip in
          HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "checkmark.circle.fill")
              .foregroundStyle(.green)
              .font(.subheadline)
            Text(tip)
              .font(.subheadline)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.orange.opacity(0.08))
    )
  }

  // MARK: - Import Button

  private var importButton: some View {
    NavigationLink {
      ImportedItineraryView(guide: guide)
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
}

// MARK: - Quick Info Card

struct QuickInfoCard: View {
  let icon: String
  let title: String
  let value: String
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)

      Text(title)
        .font(.caption)
        .foregroundStyle(.secondary)

      Text(value)
        .font(.subheadline)
        .fontWeight(.semibold)
        .lineLimit(1)
    }
    .padding(DesignTokens.Spacing.sm)
    .frame(width: 100, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(color.opacity(0.1))
    )
  }
}

// MARK: - Day Card

struct DayCard: View {
  let day: AiDay

  var body: some View {
    HStack {
      // Day number circle
      ZStack {
        Circle()
          .fill(DesignTokens.Colors.accent.gradient)
          .frame(width: 44, height: 44)

        Text("\(day.dayNumber)")
          .font(.headline)
          .foregroundStyle(.white)
      }

      VStack(alignment: .leading, spacing: 2) {
        Text("第 \(day.dayNumber) 天")
          .font(.subheadline)
          .fontWeight(.semibold)

        if let theme = day.theme {
          Text(theme)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }

        Text("\(day.pois.count) 个景点")
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }

      Spacer()

      Image(systemName: "chevron.right")
        .font(.caption)
        .foregroundStyle(.tertiary)
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }
}

// MARK: - Day Detail Sheet

struct DayDetailSheet: View {
  let day: AiDay
  let onDismiss: () -> Void

  var body: some View {
    NavigationStack {
      List {
        ForEach(Array(day.pois.enumerated()), id: \.element.id) { index, poi in
          PoiRow(poi: poi, index: index + 1)
        }
      }
      .listStyle(.insetGrouped)
      .navigationTitle("第 \(day.dayNumber) 天")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { onDismiss() }
        }
      }
    }
  }
}

// MARK: - POI Row

struct PoiRow: View {
  let poi: AiPoi
  let index: Int

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Index badge
      ZStack {
        Circle()
          .fill(colorForType(poi.type).gradient)
          .frame(width: 32, height: 32)

        Text("\(index)")
          .font(.caption)
          .fontWeight(.bold)
          .foregroundStyle(.white)
      }

      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: DesignTokens.Spacing.xs) {
          Text(poi.name)
            .font(.subheadline)
            .fontWeight(.medium)

          if let type = poi.type {
            Text(type)
              .font(.caption2)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(colorForType(type).opacity(0.15))
              .clipShape(Capsule())
          }
        }

        if let desc = poi.description {
          Text(desc)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        if let address = poi.address {
          Label(address, systemImage: "mappin")
            .font(.caption)
            .foregroundStyle(.tertiary)
            .lineLimit(1)
        }
      }

      Spacer()

      if poi.latitude != nil && poi.latitude != 0 {
        Image(systemName: "location.fill")
          .foregroundStyle(.green)
          .font(.caption)
      }
    }
    .padding(.vertical, 4)
  }

  private func colorForType(_ type: String?) -> Color {
    switch type?.lowercased() {
    case "景点", "attraction": return .orange
    case "餐厅", "restaurant", "美食", "food": return .red
    case "酒店", "hotel", "住宿", "accommodation": return .blue
    case "交通", "transport", "transportation": return .green
    default: return .purple
    }
  }
}

// MARK: - Blog Detail POI Annotation

struct BlogDetailPoiAnnotation: Identifiable {
  let id = UUID()
  let poi: AiPoi
  let dayNumber: Int
  let index: Int
  let coordinate: CLLocationCoordinate2D
}

// MARK: - Map Marker By Day

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

// MARK: - Map POI List Row

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
