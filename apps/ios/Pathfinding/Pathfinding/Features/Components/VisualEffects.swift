import SwiftUI

// MARK: - Explorer Aesthetic Visual Effects
// 探索者美学视觉效果系统 - 为旅行 App 打造独特的地形/探索主题

// MARK: - Noise Texture Overlay

/// 添加微妙的噪点纹理，增加视觉质感和深度
struct NoiseTextureOverlay: View {
  let opacity: Double
  let blendMode: BlendMode

  init(opacity: Double = 0.03, blendMode: BlendMode = .overlay) {
    self.opacity = opacity
    self.blendMode = blendMode
  }

  var body: some View {
    Canvas { context, size in
      for _ in 0..<Int(size.width * size.height * 0.1) {
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

/// 等高线装饰背景 - 地形/探索主题的核心视觉元素
struct TopographicLinesView: View {
  @Environment(\.colorScheme) private var colorScheme
  let lineCount: Int
  let lineColor: Color?
  let animated: Bool

  @State private var phase: CGFloat = 0

  init(lineCount: Int = 8, lineColor: Color? = nil, animated: Bool = false) {
    self.lineCount = lineCount
    self.lineColor = lineColor
    self.animated = animated
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

        // 创建有机的等高线形状
        for angle in stride(from: 0, through: 360, by: 2) {
          let radians = CGFloat(angle) * .pi / 180
          // 添加有机的波动
          let noise = sin(radians * 3 + phase) * 15 + cos(radians * 5) * 10
          let radius = baseRadius + noise

          let x = centerX + cos(radians) * radius
          let y = centerY + sin(radians) * radius * 0.6 // 椭圆形

          if angle == 0 {
            path.move(to: CGPoint(x: x, y: y))
          } else {
            path.addLine(to: CGPoint(x: x, y: y))
          }
        }
        path.closeSubpath()

        context.stroke(
          path,
          with: .color(effectiveLineColor),
          lineWidth: 1
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

// MARK: - Gradient Mesh Background

/// 渐变网格背景 - 现代、高级的视觉效果
struct GradientMeshBackground: View {
  @Environment(\.colorScheme) private var colorScheme
  let colors: [Color]
  let animated: Bool

  @State private var animationPhase: CGFloat = 0

  init(colors: [Color]? = nil, animated: Bool = true) {
    self.colors = colors ?? [
      .indigo.opacity(0.3),
      .purple.opacity(0.2),
      .cyan.opacity(0.15),
      .mint.opacity(0.1)
    ]
    self.animated = animated
  }

  var body: some View {
    GeometryReader { geometry in
      ZStack {
        // 多层渐变叠加
        ForEach(0..<colors.count, id: \.self) { index in
          let offset = animated ? animationPhase + CGFloat(index) * 0.5 : CGFloat(index) * 0.5
          Circle()
            .fill(
              RadialGradient(
                colors: [colors[index], colors[index].opacity(0)],
                center: .center,
                startRadius: 0,
                endRadius: geometry.size.width * 0.8
              )
            )
            .frame(width: geometry.size.width * 1.5, height: geometry.size.width * 1.5)
            .offset(
              x: cos(offset) * geometry.size.width * 0.3,
              y: sin(offset * 1.3) * geometry.size.height * 0.2
            )
            .blur(radius: 60)
        }
      }
      .frame(width: geometry.size.width, height: geometry.size.height)
    }
    .allowsHitTesting(false)
    .onAppear {
      if animated {
        withAnimation(.easeInOut(duration: 8).repeatForever(autoreverses: true)) {
          animationPhase = .pi
        }
      }
    }
  }
}

// MARK: - Compass Rose Decoration

/// 指南针装饰元素 - 探索主题的图标化元素
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

// MARK: - Grain Overlay

/// 胶片颗粒效果 - 增加复古质感
struct GrainOverlay: View {
  @Environment(\.colorScheme) private var colorScheme
  let intensity: Double

  init(intensity: Double = 0.05) {
    self.intensity = intensity
  }

  var body: some View {
    GeometryReader { geometry in
      Image(systemName: "circle.fill")
        .resizable()
        .frame(width: 1, height: 1)
        .opacity(0)
        .background(
          Canvas { context, size in
            let gridSize: CGFloat = 2
            for x in stride(from: 0, to: size.width, by: gridSize) {
              for y in stride(from: 0, to: size.height, by: gridSize) {
                if Bool.random() {
                  let brightness = Double.random(in: 0...1)
                  let grainOpacity = intensity * brightness
                  context.fill(
                    Path(CGRect(x: x, y: y, width: gridSize, height: gridSize)),
                    with: .color(colorScheme == .dark
                      ? Color.white.opacity(grainOpacity)
                      : Color.black.opacity(grainOpacity * 0.5))
                  )
                }
              }
            }
          }
        )
        .frame(width: geometry.size.width, height: geometry.size.height)
    }
    .blendMode(.overlay)
    .allowsHitTesting(false)
  }
}

// MARK: - Animated Border Gradient

/// 动态渐变边框 - 高亮重要元素
struct AnimatedBorderGradient: ViewModifier {
  let colors: [Color]
  let lineWidth: CGFloat
  let cornerRadius: CGFloat

  @State private var rotation: Double = 0

  init(colors: [Color] = [.indigo, .purple, .pink, .indigo], lineWidth: CGFloat = 2, cornerRadius: CGFloat = DesignTokens.Radius.md) {
    self.colors = colors
    self.lineWidth = lineWidth
    self.cornerRadius = cornerRadius
  }

  func body(content: Content) -> some View {
    content
      .overlay(
        RoundedRectangle(cornerRadius: cornerRadius)
          .stroke(
            AngularGradient(
              colors: colors,
              center: .center,
              angle: .degrees(rotation)
            ),
            lineWidth: lineWidth
          )
      )
      .onAppear {
        withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
          rotation = 360
        }
      }
  }
}

// MARK: - Floating Particles

/// 漂浮粒子效果 - 增加生动感
struct FloatingParticles: View {
  let count: Int
  let color: Color

  @State private var particles: [Particle] = []

  struct Particle: Identifiable {
    let id = UUID()
    var x: CGFloat
    var y: CGFloat
    var size: CGFloat
    var opacity: Double
    var speed: Double
  }

  init(count: Int = 20, color: Color = .white) {
    self.count = count
    self.color = color
  }

  var body: some View {
    GeometryReader { geometry in
      TimelineView(.animation(minimumInterval: 1/30)) { timeline in
        Canvas { context, size in
          for particle in particles {
            let y = (particle.y + CGFloat(timeline.date.timeIntervalSinceReferenceDate * particle.speed * 20))
              .truncatingRemainder(dividingBy: size.height + 20) - 10

            context.opacity = particle.opacity
            context.fill(
              Path(ellipseIn: CGRect(
                x: particle.x,
                y: y,
                width: particle.size,
                height: particle.size
              )),
              with: .color(color)
            )
          }
        }
      }
      .onAppear {
        particles = (0..<count).map { _ in
          Particle(
            x: CGFloat.random(in: 0..<geometry.size.width),
            y: CGFloat.random(in: 0..<geometry.size.height),
            size: CGFloat.random(in: 2...6),
            opacity: Double.random(in: 0.1...0.4),
            speed: Double.random(in: 0.5...2)
          )
        }
      }
    }
    .allowsHitTesting(false)
  }
}

// MARK: - Explorer Card Style

/// 探索者风格卡片 - 融合地形美学的卡片样式
struct ExplorerCardStyle: ViewModifier {
  @Environment(\.colorScheme) private var colorScheme
  let accentColor: Color
  let showTopographicLines: Bool

  init(accentColor: Color = DesignTokens.Colors.accent, showTopographicLines: Bool = true) {
    self.accentColor = accentColor
    self.showTopographicLines = showTopographicLines
  }

  func body(content: Content) -> some View {
    content
      .background(
        ZStack {
          // 基础背景
          RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(DesignTokens.Colors.cardBackground)

          // 等高线装饰（可选）
          if showTopographicLines {
            TopographicLinesView(lineCount: 4, lineColor: accentColor.opacity(0.08))
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
          }

          // 微妙的渐变叠加
          RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(
              LinearGradient(
                colors: [
                  accentColor.opacity(colorScheme == .dark ? 0.08 : 0.04),
                  .clear
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
            )
        }
      )
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
      .overlay(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
          .stroke(
            DesignTokens.Colors.cardBorder(for: colorScheme),
            lineWidth: colorScheme == .dark ? 0.5 : 0
          )
      )
      .shadow(
        color: colorScheme == .dark
          ? accentColor.opacity(0.15)
          : .black.opacity(0.06),
        radius: colorScheme == .dark ? 12 : 8,
        y: 4
      )
  }
}

// MARK: - Explorer Page Background

/// 探索者页面背景 - 统一的 APP 级别背景样式
/// 用于为主要页面添加一致的视觉风格
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
  func noiseTexture(opacity: Double = 0.03) -> some View {
    overlay(NoiseTextureOverlay(opacity: opacity))
  }

  /// 应用探索者页面背景
  func explorerPageBackground(
    style: ExplorerPageBackground.Style = .standard,
    accentColor: Color = DesignTokens.Colors.accent
  ) -> some View {
    background(ExplorerPageBackground(style: style, accentColor: accentColor))
  }

  /// 应用等高线背景
  func topographicBackground(lineCount: Int = 8, color: Color? = nil, animated: Bool = false) -> some View {
    background(TopographicLinesView(lineCount: lineCount, lineColor: color, animated: animated))
  }

  /// 应用渐变网格背景
  func gradientMeshBackground(colors: [Color]? = nil, animated: Bool = true) -> some View {
    background(GradientMeshBackground(colors: colors, animated: animated))
  }

  /// 应用胶片颗粒效果
  func grainOverlay(intensity: Double = 0.05) -> some View {
    overlay(GrainOverlay(intensity: intensity))
  }

  /// 应用动态渐变边框
  func animatedBorder(colors: [Color] = [.indigo, .purple, .pink, .indigo], lineWidth: CGFloat = 2, cornerRadius: CGFloat = DesignTokens.Radius.md) -> some View {
    modifier(AnimatedBorderGradient(colors: colors, lineWidth: lineWidth, cornerRadius: cornerRadius))
  }

  /// 应用探索者风格卡片
  func explorerCardStyle(accentColor: Color = DesignTokens.Colors.accent, showTopographicLines: Bool = true) -> some View {
    modifier(ExplorerCardStyle(accentColor: accentColor, showTopographicLines: showTopographicLines))
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

      // Gradient Mesh
      Text("渐变网格")
        .font(.headline)
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
        .background(Color.black)
        .gradientMeshBackground()
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

      // Explorer Card
      VStack(alignment: .leading, spacing: 8) {
        Text("探索者卡片")
          .font(.headline)
        Text("融合等高线装饰的独特卡片风格")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
      .padding()
      .frame(maxWidth: .infinity, alignment: .leading)
      .explorerCardStyle(accentColor: .orange)

      // Animated Border
      Text("动态边框")
        .font(.headline)
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .animatedBorder(colors: [.indigo, .purple, .pink, .indigo])
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

      // Gradient Mesh with Particles
      ZStack {
        GradientMeshBackground(colors: [
          .purple.opacity(0.4),
          .indigo.opacity(0.3),
          .cyan.opacity(0.2)
        ])
        FloatingParticles(count: 30, color: .white)
        Text("渐变网格 + 粒子")
          .font(.headline)
          .foregroundStyle(.white)
      }
      .frame(maxWidth: .infinity)
      .frame(height: 150)
      .clipShape(RoundedRectangle(cornerRadius: 16))

      // Explorer Card
      VStack(alignment: .leading, spacing: 8) {
        Text("探索者卡片")
          .font(.headline)
        Text("暗色模式下的独特视觉效果")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
      .padding()
      .frame(maxWidth: .infinity, alignment: .leading)
      .explorerCardStyle(accentColor: .purple)
    }
    .padding()
  }
  .background(Color(.systemBackground))
  .preferredColorScheme(.dark)
}
