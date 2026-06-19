import SwiftUI

// MARK: - Quick Info Card

struct QuickInfoCard: View {
  let icon: String
  let title: String
  let value: String
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
      // Icon with colored background
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)
        .frame(width: 32, height: 32)
        .background(color.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

      Text(title)
        .font(.caption)
        .foregroundStyle(.secondary)

      Text(value)
        .font(.subheadline)
        .fontWeight(.semibold)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    }
    .padding(DesignTokens.Spacing.sm)
    .frame(maxWidth: .infinity, alignment: .leading)
    .cardSurface()
  }
}
