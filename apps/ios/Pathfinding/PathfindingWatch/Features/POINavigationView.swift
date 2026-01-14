import SwiftUI
import MapKit
import CoreLocation

// MARK: - POI Navigation View

/// View for navigating to a specific POI on Apple Watch
struct POINavigationView: View {
  let poi: WatchPOI

  @State private var locationManager = WatchLocationManager()
  @State private var showingMap = false

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {
        // POI Header
        poiHeader

        Divider()

        // Distance & Direction
        if poi.hasCoordinates {
          distanceSection

          // Map Preview
          mapPreview

          // Navigation Actions
          navigationActions
        } else {
          noCoordinatesView
        }

        // Notes
        if let notes = poi.notes, !notes.isEmpty {
          notesSection(notes)
        }
      }
      .padding(.horizontal)
    }
    .navigationTitle("导航")
    .navigationBarTitleDisplayMode(.inline)
    .onAppear {
      if poi.hasCoordinates {
        locationManager.startUpdating()
      }
    }
    .onDisappear {
      locationManager.stopUpdating()
    }
  }

  // MARK: - POI Header

  private var poiHeader: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 8) {
        Image(systemName: poi.iconName)
          .font(.title2)
          .foregroundStyle(.blue)

        Text(poi.name)
          .font(.headline)
          .lineLimit(2)
      }

      if let address = poi.address {
        Text(address)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)
      }

      if let time = poi.startTime {
        Label(time, systemImage: "clock")
          .font(.caption)
          .foregroundStyle(.orange)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  // MARK: - Distance Section

  private var distanceSection: some View {
    VStack(spacing: 8) {
      if let userLocation = locationManager.currentLocation,
         let poiLat = poi.latitude,
         let poiLon = poi.longitude {
        let poiLocation = CLLocation(latitude: poiLat, longitude: poiLon)
        let distance = userLocation.distance(from: poiLocation)

        HStack {
          // Distance
          VStack {
            Text(formatDistance(distance))
              .font(.title2)
              .fontWeight(.bold)
              .foregroundStyle(.blue)
            Text("距离")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }

          Spacer()

          // Direction Compass
          DirectionCompassView(
            userHeading: locationManager.heading,
            targetBearing: calculateBearing(from: userLocation, to: poiLocation)
          )
        }
        .padding()
        .background(
          RoundedRectangle(cornerRadius: 12)
            .fill(.ultraThinMaterial)
        )
      } else {
        HStack {
          ProgressView()
          Text("获取位置中...")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding()
      }
    }
  }

  // MARK: - Map Preview

  @ViewBuilder
  private var mapPreview: some View {
    if let lat = poi.latitude, let lon = poi.longitude {
      let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lon)

      Map {
        Marker(poi.name, coordinate: coordinate)
          .tint(.blue)

        if let userLocation = locationManager.currentLocation {
          Marker("我的位置", coordinate: userLocation.coordinate)
            .tint(.green)
        }
      }
      .frame(height: 100)
      .clipShape(RoundedRectangle(cornerRadius: 12))
      .allowsHitTesting(false)
    }
  }

  // MARK: - Navigation Actions

  private var navigationActions: some View {
    VStack(spacing: 8) {
      Button {
        openInMaps()
      } label: {
        Label("Apple 地图导航", systemImage: "map.fill")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .tint(.blue)

      Button {
        markAsVisited()
      } label: {
        Label(poi.isVisited ? "取消已到达" : "标记已到达", systemImage: poi.isVisited ? "xmark.circle" : "checkmark.circle")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.bordered)
    }
  }

  // MARK: - No Coordinates View

  private var noCoordinatesView: some View {
    VStack(spacing: 8) {
      Image(systemName: "location.slash")
        .font(.largeTitle)
        .foregroundStyle(.secondary)

      Text("暂无坐标信息")
        .font(.caption)
        .foregroundStyle(.secondary)

      if let address = poi.address {
        Text("地址: \(address)")
          .font(.caption2)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
    }
    .padding()
  }

  // MARK: - Notes Section

  private func notesSection(_ notes: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Label("备注", systemImage: "note.text")
        .font(.caption)
        .foregroundStyle(.secondary)

      Text(notes)
        .font(.caption)
        .lineLimit(3)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
    .background(
      RoundedRectangle(cornerRadius: 8)
        .fill(.ultraThinMaterial)
    )
  }

  // MARK: - Helpers

  private func formatDistance(_ meters: Double) -> String {
    if meters >= 1000 {
      return String(format: "%.1f km", meters / 1000)
    } else {
      return String(format: "%.0f m", meters)
    }
  }

  private func calculateBearing(from source: CLLocation, to destination: CLLocation) -> Double {
    let lat1 = source.coordinate.latitude.toRadians()
    let lon1 = source.coordinate.longitude.toRadians()
    let lat2 = destination.coordinate.latitude.toRadians()
    let lon2 = destination.coordinate.longitude.toRadians()

    let dLon = lon2 - lon1

    let y = sin(dLon) * cos(lat2)
    let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)

    let bearing = atan2(y, x).toDegrees()
    return (bearing + 360).truncatingRemainder(dividingBy: 360)
  }

  private func openInMaps() {
    guard let lat = poi.latitude, let lon = poi.longitude else { return }

    let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lon)
    let placemark = MKPlacemark(coordinate: coordinate)
    let mapItem = MKMapItem(placemark: placemark)
    mapItem.name = poi.name

    mapItem.openInMaps(launchOptions: [
      MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
    ])
  }

  private func markAsVisited() {
    WatchSessionManager.shared.markPOIVisited(poiId: poi.id, visited: !poi.isVisited)
  }
}

// MARK: - Direction Compass View

struct DirectionCompassView: View {
  let userHeading: Double?
  let targetBearing: Double

  var body: some View {
    ZStack {
      Circle()
        .stroke(.gray.opacity(0.3), lineWidth: 2)
        .frame(width: 50, height: 50)

      // Arrow pointing to destination
      Image(systemName: "location.north.fill")
        .font(.title3)
        .foregroundStyle(.blue)
        .rotationEffect(.degrees(arrowRotation))
    }
  }

  private var arrowRotation: Double {
    if let heading = userHeading {
      return targetBearing - heading
    }
    return targetBearing
  }
}

// MARK: - Watch Location Manager

@MainActor
@Observable
final class WatchLocationManager: NSObject {
  private let locationManager = CLLocationManager()

  private(set) var currentLocation: CLLocation?
  private(set) var heading: Double?
  private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined

  override init() {
    super.init()
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBest
  }

  func startUpdating() {
    locationManager.requestWhenInUseAuthorization()
    locationManager.startUpdatingLocation()
    locationManager.startUpdatingHeading()
  }

  func stopUpdating() {
    locationManager.stopUpdatingLocation()
    locationManager.stopUpdatingHeading()
  }
}

extension WatchLocationManager: CLLocationManagerDelegate {
  nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    Task { @MainActor in
      currentLocation = locations.last
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
    Task { @MainActor in
      heading = newHeading.trueHeading
    }
  }

  nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    Task { @MainActor in
      authorizationStatus = manager.authorizationStatus
      if manager.authorizationStatus == .authorizedWhenInUse {
        manager.startUpdatingLocation()
      }
    }
  }
}

// MARK: - Extensions

extension Double {
  func toRadians() -> Double {
    self * .pi / 180
  }

  func toDegrees() -> Double {
    self * 180 / .pi
  }
}

// MARK: - Preview

#Preview {
  POINavigationView(poi: WatchPOI(
    id: "1",
    name: "故宫博物院",
    type: "attraction",
    address: "北京市东城区景山前街4号",
    latitude: 39.9163,
    longitude: 116.3972,
    orderIndex: 1,
    startTime: "09:00",
    endTime: "12:00",
    isVisited: false,
    notes: "建议提前预约门票"
  ))
}
