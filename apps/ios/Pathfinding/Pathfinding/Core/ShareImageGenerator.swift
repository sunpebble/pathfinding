import CoreGraphics
import OSLog
import SwiftUI
import UIKit

// MARK: - Share Card Style

/// Style options for share card generation
enum ShareCardStyle: String, CaseIterable, Identifiable {
  case modern = "modern"
  case minimal = "minimal"
  case colorful = "colorful"
  case dark = "dark"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .modern: return "现代"
    case .minimal: return "简约"
    case .colorful: return "多彩"
    case .dark: return "暗黑"
    }
  }

  var backgroundColor: Color {
    switch self {
    case .modern: return Color(.systemBackground)
    case .minimal: return .white
    case .colorful: return Color(red: 0.98, green: 0.95, blue: 0.92)
    case .dark: return Color(red: 0.1, green: 0.1, blue: 0.12)
    }
  }

  var primaryTextColor: Color {
    switch self {
    case .modern, .minimal, .colorful: return .primary
    case .dark: return .white
    }
  }

  var secondaryTextColor: Color {
    switch self {
    case .modern, .minimal, .colorful: return .secondary
    case .dark: return Color(white: 0.7)
    }
  }

  var accentColor: Color {
    switch self {
    case .modern: return .indigo
    case .minimal: return .gray
    case .colorful: return .orange
    case .dark: return .cyan
    }
  }

  var gradientColors: [Color] {
    switch self {
    case .modern: return [.indigo, .purple]
    case .minimal: return [.gray.opacity(0.3), .gray.opacity(0.1)]
    case .colorful: return [.orange, .pink, .purple]
    case .dark: return [.cyan.opacity(0.6), .purple.opacity(0.6)]
    }
  }
}

// MARK: - Share Card Size

/// Size options for share cards
enum ShareCardSize: String, CaseIterable, Identifiable {
  case square = "square"      // 1:1 (1080x1080)
  case portrait = "portrait"  // 4:5 (1080x1350)
  case story = "story"        // 9:16 (1080x1920)
  case wide = "wide"          // 16:9 (1920x1080)

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .square: return "正方形 1:1"
    case .portrait: return "竖版 4:5"
    case .story: return "故事 9:16"
    case .wide: return "横版 16:9"
    }
  }

  var size: CGSize {
    switch self {
    case .square: return CGSize(width: 1080, height: 1080)
    case .portrait: return CGSize(width: 1080, height: 1350)
    case .story: return CGSize(width: 1080, height: 1920)
    case .wide: return CGSize(width: 1920, height: 1080)
    }
  }

  var aspectRatio: CGFloat {
    size.width / size.height
  }
}

// MARK: - Share Image Generator

/// Generates share images/cards from content
@MainActor
final class ShareImageGenerator {
  static let shared = ShareImageGenerator()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "ShareImageGenerator")

  private init() {}

  // MARK: - Generate Share Card

  /// Generate a share card image from a BlogPost
  @MainActor
  func generateShareCard(
    from blogPost: BlogPost,
    style: ShareCardStyle = .modern,
    size: ShareCardSize = .square,
    coverImage: UIImage? = nil
  ) async -> UIImage? {
    let view = BlogPostShareCard(
      blogPost: blogPost,
      style: style,
      coverImage: coverImage
    )

    return await renderViewToImage(view, size: size.size)
  }

  /// Generate a share card image from an APIItinerary
  @MainActor
  func generateShareCard(
    from itinerary: APIItinerary,
    style: ShareCardStyle = .modern,
    size: ShareCardSize = .square,
    coverImage: UIImage? = nil
  ) async -> UIImage? {
    let view = ItineraryShareCard(
      itinerary: itinerary,
      style: style,
      coverImage: coverImage
    )

    return await renderViewToImage(view, size: size.size)
  }

  /// Generate a share card with custom content
  @MainActor
  func generateShareCard(
    title: String,
    subtitle: String? = nil,
    description: String? = nil,
    stats: [(icon: String, value: String)]? = nil,
    style: ShareCardStyle = .modern,
    size: ShareCardSize = .square,
    coverImage: UIImage? = nil
  ) async -> UIImage? {
    let view = CustomShareCard(
      title: title,
      subtitle: subtitle,
      description: description,
      stats: stats,
      style: style,
      coverImage: coverImage
    )

    return await renderViewToImage(view, size: size.size)
  }

  // MARK: - Render View to Image

  @MainActor
  private func renderViewToImage<V: View>(_ view: V, size: CGSize) async -> UIImage? {
    let renderer = ImageRenderer(content: view.frame(width: size.width, height: size.height))

    renderer.scale = 2.0  // 2x for retina quality

    guard let image = renderer.uiImage else {
      logger.error("Failed to render view to image")
      return nil
    }

    return image
  }

  // MARK: - Image Utilities

  /// Resize an image to fit within max dimensions while maintaining aspect ratio
  func resizeImage(_ image: UIImage, maxSize: CGSize) -> UIImage? {
    let aspectWidth = maxSize.width / image.size.width
    let aspectHeight = maxSize.height / image.size.height
    let aspectRatio = min(aspectWidth, aspectHeight)

    let newSize = CGSize(
      width: image.size.width * aspectRatio,
      height: image.size.height * aspectRatio
    )

    let renderer = UIGraphicsImageRenderer(size: newSize)
    return renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }
  }

  /// Create a blurred overlay image
  func createBlurredOverlay(_ image: UIImage, blurRadius: CGFloat = 20) -> UIImage? {
    guard let ciImage = CIImage(image: image) else { return nil }

    let filter = CIFilter(name: "CIGaussianBlur")
    filter?.setValue(ciImage, forKey: kCIInputImageKey)
    filter?.setValue(blurRadius, forKey: kCIInputRadiusKey)

    guard let outputImage = filter?.outputImage else { return nil }

    let context = CIContext()
    guard let cgImage = context.createCGImage(outputImage, from: ciImage.extent) else { return nil }

    return UIImage(cgImage: cgImage)
  }

  /// Add a gradient overlay to an image
  func addGradientOverlay(
    _ image: UIImage,
    colors: [UIColor] = [.clear, .black.withAlphaComponent(0.7)],
    locations: [NSNumber] = [0.5, 1.0]
  ) -> UIImage? {
    let size = image.size

    let renderer = UIGraphicsImageRenderer(size: size)
    return renderer.image { context in
      // Draw original image
      image.draw(at: .zero)

      // Draw gradient
      let gradientLayer = CAGradientLayer()
      gradientLayer.frame = CGRect(origin: .zero, size: size)
      gradientLayer.colors = colors.map { $0.cgColor }
      gradientLayer.locations = locations
      gradientLayer.startPoint = CGPoint(x: 0.5, y: 0)
      gradientLayer.endPoint = CGPoint(x: 0.5, y: 1)

      gradientLayer.render(in: context.cgContext)
    }
  }

  /// Save image to photo library
  func saveToPhotoLibrary(_ image: UIImage) async -> Bool {
    return await withCheckedContinuation { continuation in
      UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
      continuation.resume(returning: true)
    }
  }

  /// Get image data for sharing
  func getImageData(_ image: UIImage, format: ImageFormat = .jpeg, quality: CGFloat = 0.9) -> Data? {
    switch format {
    case .jpeg:
      return image.jpegData(compressionQuality: quality)
    case .png:
      return image.pngData()
    }
  }

  enum ImageFormat {
    case jpeg
    case png
  }
}

// MARK: - Blog Post Share Card View

private struct BlogPostShareCard: View {
  let blogPost: BlogPost
  let style: ShareCardStyle
  let coverImage: UIImage?

  var body: some View {
    ZStack {
      // Background
      style.backgroundColor

      VStack(spacing: 0) {
        // Cover Image Section
        if let coverImage = coverImage {
          ZStack(alignment: .bottomLeading) {
            Image(uiImage: coverImage)
              .resizable()
              .aspectRatio(contentMode: .fill)
              .frame(height: 400)
              .clipped()

            // Gradient overlay
            LinearGradient(
              colors: [.clear, .black.opacity(0.7)],
              startPoint: .top,
              endPoint: .bottom
            )
            .frame(height: 200)

            // Title on image
            VStack(alignment: .leading, spacing: 8) {
              Text(blogPost.title)
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(2)

              if let author = blogPost.authorName {
                HStack(spacing: 4) {
                  Image(systemName: "person.circle.fill")
                    .font(.system(size: 14))
                  Text(author)
                    .font(.system(size: 14))
                }
                .foregroundColor(.white.opacity(0.9))
              }
            }
            .padding(24)
          }
          .frame(height: 400)
        } else {
          // No cover image - show gradient header
          ZStack(alignment: .bottomLeading) {
            LinearGradient(
              colors: style.gradientColors,
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
            .frame(height: 300)

            VStack(alignment: .leading, spacing: 8) {
              Text(blogPost.title)
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(3)

              if let author = blogPost.authorName {
                HStack(spacing: 4) {
                  Image(systemName: "person.circle.fill")
                    .font(.system(size: 14))
                  Text(author)
                    .font(.system(size: 14))
                }
                .foregroundColor(.white.opacity(0.9))
              }
            }
            .padding(24)
          }
          .frame(height: 300)
        }

        // Content Section
        VStack(alignment: .leading, spacing: 16) {
          // AI Summary
          if let summary = blogPost.aiSummary {
            Text(summary)
              .font(.system(size: 18))
              .foregroundColor(style.primaryTextColor)
              .lineLimit(4)
          }

          // Quick Info
          HStack(spacing: 16) {
            if let duration = blogPost.aiDuration {
              ShareCardInfoBadge(icon: "clock", text: duration, style: style)
            }
            if let budget = blogPost.aiBudget {
              ShareCardInfoBadge(icon: "yensign.circle", text: budget, style: style)
            }
            if let days = blogPost.aiDays {
              ShareCardInfoBadge(icon: "map", text: "\(days.count)天", style: style)
            }
          }

          // Stats
          HStack(spacing: 20) {
            if let views = blogPost.viewsCount {
              HStack(spacing: 4) {
                Image(systemName: "eye")
                Text("\(views)")
              }
              .font(.system(size: 14))
              .foregroundColor(style.secondaryTextColor)
            }

            if let likes = blogPost.likesCount {
              HStack(spacing: 4) {
                Image(systemName: "heart.fill")
                  .foregroundColor(.red)
                Text("\(likes)")
              }
              .font(.system(size: 14))
              .foregroundColor(style.secondaryTextColor)
            }
          }
        }
        .padding(24)

        Spacer()

        // Footer with branding
        ShareCardFooter(style: style)
      }
    }
  }
}

// MARK: - Itinerary Share Card View

private struct ItineraryShareCard: View {
  let itinerary: APIItinerary
  let style: ShareCardStyle
  let coverImage: UIImage?

  var body: some View {
    ZStack {
      style.backgroundColor

      VStack(spacing: 0) {
        // Header with gradient
        ZStack(alignment: .bottomLeading) {
          if let coverImage = coverImage {
            Image(uiImage: coverImage)
              .resizable()
              .aspectRatio(contentMode: .fill)
              .frame(height: 350)
              .clipped()

            LinearGradient(
              colors: [.clear, .black.opacity(0.7)],
              startPoint: .top,
              endPoint: .bottom
            )
            .frame(height: 200)
          } else {
            LinearGradient(
              colors: style.gradientColors,
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
            .frame(height: 350)
          }

          VStack(alignment: .leading, spacing: 8) {
            if let cityName = itinerary.cityName {
              HStack(spacing: 6) {
                Image(systemName: "mappin.circle.fill")
                  .font(.system(size: 16))
                Text(cityName)
                  .font(.system(size: 16, weight: .medium))
              }
              .foregroundColor(.white.opacity(0.9))
            }

            Text(itinerary.title)
              .font(.system(size: 32, weight: .bold))
              .foregroundColor(.white)
              .lineLimit(2)
          }
          .padding(24)
        }
        .frame(height: 350)

        // Itinerary Info
        VStack(alignment: .leading, spacing: 20) {
          // Duration and dates
          HStack(spacing: 24) {
            if let daysCount = itinerary.daysCount {
              VStack(alignment: .leading, spacing: 4) {
                Text("行程天数")
                  .font(.system(size: 12))
                  .foregroundColor(style.secondaryTextColor)
                Text("\(daysCount) 天")
                  .font(.system(size: 24, weight: .bold))
                  .foregroundColor(style.accentColor)
              }
            }

            VStack(alignment: .leading, spacing: 4) {
              Text("出发日期")
                .font(.system(size: 12))
                .foregroundColor(style.secondaryTextColor)
              Text(formatDate(itinerary.startDate))
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(style.primaryTextColor)
            }
          }

          // Days preview
          if let days = itinerary.days, !days.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
              Text("行程概览")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(style.secondaryTextColor)

              ForEach(days.prefix(3), id: \.id) { day in
                HStack(spacing: 12) {
                  Text("Day \(day.dayNumber)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(style.accentColor)
                    .clipShape(Capsule())

                  Text("\(day.items?.count ?? 0) 个景点")
                    .font(.system(size: 14))
                    .foregroundColor(style.primaryTextColor)

                  Spacer()
                }
              }

              if days.count > 3 {
                Text("还有 \(days.count - 3) 天...")
                  .font(.system(size: 12))
                  .foregroundColor(style.secondaryTextColor)
              }
            }
          }
        }
        .padding(24)

        Spacer()

        ShareCardFooter(style: style)
      }
    }
  }

  private func formatDate(_ dateString: String) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"

    guard let date = formatter.date(from: dateString) else {
      return dateString
    }

    formatter.dateFormat = "M月d日"
    return formatter.string(from: date)
  }
}

// MARK: - Custom Share Card View

private struct CustomShareCard: View {
  let title: String
  let subtitle: String?
  let description: String?
  let stats: [(icon: String, value: String)]?
  let style: ShareCardStyle
  let coverImage: UIImage?

  var body: some View {
    ZStack {
      style.backgroundColor

      VStack(spacing: 0) {
        // Header
        ZStack(alignment: .bottomLeading) {
          if let coverImage = coverImage {
            Image(uiImage: coverImage)
              .resizable()
              .aspectRatio(contentMode: .fill)
              .frame(height: 350)
              .clipped()

            LinearGradient(
              colors: [.clear, .black.opacity(0.7)],
              startPoint: .top,
              endPoint: .bottom
            )
            .frame(height: 200)
          } else {
            LinearGradient(
              colors: style.gradientColors,
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
            .frame(height: 350)
          }

          VStack(alignment: .leading, spacing: 8) {
            if let subtitle = subtitle {
              Text(subtitle)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
            }

            Text(title)
              .font(.system(size: 32, weight: .bold))
              .foregroundColor(.white)
              .lineLimit(3)
          }
          .padding(24)
        }
        .frame(height: 350)

        // Content
        VStack(alignment: .leading, spacing: 16) {
          if let description = description {
            Text(description)
              .font(.system(size: 18))
              .foregroundColor(style.primaryTextColor)
              .lineLimit(4)
          }

          if let stats = stats, !stats.isEmpty {
            HStack(spacing: 16) {
              ForEach(Array(stats.enumerated()), id: \.offset) { _, stat in
                ShareCardInfoBadge(icon: stat.icon, text: stat.value, style: style)
              }
            }
          }
        }
        .padding(24)

        Spacer()

        ShareCardFooter(style: style)
      }
    }
  }
}

// MARK: - Share Card Components

private struct ShareCardInfoBadge: View {
  let icon: String
  let text: String
  let style: ShareCardStyle

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: icon)
        .font(.system(size: 14))
        .foregroundColor(style.accentColor)

      Text(text)
        .font(.system(size: 14, weight: .medium))
        .foregroundColor(style.primaryTextColor)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(style.accentColor.opacity(0.15))
    .clipShape(Capsule())
  }
}

private struct ShareCardFooter: View {
  let style: ShareCardStyle

  var body: some View {
    HStack {
      // App logo/name
      HStack(spacing: 8) {
        Image(systemName: "map.fill")
          .font(.system(size: 20))
          .foregroundColor(style.accentColor)

        VStack(alignment: .leading, spacing: 0) {
          Text("探路")
            .font(.system(size: 18, weight: .bold))
            .foregroundColor(style.primaryTextColor)

          Text("Pathfinding")
            .font(.system(size: 10))
            .foregroundColor(style.secondaryTextColor)
        }
      }

      Spacer()

      // QR code placeholder or scan hint
      VStack(alignment: .trailing, spacing: 2) {
        Image(systemName: "qrcode")
          .font(.system(size: 24))
          .foregroundColor(style.secondaryTextColor)

        Text("扫码查看")
          .font(.system(size: 10))
          .foregroundColor(style.secondaryTextColor)
      }
    }
    .padding(20)
    .background(style.backgroundColor)
  }
}

// MARK: - Preview Provider

#Preview("Share Card - Modern") {
  BlogPostShareCard(
    blogPost: BlogPost(
      id: "1",
      title: "东京5日深度游攻略 | 小众景点+美食推荐",
      authorName: "旅行达人小明",
      content: nil,
      contentHtml: nil,
      contentMarkdown: nil,
      summary: nil,
      coverImageUrl: nil,
      imageUrls: nil,
      sourcePlatform: "xiaohongshu",
      qualityScore: 0.9,
      viewsCount: 12500,
      likesCount: 856,
      savesCount: 234,
      createdAt: nil,
      destinations: ["东京"],
      aiSummary: "一份超详细的东京深度游攻略,涵盖浅草寺、新宿、涩谷等经典景点,以及隐藏的小众打卡地。",
      aiTips: nil,
      aiBestTime: "3-5月",
      aiDuration: "5天",
      aiBudget: "8000-12000元",
      aiDays: [],
      aiProcessedAt: 1704067200
    ),
    style: .modern,
    coverImage: nil
  )
  .frame(width: 540, height: 540)
}
