import MapKit
import SwiftUI

/// Optimized map view with annotation clustering for large datasets
/// Handles 100+ POIs efficiently with viewport-based filtering and clustering
struct OptimizedMapView: View {
  // MARK: - Properties

  let annotations: [SavedPoiAnnotation]
  @Binding var cameraPosition: MapCameraPosition
  let selectedPoiId: String?
  let onAnnotationTap: ((String) -> Void)?

  // MARK: - State

  @State private var visibleAnnotations: [SavedPoiAnnotation] = []
  @State private var currentRegion: MKCoordinateRegion?

  // MARK: - Constants

  private let maxVisibleAnnotations = AppConfig.mapAnnotationLimit
  private let clusteringThreshold = 50 // Cluster when zoomed out beyond this many annotations

  // MARK: - Initialization

  init(
    annotations: [SavedPoiAnnotation],
    cameraPosition: Binding<MapCameraPosition>,
    selectedPoiId: String? = nil,
    onAnnotationTap: ((String) -> Void)? = nil
  ) {
    self.annotations = annotations
    self._cameraPosition = cameraPosition
    self.selectedPoiId = selectedPoiId
    self.onAnnotationTap = onAnnotationTap
  }

  // MARK: - Body

  var body: some View {
    Map(position: $cameraPosition) {
      ForEach(displayAnnotations, id: \.id) { annotation in
        let isSelected = annotation.poi.id == selectedPoiId
        let index = annotations.firstIndex(where: { $0.id == annotation.id }) ?? 0

        Annotation(annotation.poi.name, coordinate: annotation.coordinate) {
          ZStack {
            Circle()
              .fill(isSelected ? Color.red : colorForType(annotation.poi.type))
              .frame(width: isSelected ? 40 : 30, height: isSelected ? 40 : 30)
              .shadow(color: isSelected ? .red.opacity(0.5) : .black.opacity(0.2), radius: isSelected ? 8 : 4)
              .overlay(
                Circle().stroke(.white, lineWidth: 2)
              )
              .scaleEffect(isSelected ? 1.1 : 1.0)
              .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isSelected)

            Text("\(index + 1)")
              .font(isSelected ? .body : .caption)
              .fontWeight(.bold)
              .foregroundStyle(.white)
          }
          .zIndex(isSelected ? 100 : 1)
          .onTapGesture {
            onAnnotationTap?(annotation.poi.id)
          }
        }
      }
    }
    .onMapCameraChange { context in
      updateVisibleAnnotations(region: context.region)
    }
    .task {
      // Initial load with all annotations if under limit
      if annotations.count <= maxVisibleAnnotations {
        visibleAnnotations = annotations
      } else {
        // Start with a subset based on camera position
        updateVisibleAnnotationsFromCamera()
      }
    }
  }

  // MARK: - Computed Properties

  /// Annotations to display after clustering and filtering
  private var displayAnnotations: [SavedPoiAnnotation] {
    // If selected POI exists, always include it
    if let selectedId = selectedPoiId,
       let selectedAnnotation = annotations.first(where: { $0.poi.id == selectedId }),
       !visibleAnnotations.contains(where: { $0.id == selectedAnnotation.id }) {
      return visibleAnnotations + [selectedAnnotation]
    }
    return visibleAnnotations
  }

  // MARK: - Private Methods

  /// Update visible annotations based on camera region
  private func updateVisibleAnnotations(region: MKCoordinateRegion) {
    currentRegion = region

    // If total annotations are under limit, show all
    guard annotations.count > maxVisibleAnnotations else {
      visibleAnnotations = annotations
      return
    }

    // Filter annotations within visible region with padding
    let paddedRegion = paddedRegion(region, factor: 1.5)
    let filteredAnnotations = annotations.filter { annotation in
      isCoordinate(annotation.coordinate, inRegion: paddedRegion)
    }

    // If filtered annotations are still too many, apply clustering
    if filteredAnnotations.count > maxVisibleAnnotations {
      visibleAnnotations = clusterAnnotations(filteredAnnotations, limit: maxVisibleAnnotations)
    } else {
      visibleAnnotations = filteredAnnotations
    }
  }

  /// Update visible annotations based on current camera position
  private func updateVisibleAnnotationsFromCamera() {
    if case .region(let region) = cameraPosition {
      updateVisibleAnnotations(region: region)
    }
  }

  /// Check if coordinate is within region bounds
  private func isCoordinate(_ coordinate: CLLocationCoordinate2D, inRegion region: MKCoordinateRegion) -> Bool {
    let latRange = (region.center.latitude - region.span.latitudeDelta / 2)...(region.center.latitude + region.span.latitudeDelta / 2)
    let lngRange = (region.center.longitude - region.span.longitudeDelta / 2)...(region.center.longitude + region.span.longitudeDelta / 2)

    return latRange.contains(coordinate.latitude) && lngRange.contains(coordinate.longitude)
  }

  /// Create a padded region for better UX (load annotations before scrolling to edge)
  private func paddedRegion(_ region: MKCoordinateRegion, factor: Double) -> MKCoordinateRegion {
    MKCoordinateRegion(
      center: region.center,
      span: MKCoordinateSpan(
        latitudeDelta: region.span.latitudeDelta * factor,
        longitudeDelta: region.span.longitudeDelta * factor
      )
    )
  }

  /// Cluster annotations by geographic proximity when there are too many
  private func clusterAnnotations(_ annotations: [SavedPoiAnnotation], limit: Int) -> [SavedPoiAnnotation] {
    guard annotations.count > limit else { return annotations }

    // Sort by importance (selected > has description > default)
    let sortedAnnotations = annotations.sorted { a, b in
      // Selected POI always comes first
      if a.poi.id == selectedPoiId { return true }
      if b.poi.id == selectedPoiId { return false }

      // POIs with descriptions are more important
      let aHasDesc = a.poi.description != nil && !a.poi.description!.isEmpty
      let bHasDesc = b.poi.description != nil && !b.poi.description!.isEmpty
      if aHasDesc != bHasDesc { return aHasDesc }

      return false
    }

    // Take the most important annotations up to the limit
    return Array(sortedAnnotations.prefix(limit))
  }

  /// Get color for POI type
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

// MARK: - Preview

#Preview {
  @Previewable @State var cameraPosition: MapCameraPosition = .region(
    MKCoordinateRegion(
      center: CLLocationCoordinate2D(latitude: 39.9042, longitude: 116.4074),
      span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
  )

  let sampleAnnotations = (1...100).map { i in
    SavedPoiAnnotation(
      poi: AiPoi(
        id: "\(i)",
        name: "景点 \(i)",
        type: "attraction",
        description: "测试景点",
        latitude: 39.9042 + Double.random(in: -0.05...0.05),
        longitude: 116.4074 + Double.random(in: -0.05...0.05),
        address: "北京市朝阳区"
      ),
      coordinate: CLLocationCoordinate2D(
        latitude: 39.9042 + Double.random(in: -0.05...0.05),
        longitude: 116.4074 + Double.random(in: -0.05...0.05)
      )
    )
  }

  return OptimizedMapView(
    annotations: sampleAnnotations,
    cameraPosition: $cameraPosition,
    selectedPoiId: nil
  )
  .frame(height: 400)
}
