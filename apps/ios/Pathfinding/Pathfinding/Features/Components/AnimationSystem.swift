import SwiftUI

// MARK: - Enhanced Animation System
// 增强动画系统 - 探索者美学微交互

// MARK: - Staggered Animation Modifier

struct StaggeredAnimationModifier: ViewModifier {
  let index: Int
  let baseDelay: Double
  let animation: Animation

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var isVisible = false

  init(index: Int, baseDelay: Double = 0.05, animation: Animation = .spring(response: 0.5, dampingFraction: 0.8)) {
    self.index = index
    self.baseDelay = baseDelay
    self.animation = animation
  }

  func body(content: Content) -> some View {
    content
      .opacity(isVisible ? 1 : 0)
      .offset(y: isVisible ? 0 : (reduceMotion ? 0 : 20))
      .scaleEffect(isVisible ? 1 : (reduceMotion ? 1 : 0.95))
      .onAppear {
        guard !reduceMotion else {
          isVisible = true
          return
        }
        withAnimation(animation.delay(Double(index) * baseDelay)) {
          isVisible = true
        }
      }
  }
}

// MARK: - Pulse Animation

struct PulseAnimation: ViewModifier {
  let duration: Double
  let minScale: CGFloat
  let maxScale: CGFloat

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var isPulsing = false

  init(duration: Double = 1.5, minScale: CGFloat = 0.97, maxScale: CGFloat = 1.03) {
    self.duration = duration
    self.minScale = minScale
    self.maxScale = maxScale
  }

  func body(content: Content) -> some View {
    content
      .scaleEffect(reduceMotion ? 1.0 : (isPulsing ? maxScale : minScale))
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
          isPulsing = true
        }
      }
  }
}

// MARK: - Shimmer Animation

struct ShimmerAnimation: ViewModifier {
  let duration: Double
  let delay: Double

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var phase: CGFloat = 0

  init(duration: Double = 1.5, delay: Double = 0) {
    self.duration = duration
    self.delay = delay
  }

  func body(content: Content) -> some View {
    content
      .overlay(
        GeometryReader { geometry in
          if !reduceMotion {
            LinearGradient(
              colors: [
                .clear,
                .white.opacity(0.4),
                .clear
              ],
              startPoint: .leading,
              endPoint: .trailing
            )
            .frame(width: geometry.size.width * 0.5)
            .offset(x: phase * geometry.size.width * 1.5 - geometry.size.width * 0.25)
            .blur(radius: 3)
          }
        }
        .mask(content)
      )
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.linear(duration: duration).delay(delay).repeatForever(autoreverses: false)) {
          phase = 1
        }
      }
  }
}

// MARK: - Bounce In Animation

struct BounceInAnimation: ViewModifier {
  let direction: Edge
  let distance: CGFloat
  let delay: Double

  @State private var isVisible = false

  init(from direction: Edge = .bottom, distance: CGFloat = 50, delay: Double = 0) {
    self.direction = direction
    self.distance = distance
    self.delay = delay
  }

  private var offset: CGSize {
    guard !isVisible else { return .zero }
    switch direction {
    case .top: return CGSize(width: 0, height: -distance)
    case .bottom: return CGSize(width: 0, height: distance)
    case .leading: return CGSize(width: -distance, height: 0)
    case .trailing: return CGSize(width: distance, height: 0)
    }
  }

  func body(content: Content) -> some View {
    content
      .opacity(isVisible ? 1 : 0)
      .offset(offset)
      .onAppear {
        withAnimation(.spring(response: 0.6, dampingFraction: 0.7).delay(delay)) {
          isVisible = true
        }
      }
  }
}

// MARK: - Slide In Animation (滑入动画)

struct SlideInAnimation: ViewModifier {
  let edge: Edge
  let duration: Double
  let delay: Double

  @State private var isVisible = false

  init(from edge: Edge = .leading, duration: Double = 0.4, delay: Double = 0) {
    self.edge = edge
    self.duration = duration
    self.delay = delay
  }

  private var offset: CGSize {
    guard !isVisible else { return .zero }
    switch edge {
    case .top: return CGSize(width: 0, height: -100)
    case .bottom: return CGSize(width: 0, height: 100)
    case .leading: return CGSize(width: -100, height: 0)
    case .trailing: return CGSize(width: 100, height: 0)
    }
  }

  func body(content: Content) -> some View {
    content
      .opacity(isVisible ? 1 : 0)
      .offset(offset)
      .onAppear {
        withAnimation(.easeOut(duration: duration).delay(delay)) {
          isVisible = true
        }
      }
  }
}

// MARK: - Reveal Animation (展开动画 - 像展开地图)

struct RevealAnimation: ViewModifier {
  let anchor: UnitPoint
  let duration: Double
  let delay: Double

  @State private var isRevealed = false

  init(anchor: UnitPoint = .top, duration: Double = 0.5, delay: Double = 0) {
    self.anchor = anchor
    self.duration = duration
    self.delay = delay
  }

  func body(content: Content) -> some View {
    content
      .scaleEffect(x: 1, y: isRevealed ? 1 : 0, anchor: anchor)
      .opacity(isRevealed ? 1 : 0)
      .onAppear {
        withAnimation(.spring(response: duration, dampingFraction: 0.8).delay(delay)) {
          isRevealed = true
        }
      }
  }
}

// MARK: - Compass Spin Animation (指南针旋转 - 加载状态)

struct CompassSpinAnimation: ViewModifier {
  let duration: Double
  let clockwise: Bool

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var rotation: Double = 0

  init(duration: Double = 2.0, clockwise: Bool = true) {
    self.duration = duration
    self.clockwise = clockwise
  }

  func body(content: Content) -> some View {
    content
      .rotationEffect(.degrees(rotation))
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.linear(duration: duration).repeatForever(autoreverses: false)) {
          rotation = clockwise ? 360 : -360
        }
      }
  }
}

// MARK: - Path Draw Animation (路径绘制动画)

struct PathDrawAnimation: ViewModifier {
  let duration: Double
  let delay: Double

  @State private var trimEnd: CGFloat = 0

  init(duration: Double = 1.0, delay: Double = 0) {
    self.duration = duration
    self.delay = delay
  }

  func body(content: Content) -> some View {
    content
      .mask(
        GeometryReader { geometry in
          Rectangle()
            .trim(from: 0, to: trimEnd)
            .stroke(lineWidth: max(geometry.size.width, geometry.size.height) * 2)
        }
      )
      .onAppear {
        withAnimation(.easeInOut(duration: duration).delay(delay)) {
          trimEnd = 1
        }
      }
  }
}

// MARK: - Scale Reveal Animation (缩放揭示 - POI选中)

struct ScaleRevealAnimation: ViewModifier {
  let initialScale: CGFloat
  let duration: Double
  let delay: Double

  @State private var isRevealed = false

  init(initialScale: CGFloat = 0.5, duration: Double = 0.4, delay: Double = 0) {
    self.initialScale = initialScale
    self.duration = duration
    self.delay = delay
  }

  func body(content: Content) -> some View {
    content
      .scaleEffect(isRevealed ? 1 : initialScale)
      .opacity(isRevealed ? 1 : 0)
      .onAppear {
        withAnimation(.spring(response: duration, dampingFraction: 0.7).delay(delay)) {
          isRevealed = true
        }
      }
  }
}

// MARK: - Rotate In Animation

struct RotateInAnimation: ViewModifier {
  let angle: Double
  let delay: Double

  @State private var isVisible = false

  init(angle: Double = 15, delay: Double = 0) {
    self.angle = angle
    self.delay = delay
  }

  func body(content: Content) -> some View {
    content
      .opacity(isVisible ? 1 : 0)
      .rotationEffect(.degrees(isVisible ? 0 : angle))
      .scaleEffect(isVisible ? 1 : 0.8)
      .onAppear {
        withAnimation(.spring(response: 0.5, dampingFraction: 0.7).delay(delay)) {
          isVisible = true
        }
      }
  }
}

// MARK: - Float Animation

struct FloatAnimation: ViewModifier {
  let distance: CGFloat
  let duration: Double

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var isFloating = false

  init(distance: CGFloat = 6, duration: Double = 2) {
    self.distance = distance
    self.duration = duration
  }

  func body(content: Content) -> some View {
    content
      .offset(y: reduceMotion ? 0 : (isFloating ? -distance : distance))
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
          isFloating = true
        }
      }
  }
}

// MARK: - Glow Animation

struct GlowAnimation: ViewModifier {
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let color: Color
  let radius: CGFloat
  let duration: Double

  @State private var isGlowing = false

  init(color: Color = .blue, radius: CGFloat = 12, duration: Double = 1.5) {
    self.color = color
    self.radius = radius
    self.duration = duration
  }

  func body(content: Content) -> some View {
    content
      .shadow(
        color: color.opacity(isGlowing ? 0.6 : 0.2),
        radius: isGlowing ? radius : radius * 0.5,
        y: 0
      )
      .onAppear {
        guard !reduceMotion, colorScheme == .dark else { return }
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
          isGlowing = true
        }
      }
  }
}

// MARK: - Enhanced Glow Animation (增强发光 - 暗色模式优化)

struct EnhancedGlowAnimation: ViewModifier {
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let color: Color
  let innerRadius: CGFloat
  let outerRadius: CGFloat
  let duration: Double

  @State private var isGlowing = false

  init(color: Color = .blue, innerRadius: CGFloat = 8, outerRadius: CGFloat = 20, duration: Double = 2.0) {
    self.color = color
    self.innerRadius = innerRadius
    self.outerRadius = outerRadius
    self.duration = duration
  }

  func body(content: Content) -> some View {
    content
      .shadow(
        color: color.opacity(isGlowing ? 0.4 : 0.15),
        radius: isGlowing ? outerRadius : innerRadius,
        y: 0
      )
      .shadow(
        color: color.opacity(isGlowing ? 0.6 : 0.3),
        radius: isGlowing ? innerRadius : innerRadius * 0.5,
        y: 0
      )
      .onAppear {
        guard !reduceMotion, colorScheme == .dark else { return }
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
          isGlowing = true
        }
      }
  }
}

// MARK: - Shake Animation

struct ShakeAnimation: ViewModifier {
  @Binding var trigger: Bool
  let intensity: CGFloat
  let duration: Double

  @State private var shakeOffset: CGFloat = 0

  init(trigger: Binding<Bool>, intensity: CGFloat = 10, duration: Double = 0.5) {
    self._trigger = trigger
    self.intensity = intensity
    self.duration = duration
  }

  func body(content: Content) -> some View {
    content
      .offset(x: shakeOffset)
      .onChange(of: trigger) { _, newValue in
        if newValue {
          withAnimation(.spring(response: 0.1, dampingFraction: 0.2)) {
            shakeOffset = intensity
          }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.spring(response: 0.1, dampingFraction: 0.2)) {
              shakeOffset = -intensity
            }
          }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            withAnimation(.spring(response: 0.15, dampingFraction: 0.5)) {
              shakeOffset = 0
            }
          }
          DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
            trigger = false
          }
        }
      }
  }
}

// MARK: - Breathing Animation (呼吸动画 - 更柔和的脉冲)

struct BreathingAnimation: ViewModifier {
  let minOpacity: Double
  let maxOpacity: Double
  let duration: Double

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var isBreathing = false

  init(minOpacity: Double = 0.6, maxOpacity: Double = 1.0, duration: Double = 2.0) {
    self.minOpacity = minOpacity
    self.maxOpacity = maxOpacity
    self.duration = duration
  }

  func body(content: Content) -> some View {
    content
      .opacity(reduceMotion ? maxOpacity : (isBreathing ? maxOpacity : minOpacity))
      .onAppear {
        guard !reduceMotion else { return }
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
          isBreathing = true
        }
      }
  }
}

// MARK: - Ripple Animation (波纹动画 - 点击反馈)

struct RippleAnimation: ViewModifier {
  @Binding var trigger: Bool
  let color: Color

  @State private var rippleScale: CGFloat = 0.5
  @State private var rippleOpacity: Double = 0.5

  init(trigger: Binding<Bool>, color: Color = .white) {
    self._trigger = trigger
    self.color = color
  }

  func body(content: Content) -> some View {
    content
      .overlay(
        Circle()
          .fill(color.opacity(rippleOpacity))
          .scaleEffect(rippleScale)
          .allowsHitTesting(false)
      )
      .onChange(of: trigger) { _, newValue in
        if newValue {
          rippleScale = 0.5
          rippleOpacity = 0.5
          withAnimation(.easeOut(duration: 0.4)) {
            rippleScale = 2.0
            rippleOpacity = 0
          }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            trigger = false
          }
        }
      }
  }
}

// MARK: - Typewriter Animation

/// 打字机动画 - 文字逐字出现的效果
struct TypewriterText: View {
  let text: String
  let speed: Double

  @State private var displayedText = ""
  @State private var currentIndex = 0

  init(_ text: String, speed: Double = 0.05) {
    self.text = text
    self.speed = speed
  }

  var body: some View {
    Text(displayedText)
      .onAppear {
        displayedText = ""
        currentIndex = 0
        typeNextCharacter()
      }
  }

  private func typeNextCharacter() {
    guard currentIndex < text.count else { return }

    let index = text.index(text.startIndex, offsetBy: currentIndex)
    displayedText += String(text[index])
    currentIndex += 1

    DispatchQueue.main.asyncAfter(deadline: .now() + speed) {
      typeNextCharacter()
    }
  }
}

// MARK: - Count Up Animation

/// 数字递增动画 - 数字从0增长的效果
struct CountUpText: View {
  let value: Int
  let duration: Double
  let prefix: String
  let suffix: String

  @State private var displayValue: Int = 0

  init(_ value: Int, duration: Double = 1.0, prefix: String = "", suffix: String = "") {
    self.value = value
    self.duration = duration
    self.prefix = prefix
    self.suffix = suffix
  }

  var body: some View {
    Text("\(prefix)\(displayValue)\(suffix)")
      .contentTransition(.numericText())
      .onAppear {
        animateValue()
      }
  }

  private func animateValue() {
    let steps = min(value, 60)
    let stepDuration = duration / Double(steps)
    let increment = max(1, value / steps)

    for i in 0...steps {
      DispatchQueue.main.asyncAfter(deadline: .now() + stepDuration * Double(i)) {
        withAnimation(.easeOut(duration: stepDuration)) {
          displayValue = min(increment * i, value)
        }
      }
    }
  }
}

// MARK: - Parallax Scroll Effect

/// 视差滚动效果 - 元素随滚动产生视差移动
struct ParallaxScrollModifier: ViewModifier {
  let speed: CGFloat
  let axis: Axis

  init(speed: CGFloat = 0.3, axis: Axis = .vertical) {
    self.speed = speed
    self.axis = axis
  }

  func body(content: Content) -> some View {
    GeometryReader { geometry in
      let minY = geometry.frame(in: .global).minY
      let offset = minY * speed

      content
        .offset(
          x: axis == .horizontal ? offset : 0,
          y: axis == .vertical ? -offset : 0
        )
    }
  }
}

// MARK: - Hero Animation Namespace

/// Hero 动画命名空间包装
struct HeroAnimationWrapper<Content: View>: View {
  @Namespace private var namespace
  let content: (Namespace.ID) -> Content

  var body: some View {
    content(namespace)
  }
}

// MARK: - View Extensions

extension View {
  func staggeredAnimation(index: Int, baseDelay: Double = 0.05) -> some View {
    modifier(StaggeredAnimationModifier(index: index, baseDelay: baseDelay))
  }

  func pulseAnimation(duration: Double = 1.5) -> some View {
    modifier(PulseAnimation(duration: duration))
  }

  func shimmerAnimation(duration: Double = 1.5, delay: Double = 0) -> some View {
    modifier(ShimmerAnimation(duration: duration, delay: delay))
  }

  func bounceIn(from direction: Edge = .bottom, distance: CGFloat = 50, delay: Double = 0) -> some View {
    modifier(BounceInAnimation(from: direction, distance: distance, delay: delay))
  }

  func rotateIn(angle: Double = 15, delay: Double = 0) -> some View {
    modifier(RotateInAnimation(angle: angle, delay: delay))
  }

  func floatAnimation(distance: CGFloat = 6, duration: Double = 2) -> some View {
    modifier(FloatAnimation(distance: distance, duration: duration))
  }

  func glowAnimation(color: Color = .blue, radius: CGFloat = 12, duration: Double = 1.5) -> some View {
    modifier(GlowAnimation(color: color, radius: radius, duration: duration))
  }

  func shakeAnimation(trigger: Binding<Bool>, intensity: CGFloat = 10) -> some View {
    modifier(ShakeAnimation(trigger: trigger, intensity: intensity))
  }

  func parallaxScroll(speed: CGFloat = 0.3, axis: Axis = .vertical) -> some View {
    modifier(ParallaxScrollModifier(speed: speed, axis: axis))
  }

  func slideIn(from edge: Edge = .leading, duration: Double = 0.4, delay: Double = 0) -> some View {
    modifier(SlideInAnimation(from: edge, duration: duration, delay: delay))
  }

  func revealAnimation(anchor: UnitPoint = .top, duration: Double = 0.5, delay: Double = 0) -> some View {
    modifier(RevealAnimation(anchor: anchor, duration: duration, delay: delay))
  }

  func compassSpin(duration: Double = 2.0, clockwise: Bool = true) -> some View {
    modifier(CompassSpinAnimation(duration: duration, clockwise: clockwise))
  }

  func pathDraw(duration: Double = 1.0, delay: Double = 0) -> some View {
    modifier(PathDrawAnimation(duration: duration, delay: delay))
  }

  func scaleReveal(initialScale: CGFloat = 0.5, duration: Double = 0.4, delay: Double = 0) -> some View {
    modifier(ScaleRevealAnimation(initialScale: initialScale, duration: duration, delay: delay))
  }

  func enhancedGlow(color: Color = .blue, innerRadius: CGFloat = 8, outerRadius: CGFloat = 20) -> some View {
    modifier(EnhancedGlowAnimation(color: color, innerRadius: innerRadius, outerRadius: outerRadius))
  }

  func breathingAnimation(minOpacity: Double = 0.6, maxOpacity: Double = 1.0, duration: Double = 2.0) -> some View {
    modifier(BreathingAnimation(minOpacity: minOpacity, maxOpacity: maxOpacity, duration: duration))
  }

  func rippleAnimation(trigger: Binding<Bool>, color: Color = .white) -> some View {
    modifier(RippleAnimation(trigger: trigger, color: color))
  }
}

// MARK: - Preview

#Preview("Animations Demo") {
  ScrollView {
    VStack(spacing: 24) {
      // Staggered Animation
      VStack(spacing: 8) {
        Text("交错动画")
          .font(.headline)
        ForEach(0..<5) { index in
          Text("Item \(index + 1)")
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color.blue.opacity(0.2))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .staggeredAnimation(index: index)
        }
      }

      Divider()

      // Pulse Animation
      Text("脉冲动画")
        .font(.headline)
        .padding()
        .background(Color.purple.opacity(0.3))
        .clipShape(Circle())
        .pulseAnimation()

      Divider()

      // Float Animation
      Image(systemName: "airplane")
        .font(.largeTitle)
        .foregroundStyle(.orange)
        .floatAnimation()

      Divider()

      // Count Up
      VStack {
        Text("数字递增")
          .font(.headline)
        CountUpText(1234, prefix: "¥", suffix: " 元")
          .font(.system(size: 48, weight: .bold, design: .rounded))
      }

      Divider()

      // Typewriter
      VStack {
        Text("打字机效果")
          .font(.headline)
        TypewriterText("探索未知的旅程...")
          .font(.title3)
      }

      Divider()

      // Glow Animation
      Text("发光效果")
        .font(.headline)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .glowAnimation(color: .cyan)
    }
    .padding()
  }
}
