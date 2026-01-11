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
      guard let lat = poi.latitude, let lng = poi.longitude else { return nil }
      return PoiAnnotation(
        poi: poi, coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng))
    }
  }

  var body: some View {
    VStack(spacing: 0) {
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 12) {
          ForEach(days) { day in
            Button {
              withAnimation { selectedDay = day.dayNumber }
            } label: {
              VStack(spacing: 4) {
                Text("Day \(day.dayNumber)").font(.headline)
                if let theme = day.theme { Text(theme).font(.caption).lineLimit(1) }
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

      Map(position: $cameraPosition) {
        ForEach(annotations) { annotation in
          Marker(annotation.poi.name, coordinate: annotation.coordinate)
        }
      }
      .mapStyle(.standard(elevation: .realistic))
      .onChange(of: selectedDay) { _, _ in updateCamera() }
      .onAppear { updateCamera() }

      List {
        if let day = currentDay {
          ForEach(Array(day.pois.enumerated()), id: \.offset) { index, poi in
            HStack(spacing: 12) {
              ZStack {
                Circle().fill(.purple).frame(width: 32, height: 32)
                Text("\(index + 1)").font(.caption).fontWeight(.bold).foregroundStyle(.white)
              }
              VStack(alignment: .leading, spacing: 2) {
                Text(poi.name).font(.subheadline).fontWeight(.medium)
                if let type = poi.type { Text(type).font(.caption).foregroundStyle(.secondary) }
              }
              Spacer()
              if poi.latitude != nil { Image(systemName: "location.fill").foregroundStyle(.green) }
            }
            .padding(.vertical, 4)
          }
        }
      }
      .listStyle(.plain).frame(height: 200)
    }
    .navigationTitle("导入行程").navigationBarTitleDisplayMode(.inline)
  }

  private func updateCamera() {
    guard !annotations.isEmpty else { return }
    let coords = annotations.map(\.coordinate)
    let center = CLLocationCoordinate2D(
      latitude: coords.map(\.latitude).reduce(0, +) / Double(coords.count),
      longitude: coords.map(\.longitude).reduce(0, +) / Double(coords.count)
    )
    withAnimation {
      cameraPosition = .region(
        MKCoordinateRegion(
          center: center, span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)))
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
        id: "1", title: "Test", author: nil, content: nil, summary: nil, coverImage: nil,
        platform: "test", qualityScore: nil, viewCount: nil, likeCount: nil, createdAt: nil,
        aiSummary: nil, aiTips: nil, aiBestTime: nil, aiDuration: nil, aiBudget: nil,
        aiDays: [
          AiDay(
            dayNumber: 1, theme: "Day 1",
            pois: [
              AiPoi(
                name: "Place", type: "景点", description: nil, latitude: 35.68, longitude: 139.76,
                address: nil)
            ])
        ], aiProcessedAt: nil))
  }
}
