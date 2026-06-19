import MapKit
import SwiftUI

/// Media area for the blog detail screen: mode picker, image gallery, map, and POI list.
struct BlogDetailMediaSection: View {
  let guide: BlogPost
  @Binding var mediaMode: MediaMode
  @Binding var currentImageIndex: Int
  @Binding var showImageViewer: Bool
  @Binding var selectedMapPoi: AiPoi?

  @State private var mapCameraPosition: MapCameraPosition = .automatic
  @State private var mapCameraInitialized = false

  private var displayImages: [String] {
    if let images = guide.imageUrls, !images.isEmpty {
      return Array(images.prefix(10))
    } else if let cover = guide.coverImage {
      return [cover]
    }
    return []
  }

  private func colorForDay(_ dayNumber: Int) -> Color {
    BlogDetailDayColors.color(forDay: dayNumber)
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

  @ViewBuilder
  private var mediaArea: some View {
    switch mediaMode {
    case .images:
      imageGallery
    case .map:
      mapContentView
    }
  }

  var body: some View {
    // MARK: - Media Mode Picker
    mediaModePicker

    // MARK: - Media Area (Images or Map)
    mediaArea
  }

  // MARK: - Media Mode Picker

  @ViewBuilder
  private var mediaModePicker: some View {
    if let days = guide.aiDays, !days.isEmpty {
      Picker("", selection: Binding(
        get: { mediaMode },
        set: { newValue in
          withAnimation(.easeInOut(duration: 0.3)) {
            mediaMode = newValue
          }
        }
      )) {
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
        .fill(DesignTokens.Colors.fillTertiary)
        .aspectRatio(16 / 9, contentMode: .fill)
        .frame(maxWidth: .infinity)
    } else if displayImages.count == 1 {
      CachedAsyncImage(url: URL(string: displayImages[0])) { image in
        image
          .resizable()
          .aspectRatio(16 / 9, contentMode: .fill)
      } placeholder: {
        Rectangle()
          .fill(DesignTokens.Colors.fillTertiary)
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
                .fill(DesignTokens.Colors.fillTertiary)
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
                .fill(index == currentImageIndex ? DesignTokens.Colors.textInverted : DesignTokens.Colors.textInverted.opacity(0.5))
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
}
