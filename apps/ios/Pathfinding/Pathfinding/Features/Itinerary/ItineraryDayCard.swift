import MapKit
import SwiftUI

// MARK: - Day Card

struct ItineraryDayCard: View {
  let day: AiDay
  let index: Int
  let onSelect: () -> Void
  @Binding var selectedPoiId: String?
  @Binding var cameraPosition: MapCameraPosition

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      // Day Header (Editable)
      Button {
        onSelect()
      } label: {
        HStack {
          Text("itinerary.day".localized(day.dayNumber))
            .font(.headline)
            .foregroundStyle(.primary)
          if let theme = day.theme {
            Text(theme)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
          Spacer()
          Image(systemName: "pencil.circle")
            .font(.title3)
            .foregroundStyle(.blue)
        }
      }
      .buttonStyle(.plain)

      // Timeline POIs
      LazyVStack(alignment: .leading, spacing: 0) {
        ForEach(Array(day.pois.enumerated()), id: \.element.id) { poiIndex, poi in
          let isSelected = poi.id == selectedPoiId
          HStack(alignment: .top, spacing: 12) {
            // Timeline Indicator
            VStack(spacing: 0) {
              Rectangle()
                .fill(poiIndex == 0 ? Color.clear : Color.gray.opacity(0.3))
                .frame(width: 2, height: 6)
              Circle()
                .fill(isSelected ? Color.red : Color.blue)
                .frame(width: isSelected ? 12 : 8, height: isSelected ? 12 : 8)
                .animation(.spring, value: isSelected)
              Rectangle()
                .fill(poiIndex == day.pois.count - 1 ? Color.clear : Color.gray.opacity(0.3))
                .frame(width: 2)
            }
            .frame(width: 16)

            // Content
            VStack(alignment: .leading, spacing: 4) {
              HStack(alignment: .firstTextBaseline) {
                if let time = poi.time {
                  Text(time).font(.caption).monospacedDigit().foregroundStyle(.blue)
                }
                Text(poi.name)
                  .font(.subheadline)
                  .fontWeight(isSelected ? .bold : .medium)
                  .foregroundStyle(isSelected ? .red : .primary)
              }
              if let desc = poi.description {
                Text(desc).font(.caption).foregroundStyle(.secondary).lineLimit(2)
              }
            }
            .padding(.bottom, 16)
          }
          .contentShape(Rectangle())
          .onTapGesture {
            withAnimation {
              selectedPoiId = poi.id
              if let lat = poi.latitude, let lng = poi.longitude, lat != 0 && lng != 0 {
                cameraPosition = .region(MKCoordinateRegion(
                  center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                  span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
                ))
              }
            }
          }
          .accessibilityElement(children: .combine)
          .accessibilityLabel("itinerary.stop_accessibility".localized(poiIndex + 1, poi.name))
          .accessibilityValue(isSelected ? "itinerary.stop_selected".localized : "")
          .accessibilityHint("itinerary.stop_hint".localized)
        }
      }
      .padding(.leading, 4)
    }
    .padding()
  }
}
