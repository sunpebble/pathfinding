import SwiftUI
import MapKit

// MARK: - Hidden Gems Discovery View

struct HiddenGemsView: View {
  @State private var store = HiddenGemsStore.shared
  @State private var searchText = ""
  @State private var showingFilters = false
  @State private var showingSubmitSheet = false
  @State private var selectedTab: DiscoveryTab = .discover

  enum DiscoveryTab: String, CaseIterable {
    case discover = "discover"
    case local = "local"
    case community = "community"
    case myPicks = "myPicks"

    var displayName: String {
      switch self {
      case .discover: return "发现"
      case .local: return "本地推荐"
      case .community: return "社区分享"
      case .myPicks: return "我的发现"
      }
    }

    var icon: String {
      switch self {
      case .discover: return "sparkles"
      case .local: return "person.crop.circle.badge.checkmark"
      case .community: return "person.3.fill"
      case .myPicks: return "heart.fill"
      }
    }
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Tab selector
        tabSelector

        // Content based on selected tab
        Group {
          switch selectedTab {
          case .discover:
            discoverContent
          case .local:
            localRecommendationsContent
          case .community:
            communityContent
          case .myPicks:
            myPicksContent
          }
        }
      }
      .navigationTitle("隐藏景点")
      .searchable(text: $searchText, prompt: "搜索小众景点")
      .onChange(of: searchText) { _, newValue in
        Task {
          if newValue.isEmpty {
            await store.fetchHiddenGems()
          } else {
            await store.searchHiddenGems(query: newValue)
          }
        }
      }
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            showingFilters = true
          } label: {
            Image(systemName: "line.3.horizontal.decrease.circle")
              .symbolVariant(hasActiveFilters ? .fill : .none)
          }
        }

        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showingSubmitSheet = true
          } label: {
            Image(systemName: "plus.circle.fill")
          }
        }
      }
      .sheet(isPresented: $showingFilters) {
        FilterSheet(store: store)
      }
      .sheet(isPresented: $showingSubmitSheet) {
        SubmitHiddenGemSheet(store: store)
      }
      .task {
        await store.fetchHiddenGems()
      }
      .refreshable {
        await store.fetchHiddenGems(forceRefresh: true)
      }
    }
  }

  private var hasActiveFilters: Bool {
    store.selectedCategory != nil ||
    store.selectedPopularityLevel != nil ||
    store.onlyLocalRecommended
  }

  // MARK: - Tab Selector

  private var tabSelector: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.xs) {
        ForEach(DiscoveryTab.allCases, id: \.self) { tab in
          Button {
            withAnimation(.easeInOut(duration: 0.2)) {
              selectedTab = tab
            }
            loadTabContent(tab)
          } label: {
            HStack(spacing: DesignTokens.Spacing.xxs) {
              Image(systemName: tab.icon)
                .font(.caption)
              Text(tab.displayName)
                .font(.subheadline)
                .fontWeight(.medium)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(
              selectedTab == tab
                ? Color.accentColor.opacity(0.15)
                : Color(.systemGray6)
            )
            .foregroundStyle(selectedTab == tab ? Color.accentColor : .secondary)
            .clipShape(Capsule())
          }
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.xs)
    }
    .background(Color(.systemBackground))
  }

  private func loadTabContent(_ tab: DiscoveryTab) {
    Task {
      switch tab {
      case .discover:
        await store.fetchHiddenGems()
      case .local:
        if let cityId = store.selectedCityId {
          await store.fetchLocalRecommendations(cityId: cityId)
        }
      case .community:
        await store.fetchUserSubmissions(status: .approved)
      case .myPicks:
        await store.fetchMySubmissions()
      }
    }
  }

  // MARK: - Discover Content

  private var discoverContent: some View {
    Group {
      if store.isLoading && store.hiddenGems.isEmpty {
        loadingView
      } else if store.filteredHiddenGems.isEmpty {
        emptyStateView(
          title: "暂无隐藏景点",
          message: "换个筛选条件试试，或发现第一个小众景点",
          icon: "sparkles"
        )
      } else {
        hiddenGemsList
      }
    }
  }

  private var hiddenGemsList: some View {
    List {
      // Popularity level quick filters
      popularityQuickFilters

      ForEach(store.filteredHiddenGems) { gem in
        NavigationLink {
          HiddenGemDetailView(gem: gem)
        } label: {
          HiddenGemRow(gem: gem)
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

  private var popularityQuickFilters: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.xs) {
        ForEach(PopularityLevel.allCases, id: \.self) { level in
          Button {
            withAnimation {
              if store.selectedPopularityLevel == level {
                store.selectedPopularityLevel = nil
              } else {
                store.selectedPopularityLevel = level
              }
            }
            Task {
              if let selected = store.selectedPopularityLevel {
                await store.fetchByPopularityLevel(selected)
              } else {
                await store.fetchHiddenGems()
              }
            }
          } label: {
            HStack(spacing: 4) {
              Image(systemName: level.icon)
                .font(.caption2)
              Text(level.displayName)
                .font(.caption)
            }
            .padding(.horizontal, DesignTokens.Spacing.xs)
            .padding(.vertical, 6)
            .background(
              store.selectedPopularityLevel == level
                ? popularityColor(level).opacity(0.2)
                : Color(.systemGray6)
            )
            .foregroundStyle(
              store.selectedPopularityLevel == level
                ? popularityColor(level)
                : .secondary
            )
            .clipShape(Capsule())
          }
        }
      }
      .padding(.vertical, DesignTokens.Spacing.xs)
    }
    .listRowSeparator(.hidden)
    .listRowBackground(Color.clear)
    .listRowInsets(EdgeInsets(horizontal: DesignTokens.Spacing.md, vertical: 0))
  }

  private func popularityColor(_ level: PopularityLevel) -> Color {
    switch level {
    case .hidden: return .green
    case .emerging: return .teal
    case .moderate: return .blue
    case .popular: return .orange
    case .crowded: return .red
    }
  }

  // MARK: - Local Recommendations Content

  private var localRecommendationsContent: some View {
    Group {
      if store.selectedCityId == nil {
        emptyStateView(
          title: "选择城市",
          message: "选择一个城市来查看当地人推荐的小众景点",
          icon: "mappin.circle"
        )
      } else if store.isLoading && store.localRecommendations.isEmpty {
        loadingView
      } else if store.localRecommendations.isEmpty {
        emptyStateView(
          title: "暂无本地推荐",
          message: "这个城市还没有本地人推荐的景点",
          icon: "person.crop.circle.badge.checkmark"
        )
      } else {
        localRecommendationsList
      }
    }
  }

  private var localRecommendationsList: some View {
    List {
      ForEach(store.localRecommendations) { gem in
        NavigationLink {
          HiddenGemDetailView(gem: gem)
        } label: {
          LocalRecommendationRow(gem: gem)
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

  // MARK: - Community Content

  private var communityContent: some View {
    Group {
      if store.isLoading && store.userSubmissions.isEmpty {
        loadingView
      } else if store.userSubmissions.isEmpty {
        emptyStateView(
          title: "暂无社区分享",
          message: "成为第一个分享小众景点的人吧",
          icon: "person.3.fill"
        )
      } else {
        communityList
      }
    }
  }

  private var communityList: some View {
    List {
      ForEach(store.userSubmissions) { submission in
        NavigationLink {
          UserSubmissionDetailView(submission: submission)
        } label: {
          UserSubmissionRow(submission: submission)
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

  // MARK: - My Picks Content

  private var myPicksContent: some View {
    Group {
      if store.isLoading && store.mySubmissions.isEmpty {
        loadingView
      } else if store.mySubmissions.isEmpty {
        emptyStateView(
          title: "还没有发现",
          message: "点击右上角的加号分享你发现的小众景点",
          icon: "heart.fill"
        )
      } else {
        myPicksList
      }
    }
  }

  private var myPicksList: some View {
    List {
      ForEach(store.mySubmissions) { submission in
        NavigationLink {
          UserSubmissionDetailView(submission: submission)
        } label: {
          UserSubmissionRow(submission: submission, showStatus: true)
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

  // MARK: - Helper Views

  private var loadingView: some View {
    List {
      ForEach(0..<6, id: \.self) { _ in
        HiddenGemRowSkeleton()
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

  private func emptyStateView(title: String, message: String, icon: String) -> some View {
    ContentUnavailableView(
      title,
      systemImage: icon,
      description: Text(message)
    )
  }
}

// MARK: - Hidden Gem Row

struct HiddenGemRow: View {
  let gem: HiddenGemPoi

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Image
      ZStack(alignment: .topTrailing) {
        CachedAsyncImage(url: URL(string: gem.imageUrls?.first ?? "")) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Rectangle()
            .fill(Color(.systemGray5))
            .overlay {
              Image(systemName: gem.category.icon)
                .font(.title2)
                .foregroundStyle(.secondary)
            }
        }
        .frame(width: 80, height: 80)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

        // Popularity indicator
        if let level = gem.popularityLevel {
          Circle()
            .fill(popularityColor(level).gradient)
            .frame(width: 20, height: 20)
            .overlay {
              Image(systemName: level.icon)
                .font(.system(size: 10))
                .foregroundStyle(.white)
            }
            .offset(x: 4, y: -4)
        }
      }

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
        Text(gem.name)
          .font(.subheadline)
          .fontWeight(.medium)
          .lineLimit(1)

        if let address = gem.address {
          Text(address)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }

        HStack(spacing: DesignTokens.Spacing.sm) {
          // Category
          HStack(spacing: 2) {
            Image(systemName: gem.category.icon)
            Text(gem.category.displayName)
          }
          .font(.caption2)
          .foregroundStyle(.secondary)

          // Rating
          if let rating = gem.hiddenGemRating {
            HStack(spacing: 2) {
              Image(systemName: "star.fill")
                .foregroundStyle(.orange)
              Text(String(format: "%.1f", rating))
            }
            .font(.caption2)
          }

          Spacer()

          // Local recommendation badge
          if gem.localRecommendation?.isLocalRecommended == true {
            Badge("本地推荐", icon: "checkmark.seal.fill", style: .success)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }

  private func popularityColor(_ level: PopularityLevel) -> Color {
    switch level {
    case .hidden: return .green
    case .emerging: return .teal
    case .moderate: return .blue
    case .popular: return .orange
    case .crowded: return .red
    }
  }
}

// MARK: - Local Recommendation Row

struct LocalRecommendationRow: View {
  let gem: HiddenGemPoi

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HiddenGemRow(gem: gem)

      if let localRec = gem.localRecommendation {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
          if let tips = localRec.localTips {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "lightbulb.fill")
                .foregroundStyle(.orange)
              Text(tips)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          if let bestTime = localRec.bestTimeToVisit {
            HStack(spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "clock.fill")
                .foregroundStyle(.blue)
              Text("最佳时间: \(bestTime)")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          if let recommendedBy = localRec.recommendedBy {
            HStack(spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "person.fill")
                .foregroundStyle(.green)
              Text("推荐人: \(recommendedBy)")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.bottom, DesignTokens.Spacing.xs)
      }
    }
  }
}

// MARK: - User Submission Row

struct UserSubmissionRow: View {
  let submission: UserSubmittedPoi
  var showStatus: Bool = false

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Image
      CachedAsyncImage(url: URL(string: submission.imageUrls?.first ?? "")) { image in
        image
          .resizable()
          .aspectRatio(contentMode: .fill)
      } placeholder: {
        Rectangle()
          .fill(Color(.systemGray5))
          .overlay {
            Image(systemName: submission.category.icon)
              .font(.title2)
              .foregroundStyle(.secondary)
          }
      }
      .frame(width: 80, height: 80)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
        HStack {
          Text(submission.name)
            .font(.subheadline)
            .fontWeight(.medium)
            .lineLimit(1)

          Spacer()

          if showStatus {
            statusBadge
          }
        }

        Text(submission.description)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)

        HStack(spacing: DesignTokens.Spacing.sm) {
          // Votes
          HStack(spacing: 4) {
            Image(systemName: "arrow.up")
            Text("\(submission.upvotes)")
          }
          .font(.caption)
          .foregroundStyle(.green)

          HStack(spacing: 4) {
            Image(systemName: "arrow.down")
            Text("\(submission.downvotes)")
          }
          .font(.caption)
          .foregroundStyle(.red)

          // Views
          HStack(spacing: 4) {
            Image(systemName: "eye")
            Text("\(submission.viewCount)")
          }
          .font(.caption)
          .foregroundStyle(.secondary)

          Spacer()

          // Category
          Text(submission.category.displayName)
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color(.systemGray6))
            .clipShape(Capsule())
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }

  private var statusBadge: some View {
    HStack(spacing: 2) {
      Image(systemName: submission.status.icon)
      Text(submission.status.displayName)
    }
    .font(.caption2)
    .foregroundStyle(statusColor)
    .padding(.horizontal, 6)
    .padding(.vertical, 2)
    .background(statusColor.opacity(0.15))
    .clipShape(Capsule())
  }

  private var statusColor: Color {
    switch submission.status {
    case .pending: return .orange
    case .approved: return .green
    case .rejected: return .red
    case .merged: return .blue
    }
  }
}

// MARK: - Skeleton

struct HiddenGemRowSkeleton: View {
  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      ShimmerView()
        .frame(width: 80, height: 80)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        ShimmerView()
          .frame(height: 16)
          .frame(maxWidth: 150)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        ShimmerView()
          .frame(height: 12)
          .frame(maxWidth: 100)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        Spacer()

        HStack {
          ShimmerView()
            .frame(width: 60, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))

          Spacer()

          ShimmerView()
            .frame(width: 50, height: 16)
            .clipShape(Capsule())
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }
}

#Preview {
  HiddenGemsView()
}
