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
        HStack(spacing: 14) {
          VStack(alignment: .leading, spacing: 2) {
            Text("\(day.dayNumber)")
              .font(.system(size: 24, weight: .bold, design: .serif))
              .foregroundStyle(DesignTokens.Colors.textPrimary)
            Text("itinerary.day".localized(day.dayNumber))
              .font(.caption)
              .foregroundStyle(DesignTokens.Colors.textSecondary)
          }
          if let theme = day.theme {
            Text(theme)
              .font(.subheadline)
              .foregroundStyle(DesignTokens.Colors.textSecondary)
          }
          Spacer()
          Image(systemName: "pencil")
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(DesignTokens.Colors.textPrimary)
            .frame(width: 38, height: 38)
            .background(Sunpebble.ink.opacity(0.06))
            .clipShape(Circle())
            .overlay(Circle().stroke(DesignTokens.Colors.border, lineWidth: 1))
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
                .fill(poiIndex == 0 ? Color.clear : DesignTokens.Colors.border)
                .frame(width: 2, height: 6)
              Circle()
                .fill(isSelected ? DesignTokens.Colors.accent : DesignTokens.Colors.textSecondary)
                .frame(width: isSelected ? 12 : 8, height: isSelected ? 12 : 8)
                .animation(.spring, value: isSelected)
              Rectangle()
                .fill(poiIndex == day.pois.count - 1 ? Color.clear : DesignTokens.Colors.border)
                .frame(width: 2)
            }
            .frame(width: 16)

            // Content
            VStack(alignment: .leading, spacing: 4) {
              HStack(alignment: .firstTextBaseline) {
                if let time = poi.time {
                  Text(time).font(.caption).monospacedDigit().foregroundStyle(DesignTokens.Colors.accent)
                }
                Text(poi.name)
                  .font(.subheadline)
                  .fontWeight(isSelected ? .bold : .medium)
                  .foregroundStyle(isSelected ? DesignTokens.Colors.accent : DesignTokens.Colors.textPrimary)
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
