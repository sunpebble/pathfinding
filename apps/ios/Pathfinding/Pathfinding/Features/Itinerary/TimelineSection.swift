import MapKit
import SwiftUI

// MARK: - Timeline Section

struct TimelineSection: View {
  @Binding var localDays: [AiDay]
  @Binding var selectedDayIndex: Int?
  @Binding var selectedPoiId: String?
  @Binding var cameraPosition: MapCameraPosition

  @Namespace private var glassNS
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Label("行程安排", systemImage: "map")
        .font(.headline)
        .padding(.horizontal)

      GlassEffectContainer(spacing: DesignTokens.Spacing.sm) {
        ForEach(Array(localDays.enumerated()), id: \.element.id) { index, day in
          let isSelected = selectedDayIndex == index
          ItineraryDayCard(
            day: day,
            index: index,
            onSelect: {
              withAnimation(reduceMotion ? nil : DesignTokens.Animation.spring) {
                selectedDayIndex = index
              }
            },
            selectedPoiId: $selectedPoiId,
            cameraPosition: $cameraPosition
          )
          .cardSurface(tint: isSelected ? .accentColor.opacity(0.3) : nil)
          .glassEffectID("day-\(index)", in: glassNS)
        }
      }
      .padding(.horizontal)
    }
  }
}
