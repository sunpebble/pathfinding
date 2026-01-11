import MapKit
import SwiftUI

struct ImportedItineraryView: View {
  let guide: BlogPost
  @State private var selectedDay: Int = 1
  @State private var cameraPosition: MapCameraPosition = .automatic

  var days: [AiDay] { guide.aiDays ?? [] }
  var currentDay: AiDay? { days.first { $0.dayNumber == selectedDay } }

  var annotations: [PoiAnnotation] {
    guard let day = currentDay else { return [] }
    return day.pois.compactMap { poi in
      guard let lat = poi.latitude, let lng = poi.longitude,
        lat != 0 && lng != 0,
        // 验证坐标在合理范围内（中国及周边区域）
        lat >= 3 && lat <= 54,  // 纬度范围
        lng >= 73 && lng <= 136  // 经度范围
      else { return nil }
      return PoiAnnotation(
        poi: poi,
        coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
      )
    }
  }

  var body: some View {
    VStack(spacing: 0) {
      // Day picker
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 12) {
          ForEach(days) { day in
            Button {
              withAnimation { selectedDay = day.dayNumber }
            } label: {
              VStack(spacing: 4) {
                Text("Day \(day.dayNumber)").font(.headline)
                if let theme = day.theme {
                  Text(theme).font(.caption).lineLimit(1)
                }
              }
              .padding(.horizontal, 16).padding(.vertical, 8)
              .background(
                selectedDay == day.dayNumber ? Color.accentColor : Color.secondary.opacity(0.1)
              )
              .foregroundStyle(selectedDay == day.dayNumber ? .white : .primary)
              .clipShape(Capsule())
            }
            .buttonStyle(.plain)
          }
        }
        .padding()
      }
      .background(.ultraThinMaterial)

      // Map with Markers
      Map(position: $cameraPosition) {
        ForEach(Array(annotations.enumerated()), id: \.element.id) { index, annotation in
          Annotation(annotation.poi.name, coordinate: annotation.coordinate) {
            ZStack {
              Circle()
                .fill(colorForType(annotation.poi.type))
                .frame(width: 30, height: 30)
              Text("\(index + 1)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            }
          }
        }
      }
      .mapStyle(.standard(elevation: .realistic))
      .onChange(of: selectedDay) { _, _ in updateCamera() }
      .onAppear { updateCamera() }

      // POI List
      List {
        if let day = currentDay {
          ForEach(Array(day.pois.enumerated()), id: \.offset) { index, poi in
            HStack(spacing: 12) {
              ZStack {
                Circle().fill(colorForType(poi.type)).frame(width: 32, height: 32)
                Text("\(index + 1)").font(.caption).fontWeight(.bold).foregroundStyle(.white)
              }
              VStack(alignment: .leading, spacing: 2) {
                Text(poi.name).font(.subheadline).fontWeight(.medium)
                if let type = poi.type {
                  Text(type).font(.caption).foregroundStyle(.secondary)
                }
              }
              Spacer()
              if poi.latitude != nil && poi.latitude != 0 {
                Image(systemName: "location.fill").foregroundStyle(.green)
              }
            }
            .padding(.vertical, 4)
          }
        }
      }
      .listStyle(.plain)
      .frame(height: 200)
    }
    .navigationTitle("导入行程")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func updateCamera() {
    print("📍 Annotations count: \(annotations.count)")
    guard !annotations.isEmpty else {
      print("⚠️ No annotations to display")
      return
    }

    let coords = annotations.map(\.coordinate)
    coords.forEach { print("  📌 \($0.latitude), \($0.longitude)") }

    // Calculate bounding box
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

    // Add padding to the span, with min/max limits
    // Min: 0.01 (very close zoom), Max: 2.0 (city level, not country level)
    let latDelta = min(max((maxLat - minLat) * 1.5, 0.01), 2.0)
    let lngDelta = min(max((maxLng - minLng) * 1.5, 0.01), 2.0)

    print(
      "📍 Camera: center=(\(center.latitude), \(center.longitude)), span=(\(latDelta), \(lngDelta))")

    withAnimation {
      cameraPosition = .region(
        MKCoordinateRegion(
          center: center,
          span: MKCoordinateSpan(latitudeDelta: latDelta, longitudeDelta: lngDelta)
        ))
    }
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
  }
}
