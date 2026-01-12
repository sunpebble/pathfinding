import MapKit
import SwiftUI

struct ImportedItineraryView: View {
  let guide: BlogPost
  @State private var selectedDay: Int = 1
  @State private var cameraPosition: MapCameraPosition = .automatic
  @State private var selectedPoi: AiPoi?
  @State private var showSaveSuccess = false
  
  @Environment(\.dismiss) private var dismiss
  @Environment(AppState.self) private var appState
  
  private var store: ItineraryStore { ItineraryStore.shared }
  private var isSaved: Bool { store.isSaved(blogId: guide.id) }

  var days: [AiDay] { guide.aiDays ?? [] }
  var currentDay: AiDay? { days.first { $0.dayNumber == selectedDay } }

  var annotations: [PoiAnnotation] {
    guard let day = currentDay else { return [] }
    return day.pois.compactMap { poi in
      guard let lat = poi.latitude, let lng = poi.longitude,
        lat != 0 && lng != 0,
        lat >= -90 && lat <= 90,
        lng >= -180 && lng <= 180
      else { return nil }
      return PoiAnnotation(
        poi: poi,
        coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
      )
    }
  }

  var body: some View {
    VStack(spacing: 0) {
      // MARK: - Day Selector
      daySelectorView
        .background(.ultraThinMaterial)

      // MARK: - Map
      mapView
        .frame(maxHeight: .infinity)

      // MARK: - POI List
      poiListView
        .frame(height: 220)
    }
    .navigationTitle(guide.title)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          store.save(from: guide)
          showSaveSuccess = true
        } label: {
          Label(isSaved ? "已保存" : "保存", systemImage: isSaved ? "checkmark.circle.fill" : "square.and.arrow.down")
        }
        .disabled(isSaved)
      }
    }
    .alert("保存成功", isPresented: $showSaveSuccess) {
      Button("查看行程") {
        appState.selectedTab = .itinerary
        dismiss() // Dismiss current view
      }
      Button("继续浏览", role: .cancel) {}
    } message: {
      Text("行程已保存到「我的行程」")
    }
    .sheet(item: $selectedPoi) { poi in
      PoiDetailSheet(poi: poi)
    }
  }

  // MARK: - Day Selector

  private var daySelectorView: some View {
    ScrollViewReader { proxy in
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(days) { day in
            DaySelectorButton(
              day: day,
              isSelected: selectedDay == day.dayNumber
            ) {
              withAnimation(.spring(response: 0.3)) {
                selectedDay = day.dayNumber
                proxy.scrollTo(day.dayNumber, anchor: .center)
              }
            }
            .id(day.dayNumber)
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
      }
      .onAppear {
        proxy.scrollTo(selectedDay, anchor: .center)
      }
    }
  }

  // MARK: - Map View

  private var mapView: some View {
    Map(position: $cameraPosition) {
      ForEach(Array(annotations.enumerated()), id: \.element.id) { index, annotation in
        Annotation(
          annotation.poi.name,
          coordinate: annotation.coordinate,
          anchor: .bottom
        ) {
          MapMarker(
            index: index + 1,
            type: annotation.poi.type,
            isSelected: selectedPoi?.name == annotation.poi.name
          )
        }
      }

      // Draw route line if multiple POIs
      if annotations.count > 1 {
        MapPolyline(coordinates: annotations.map(\.coordinate))
          .stroke(.indigo.opacity(0.6), style: StrokeStyle(lineWidth: 2, dash: [8, 4]))
      }
    }
    .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .including([.restaurant, .hotel, .museum, .park])))
    .mapControls {
      MapCompass()
      MapScaleView()
      MapUserLocationButton()
    }
    .onChange(of: selectedDay) { _, _ in
      updateCamera()
    }
    .onAppear {
      updateCamera()
    }
  }

  // MARK: - POI List

  private var poiListView: some View {
    VStack(spacing: 0) {
      // Handle
      Capsule()
        .fill(Color(.systemGray4))
        .frame(width: 36, height: 4)
        .padding(.top, DesignTokens.Spacing.xs)
        .padding(.bottom, DesignTokens.Spacing.sm)

      // List
      ScrollView {
        LazyVStack(spacing: DesignTokens.Spacing.xs) {
          if let day = currentDay {
            ForEach(Array(day.pois.enumerated()), id: \.offset) { index, poi in
              PoiListItem(
                poi: poi,
                index: index + 1,
                isSelected: selectedPoi?.name == poi.name
              ) {
                selectedPoi = poi
                // Center map on this POI
                if let lat = poi.latitude, let lng = poi.longitude {
                  withAnimation {
                    cameraPosition = .region(
                      MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                      )
                    )
                  }
                }
              }
            }
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
      }
    }
    .background(.background)
  }

  // MARK: - Update Camera

  private func updateCamera() {
    guard !annotations.isEmpty else { return }

    let coords = annotations.map(\.coordinate)
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

    withAnimation(.easeInOut(duration: 0.5)) {
      cameraPosition = .region(
        MKCoordinateRegion(
          center: center,
          span: MKCoordinateSpan(latitudeDelta: latDelta, longitudeDelta: lngDelta)
        )
      )
    }
  }
}

// MARK: - Day Selector Button

struct DaySelectorButton: View {
  let day: AiDay
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 4) {
        Text("Day")
          .font(.caption2)
          .fontWeight(.medium)

        Text("\(day.dayNumber)")
          .font(.headline)

        if let theme = day.theme {
          Text(theme)
            .font(.caption2)
            .lineLimit(1)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(isSelected ? Color.accentColor : Color(.systemGray6))
      )
      .foregroundStyle(isSelected ? .white : .primary)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Map Marker

struct MapMarker: View {
  let index: Int
  let type: String?
  let isSelected: Bool

  var body: some View {
    ZStack {
      Circle()
        .fill(colorForType(type).gradient)
        .frame(width: isSelected ? 40 : 32, height: isSelected ? 40 : 32)
        .shadow(color: colorForType(type).opacity(0.5), radius: isSelected ? 8 : 4, y: 2)

      Text("\(index)")
        .font(isSelected ? .headline : .caption)
        .fontWeight(.bold)
        .foregroundStyle(.white)
    }
    .animation(.spring(response: 0.3), value: isSelected)
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

// MARK: - POI List Item

struct PoiListItem: View {
  let poi: AiPoi
  let index: Int
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Index
        ZStack {
          Circle()
            .fill(colorForType(poi.type).gradient)
            .frame(width: 28, height: 28)

          Text("\(index)")
            .font(.caption)
            .fontWeight(.bold)
            .foregroundStyle(.white)
        }

        // Info
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

        // Location indicator
        if poi.latitude != nil && poi.latitude != 0 {
          Image(systemName: "location.fill")
            .font(.caption)
            .foregroundStyle(.green)
        }

        Image(systemName: "chevron.right")
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }
      .padding(DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
          .fill(isSelected ? Color.accentColor.opacity(0.1) : Color(.systemGray6))
      )
    }
    .buttonStyle(.plain)
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

// MARK: - POI Detail Sheet

struct PoiDetailSheet: View {
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

          // Map preview
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

          // Actions
          HStack(spacing: DesignTokens.Spacing.md) {
            if let lat = poi.latitude, let lng = poi.longitude {
              Button {
                openInMaps(name: poi.name, lat: lat, lng: lng)
              } label: {
                Label("导航", systemImage: "arrow.triangle.turn.up.right.diamond")
                  .frame(maxWidth: .infinity)
              }
              .buttonStyle(.borderedProminent)
            }

            Button {
              // Add to favorites
            } label: {
              Label("收藏", systemImage: "bookmark")
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
          }
        }
        .padding(DesignTokens.Spacing.lg)
      }
      .navigationTitle("景点详情")
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

// MARK: - POI Annotation

struct PoiAnnotation: Identifiable {
  let id = UUID()
  let poi: AiPoi
  let coordinate: CLLocationCoordinate2D
}

#Preview {
  NavigationStack {
    ImportedItineraryView(
      guide: BlogPost(
        id: "1", title: "Test", authorName: nil, content: nil, summary: nil, coverImageUrl: nil,
        imageUrls: nil, sourcePlatform: "test", qualityScore: nil, viewsCount: nil, likesCount: nil,
        savesCount: nil, createdAt: nil,
        aiSummary: nil, aiTips: nil, aiBestTime: nil, aiDuration: nil, aiBudget: nil,
        aiDays: [
          AiDay(
            dayNumber: 1, theme: "Day 1",
            pois: [
              AiPoi(
                name: "Place 1", type: "景点", description: nil, latitude: 35.68, longitude: 139.76,
                address: nil),
              AiPoi(
                name: "Place 2", type: "美食", description: nil, latitude: 35.69, longitude: 139.77,
                address: nil),
            ])
        ], aiProcessedAt: nil))
        .environment(AppState())
  }
}
