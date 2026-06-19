import SwiftUI

// MARK: - Day Card

struct DayCard: View {
  let day: AiDay

  var body: some View {
    HStack {
      // Day number circle
      ZStack {
        Circle()
          .fill(DesignTokens.Colors.accent.gradient)
          .frame(width: 44, height: 44)

        Text("\(day.dayNumber)")
          .font(.headline)
          .foregroundStyle(.white)
      }

      VStack(alignment: .leading, spacing: 2) {
        Text("第 \(day.dayNumber) 天")
          .font(.subheadline)
          .fontWeight(.semibold)

        if let theme = day.theme {
          Text(theme)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }

        Text("\(day.pois.count) 个景点")
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }

      Spacer()

      Image(systemName: "chevron.right")
        .font(.caption)
        .foregroundStyle(.tertiary)
    }
    .padding(DesignTokens.Spacing.sm)
    .cardSurface()
  }
}
