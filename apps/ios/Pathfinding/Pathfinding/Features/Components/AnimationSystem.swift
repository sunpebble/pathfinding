import SwiftUI

// MARK: - Enhanced Animation System
// 增强的动画系统 - 为探索者美学提供丰富的微交互

// MARK: - Staggered Animation Modifier

/// 交错动画修饰符 - 列表项依次出现的优雅效果
struct StaggeredAnimationModifier: ViewModifier {
  let index: Int
  let baseDelay: Double
  let animation: Animation

  @State private var isVisible = false

  init(index: Int, baseDelay: Double = 0.05, animation: Animation = .spring(response: 0.5, dampingFraction: 0.8)) {
    self.index = index
    self.baseDelay = baseDelay
    self.animation = animation
  }

  func body(content: Content) -> some View {
    content
      .opacity(isVisible ? 1 : 0)
      .offset(y: isVisible ? 0 : 20)
      .scaleEffect(isVisible ? 1 : 0.95)
      .onAppear {
        withAnimation(animation.delay(Double(index) * baseDelay)) {
          isVisible = true
        }
      }
  }
}

// MARK: - Pulse Animation

/// 脉冲动画 - 吸引注意力的呼吸效果
struct PulseAnimation: ViewModifier {
  let duration: Double
  let minScale: CGFloat
  let maxScale: CGFloat

  @State private var isPulsing = false

  init(duration: Double = 1.5, minScale: CGFloat = 0.97, maxScale: CGFloat = 1.03) {
    self.duration = duration
    self.minScale = minScale
    self.maxScale = maxScale
  }

  func body(content: Content) -> some View {
    content
      .scaleEffect(isPulsing ? maxScale : minScale)
      .onAppear {
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
          isPulsing = true
        }
      }
  }
}

// MARK: - Shimmer Animation

/// 光泽动画 - 高光扫过的精致效果
struct ShimmerAnimation: ViewModifier {
  let duration: Double
  let delay: Double

  @State private var phase: CGFloat = 0

  init(duration: Double = 1.5, delay: Double = 0) {
    self.duration = duration
    self.delay = delay
  }

  func body(content: Content) -> some View {
    content
      .overlay(
        GeometryReader { geometry in
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
        .mask(content)
      )
      .onAppear {
        withAnimation(.linear(duration: duration).delay(delay).repeatForever(autoreverses: false)) {
          phase = 1
        }
      }
  }
}

// MARK: - Bounce In Animation

/// 弹入动画 - 元素从远处弹入的活力效果
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

// MARK: - Rotate In Animation

/// 旋转入场动画 - 元素旋转出现的戏剧效果
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

/// 悬浮动画 - 元素轻微上下浮动的悬浮效果
struct FloatAnimation: ViewModifier {
  let distance: CGFloat
  let duration: Double

  @State private var isFloating = false

  init(distance: CGFloat = 6, duration: Double = 2) {
    self.distance = distance
    self.duration = duration
  }

  func body(content: Content) -> some View {
    content
      .offset(y: isFloating ? -distance : distance)
      .onAppear {
        withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
          isFloating = true
        }
      }
  }
}

// MARK: - Glow Animation

/// 发光动画 - 元素发光的高亮效果
struct GlowAnimation: ViewModifier {
  @Environment(\.colorScheme) private var colorScheme
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
        // 只在暗色模式下启用发光动画
        if colorScheme == .dark {
          withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
            isGlowing = true
          }
        }
      }
  }
}

// MARK: - Shake Animation

/// 抖动动画 - 错误或警告的反馈效果
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
  /// 应用交错动画
  func staggeredAnimation(index: Int, baseDelay: Double = 0.05) -> some View {
    modifier(StaggeredAnimationModifier(index: index, baseDelay: baseDelay))
  }

  /// 应用脉冲动画
  func pulseAnimation(duration: Double = 1.5) -> some View {
    modifier(PulseAnimation(duration: duration))
  }

  /// 应用光泽动画
  func shimmerAnimation(duration: Double = 1.5, delay: Double = 0) -> some View {
    modifier(ShimmerAnimation(duration: duration, delay: delay))
  }

  /// 应用弹入动画
  func bounceIn(from direction: Edge = .bottom, distance: CGFloat = 50, delay: Double = 0) -> some View {
    modifier(BounceInAnimation(from: direction, distance: distance, delay: delay))
  }

  /// 应用旋转入场动画
  func rotateIn(angle: Double = 15, delay: Double = 0) -> some View {
    modifier(RotateInAnimation(angle: angle, delay: delay))
  }

  /// 应用悬浮动画
  func floatAnimation(distance: CGFloat = 6, duration: Double = 2) -> some View {
    modifier(FloatAnimation(distance: distance, duration: duration))
  }

  /// 应用发光动画
  func glowAnimation(color: Color = .blue, radius: CGFloat = 12, duration: Double = 1.5) -> some View {
    modifier(GlowAnimation(color: color, radius: radius, duration: duration))
  }

  /// 应用抖动动画
  func shakeAnimation(trigger: Binding<Bool>, intensity: CGFloat = 10) -> some View {
    modifier(ShakeAnimation(trigger: trigger, intensity: intensity))
  }

  /// 应用视差滚动效果
  func parallaxScroll(speed: CGFloat = 0.3, axis: Axis = .vertical) -> some View {
    modifier(ParallaxScrollModifier(speed: speed, axis: axis))
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
