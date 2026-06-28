import MapKit
import SwiftUI

/// Custom tile overlay that uses offline map tiles
final class OfflineTileOverlay: MKTileOverlay {
  // MARK: - Properties

  private let regionId: String
  private let storage = OfflineMapStorage.shared
  private let fallbackToOnline: Bool

  /// Online tile URL template for fallback
  private let onlineURLTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

  // MARK: - Initialization

  init(regionId: String, fallbackToOnline: Bool = true) {
    self.regionId = regionId
    self.fallbackToOnline = fallbackToOnline
    super.init(urlTemplate: nil)

    // Standard tile size
    self.tileSize = CGSize(width: 256, height: 256)

    // Enable replacing default Apple maps
    self.canReplaceMapContent = true
  }

  // MARK: - MKTileOverlay Overrides

  override func loadTile(
    at path: MKTileOverlayPath,
    result: @escaping (Data?, Error?) -> Void
  ) {
    // Try to get tile from offline storage first
    if let tileData = storage.getTile(
      regionId: regionId,
      zoom: path.z,
      x: path.x,
      y: path.y
    ) {
      result(tileData, nil)
      return
    }

    // Fallback to online if enabled
    if fallbackToOnline {
      loadOnlineTile(at: path, result: result)
    } else {
      // Return empty/transparent tile
      result(nil, nil)
    }
  }

  override func url(forTilePath path: MKTileOverlayPath) -> URL {
    let urlString = onlineURLTemplate
      .replacingOccurrences(of: "{z}", with: String(path.z))
      .replacingOccurrences(of: "{x}", with: String(path.x))
      .replacingOccurrences(of: "{y}", with: String(path.y))
    return URL(string: urlString)!
  }

  // MARK: - Private Methods

  private func loadOnlineTile(
    at path: MKTileOverlayPath,
    result: @escaping (Data?, Error?) -> Void
  ) {
    let url = self.url(forTilePath: path)
    var request = URLRequest(url: url)
    request.setValue("Pathfinding-iOS/1.0", forHTTPHeaderField: "User-Agent")

    nonisolated(unsafe) let callback = result
    URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        callback(nil, error)
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
            httpResponse.statusCode == 200,
            let data = data else {
        callback(nil, nil)
        return
      }

      callback(data, nil)
    }.resume()
  }
}

// MARK: - Offline-aware Map View

/// A map view that automatically uses offline tiles when available
struct OfflineAwareMapView: UIViewRepresentable {
  let annotations: [SavedPoiAnnotation]
  @Binding var region: MKCoordinateRegion
  let selectedPoiId: String?
  let onAnnotationTap: ((String) -> Void)?
  let preferOffline: Bool

  init(
    annotations: [SavedPoiAnnotation],
    region: Binding<MKCoordinateRegion>,
    selectedPoiId: String? = nil,
    onAnnotationTap: ((String) -> Void)? = nil,
    preferOffline: Bool = true
  ) {
    self.annotations = annotations
    self._region = region
    self.selectedPoiId = selectedPoiId
    self.onAnnotationTap = onAnnotationTap
    self.preferOffline = preferOffline
  }

  func makeUIView(context: Context) -> MKMapView {
    let mapView = MKMapView()
    mapView.delegate = context.coordinator
    mapView.showsUserLocation = true
    mapView.setRegion(region, animated: false)

    // Add offline tile overlay if available
    if preferOffline {
      addOfflineTileOverlay(to: mapView)
    }

    return mapView
  }

  func updateUIView(_ mapView: MKMapView, context: Context) {
    // Update region if changed significantly
    let currentCenter = mapView.region.center
    let newCenter = region.center
    let distance = CLLocation(latitude: currentCenter.latitude, longitude: currentCenter.longitude)
      .distance(from: CLLocation(latitude: newCenter.latitude, longitude: newCenter.longitude))

    if distance > 1000 { // More than 1km difference
      mapView.setRegion(region, animated: true)
    }

    // Update annotations
    updateAnnotations(on: mapView, context: context)

    // Update offline overlay based on current region
    if preferOffline {
      updateOfflineTileOverlay(on: mapView)
    }
  }

  func makeCoordinator() -> Coordinator {
    Coordinator(self)
  }

  // MARK: - Private Methods

  private func addOfflineTileOverlay(to mapView: MKMapView) {
    // Check if there's an offline region for the current location
    let manager = OfflineMapManager.shared
    let center = CLLocationCoordinate2D(
      latitude: region.center.latitude,
      longitude: region.center.longitude
    )

    if let offlineRegion = manager.getOfflineRegion(for: center) {
      let overlay = OfflineTileOverlay(regionId: offlineRegion.id, fallbackToOnline: true)
      mapView.addOverlay(overlay, level: .aboveLabels)
    }
  }

  private func updateOfflineTileOverlay(on mapView: MKMapView) {
    // Remove existing tile overlays
    let existingOverlays = mapView.overlays.compactMap { $0 as? OfflineTileOverlay }
    mapView.removeOverlays(existingOverlays)

    // Add new overlay if needed
    addOfflineTileOverlay(to: mapView)
  }

  private func updateAnnotations(on mapView: MKMapView, context: Context) {
    // Remove old annotations
    let existingAnnotations = mapView.annotations.compactMap { $0 as? MapPoiAnnotation }
    mapView.removeAnnotations(existingAnnotations)

    // Add new annotations
    let newAnnotations = annotations.map { savedAnnotation -> MapPoiAnnotation in
      let annotation = MapPoiAnnotation(poi: savedAnnotation.poi)
      annotation.coordinate = savedAnnotation.coordinate
      return annotation
    }
    mapView.addAnnotations(newAnnotations)
  }

  // MARK: - Coordinator

  class Coordinator: NSObject, MKMapViewDelegate {
    var parent: OfflineAwareMapView

    init(_ parent: OfflineAwareMapView) {
      self.parent = parent
    }

    func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
      if let tileOverlay = overlay as? MKTileOverlay {
        return MKTileOverlayRenderer(tileOverlay: tileOverlay)
      }
      return MKOverlayRenderer(overlay: overlay)
    }

    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
      guard let poiAnnotation = annotation as? MapPoiAnnotation else {
        return nil
      }

      let identifier = "MapPoiAnnotation"
      var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView

      if annotationView == nil {
        annotationView = MKMarkerAnnotationView(annotation: poiAnnotation, reuseIdentifier: identifier)
        annotationView?.canShowCallout = true
      } else {
        annotationView?.annotation = poiAnnotation
      }

      // Style based on POI type
      annotationView?.markerTintColor = colorForType(poiAnnotation.poi.type)
      annotationView?.glyphImage = UIImage(systemName: iconForType(poiAnnotation.poi.type))

      // Highlight selected
      if poiAnnotation.poi.id == parent.selectedPoiId {
        annotationView?.markerTintColor = .systemRed
        annotationView?.displayPriority = .required
      }

      return annotationView
    }

    func mapView(_ mapView: MKMapView, didSelect annotation: MKAnnotation) {
      guard let poiAnnotation = annotation as? MapPoiAnnotation else { return }
      parent.onAnnotationTap?(poiAnnotation.poi.id)
    }

    func mapViewDidChangeVisibleRegion(_ mapView: MKMapView) {
      parent.region = mapView.region
    }

    private func colorForType(_ type: String?) -> UIColor {
      switch type?.lowercased() {
      case "景点", "attraction": return .systemOrange
      case "餐厅", "restaurant", "美食", "food": return .systemRed
      case "酒店", "hotel", "住宿", "accommodation": return .systemBlue
      case "交通", "transport", "transportation": return .systemGreen
      default: return .systemPurple
      }
    }

    private func iconForType(_ type: String?) -> String {
      switch type?.lowercased() {
      case "景点", "attraction": return "star.fill"
      case "餐厅", "restaurant", "美食", "food": return "fork.knife"
      case "酒店", "hotel", "住宿", "accommodation": return "bed.double.fill"
      case "交通", "transport", "transportation": return "bus.fill"
      default: return "mappin"
      }
    }
  }
}

// MARK: - POI Annotation

class MapPoiAnnotation: NSObject, MKAnnotation {
  let poi: AiPoi
  var coordinate: CLLocationCoordinate2D

  var title: String? { poi.name }
  var subtitle: String? { poi.description }

  init(poi: AiPoi) {
    self.poi = poi
    self.coordinate = CLLocationCoordinate2D(
      latitude: poi.latitude ?? 0,
      longitude: poi.longitude ?? 0
    )
    super.init()
  }
}

// MARK: - Network Status Monitor

import Network

/// Monitors network connectivity for offline mode
@MainActor
@Observable
final class NetworkMonitor {
  static let shared = NetworkMonitor()

  private(set) var isConnected: Bool = true
  private(set) var connectionType: NWInterface.InterfaceType?

  private let monitor = NWPathMonitor()
  private let queue = DispatchQueue(label: "com.kunish.pathfinding.networkmonitor")

  private init() {
    startMonitoring()
  }

  private func startMonitoring() {
    monitor.pathUpdateHandler = { [weak self] path in
      Task { @MainActor in
        self?.isConnected = path.status == .satisfied

        if path.usesInterfaceType(.wifi) {
          self?.connectionType = .wifi
        } else if path.usesInterfaceType(.cellular) {
          self?.connectionType = .cellular
        } else {
          self?.connectionType = nil
        }
      }
    }
    monitor.start(queue: queue)
  }

  deinit {
    monitor.cancel()
  }
}

// MARK: - Offline Status Banner

struct OfflineStatusBanner: View {
  @State private var networkMonitor = NetworkMonitor.shared
  @State private var manager = OfflineMapManager.shared

  var body: some View {
    if !networkMonitor.isConnected {
      HStack(spacing: DesignTokens.Spacing.sm) {
        Image(systemName: "wifi.slash")
          .foregroundStyle(.white)

        if manager.downloadedRegions.isEmpty {
          Text("离线模式 - 无可用离线地图")
        } else {
          Text("离线模式 - 使用本地地图")
        }

        Spacer()
      }
      .font(.caption)
      .padding(.horizontal)
      .padding(.vertical, 8)
      .background(manager.downloadedRegions.isEmpty ? Color.red : Color.orange)
      .foregroundStyle(.white)
    }
  }
}
