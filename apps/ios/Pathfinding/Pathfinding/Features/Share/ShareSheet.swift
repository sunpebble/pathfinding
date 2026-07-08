import SwiftUI

// MARK: - Share Sheet

/// A sheet presenting sharing options for various platforms
struct ShareSheet: View {
  let title: String
  let subtitle: String?
  let content: ShareableContent
  let onDismiss: () -> Void

  @State private var selectedStyle: ShareCardStyle = .modern
  @State private var selectedSize: ShareCardSize = .square
  @State private var generatedImage: UIImage?
  @State private var isGeneratingImage = false
  @State private var isSharing = false
  @State private var showCopiedToast = false
  @State private var shareError: String?
  @State private var coverImage: UIImage?

  @Environment(\.colorScheme) private var colorScheme

  private let shareManager = ShareManager.shared
  private let imageGenerator = ShareImageGenerator.shared

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.lg) {
          // Preview Card
          shareCardPreview

          // Style Selector
          styleSelector

          // Size Selector
          sizeSelector

          // Platform Grid
          platformGrid

          // Quick Actions
          quickActions
        }
        .padding(DesignTokens.Spacing.md)
      }
      .navigationTitle("分享")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { onDismiss() }
        }
      }
      .overlay {
        if showCopiedToast {
          copiedToast
        }
      }
      .alert("分享失败", isPresented: .init(
        get: { shareError != nil },
        set: { if !$0 { shareError = nil } }
      )) {
        Button("确定", role: .cancel) {}
      } message: {
        if let error = shareError {
          Text(error)
        }
      }
      .task {
        await loadCoverImage()
        await generatePreviewImage()
      }
    }
    .presentationDetents([.large])
    .presentationDragIndicator(.visible)
  }

  // MARK: - Share Card Preview

  private var shareCardPreview: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      Text("预览")
        .font(.headline)
        .frame(maxWidth: .infinity, alignment: .leading)

      ZStack {
        if isGeneratingImage {
          RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            .fill(DesignTokens.Colors.fillSecondary)
            .aspectRatio(selectedSize.aspectRatio, contentMode: .fit)
            .overlay {
              ProgressView()
                .scaleEffect(1.2)
            }
        } else if let image = generatedImage {
          Image(uiImage: image)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        } else {
          RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            .fill(DesignTokens.Colors.fillSecondary)
            .aspectRatio(selectedSize.aspectRatio, contentMode: .fit)
            .overlay {
              VStack(spacing: 8) {
                Image(systemName: "photo")
                  .font(.largeTitle)
                  .foregroundStyle(.secondary)
                Text("生成预览中...")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
        }
      }
      .frame(maxHeight: 300)
    }
  }

  // MARK: - Style Selector

  private var styleSelector: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("样式")
        .font(.headline)

      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(ShareCardStyle.allCases) { style in
            StyleButton(
              style: style,
              isSelected: selectedStyle == style
            ) {
              selectedStyle = style
              Task { await generatePreviewImage() }
            }
          }
        }
      }
    }
  }

  // MARK: - Size Selector

  private var sizeSelector: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("尺寸")
        .font(.headline)

      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(ShareCardSize.allCases) { size in
            SizeButton(
              size: size,
              isSelected: selectedSize == size
            ) {
              selectedSize = size
              Task { await generatePreviewImage() }
            }
          }
        }
      }
    }
  }

  // MARK: - Platform Grid

  private var platformGrid: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("分享到")
        .font(.headline)

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
      ], spacing: DesignTokens.Spacing.md) {
        ForEach(orderedPlatforms, id: \.self) { platform in
          PlatformButton(
            platform: platform,
            isAvailable: shareManager.isPlatformAvailable(platform),
            isLoading: isSharing
          ) {
            Task { await shareToPlatform(platform) }
          }
        }
      }
    }
  }

  private var orderedPlatforms: [SharePlatform] {
    // Order: installed social apps first, then system options
    let socialPlatforms: [SharePlatform] = [.wechat, .weibo, .xiaohongshu, .qq, .douyin]
    let systemPlatforms: [SharePlatform] = [.copyLink, .systemShare]

    let installed = socialPlatforms.filter { shareManager.isPlatformAvailable($0) }
    let notInstalled = socialPlatforms.filter { !shareManager.isPlatformAvailable($0) }

    return installed + systemPlatforms + notInstalled
  }

  // MARK: - Quick Actions

  private var quickActions: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      Button {
        Task { await saveToPhotos() }
      } label: {
        Label("保存图片到相册", systemImage: "square.and.arrow.down")
          .font(.headline)
          .frame(maxWidth: .infinity)
          .padding(.vertical, DesignTokens.Spacing.sm)
      }
      .buttonStyle(.borderedProminent)
      .tint(.indigo)
      .disabled(generatedImage == nil)
    }
  }

  // MARK: - Copied Toast

  private var copiedToast: some View {
    VStack {
      Spacer()

      HStack(spacing: 8) {
        Image(systemName: "checkmark.circle.fill")
          .foregroundStyle(.green)
        Text("已复制到剪贴板")
      }
      .font(.subheadline)
      .fontWeight(.medium)
      .padding(.horizontal, DesignTokens.Spacing.lg)
      .padding(.vertical, DesignTokens.Spacing.md)
      .background(.ultraThinMaterial)
      .clipShape(Capsule())
      .shadow(radius: 10)
      .padding(.bottom, 50)
    }
    .transition(.move(edge: .bottom).combined(with: .opacity))
    .animation(.spring(response: 0.3), value: showCopiedToast)
  }

  // MARK: - Actions

  private func loadCoverImage() async {
    switch content {
    case .itinerary(let itinerary):
      if let urlString = itinerary.coverImageUrl,
         let url = URL(string: urlString) {
        do {
          let (data, _) = try await URLSession.shared.data(from: url)
          coverImage = UIImage(data: data)
        } catch {
          // Ignore image loading errors
        }
      }

    case .custom:
      break
    }
  }

  private func generatePreviewImage() async {
    isGeneratingImage = true
    defer { isGeneratingImage = false }

    switch content {
    case .itinerary(let itinerary):
      generatedImage = await imageGenerator.generateShareCard(
        from: itinerary,
        style: selectedStyle,
        size: selectedSize,
        coverImage: coverImage
      )

    case .custom(let title, let subtitle, let description, let stats):
      generatedImage = await imageGenerator.generateShareCard(
        title: title,
        subtitle: subtitle,
        description: description,
        stats: stats,
        style: selectedStyle,
        size: selectedSize,
        coverImage: coverImage
      )
    }
  }

  private func shareToPlatform(_ platform: SharePlatform) async {
    isSharing = true
    defer { isSharing = false }

    // Build share content
    var shareContent: ShareContent

    switch content {
    case .itinerary(let itinerary):
      shareContent = shareManager.buildShareContent(from: itinerary)

    case .custom(let title, _, let description, _):
      shareContent = ShareContent(
        title: title,
        description: description,
        hashtags: ["SunpebbleTrips", "旅行"]
      )
    }

    // Add generated image if available
    if let image = generatedImage {
      shareContent = ShareContent(
        title: shareContent.title,
        description: shareContent.description,
        url: shareContent.url,
        image: image,
        hashtags: shareContent.hashtags
      )
    }

    // Share
    let result = await shareManager.share(content: shareContent, to: platform)

    if !result.success {
      if let error = result.error {
        shareError = error.localizedDescription
      }
    } else if platform == .copyLink {
      showCopiedToast = true
      Task {
        try? await Task.sleep(for: .seconds(2))
        showCopiedToast = false
      }
    }
  }

  private func saveToPhotos() async {
    guard let image = generatedImage else { return }

    let success = await imageGenerator.saveToPhotoLibrary(image)
    if success {
      showCopiedToast = true
      Task {
        try? await Task.sleep(for: .seconds(2))
        showCopiedToast = false
      }
    }
  }
}

// MARK: - Shareable Content

enum ShareableContent {
  case itinerary(APIItinerary)
  case custom(title: String, subtitle: String?, description: String?, stats: [(icon: String, value: String)]?)
}

// MARK: - Style Button

private struct StyleButton: View {
  let style: ShareCardStyle
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 6) {
        RoundedRectangle(cornerRadius: 8)
          .fill(style.backgroundColor)
          .overlay {
            LinearGradient(
              colors: style.gradientColors,
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
            .mask(
              RoundedRectangle(cornerRadius: 8)
                .frame(height: 20)
                .offset(y: 15)
            )
          }
          .frame(width: 60, height: 50)
          .overlay(
            RoundedRectangle(cornerRadius: 8)
              .stroke(isSelected ? style.accentColor : .clear, lineWidth: 2)
          )

        Text(style.displayName)
          .font(.caption2)
          .foregroundStyle(isSelected ? .primary : .secondary)
      }
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Size Button

private struct SizeButton: View {
  let size: ShareCardSize
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 6) {
        RoundedRectangle(cornerRadius: 6)
          .stroke(isSelected ? Color.accentColor : Color.secondary.opacity(0.3), lineWidth: 2)
          .aspectRatio(size.aspectRatio, contentMode: .fit)
          .frame(height: 40)
          .overlay {
            if isSelected {
              Image(systemName: "checkmark")
                .font(.caption)
                .foregroundStyle(Color.accentColor)
            }
          }

        Text(size.displayName)
          .font(.caption2)
          .foregroundStyle(isSelected ? .primary : .secondary)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .frame(width: 70)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Platform Button

private struct PlatformButton: View {
  let platform: SharePlatform
  let isAvailable: Bool
  let isLoading: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 8) {
        ZStack {
          Circle()
            .fill(platformColor.opacity(isAvailable ? 0.15 : 0.05))
            .frame(width: 50, height: 50)

          if isLoading {
            ProgressView()
          } else {
            Image(systemName: platform.iconName)
              .font(.system(size: 22))
              .foregroundStyle(isAvailable ? platformColor : .gray)
          }
        }

        Text(platform.displayName)
          .font(.caption2)
          .foregroundStyle(isAvailable ? .primary : .secondary)
          .lineLimit(1)
      }
    }
    .buttonStyle(.plain)
    .disabled(!isAvailable || isLoading)
    .opacity(isAvailable ? 1 : 0.5)
  }

  private var platformColor: Color {
    switch platform {
    case .wechat: return .green
    case .weibo: return .red
    case .xiaohongshu: return .red
    case .qq: return .blue
    case .douyin: return .pink
    case .copyLink: return .gray
    case .systemShare: return .indigo
    case .generic: return .gray
    }
  }
}

// MARK: - Preview

#Preview {
  ShareSheet(
    title: "东京5日游",
    subtitle: "精选行程",
    content: .custom(
      title: "东京5日行程",
      subtitle: "旅行达人推荐",
      description: "一份可编辑的东京深度游行程，涵盖经典景点和小众打卡地。",
      stats: [("clock", "5天"), ("yensign.circle", "8000元")]
    ),
    onDismiss: {}
  )
}
