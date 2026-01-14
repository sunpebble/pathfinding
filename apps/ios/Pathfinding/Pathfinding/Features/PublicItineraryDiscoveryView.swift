import SwiftUI

/// View for discovering and browsing public itineraries from other users
struct PublicItineraryDiscoveryView: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(AppState.self) private var appState

  @State private var itineraries: [APIItinerary] = []
  @State private var isLoading = true
  @State private var isLoadingMore = false
  @State private var error: Error?
  @State private var currentPage = 1
  @State private var hasMore = true
  @State private var totalCount = 0

  // Filter and sort options
  @State private var selectedCityId: String?
  @State private var sortOption: SortOption = .newest

  // Sheet presentation
  @State private var selectedItinerary: APIItinerary?
  @State private var showCopySheet = false

  private let pageSize = 20

  enum SortOption: String, CaseIterable {
    case newest = "created_at"
    case popular = "copy_count"
    case duration = "days_count"

    var displayName: String {
      switch self {
      case .newest: return "最新发布"
      case .popular: return "最多复制"
      case .duration: return "行程天数"
      }
    }

    var iconName: String {
      switch self {
      case .newest: return "clock"
      case .popular: return "flame"
      case .duration: return "calendar"
      }
    }
  }

  var body: some View {
    NavigationStack {
      Group {
        if isLoading && itineraries.isEmpty {
          loadingView
        } else if let error = error, itineraries.isEmpty {
          errorView(error)
        } else if itineraries.isEmpty {
          emptyView
        } else {
          itineraryListView
        }
      }
      .navigationTitle("发现行程")
      .navigationBarTitleDisplayMode(.large)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          sortMenuButton
        }
      }
      .refreshable {
        await refresh()
      }
      .sheet(isPresented: $showCopySheet) {
        if let itinerary = selectedItinerary {
          CopyPublicItinerarySheet(itinerary: itinerary) { _ in
            showCopySheet = false
          }
        }
      }
      .task {
        await loadItineraries()
      }
    }
  }

  // MARK: - Loading View

  private var loadingView: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      ProgressView()
        .scaleEffect(1.2)

      Text("加载中...")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  // MARK: - Error View

  private func errorView(_ error: Error) -> some View {
    ContentUnavailableView {
      Label("加载失败", systemImage: "exclamationmark.triangle")
    } description: {
      Text(error.localizedDescription)
    } actions: {
      Button("重试") {
        Task {
          await loadItineraries()
        }
      }
      .buttonStyle(.borderedProminent)
    }
  }

  // MARK: - Empty View

  private var emptyView: some View {
    ContentUnavailableView {
      Label("暂无公开行程", systemImage: "map")
    } description: {
      Text("目前还没有用户分享公开行程")
    } actions: {
      Button("刷新") {
        Task {
          await loadItineraries()
        }
      }
      .buttonStyle(.bordered)
    }
  }

  // MARK: - Itinerary List View

  private var itineraryListView: some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.md) {
        // Header with count
        HStack {
          Text("共 \(totalCount) 个公开行程")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Spacer()
        }
        .padding(.horizontal)
        .padding(.top, DesignTokens.Spacing.sm)

        // Itinerary cards
        ForEach(itineraries) { itinerary in
          PublicItineraryCard(itinerary: itinerary) {
            selectedItinerary = itinerary
            showCopySheet = true
          }
          .padding(.horizontal)
        }

        // Load more indicator
        if hasMore {
          loadMoreView
            .onAppear {
              Task {
                await loadMore()
              }
            }
        }
      }
      .padding(.bottom, DesignTokens.Spacing.xl)
    }
  }

  // MARK: - Load More View

  private var loadMoreView: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      if isLoadingMore {
        ProgressView()
          .scaleEffect(0.8)
        Text("加载更多...")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .frame(height: 44)
    .frame(maxWidth: .infinity)
  }

  // MARK: - Sort Menu Button

  private var sortMenuButton: some View {
    Menu {
      ForEach(SortOption.allCases, id: \.self) { option in
        Button {
          if sortOption != option {
            sortOption = option
            Task {
              await refresh()
            }
          }
        } label: {
          Label {
            Text(option.displayName)
          } icon: {
            if sortOption == option {
              Image(systemName: "checkmark")
            }
          }
        }
      }
    } label: {
      Image(systemName: "arrow.up.arrow.down")
        .font(.body)
    }
  }

  // MARK: - Data Loading

  private func loadItineraries() async {
    guard !isLoading || itineraries.isEmpty else { return }

    isLoading = true
    error = nil

    do {
      let result = try await ItineraryStore.shared.getPublicItineraries(
        cityId: selectedCityId,
        page: 1,
        pageSize: pageSize,
        sortBy: sortOption.rawValue
      )

      itineraries = result.data
      totalCount = result.total
      currentPage = 1
      hasMore = result.data.count >= pageSize

      isLoading = false
    } catch {
      self.error = error
      isLoading = false
    }
  }

  private func loadMore() async {
    guard !isLoadingMore && hasMore else { return }

    isLoadingMore = true

    do {
      let nextPage = currentPage + 1
      let result = try await ItineraryStore.shared.getPublicItineraries(
        cityId: selectedCityId,
        page: nextPage,
        pageSize: pageSize,
        sortBy: sortOption.rawValue
      )

      itineraries.append(contentsOf: result.data)
      currentPage = nextPage
      hasMore = result.data.count >= pageSize

      isLoadingMore = false
    } catch {
      isLoadingMore = false
    }
  }

  private func refresh() async {
    currentPage = 1
    hasMore = true
    await loadItineraries()
  }
}

// MARK: - Public Itinerary Card

struct PublicItineraryCard: View {
  let itinerary: APIItinerary
  let onCopyTapped: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Header with cover image
      headerView

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        // Title
        Text(itinerary.title)
          .font(.headline)
          .lineLimit(2)

        // City and duration
        HStack(spacing: DesignTokens.Spacing.md) {
          if let cityName = itinerary.cityName {
            Label(cityName, systemImage: "mappin.circle.fill")
              .font(.caption)
              .foregroundStyle(.secondary)
          }

          if let daysCount = itinerary.daysCount {
            Label("\(daysCount)天", systemImage: "calendar")
              .font(.caption)
              .foregroundStyle(.secondary)
          }

          if let days = itinerary.days {
            let poiCount = days.reduce(0) { $0 + ($1.items?.count ?? 0) }
            if poiCount > 0 {
              Label("\(poiCount)景点", systemImage: "mappin")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }

        // Author info
        authorView

        // Date range
        dateRangeView
      }
      .padding(.horizontal, DesignTokens.Spacing.sm)

      // Action buttons
      actionButtonsView
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.bottom, DesignTokens.Spacing.sm)
    }
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
    )
  }

  // MARK: - Header View

  private var headerView: some View {
    ZStack(alignment: .bottomLeading) {
      // Cover image or gradient
      if let coverUrl = itinerary.coverImageUrl, let url = URL(string: coverUrl) {
        CachedAsyncImage(url: url) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          gradientPlaceholder
        }
        .frame(height: 140)
        .clipShape(
          UnevenRoundedRectangle(
            topLeadingRadius: DesignTokens.Radius.md,
            topTrailingRadius: DesignTokens.Radius.md
          )
        )
      } else {
        gradientPlaceholder
          .frame(height: 140)
          .clipShape(
            UnevenRoundedRectangle(
              topLeadingRadius: DesignTokens.Radius.md,
              topTrailingRadius: DesignTokens.Radius.md
            )
          )
      }

      // Visibility badge
      if itinerary.visibility == "public" {
        HStack(spacing: 4) {
          Image(systemName: "globe")
          Text("公开")
        }
        .font(.caption2)
        .fontWeight(.medium)
        .foregroundStyle(.white)
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, 4)
        .background(
          Capsule()
            .fill(Color.green.opacity(0.8))
        )
        .padding(DesignTokens.Spacing.sm)
      }
    }
  }

  private var gradientPlaceholder: some View {
    LinearGradient(
      colors: [.blue.opacity(0.6), .purple.opacity(0.4)],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
    .overlay(
      Image(systemName: "map.fill")
        .font(.largeTitle)
        .foregroundStyle(.white.opacity(0.5))
    )
  }

  // MARK: - Author View

  private var authorView: some View {
    Group {
      if let author = itinerary.originalAuthor {
        HStack(spacing: DesignTokens.Spacing.xs) {
          if let avatarUrl = author.avatarUrl, let url = URL(string: avatarUrl) {
            CachedAsyncImage(url: url) { image in
              image
                .resizable()
                .aspectRatio(contentMode: .fill)
            } placeholder: {
              Circle()
                .fill(Color(.systemGray5))
            }
            .frame(width: 20, height: 20)
            .clipShape(Circle())
          } else {
            Image(systemName: "person.circle.fill")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }

          if let displayName = author.displayName {
            Text(displayName)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
  }

  // MARK: - Date Range View

  private var dateRangeView: some View {
    HStack(spacing: DesignTokens.Spacing.xs) {
      Image(systemName: "clock")
        .font(.caption2)
        .foregroundStyle(.tertiary)

      Text("\(formattedDate(itinerary.startDate)) - \(formattedDate(itinerary.endDate))")
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
  }

  // MARK: - Action Buttons View

  private var actionButtonsView: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // View details button (placeholder for future detail view)
      Button {
        // TODO: Navigate to detail view
      } label: {
        Label("查看详情", systemImage: "eye")
          .font(.caption)
          .fontWeight(.medium)
      }
      .buttonStyle(.bordered)
      .controlSize(.small)

      Spacer()

      // Copy button
      Button(action: onCopyTapped) {
        Label("复制行程", systemImage: "doc.on.doc")
          .font(.caption)
          .fontWeight(.medium)
      }
      .buttonStyle(.borderedProminent)
      .controlSize(.small)
    }
  }

  // MARK: - Helper Methods

  private func formattedDate(_ dateString: String) -> String {
    let inputFormatter = DateFormatter()
    inputFormatter.dateFormat = "yyyy-MM-dd"

    let outputFormatter = DateFormatter()
    outputFormatter.dateFormat = "M月d日"

    if let date = inputFormatter.date(from: dateString) {
      return outputFormatter.string(from: date)
    }
    return dateString
  }
}

// MARK: - Previews

#Preview("Discovery View") {
  PublicItineraryDiscoveryView()
    .environment(AppState())
}

#Preview("Itinerary Card") {
  PublicItineraryCard(
    itinerary: APIItinerary(
      id: "test-1",
      userId: "user-1",
      title: "东京7日深度游 - 探索传统与现代的完美融合",
      cityId: "tokyo",
      startDate: "2024-05-01",
      endDate: "2024-05-07",
      visibility: "public",
      coverImageUrl: nil,
      copiedFromId: nil,
      cityName: "东京",
      daysCount: 7,
      days: [
        APIItineraryDay(id: "d1", itineraryId: "test-1", dayNumber: 1, date: "2024-05-01", items: []),
        APIItineraryDay(id: "d2", itineraryId: "test-1", dayNumber: 2, date: "2024-05-02", items: [])
      ],
      collaborators: nil,
      originalAuthor: OriginalAuthorInfo(
        userId: "author-1",
        displayName: "旅行达人",
        avatarUrl: nil
      )
    )
  ) {
    print("Copy tapped")
  }
  .padding()
  .background(Color(.systemGroupedBackground))
}
