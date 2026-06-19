import MapKit
import SwiftUI

// MARK: - Timeline Section

struct TimelineSection: View {
  @Binding var localDays: [AiDay]
  @Binding var selectedDayIndex: Int?
  @Binding var selectedPoiId: String?
  @Binding var cameraPosition: MapCameraPosition

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Label("行程安排", systemImage: "map")
        .font(.headline)
        .padding(.horizontal)

      LazyVStack(spacing: 12) {
        ForEach(Array(localDays.enumerated()), id: \.element.id) { index, day in
          ItineraryDayCard(
            day: day,
            index: index,
            selectedDayIndex: $selectedDayIndex,
            selectedPoiId: $selectedPoiId,
            cameraPosition: $cameraPosition
          )
        }
      }
    }
  }
}
