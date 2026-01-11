import SwiftUI

struct BlogListView: View {
  @State private var store = GuideStore.shared
  @State private var searchText = ""
  @State private var sortOption: SortOption = .latest

  enum SortOption: String, CaseIterable {
    case latest = "最新"
    case popular = "热门"
    case quality = "精选"
  }

  var filteredGuides: [BlogPost] {
    var guides = store.searchGuides(query: searchText)

    switch sortOption {
    case .latest:
      // Keep original order (already sorted by date from API)
      break
    case .popular:
      guides.sort { ($0.viewCount ?? 0) > ($1.viewCount ?? 0) }
    case .quality:
      guides.sort { ($0.qualityScore ?? 0) > ($1.qualityScore ?? 0) }
    }

    return guides
  }

  var body: some View {
    NavigationStack {
      Group {
        if store.isLoading && store.guides.isEmpty {
          loadingView
        } else if store.guides.isEmpty {
          emptyView
        } else {
          guideList
        }
      }
      .navigationTitle("旅行攻略")
      .searchable(text: $searchText, prompt: "搜索攻略标题")
      .navigationDestination(for: BlogPost.self) { guide in
        BlogDetailView(guide: guide)
      }
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Menu {
            ForEach(SortOption.allCases, id: \.self) { option in
              Button {
                withAnimation { sortOption = option }
              } label: {
                HStack {
                  Text(option.rawValue)
                  if sortOption == option {
                    Image(systemName: "checkmark")
                  }
                }
              }
            }
          } label: {
            Image(systemName: "arrow.up.arrow.down.circle")
              .symbolVariant(sortOption != .latest ? .fill : .none)
          }
        }
      }
      .task {
        await store.fetchGuides()
      }
      .refreshable {
        await store.fetchGuides(forceRefresh: true)
      }
    }
  }

  // MARK: - Guide List

  private var guideList: some View {
    List {
      ForEach(filteredGuides) { guide in
        NavigationLink(value: guide) {
          GuideListRow(guide: guide)
        }
        .listRowSeparator(.hidden)
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets(
          top: DesignTokens.Spacing.xxs,
          leading: DesignTokens.Spacing.md,
          bottom: DesignTokens.Spacing.xxs,
          trailing: DesignTokens.Spacing.md
        ))
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(Color(.systemGroupedBackground))
  }

  // MARK: - Loading View

  private var loadingView: some View {
    List {
      ForEach(0..<8, id: \.self) { _ in
        GuideListRowSkeleton()
          .listRowSeparator(.hidden)
          .listRowBackground(Color.clear)
          .listRowInsets(EdgeInsets(
            top: DesignTokens.Spacing.xxs,
            leading: DesignTokens.Spacing.md,
            bottom: DesignTokens.Spacing.xxs,
            trailing: DesignTokens.Spacing.md
          ))
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(Color(.systemGroupedBackground))
  }

  // MARK: - Empty View

  private var emptyView: some View {
    ContentUnavailableView(
      "暂无攻略",
      systemImage: "book",
      description: Text("下拉刷新加载")
    )
  }
}

// MARK: - Guide List Row

struct GuideListRow: View {
  let guide: BlogPost

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Thumbnail
      ZStack(alignment: .topTrailing) {
        CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Rectangle()
            .fill(Color(.systemGray5))
        }
        .frame(width: 90, height: 68)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

        // AI indicator
        if guide.aiProcessedAt != nil {
          Circle()
            .fill(Color.aiPurple.gradient)
            .frame(width: 18, height: 18)
            .overlay {
              Image(systemName: "sparkles")
                .font(.system(size: 9))
                .foregroundStyle(.white)
            }
            .offset(x: 4, y: -4)
        }
      }

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
        Text(guide.title)
          .font(.subheadline)
          .fontWeight(.medium)
          .lineLimit(2)
          .foregroundStyle(.primary)

        Spacer()

        HStack(spacing: DesignTokens.Spacing.xs) {
          if let author = guide.author {
            Text(author)
              .lineLimit(1)
          }

          Spacer()

          // Stats
          HStack(spacing: DesignTokens.Spacing.sm) {
            if let views = guide.viewCount, views > 0 {
              StatLabel(icon: "eye", value: formatNumber(views))
            }
            if let likes = guide.likeCount, likes > 0 {
              StatLabel(icon: "heart.fill", value: formatNumber(likes), color: .red.opacity(0.7))
            }
          }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }

  private func formatNumber(_ num: Int) -> String {
    if num >= 10000 {
      return String(format: "%.1fw", Double(num) / 10000)
    } else if num >= 1000 {
      return String(format: "%.1fk", Double(num) / 1000)
    }
    return "\(num)"
  }
}

// MARK: - Guide List Row Skeleton

struct GuideListRowSkeleton: View {
  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      ShimmerView()
        .frame(width: 90, height: 68)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        ShimmerView()
          .frame(height: 16)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        ShimmerView()
          .frame(height: 14)
          .frame(width: 150)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        Spacer()

        HStack {
          ShimmerView()
            .frame(width: 60, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))

          Spacer()

          ShimmerView()
            .frame(width: 80, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }
}

#Preview {
  BlogListView()
}
