import SwiftUI

// MARK: - Explorer Divider (探索者分隔线)

@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
struct ExplorerDivider: View {
  let style: Style
  let color: Color

  @Environment(\.colorScheme) private var colorScheme

  enum Style {
    case simple, dotted, decorated, topographic
  }

  init(style: Style = .simple, color: Color? = nil) {
    self.style = style
    self.color = color ?? DesignTokens.Colors.separator
  }

  var body: some View {
    switch style {
    case .simple:
      simpleDivider
    case .dotted:
      dottedDivider
    case .decorated:
      decoratedDivider
    case .topographic:
      topographicDivider
    }
  }

  private var simpleDivider: some View {
    Rectangle()
      .fill(color.opacity(0.3))
      .frame(height: 1)
  }

  private var dottedDivider: some View {
    GeometryReader { geometry in
      HStack(spacing: 4) {
        ForEach(0..<Int(geometry.size.width / 8), id: \.self) { _ in
          Circle()
            .fill(color.opacity(0.3))
            .frame(width: 2, height: 2)
        }
      }
    }
    .frame(height: 2)
  }

  private var decoratedDivider: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Rectangle()
        .fill(
          LinearGradient(
            colors: [.clear, color.opacity(0.3)],
            startPoint: .leading,
            endPoint: .trailing
          )
        )
        .frame(height: 1)

      Image(systemName: "diamond.fill")
        .font(.system(size: 6))
        .foregroundStyle(color.opacity(0.4))

      Rectangle()
        .fill(
          LinearGradient(
            colors: [color.opacity(0.3), .clear],
            startPoint: .leading,
            endPoint: .trailing
          )
        )
        .frame(height: 1)
    }
  }

  private var topographicDivider: some View {
    Canvas { context, size in
      var path = Path()
      path.move(to: CGPoint(x: 0, y: size.height / 2))

      for x in stride(from: 0, to: size.width, by: 4) {
        let y = size.height / 2 + sin(x * 0.05) * 3
        path.addLine(to: CGPoint(x: x, y: y))
      }

      context.stroke(path, with: .color(color.opacity(0.3)), lineWidth: 1)
    }
    .frame(height: 10)
  }
}

// MARK: - Explorer Loading Indicator (探索者加载指示器)

@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
struct ExplorerLoadingIndicator: View {
  let message: String?
  let size: CGFloat

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var rotation: Double = 0

  init(message: String? = nil, size: CGFloat = 40) {
    self.message = message
    self.size = size
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      CompassRoseDecoration(size: size, color: DesignTokens.Colors.accent, opacity: 0.6)
        .rotationEffect(.degrees(rotation))
        .onAppear {
          guard !reduceMotion else { return }
          withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
            rotation = 360
          }
        }

      if let message = message {
        Text(message)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    }
  }
}

// MARK: - Preview

#Preview("Explorer Components") {
  ScrollView {
    VStack(spacing: 24) {
      VStack(spacing: 16) {
        ExplorerDivider(style: .simple)
        ExplorerDivider(style: .dotted)
        ExplorerDivider(style: .decorated)
        ExplorerDivider(style: .topographic)
      }

      ExplorerLoadingIndicator(message: "正在探索...")
    }
    .padding()
  }
  .background(Color(.systemGroupedBackground))
}
