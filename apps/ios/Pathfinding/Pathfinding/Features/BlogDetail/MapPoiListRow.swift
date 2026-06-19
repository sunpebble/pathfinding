import SwiftUI

// MARK: - Map POI List Row

struct MapPoiListRow: View {
  let poi: AiPoi
  let dayColor: Color
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        Circle()
          .fill(dayColor.opacity(0.2))
          .frame(width: 8, height: 8)

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
          Text(poi.name)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.primary)

          if let type = poi.type {
            Text(type)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        if poi.latitude != nil && poi.latitude != 0 {
          Image(systemName: "location.fill")
            .font(.caption)
            .foregroundStyle(.green)
        }
      }
      .padding(.vertical, DesignTokens.Spacing.xs)
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
          .fill(isSelected ? dayColor.opacity(0.1) : Color.clear)
      )
    }
    .buttonStyle(.plain)
  }
}
