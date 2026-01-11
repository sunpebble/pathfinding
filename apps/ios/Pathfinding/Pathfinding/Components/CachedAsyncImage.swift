import SwiftUI

/// A cached version of AsyncImage with memory and disk caching
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
  let url: URL?
  let scale: CGFloat
  let transaction: Transaction
  @ViewBuilder let content: (Image) -> Content
  @ViewBuilder let placeholder: () -> Placeholder

  @State private var phase: AsyncImagePhase = .empty

  init(
    url: URL?,
    scale: CGFloat = 1,
    transaction: Transaction = Transaction(),
    @ViewBuilder content: @escaping (Image) -> Content,
    @ViewBuilder placeholder: @escaping () -> Placeholder
  ) {
    self.url = url
    self.scale = scale
    self.transaction = transaction
    self.content = content
    self.placeholder = placeholder
  }

  var body: some View {
    Group {
      switch phase {
      case .empty:
        placeholder()
          .task(id: url) {
            await loadImage()
          }

      case .success(let image):
        content(image)

      case .failure:
        placeholder()
          .overlay {
            Image(systemName: "photo")
              .foregroundStyle(.tertiary)
          }

      @unknown default:
        placeholder()
      }
    }
    .animation(transaction.animation, value: phase.isSuccess)
  }

  private func loadImage() async {
    guard let url else {
      phase = .failure(ImageError.invalidURL)
      return
    }

    // Check memory cache first
    if let cachedImage = ImageCache.shared.image(for: url) {
      phase = .success(cachedImage)
      return
    }

    do {
      let (data, _) = try await URLSession.shared.data(from: url)
      guard let uiImage = UIImage(data: data) else {
        phase = .failure(ImageError.decodingFailed)
        return
      }

      let image = Image(uiImage: uiImage)
      ImageCache.shared.setImage(image, uiImage: uiImage, for: url)

      withTransaction(transaction) {
        phase = .success(image)
      }
    } catch {
      phase = .failure(error)
    }
  }
}

// MARK: - Convenience Initializer

extension CachedAsyncImage where Placeholder == ProgressView<EmptyView, EmptyView> {
  init(
    url: URL?,
    scale: CGFloat = 1,
    transaction: Transaction = Transaction(),
    @ViewBuilder content: @escaping (Image) -> Content
  ) {
    self.init(url: url, scale: scale, transaction: transaction, content: content) {
      ProgressView()
    }
  }
}

extension CachedAsyncImage where Content == Image, Placeholder == ProgressView<EmptyView, EmptyView>
{
  init(url: URL?, scale: CGFloat = 1) {
    self.init(url: url, scale: scale, transaction: Transaction()) { image in
      image
    } placeholder: {
      ProgressView()
    }
  }
}

// MARK: - Image Cache

final class ImageCache: @unchecked Sendable {
  static let shared = ImageCache()

  private let cache = NSCache<NSURL, CacheEntry>()
  private let fileManager = FileManager.default
  private let cacheDirectory: URL

  private final class CacheEntry {
    let image: Image
    let uiImage: UIImage

    init(image: Image, uiImage: UIImage) {
      self.image = image
      self.uiImage = uiImage
    }
  }

  private init() {
    cache.countLimit = AppConfig.imageCacheCountLimit
    cache.totalCostLimit = AppConfig.imageCacheSizeLimit

    // Setup disk cache directory
    let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
    cacheDirectory = paths[0].appendingPathComponent("ImageCache", isDirectory: true)

    try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
  }

  func image(for url: URL) -> Image? {
    // Check memory cache
    if let entry = cache.object(forKey: url as NSURL) {
      return entry.image
    }

    // Check disk cache
    let fileURL = diskCacheURL(for: url)
    if let data = try? Data(contentsOf: fileURL),
      let uiImage = UIImage(data: data)
    {
      let image = Image(uiImage: uiImage)
      let entry = CacheEntry(image: image, uiImage: uiImage)
      cache.setObject(entry, forKey: url as NSURL)
      return image
    }

    return nil
  }

  func setImage(_ image: Image, uiImage: UIImage, for url: URL) {
    // Save to memory cache
    let entry = CacheEntry(image: image, uiImage: uiImage)
    cache.setObject(entry, forKey: url as NSURL)

    // Save to disk cache asynchronously
    Task.detached(priority: .background) { [weak self] in
      guard let self else { return }
      let fileURL = self.diskCacheURL(for: url)
      if let data = uiImage.jpegData(compressionQuality: 0.8) {
        try? data.write(to: fileURL)
      }
    }
  }

  private func diskCacheURL(for url: URL) -> URL {
    let filename = url.absoluteString.data(using: .utf8)!.base64EncodedString()
      .replacingOccurrences(of: "/", with: "_")
      .prefix(100)
    return cacheDirectory.appendingPathComponent(String(filename))
  }

  func clearCache() {
    cache.removeAllObjects()
    try? fileManager.removeItem(at: cacheDirectory)
    try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
  }
}

// MARK: - Image Error

enum ImageError: LocalizedError {
  case invalidURL
  case decodingFailed

  var errorDescription: String? {
    switch self {
    case .invalidURL:
      return "Invalid image URL"
    case .decodingFailed:
      return "Failed to decode image"
    }
  }
}

// MARK: - AsyncImagePhase Extension

extension AsyncImagePhase {
  var isSuccess: Bool {
    if case .success = self { return true }
    return false
  }
}
