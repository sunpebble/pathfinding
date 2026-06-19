import MapKit
import SwiftUI

// MARK: - Map Header

struct MapHeader: View {
  let annotations: [SavedPoiAnnotation]
  let allPois: [AiPoi]
  @Binding var cameraPosition: MapCameraPosition
  @Binding var selectedPoiId: String?

  var body: some View {
    OptimizedMapView(
      annotations: annotations,
      cameraPosition: $cameraPosition,
      selectedPoiId: selectedPoiId
    ) { poiId in
      // Handle annotation tap
      withAnimation {
        selectedPoiId = poiId
        if let poi = allPois.first(where: { $0.id == poiId }),
           let lat = poi.latitude, let lng = poi.longitude, lat != 0 && lng != 0 {
          cameraPosition = .region(MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
            span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
          ))
        }
      }
    }
    .frame(height: 350)
    .clipShape(RoundedRectangle(cornerRadius: 0))
  }
}
