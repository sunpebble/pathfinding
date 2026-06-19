import SwiftUI

// MARK: - Enhanced Stat Item

struct EnhancedStatItem: View {
  let value: String
  let label: String
  let icon: String
  let color: Color
  var index: Int = 0

  @Environment(\.colorScheme) private var colorScheme
  @State private var isGlowing = false

  var body: some View {
    VStack(spacing: 8) {
      ZStack {
        // Subtle gradient background
        Circle()
          .fill(
            LinearGradient(
              colors: [color.opacity(0.15), color.opacity(0.08)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 48, height: 48)

        // Glow effect in dark mode
        if colorScheme == .dark {
          Circle()
            .fill(color.opacity(isGlowing ? 0.3 : 0.15))
            .frame(width: 48, height: 48)
            .blur(radius: 4)
        }

        Image(systemName: icon)
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(color)
      }
      .shadow(
        color: colorScheme == .dark ? color.opacity(0.3) : .clear,
        radius: 6,
        y: 0
      )

      Text(value)
        .font(.title3)
        .fontWeight(.bold)
        .monospacedDigit()

      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.sm)
    .staggeredAnimation(index: index, baseDelay: 0.04)
    .onAppear {
      if colorScheme == .dark {
        withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
          isGlowing = true
        }
      }
    }
  }
}

// MARK: - Explorer Stat Divider

struct ExplorerStatDivider: View {
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    Rectangle()
      .fill(
        LinearGradient(
          colors: [
            .clear,
            colorScheme == .dark ? Color.white.opacity(0.15) : Color.black.opacity(0.1),
            .clear
          ],
          startPoint: .top,
          endPoint: .bottom
        )
      )
      .frame(width: 1, height: 50)
  }
}
