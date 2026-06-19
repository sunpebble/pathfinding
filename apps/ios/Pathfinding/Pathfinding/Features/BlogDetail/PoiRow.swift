import SwiftUI

// MARK: - POI Row

struct PoiRow: View {
  let poi: AiPoi
  let index: Int

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Index badge
      ZStack {
        Circle()
          .fill(colorForType(poi.type).gradient)
          .frame(width: 32, height: 32)

        Text("\(index)")
          .font(.caption)
          .fontWeight(.bold)
          .foregroundStyle(.white)
      }

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
        HStack(spacing: DesignTokens.Spacing.xs) {
          Text(poi.name)
            .font(.subheadline)
            .fontWeight(.medium)

          if let type = poi.type {
            Text(type)
              .font(.caption2)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(colorForType(type).opacity(0.15))
              .clipShape(Capsule())
          }
        }

        if let desc = poi.description {
          Text(desc)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        if let address = poi.address {
          Label(address, systemImage: "mappin")
            .font(.caption)
            .foregroundStyle(.tertiary)
            .lineLimit(1)
        }
      }

      Spacer()

      if poi.latitude != nil && poi.latitude != 0 {
        Image(systemName: "location.fill")
          .foregroundStyle(.green)
          .font(.caption)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xxs)
  }

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
