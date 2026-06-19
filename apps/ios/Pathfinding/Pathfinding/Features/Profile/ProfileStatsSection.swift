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
        Circle()
          .fill(color.opacity(0.15))
          .frame(width: 48, height: 48)

        Image(systemName: icon)
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(color)
      }

      Text(isLoading ? "—" : value)
        .font(.title3)
        .fontWeight(.bold)
        .monospacedDigit()
        .redacted(reason: isLoading ? .placeholder : [])

      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}

// MARK: - Explorer Stat Divider

struct ExplorerStatDivider: View {
  var body: some View {
    Rectangle()
      .fill(Color.primary.opacity(0.1))
      .frame(width: 1, height: 50)
  }
}
