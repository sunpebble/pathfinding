import SwiftUI

// MARK: - Enhanced Stat Item

struct EnhancedStatItem: View {
  let value: String
  let label: String
  let icon: String
  let color: Color
  var index: Int = 0
  /// When true the value text is replaced with a redacted placeholder while data loads.
  var isLoading: Bool = false

  var body: some View {
    VStack(spacing: 8) {
      ZStack {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .fill(Sunpebble.sun)
          .frame(width: 44, height: 44)

        Image(systemName: icon)
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(.white)
      }

      Text(isLoading ? "—" : value)
        .font(.title3)
        .fontWeight(.bold)
        .monospacedDigit()
        .redacted(reason: isLoading ? .placeholder : [])

      Text(label)
        .font(.caption2)
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.65)
        .allowsTightening(true)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}
