import MapKit
import SwiftUI

// MARK: - Blog Detail POI Sheet

struct BlogDetailPoiSheet: View {
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
