import MapKit
import SwiftUI

// MARK: - Blog Detail POI Annotation

struct BlogDetailPoiAnnotation: Identifiable {
  let id = UUID()
  let poi: AiPoi
  let dayNumber: Int
  let index: Int
  let coordinate: CLLocationCoordinate2D
}
