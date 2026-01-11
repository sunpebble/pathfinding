import SwiftUI

struct HomeView: View {
  @State private var guides: [BlogPost] = []
  @State private var isLoading = false
  @State private var errorMessage: String?

  var featuredGuides: [BlogPost] {
    Array(guides.prefix(3))
  }

  var recentGuides: [BlogPost] {
    Array(guides.dropFirst(3))
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          // MARK: - Header
          headerSection

          if isLoading {
            loadingView
          } else if let error = errorMessage {
            errorView(error)
          } else if guides.isEmpty {
            emptyView
          } else {
            // MARK: - Featured Section
            if !featuredGuides.isEmpty {
              featuredSection
            }

            // MARK: - Recent Guides
            if !recentGuides.isEmpty {
              recentSection
            }
          }
        }
        .padding(.vertical)
      }
      .background(Color(.systemGroupedBackground))
      .navigationBarTitleDisplayMode(.inline)
      .navigationDestination(for: BlogPost.self) { guide in
        BlogDetailView(guide: guide)
      }
      .task {
        await loadGuides()
      }
      .refreshable {
        await loadGuides()
      }
    }
  }

  // MARK: - Header Section
  private var headerSection: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("发现旅途")
        .font(.system(size: 34, weight: .bold))
      Text("探索精选旅行攻略，开启你的下一段旅程")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 20)
  }

  // MARK: - Featured Section
  private var featuredSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      SectionHeader(title: "精选推荐", icon: "star.fill")
        .padding(.horizontal, 20)

      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 16) {
          ForEach(featuredGuides) { guide in
            NavigationLink(value: guide) {
              FeaturedCard(guide: guide)
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.horizontal, 20)
      }
      .scrollClipDisabled()
    }
  }

  // MARK: - Recent Section
  private var recentSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      SectionHeader(title: "最新攻略", icon: "clock.fill")
        .padding(.horizontal, 20)

      LazyVStack(spacing: 12) {
        ForEach(recentGuides) { guide in
          NavigationLink(value: guide) {
            CompactGuideCard(guide: guide)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 20)
    }
  }

  // MARK: - Loading View
  private var loadingView: some View {
    VStack(spacing: 16) {
      ProgressView()
        .scaleEffect(1.2)
      Text("加载中...")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, minHeight: 300)
    .padding(.horizontal, 20)
  }

  // MARK: - Error View
  private func errorView(_ error: String) -> some View {
    ContentUnavailableView {
      Label("加载失败", systemImage: "wifi.exclamationmark")
    } description: {
      Text(error)
    } actions: {
      Button("重试") {
        Task { await loadGuides() }
      }
      .buttonStyle(.bordered)
    }
    .frame(minHeight: 300)
    .padding(.horizontal, 20)
  }

  // MARK: - Empty View
  private var emptyView: some View {
    ContentUnavailableView {
      Label("暂无攻略", systemImage: "book.closed")
    } description: {
      Text("下拉刷新加载最新内容")
    }
    .frame(minHeight: 300)
    .padding(.horizontal, 20)
  }

  private func loadGuides() async {
    isLoading = true
    errorMessage = nil

    do {
      guides = try await APIClient.shared.fetchGuides(limit: 20)
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }
}

// MARK: - Section Header
struct SectionHeader: View {
  let title: String
  let icon: String

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: icon)
        .foregroundStyle(Color.accentColor)
        .font(.subheadline)
      Text(title)
        .font(.title3)
        .fontWeight(.semibold)
    }
  }
}

// MARK: - Featured Card (Large Horizontal Card)
struct FeaturedCard: View {
  let guide: BlogPost

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      // Cover Image
      ZStack(alignment: .bottomLeading) {
        AsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
          image.resizable().aspectRatio(contentMode: .fill)
        } placeholder: {
          Rectangle()
            .fill(
              LinearGradient(
                colors: [.purple.opacity(0.3), .blue.opacity(0.3)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
            )
            .overlay {
              Image(systemName: "photo")
                .font(.largeTitle)
                .foregroundStyle(.white.opacity(0.5))
            }
        }
        .frame(width: 280, height: 180)
        .clipped()

        // Gradient Overlay
        LinearGradient(
          colors: [.clear, .black.opacity(0.6)],
          startPoint: .top,
          endPoint: .bottom
        )

        // AI Badge
        if guide.aiProcessedAt != nil {
          HStack(spacing: 4) {
            Image(systemName: "sparkles")
            Text("AI")
          }
          .font(.caption2)
          .fontWeight(.medium)
          .foregroundStyle(.white)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(.purple.gradient)
          .clipShape(Capsule())
          .padding(12)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
        }
      }

      // Content
      VStack(alignment: .leading, spacing: 8) {
        Text(guide.title)
          .font(.headline)
          .lineLimit(2)
          .foregroundStyle(.primary)

        if let summary = guide.aiSummary ?? guide.summary {
          Text(summary)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        HStack(spacing: 12) {
          if let author = guide.author {
            HStack(spacing: 4) {
              Image(systemName: "person.circle.fill")
                .foregroundStyle(.secondary)
              Text(author)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
          }

          Spacer()

          if let views = guide.viewCount {
            HStack(spacing: 2) {
              Image(systemName: "eye")
              Text("\(views)")
            }
            .font(.caption2)
            .foregroundStyle(.tertiary)
          }
        }
      }
      .padding(12)
    }
    .frame(width: 280)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
  }
}

// MARK: - Compact Guide Card (List Style)
struct CompactGuideCard: View {
  let guide: BlogPost
  var body: some View {
    HStack(spacing: 12) {
      // Thumbnail
      ZStack(alignment: .topTrailing) {
        AsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
          image.resizable().aspectRatio(contentMode: .fill)
        } placeholder: {
          Rectangle()
            .fill(
              LinearGradient(
                colors: [.gray.opacity(0.2), .gray.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
            )
        }
        .frame(width: 100, height: 80)
        .clipShape(RoundedRectangle(cornerRadius: 10))

        if guide.aiProcessedAt != nil {
          Image(systemName: "sparkles")
            .font(.caption2)
            .foregroundStyle(.white)
            .padding(4)
            .background(.purple.gradient)
            .clipShape(Circle())
            .offset(x: 4, y: -4)
        }
      }

      // Content
      VStack(alignment: .leading, spacing: 6) {
        Text(guide.title)
          .font(.subheadline)
          .fontWeight(.medium)
          .lineLimit(2)
          .foregroundStyle(.primary)

        Spacer()

        HStack(spacing: 8) {
          if let author = guide.author {
            Text(author)
              .lineLimit(1)
          }
          Spacer()
          if let likes = guide.likeCount {
            HStack(spacing: 2) {
              Image(systemName: "heart.fill")
                .foregroundStyle(.red.opacity(0.7))
              Text("\(likes)")
            }
          }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(12)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: 14))
    .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
  }
}

#Preview {
  HomeView()
}

