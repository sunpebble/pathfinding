import SwiftUI

// MARK: - Explorer Aesthetic Visual Effects
// 探索者美学视觉效果系统 - 为旅行 App 打造独特的地形/探索主题

// MARK: - Noise Texture Overlay

@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
struct NoiseTextureOverlay: View {
  let opacity: Double
  let blendMode: BlendMode

  init(opacity: Double = 0.03, blendMode: BlendMode = .overlay) {
    self.opacity = opacity
    self.blendMode = blendMode
  }

  var body: some View {
    Canvas { context, size in
      let density = 0.08
      for _ in 0..<Int(size.width * size.height * density) {
        let x = CGFloat.random(in: 0..<size.width)
        let y = CGFloat.random(in: 0..<size.height)
        let gray = CGFloat.random(in: 0...1)

        context.fill(
          Path(ellipseIn: CGRect(x: x, y: y, width: 1, height: 1)),
          with: .color(Color(white: gray, opacity: opacity))
        )
      }
    }
    .blendMode(blendMode)
    .allowsHitTesting(false)
  }
}

// MARK: - Topographic Lines Background

@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
struct TopographicLinesView: View {
  @Environment(\.colorScheme) private var colorScheme
  let lineCount: Int
  let lineColor: Color?
  let animated: Bool
  let organic: Bool

  @State private var phase: CGFloat = 0

  init(lineCount: Int = 8, lineColor: Color? = nil, animated: Bool = false, organic: Bool = true) {
    self.lineCount = lineCount
    self.lineColor = lineColor
    self.animated = animated
    self.organic = organic
  }

  private var effectiveLineColor: Color {
    if let color = lineColor {
      return color
    }
    return colorScheme == .dark
      ? Color.white.opacity(0.04)
      : Color.black.opacity(0.03)
  }

  var body: some View {
    Canvas { context, size in
      let centerX = size.width * 0.6
      let centerY = size.height * 0.4

      for i in 0..<lineCount {
        let baseRadius = CGFloat(i + 1) * (min(size.width, size.height) / CGFloat(lineCount)) * 0.8
        var path = Path()

        for angle in stride(from: 0, through: 360, by: 2) {
          let radians = CGFloat(angle) * .pi / 180
          var noise: CGFloat = 0
          if organic {
            noise = sin(radians * 3 + phase) * 15 + cos(radians * 5) * 10 + sin(radians * 7 + CGFloat(i)) * 5
          }
          let radius = baseRadius + noise

          let x = centerX + cos(radians) * radius
          let y = centerY + sin(radians) * radius * 0.6

          if angle == 0 {
            path.move(to: CGPoint(x: x, y: y))
          } else {
            path.addLine(to: CGPoint(x: x, y: y))
          }
        }
        path.closeSubpath()

        let lineOpacity = 1.0 - (Double(i) / Double(lineCount)) * 0.5
        context.stroke(
          path,
          with: .color(effectiveLineColor.opacity(lineOpacity)),
          lineWidth: organic ? (i % 3 == 0 ? 1.5 : 1) : 1
        )
      }
    }
    .allowsHitTesting(false)
    .onAppear {
      if animated {
        withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
          phase = .pi * 2
        }
      }
    }
  }
}

// MARK: - Compass Rose Decoration

/// 指南针装饰元素 - 探索主题的图标化元素
@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
struct CompassRoseDecoration: View {
  let size: CGFloat
  let color: Color
  let opacity: Double

  init(size: CGFloat = 120, color: Color = .primary, opacity: Double = 0.05) {
    self.size = size
    self.color = color
    self.opacity = opacity
  }

  var body: some View {
    Canvas { context, canvasSize in
      let center = CGPoint(x: canvasSize.width / 2, y: canvasSize.height / 2)
      let radius = min(canvasSize.width, canvasSize.height) / 2 * 0.9

      // 外圈
      context.stroke(
        Path(ellipseIn: CGRect(
          x: center.x - radius,
          y: center.y - radius,
          width: radius * 2,
          height: radius * 2
        )),
        with: .color(color.opacity(opacity)),
        lineWidth: 1
      )

      // 方向线
      for angle in stride(from: 0, to: 360, by: 45) {
        let radians = CGFloat(angle) * .pi / 180
        let isCardinal = angle % 90 == 0
        let innerRadius = isCardinal ? radius * 0.3 : radius * 0.5
        let outerRadius = radius * 0.95

        var path = Path()
        path.move(to: CGPoint(
          x: center.x + cos(radians) * innerRadius,
          y: center.y + sin(radians) * innerRadius
        ))
        path.addLine(to: CGPoint(
          x: center.x + cos(radians) * outerRadius,
          y: center.y + sin(radians) * outerRadius
        ))

        context.stroke(
          path,
          with: .color(color.opacity(isCardinal ? opacity * 1.5 : opacity)),
          lineWidth: isCardinal ? 2 : 1
        )
      }

      // 中心点
      context.fill(
        Path(ellipseIn: CGRect(
          x: center.x - 4,
          y: center.y - 4,
          width: 8,
          height: 8
        )),
        with: .color(color.opacity(opacity * 2))
      )
    }
    .frame(width: size, height: size)
    .allowsHitTesting(false)
  }
}

// MARK: - Explorer Page Background

/// 探索者页面背景 - 统一的 APP 级别背景样式
/// 用于为主要页面添加一致的视觉风格
@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
struct ExplorerPageBackground: View {
  @Environment(\.colorScheme) private var colorScheme

  let style: Style
  let accentColor: Color

  enum Style {
    case standard      // 标准：顶部渐变 + 等高线 + 噪点
    case minimal       // 极简：仅渐变和噪点
    case immersive     // 沉浸：全屏效果 + 指南针
    case list          // 列表：适合 List 视图的轻量背景
  }

  init(style: Style = .standard, accentColor: Color = DesignTokens.Colors.accent) {
    self.style = style
    self.accentColor = accentColor
  }

  var body: some View {
    ZStack {
      // 基础背景
      Color(.systemGroupedBackground)
        .ignoresSafeArea()

      switch style {
      case .standard:
        standardBackground
      case .minimal:
        minimalBackground
      case .immersive:
        immersiveBackground
      case .list:
        listBackground
      }

      // 噪点纹理（所有风格共用）
      NoiseTextureOverlay(opacity: colorScheme == .dark ? 0.02 : 0.015)
        .ignoresSafeArea()
    }
  }

  // MARK: - Standard Background

  private var standardBackground: some View {
    VStack {
      ZStack {
        // 顶部渐变
        LinearGradient(
          colors: [
            accentColor.opacity(colorScheme == .dark ? 0.15 : 0.08),
            .clear
          ],
          startPoint: .top,
          endPoint: .bottom
        )
        .frame(height: 300)

        // 等高线
        TopographicLinesView(
          lineCount: 5,
          lineColor: accentColor.opacity(colorScheme == .dark ? 0.08 : 0.04)
        )
        .frame(height: 300)
      }
      Spacer()
    }
    .ignoresSafeArea()
  }

  // MARK: - Minimal Background

  private var minimalBackground: some View {
    VStack {
      LinearGradient(
        colors: [
          accentColor.opacity(colorScheme == .dark ? 0.1 : 0.05),
          .clear
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: 200)
      Spacer()
    }
    .ignoresSafeArea()
  }

  // MARK: - Immersive Background

  private var immersiveBackground: some View {
    ZStack {
      // 顶部渐变
      VStack {
        ZStack {
          LinearGradient(
            colors: [
              accentColor.opacity(colorScheme == .dark ? 0.2 : 0.1),
              .clear
            ],
            startPoint: .top,
            endPoint: .bottom
          )
          .frame(height: 350)

          // 等高线
          TopographicLinesView(
            lineCount: 6,
            lineColor: accentColor.opacity(colorScheme == .dark ? 0.1 : 0.05)
          )
          .frame(height: 350)

          // 指南针装饰
          HStack {
            Spacer()
            VStack {
              CompassRoseDecoration(
                size: 180,
                color: accentColor,
                opacity: colorScheme == .dark ? 0.08 : 0.05
              )
              Spacer()
            }
          }
          .padding(.trailing, -40)
          .padding(.top, 60)
        }
        Spacer()
      }
      .ignoresSafeArea()
    }
  }

  // MARK: - List Background

  private var listBackground: some View {
    VStack {
      LinearGradient(
        colors: [
          accentColor.opacity(colorScheme == .dark ? 0.08 : 0.04),
          .clear
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: 150)
      Spacer()
    }
    .ignoresSafeArea()
  }
}

// MARK: - View Extensions

extension View {
  /// 应用噪点纹理叠加
  @available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
  func noiseTexture(opacity: Double = 0.03) -> some View {
    overlay(NoiseTextureOverlay(opacity: opacity))
  }

  /// 应用探索者页面背景
  @available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
  func explorerPageBackground(
    style: ExplorerPageBackground.Style = .standard,
    accentColor: Color = DesignTokens.Colors.accent
  ) -> some View {
    background(ExplorerPageBackground(style: style, accentColor: accentColor))
  }

  /// 应用等高线背景
  @available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
  func topographicBackground(lineCount: Int = 8, color: Color? = nil, animated: Bool = false) -> some View {
    background(TopographicLinesView(lineCount: lineCount, lineColor: color, animated: animated))
  }
}

// MARK: - Preview

#Preview("Visual Effects - Light") {
  ScrollView {
    VStack(spacing: 24) {
      // Topographic Lines
      Text("等高线背景")
        .font(.headline)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
        .topographicBackground(lineCount: 6, color: .indigo.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 16))

      // Compass Rose
      ZStack {
        CompassRoseDecoration(size: 150, opacity: 0.15)
        Text("指南针装饰")
          .font(.headline)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 40)
      .background(Color(.secondarySystemBackground))
      .clipShape(RoundedRectangle(cornerRadius: 16))
    }
    .padding()
  }
  .background(Color(.systemGroupedBackground))
  .preferredColorScheme(.light)
}

#Preview("Visual Effects - Dark") {
  ScrollView {
    VStack(spacing: 24) {
      // Topographic Lines
      Text("等高线背景")
        .font(.headline)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
        .topographicBackground(lineCount: 6, color: .cyan.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
    .padding()
  }
  .background(Color(.systemBackground))
  .preferredColorScheme(.dark)
}
