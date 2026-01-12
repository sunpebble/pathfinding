import SwiftUI

/// Shimmer loading effect for skeleton screens
struct ShimmerView: View {
  @State private var phase: CGFloat = 0

  var body: some View {
    LinearGradient(
      stops: [
        .init(color: Color(.systemGray5), location: 0),
        .init(color: Color(.systemGray4), location: 0.3),
        .init(color: Color(.systemGray5), location: 0.5),
        .init(color: Color(.systemGray4), location: 0.7),
        .init(color: Color(.systemGray5), location: 1),
      ],
      startPoint: .init(x: phase - 1, y: 0.5),
      endPoint: .init(x: phase + 1, y: 0.5)
    )
    .onAppear {
      withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
        phase = 2
      }
    }
  }
}

/// Shimmer modifier for any view
struct ShimmerModifier: ViewModifier {
  let isLoading: Bool
  @State private var phase: CGFloat = 0

  func body(content: Content) -> some View {
    content
      .overlay {
        if isLoading {
          ShimmerView()
        }
      }
      .mask { content }
  }
}

extension View {
  func shimmer(isLoading: Bool) -> some View {
    modifier(ShimmerModifier(isLoading: isLoading))
  }
}

// MARK: - Skeleton Components

/// Skeleton card for guide loading state
struct GuideCardSkeleton: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ShimmerView()
        .frame(height: 180)

      VStack(alignment: .leading, spacing: 8) {
        ShimmerView()
          .frame(height: 20)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        ShimmerView()
          .frame(height: 14)
          .frame(maxWidth: .infinity, alignment: .leading)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        HStack {
          ShimmerView()
            .frame(width: 80, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))

          Spacer()

          ShimmerView()
            .frame(width: 40, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
      }
      .padding(12)
    }
    .frame(width: 280)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: 16))
  }
}

/// Compact skeleton for list items
struct CompactGuideSkeleton: View {
  var body: some View {
    HStack(spacing: 12) {
      ShimmerView()
        .frame(width: 100, height: 80)
        .clipShape(RoundedRectangle(cornerRadius: 10))

      VStack(alignment: .leading, spacing: 8) {
        ShimmerView()
          .frame(height: 16)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        ShimmerView()
          .frame(height: 14)
          .frame(width: 120)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        Spacer()

        HStack {
          ShimmerView()
            .frame(width: 60, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))

          Spacer()

          ShimmerView()
            .frame(width: 40, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
      }
    }
    .padding(12)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: 14))
  }
}

// MARK: - Preview

#Preview("Shimmer") {
  VStack(spacing: 20) {
    ShimmerView()
      .frame(width: 200, height: 100)
      .clipShape(RoundedRectangle(cornerRadius: 12))

    GuideCardSkeleton()

    CompactGuideSkeleton()
      .padding(.horizontal)
  }
  .padding()
  .background(Color(.systemGroupedBackground))
}
