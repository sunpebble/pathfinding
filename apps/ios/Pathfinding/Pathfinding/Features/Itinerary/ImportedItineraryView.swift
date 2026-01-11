import SwiftUI
import MapKit

struct ImportedItineraryView: View {
    let guide: BlogPost
    @State private var selectedDay: Int = 1
    @State private var cameraPosition: MapCameraPosition = .automatic
    
    var days: [AiDay] {
        guide.aiDays ?? []
    }
    
    var currentDay: AiDay? {
        days.first { $0.dayNumber == selectedDay }
    }
    
    var annotations: [PoiAnnotation] {
        guard let day = currentDay else { return [] }
        return day.pois.compactMap { poi in
            guard let lat = poi.latitude, let lng = poi.longitude else { return nil }
            return PoiAnnotation(poi: poi, coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng))
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Day picker
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(days) { day in
                        Button {
                            withAnimation {
                                selectedDay = day.dayNumber
                            }
                        } label: {
                            VStack(spacing: 4) {
                                Text("Day \(day.dayNumber)")
                                    .font(.headline)
                                if let theme = day.theme {
                                    Text(theme)
                                        .font(.caption)
                                        .lineLimit(1)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedDay == day.dayNumber ? Color.accentColor : Color.secondary.opacity(0.1))
                            .foregroundStyle(selectedDay == day.dayNumber ? .white : .primary)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()
            }
            .background(.ultraThinMaterial)
            
            // Map
            Map(position: $cameraPosition) {
                ForEach(annotations) { annotation in
                    Marker(annotation.poi.name, systemImage: iconForType(annotation.poi.type), coordinate: annotation.coordinate)
                        .tint(colorForType(annotation.poi.type))
                }
            }
            .mapStyle(.standard(elevation: .realistic))
            .onChange(of: selectedDay) { _, _ in
                updateCamera()
            }
            .onAppear {
                updateCamera()
            }
            
            // POI List
            List {
                if let day = currentDay {
                    ForEach(Array(day.pois.enumerated()), id: \.offset) { index, poi in
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(colorForType(poi.type))
                                    .frame(width: 32, height: 32)
                                Text("\(index + 1)")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                            }
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(poi.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                if let type = poi.type {
                                    Text(type)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            
                            Spacer()
                            
                            if poi.latitude != nil && poi.longitude != nil {
                                Image(systemName: "location.fill")
                                    .foregroundStyle(.green)
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
        guard !annotations.isEmpty else { return }
        
        let coordinates = annotations.map(\.coordinate)
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(
                latitude: coordinates.map(\.latitude).reduce(0, +) / Double(coordinates.count),
                longitude: coordinates.map(\.longitude).reduce(0, +) / Double(coordinates.count)
            ),
            span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
        )
        
        withAnimation {
            cameraPosition = .region(region)
        }
    }
    
    private func iconForType(_ type: String?) -> String {
        switch type?.lowercased() {
        case "景点", "attraction": return "star.fill"
        case "餐厅", "restaurant", "美食": return "fork.knife"
        case "酒店", "hotel", "住宿": return "bed.double.fill"
        case "交通", "transport": return "tram.fill"
        default: return "mappin"
        }
    }
    
    private func colorForType(_ type: String?) -> Color {
        switch type?.lowercased() {
        case "景点", "attraction": return .orange
        case "餐厅", "restaurant", "美食": return .red
        case "酒店", "hotel", "住宿": return .blue
        case "交通", "transport": return .green
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
        ImportedItineraryView(guide: BlogPost(
            id: "1",
            title: "东京5天深度游",
            author: nil,
            content: nil,
            summary: nil,
            coverImage: nil,
            platform: "xiaohongshu",
            qualityScore: nil,
            viewCount: nil,
            likeCount: nil,
            createdAt: nil,
            aiSummary: nil,
            aiTips: nil,
            aiBestTime: nil,
            aiDuration: nil,
            aiBudget: nil,
            aiDays: [
                AiDay(dayNumber: 1, theme: "浅草寺与东京塔", pois: [
                    AiPoi(name: "浅草寺", type: "景点", description: nil, latitude: 35.7147, longitude: 139.7966, address: nil),
                    AiPoi(name: "东京塔", type: "景点", description: nil, latitude: 35.6586, longitude: 139.7454, address: nil)
                ]),
                AiDay(dayNumber: 2, theme: "涩谷与原宿", pois: [
                    AiPoi(name: "涩谷十字路口", type: "景点", description: nil, latitude: 35.6595, longitude: 139.7004, address: nil)
                ])
            ],
            aiProcessedAt: nil
        ))
    }
}
