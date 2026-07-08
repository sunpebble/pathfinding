import SwiftUI

// MARK: - About Sheet

struct AboutSheet: View {
  var body: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.xl) {
        // Brand mark: 墨色圆角方块 + 阳光圆 + 奶油弧线（对齐设计稿 brand-mark）
        SunpebbleMark(size: 84)
          .padding(.top, DesignTokens.Spacing.lg)
          .shadow(color: .black.opacity(0.08), radius: 16, y: 8)

        VStack(spacing: 6) {
          Text("about.app_name".localized)
            .sunpebbleTitle(24)

          Text(String(format: "about.version".localized, AppConfig.appVersion))
            .font(.subheadline)
            .foregroundStyle(Sunpebble.pebble)

          Text("about.tagline".localized)
            .font(.body)
            .foregroundStyle(Sunpebble.pebble)
            .multilineTextAlignment(.center)
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .padding(.top, 6)
        }

        VStack(spacing: 0) {
          AboutRow(title: "about.developer".localized, value: "about.developer_name".localized)
          Divider().overlay(Sunpebble.hairline)
          AboutRow(title: "about.build_number".localized, value: AppConfig.buildNumber)
          Divider().overlay(Sunpebble.hairline)
          AboutRow(title: "about.swift_version".localized, value: "6.0")
          Divider().overlay(Sunpebble.hairline)
          AboutRow(title: "about.min_ios".localized, value: "iOS 26.0")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .cardSurface()
        .padding(.horizontal, DesignTokens.Spacing.lg)

        Spacer()
      }
      .padding(.top, DesignTokens.Spacing.xl)
    }
    .sunpebbleCanvas()
    .navigationTitle("about.title".localized)
    .navigationBarTitleDisplayMode(.inline)
  }
}

struct AboutRow: View {
  let title: String
  let value: String

  var body: some View {
    HStack {
      Text(title)
        .foregroundStyle(Sunpebble.pebble)
      Spacer()
      Text(value)
        .foregroundStyle(Sunpebble.ink)
    }
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}

// MARK: - Brand Mark (display-only)

/// Sunpebble brand mark：墨色圆角方块底 + 阳光圆 + 奶油笑弧，忠实还原设计稿 10-about 的 SVG。
private struct SunpebbleMark: View {
  var size: CGFloat = 84

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
        .fill(Sunpebble.ink)

      // 阳光圆：设计稿 cx50 cy39 r20（100 单位画布），上移 11 单位
      Circle()
        .fill(Sunpebble.sun)
        .frame(width: size * 0.40, height: size * 0.40)
        .offset(y: -size * 0.11)

      // 奶油笑弧：设计稿 M30 65 a22 22 0 0 0 40 0，向下鼓出
      SmileArc()
        .stroke(
          Sunpebble.canvas,
          style: StrokeStyle(lineWidth: size * 0.05, lineCap: .round)
        )
        .frame(width: size, height: size)
    }
    .frame(width: size, height: size)
  }
}

private struct SmileArc: Shape {
  func path(in rect: CGRect) -> Path {
    let w = rect.width, h = rect.height
    var path = Path()
    path.move(to: CGPoint(x: 0.30 * w, y: 0.65 * h))
    path.addQuadCurve(
      to: CGPoint(x: 0.70 * w, y: 0.65 * h),
      control: CGPoint(x: 0.50 * w, y: 0.90 * h)
    )
    return path
  }
}
