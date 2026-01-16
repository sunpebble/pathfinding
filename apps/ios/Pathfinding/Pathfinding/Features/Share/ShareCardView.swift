import SwiftUI

// MARK: - Share Card View

/// A reusable view that displays a share card preview
/// Can be used standalone or embedded in other views
struct ShareCardView: View {
  let content: ShareableContent
  let style: ShareCardStyle
  let coverImage: UIImage?

  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    ZStack {
      style.backgroundColor

      VStack(spacing: 0) {
        // Header with cover image or gradient
        headerSection

        // Content section
        contentSection

        Spacer(minLength: 0)

        // Footer with branding
        footerSection
      }
    }
  }

  // MARK: - Header Section

  @ViewBuilder
  private var headerSection: some View {
    ZStack(alignment: .bottomLeading) {
      if let coverImage = coverImage {
        Image(uiImage: coverImage)
          .resizable()
          .aspectRatio(contentMode: .fill)
          .frame(height: 200)
          .clipped()

        // Gradient overlay for readability
        LinearGradient(
          colors: [.clear, .black.opacity(0.7)],
          startPoint: .top,
          endPoint: .bottom
        )
        .frame(height: 120)
      } else {
        LinearGradient(
          colors: style.gradientColors,
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
        .frame(height: 200)
      }

      // Title overlay
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        if let subtitle = contentSubtitle {
          Text(subtitle)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(.white.opacity(0.9))
        }

        Text(contentTitle)
          .font(.title3)
          .fontWeight(.bold)
          .foregroundStyle(.white)
          .lineLimit(2)
      }
      .padding(DesignTokens.Spacing.md)
    }
    .frame(height: 200)
  }

  // MARK: - Content Section

  private var contentSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Description
      if let description = contentDescription {
        Text(description)
          .font(.subheadline)
          .foregroundStyle(style.primaryTextColor)
          .lineLimit(3)
      }

      // Stats
      if let stats = contentStats, !stats.isEmpty {
        HStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(Array(stats.prefix(4).enumerated()), id: \.offset) { _, stat in
            ShareCardStatBadge(icon: stat.icon, value: stat.value, style: style)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
  }

  // MARK: - Footer Section

  private var footerSection: some View {
    HStack {
      // App branding
      HStack(spacing: DesignTokens.Spacing.xs) {
        Image(systemName: "map.fill")
          .font(.subheadline)
          .foregroundStyle(style.accentColor)

        VStack(alignment: .leading, spacing: 0) {
          Text("探路")
            .font(.subheadline)
            .fontWeight(.bold)
            .foregroundStyle(style.primaryTextColor)

          Text("Pathfinding")
            .font(.caption2)
            .foregroundStyle(style.secondaryTextColor)
        }
      }

      Spacer()

      // QR code hint
      VStack(alignment: .trailing, spacing: 2) {
        Image(systemName: "qrcode")
          .font(.caption)
          .foregroundStyle(style.secondaryTextColor)

        Text("扫码查看")
          .font(.caption2)
          .foregroundStyle(style.secondaryTextColor)
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .background(style.backgroundColor)
  }

  // MARK: - Content Helpers

  private var contentTitle: String {
    switch content {
    case .blogPost(let post):
      return post.title
    case .itinerary(let itinerary):
      return itinerary.title
    case .custom(let title, _, _, _):
      return title
    }
  }

  private var contentSubtitle: String? {
    switch content {
    case .blogPost(let post):
      return post.authorName
    case .itinerary(let itinerary):
      return itinerary.cityName
    case .custom(_, let subtitle, _, _):
      return subtitle
    }
  }

  private var contentDescription: String? {
    switch content {
    case .blogPost(let post):
      return post.aiSummary ?? post.summary
    case .itinerary(let itinerary):
      if let cityName = itinerary.cityName, let days = itinerary.daysCount {
        return "\(cityName) \(days)日游行程"
      }
      return nil
    case .custom(_, _, let description, _):
      return description
    }
  }

  private var contentStats: [(icon: String, value: String)]? {
    switch content {
    case .blogPost(let post):
      var stats: [(icon: String, value: String)] = []
      if let duration = post.aiDuration {
        stats.append(("clock", duration))
      }
      if let budget = post.aiBudget {
        stats.append(("yensign.circle", budget))
      }
      if let days = post.aiDays {
        stats.append(("map", "\(days.count)天"))
      }
      return stats.isEmpty ? nil : stats

    case .itinerary(let itinerary):
      var stats: [(icon: String, value: String)] = []
      if let days = itinerary.daysCount {
        stats.append(("calendar", "\(days)天"))
      }
      stats.append(("calendar.badge.clock", formatDateRange(itinerary.startDate, itinerary.endDate)))
      return stats

    case .custom(_, _, _, let stats):
      return stats
    }
  }

  private func formatDateRange(_ start: String, _ end: String) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"

    guard let startDate = formatter.date(from: start),
          let endDate = formatter.date(from: end) else {
      return "\(start) - \(end)"
    }

    formatter.dateFormat = "M/d"
    return "\(formatter.string(from: startDate))-\(formatter.string(from: endDate))"
  }
}

// MARK: - Share Card Stat Badge

private struct ShareCardStatBadge: View {
  let icon: String
  let value: String
  let style: ShareCardStyle

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: icon)
        .font(.caption2)
        .foregroundStyle(style.accentColor)

      Text(value)
        .font(.caption2)
        .fontWeight(.medium)
        .foregroundStyle(style.primaryTextColor)
    }
    .padding(.horizontal, DesignTokens.Spacing.xs)
    .padding(.vertical, 4)
    .background(style.accentColor.opacity(0.1))
    .clipShape(Capsule())
  }
}

// MARK: - Share Card Preview Container

/// A container that wraps ShareCardView with selection and interaction
struct ShareCardPreviewContainer: View {
  let content: ShareableContent
  @Binding var selectedStyle: ShareCardStyle
  @Binding var selectedSize: ShareCardSize
  let coverImage: UIImage?

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Preview
      ShareCardView(
        content: content,
        style: selectedStyle,
        coverImage: coverImage
      )
      .aspectRatio(selectedSize.aspectRatio, contentMode: .fit)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
      .frame(maxHeight: 300)

      // Style selector
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text("样式")
          .font(.caption)
          .foregroundStyle(.secondary)

        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(ShareCardStyle.allCases) { style in
              ShareCardStyleChip(
                style: style,
                isSelected: selectedStyle == style
              ) {
                selectedStyle = style
              }
            }
          }
        }
      }

      // Size selector
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text("尺寸")
          .font(.caption)
          .foregroundStyle(.secondary)

        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(ShareCardSize.allCases) { size in
              ShareCardSizeChip(
                size: size,
                isSelected: selectedSize == size
              ) {
                selectedSize = size
              }
            }
          }
        }
      }
    }
  }
}

// MARK: - Style Chip

private struct ShareCardStyleChip: View {
  let style: ShareCardStyle
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) {
        Circle()
          .fill(
            LinearGradient(
              colors: style.gradientColors,
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 16, height: 16)

        Text(style.displayName)
          .font(.caption)
          .fontWeight(isSelected ? .semibold : .regular)
      }
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(isSelected ? style.accentColor.opacity(0.15) : Color(.systemGray6))
      )
      .overlay(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .stroke(isSelected ? style.accentColor : .clear, lineWidth: 1.5)
      )
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Size Chip

private struct ShareCardSizeChip: View {
  let size: ShareCardSize
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) {
        RoundedRectangle(cornerRadius: 2)
          .stroke(isSelected ? Color.accentColor : Color.secondary, lineWidth: 1)
          .aspectRatio(size.aspectRatio, contentMode: .fit)
          .frame(height: 14)

        Text(size.displayName)
          .font(.caption)
          .fontWeight(isSelected ? .semibold : .regular)
      }
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(isSelected ? Color.accentColor.opacity(0.1) : Color(.systemGray6))
      )
      .overlay(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .stroke(isSelected ? Color.accentColor : .clear, lineWidth: 1.5)
      )
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Quick Share Button

/// A compact share button that can be added to any view
struct QuickShareButton: View {
  let content: ShareableContent
  @State private var showShareSheet = false

  var body: some View {
    Button {
      showShareSheet = true
    } label: {
      Image(systemName: "square.and.arrow.up")
    }
    .sheet(isPresented: $showShareSheet) {
      ShareSheet(
        title: shareTitle,
        subtitle: shareSubtitle,
        content: content,
        onDismiss: { showShareSheet = false }
      )
    }
  }

  private var shareTitle: String {
    switch content {
    case .blogPost(let post):
      return post.title
    case .itinerary(let itinerary):
      return itinerary.title
    case .custom(let title, _, _, _):
      return title
    }
  }

  private var shareSubtitle: String? {
    switch content {
    case .blogPost(let post):
      return post.authorName
    case .itinerary(let itinerary):
      return itinerary.cityName
    case .custom(_, let subtitle, _, _):
      return subtitle
    }
  }
}

// MARK: - Preview

#Preview("Share Card View") {
  ShareCardView(
    content: .custom(
      title: "东京5日深度游攻略",
      subtitle: "旅行达人推荐",
      description: "一份超详细的东京深度游攻略,涵盖经典景点和小众打卡地。",
      stats: [("clock", "5天"), ("yensign.circle", "8000元")]
    ),
    style: .modern,
    coverImage: nil
  )
  .frame(width: 300, height: 400)
}

#Preview("Share Card Preview Container") {
  struct PreviewWrapper: View {
    @State private var style: ShareCardStyle = .modern
    @State private var size: ShareCardSize = .square

    var body: some View {
      ShareCardPreviewContainer(
        content: .custom(
          title: "东京5日深度游攻略",
          subtitle: "旅行达人推荐",
          description: "一份超详细的东京深度游攻略,涵盖经典景点和小众打卡地。",
          stats: [("clock", "5天"), ("yensign.circle", "8000元")]
        ),
        selectedStyle: $style,
        selectedSize: $size,
        coverImage: nil
      )
      .padding()
    }
  }
  return PreviewWrapper()
}
