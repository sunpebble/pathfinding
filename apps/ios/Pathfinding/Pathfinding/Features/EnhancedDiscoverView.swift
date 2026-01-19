import SwiftUI

// MARK: - Enhanced Discover View
// 优化后的探索页面 - 展示如何使用探索者美学组件

struct EnhancedDiscoverView: View {
  @State private var store = GuideStore.shared
  @State private var searchText = ""
  @State private var selectedCity: String? = nil
  @State private var onlyAiGuides = false
  @State private var searchTask: Task<Void, Never>?

  @Environment(\.colorScheme) private var colorScheme

  var isSearchMode: Bool {
    !searchText.isEmpty || selectedCity != nil || onlyAiGuides
  }

  var body: some View {
    NavigationStack {
      ZStack {
        // 背景层 - 渐变 + 等高线
        backgroundLayer

        // 内容层
        VStack(spacing: 0) {
          // 增强的筛选栏
          enhancedFilterBar
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)

          // 内容
          if store.isLoading && store.guides.isEmpty {
            enhancedLoadingView
          } else if isSearchMode {
            searchResultsView
          } else {
            mainContentView
          }
        }
      }
      .navigationTitle("discover.title".localized)
      .navigationBarTitleDisplayMode(.large)
      .searchable(text: $searchText, prompt: "discover.search_placeholder".localized)
      .onChange(of: searchText) { _, _ in triggerSearch() }
      .onChange(of: selectedCity) { _, _ in triggerSearch() }
      .onChange(of: onlyAiGuides) { _, _ in triggerSearch() }
      .navigationDestination(for: BlogPost.self) { guide in
        BlogDetailView(guide: guide)
      }
      .task {
        await store.fetchGuides()
        await store.fetchPopularDestinations()
      }
      .refreshable {
        if isSearchMode {
          await performSearch()
        } else {
          await store.fetchGuides(forceRefresh: true)
        }
      }
    }
  }

  // MARK: - Background Layer

  private var backgroundLayer: some View {
    ZStack {
      // 基础背景
      Color(.systemGroupedBackground)
        .ignoresSafeArea()

      // 顶部渐变装饰
      VStack {
        ZStack {
          // 渐变
          LinearGradient(
            colors: [
              DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.15 : 0.08),
              .clear
            ],
            startPoint: .top,
            endPoint: .bottom
          )
          .frame(height: 300)

          // 等高线装饰
          TopographicLinesView(
            lineCount: 5,
            lineColor: DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.08 : 0.04)
          )
          .frame(height: 300)

          // 指南针装饰（右上角）
          HStack {
            Spacer()
            VStack {
              CompassRoseDecoration(
                size: 150,
                color: DesignTokens.Colors.accent,
                opacity: colorScheme == .dark ? 0.06 : 0.04
              )
              Spacer()
            }
          }
          .padding(.trailing, -30)
          .padding(.top, 50)
        }

        Spacer()
      }
      .ignoresSafeArea()

      // 微妙的噪点
      NoiseTextureOverlay(opacity: colorScheme == .dark ? 0.02 : 0.015)
        .ignoresSafeArea()
    }
  }

  // MARK: - Enhanced Filter Bar

  private var enhancedFilterBar: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // 城市标签
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.xs) {
          enhancedCityTag(nil, label: "全部")
          ForEach(store.popularDestinations) { dest in
            enhancedCityTag(dest.name, label: dest.name)
          }
        }
      }

      // 筛选按钮
      HStack(spacing: DesignTokens.Spacing.md) {
        // AI 筛选按钮 - 带发光效果
        Button {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            onlyAiGuides.toggle()
          }
        } label: {
          HStack(spacing: DesignTokens.Spacing.xxs) {
            Image(systemName: "sparkles")
              .symbolEffect(.bounce, value: onlyAiGuides)
            Text("AI 行程")
          }
          .font(.subheadline)
          .fontWeight(.medium)
          .padding(.horizontal, DesignTokens.Spacing.md)
          .padding(.vertical, DesignTokens.Spacing.xs)
          .background(
            ZStack {
              if onlyAiGuides {
                LinearGradient(
                  colors: [.purple, .indigo],
                  startPoint: .topLeading,
                  endPoint: .bottomTrailing
                )
              } else {
                DesignTokens.Colors.fillTertiary
              }
            }
          )
          .foregroundStyle(onlyAiGuides ? .white : .primary)
          .clipShape(Capsule())
          .shadow(
            color: onlyAiGuides ? .purple.opacity(0.3) : .clear,
            radius: 8,
            y: 2
          )
        }
        .buttonStyle(.plain)

        Spacer()
      }
    }
  }

  private func enhancedCityTag(_ city: String?, label: String) -> some View {
    Button {
      withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
        selectedCity = city
      }
    } label: {
      Text(label)
        .font(.subheadline)
        .fontWeight(selectedCity == city ? .semibold : .regular)
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(
          ZStack {
            if selectedCity == city {
              DesignTokens.Colors.accent
            } else {
              DesignTokens.Colors.fillTertiary
            }
          }
        )
        .foregroundStyle(selectedCity == city ? .white : .primary)
        .clipShape(Capsule())
        .overlay(
          Capsule()
            .stroke(
              selectedCity == city ? .clear : DesignTokens.Colors.border.opacity(0.3),
              lineWidth: 0.5
            )
        )
    }
    .buttonStyle(.plain)
    .scaleEffect(selectedCity == city ? 1.05 : 1)
    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: selectedCity)
  }

  // MARK: - Main Content

  private var mainContentView: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxl) {
        // 精选区域
        if !store.featuredGuides.isEmpty {
          enhancedFeaturedSection
        }

        // 最近更新区域
        if !store.recentGuides.isEmpty {
          enhancedRecentSection
        }
      }
      .padding(.vertical, DesignTokens.Spacing.md)
    }
  }

  private var enhancedFeaturedSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // 区域头部
      HStack(spacing: DesignTokens.Spacing.sm) {
        ZStack {
          Circle()
            .fill(Color.orange.opacity(0.15))
            .frame(width: 32, height: 32)
          Image(systemName: "star.fill")
            .foregroundStyle(.orange)
            .font(.subheadline)
        }

        Text("discover.featured".localized)
          .font(.title3)
          .fontWeight(.bold)

        Spacer()
      }
      .padding(.horizontal, DesignTokens.Spacing.lg)

      // 水平滚动卡片
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.md) {
          ForEach(store.featuredGuides) { guide in
            NavigationLink(value: guide) {
              ExplorerFeaturedCard(guide: guide)
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
      }
      .scrollClipDisabled()
    }
  }

  private var enhancedRecentSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // 区域头部
      HStack(spacing: DesignTokens.Spacing.sm) {
        ZStack {
          Circle()
            .fill(Color.blue.opacity(0.15))
            .frame(width: 32, height: 32)
          Image(systemName: "clock.fill")
            .foregroundStyle(.blue)
            .font(.subheadline)
        }

        Text("discover.recent".localized)
          .font(.title3)
          .fontWeight(.bold)

        Spacer()
      }
      .padding(.horizontal, DesignTokens.Spacing.lg)

      // 列表
      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(Array(store.recentGuides.enumerated()), id: \.element.id) { index, guide in
          NavigationLink(value: guide) {
            ExplorerGuideRow(guide: guide, index: index)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.lg)
    }
  }

  // MARK: - Search Results

  private var searchResultsView: some View {
    Group {
      if store.isSearching {
        enhancedLoadingView
      } else if store.searchResults.isEmpty {
        ContentUnavailableView(
          "无搜索结果",
          systemImage: "magnifyingglass",
          description: Text("尝试调整搜索条件")
        )
      } else {
        List {
          Section {
            Text("找到 \(store.searchResults.count) 条结果")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
          .listRowBackground(Color.clear)

          ForEach(Array(store.searchResults.enumerated()), id: \.element.id) { index, guide in
            NavigationLink(value: guide) {
              ExplorerGuideRow(guide: guide, index: index)
            }
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
          }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
      }
    }
  }

  // MARK: - Enhanced Loading View

  private var enhancedLoadingView: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      ZStack {
        // 背景圆环
        Circle()
          .stroke(DesignTokens.Colors.fillTertiary, lineWidth: 4)
          .frame(width: 60, height: 60)

        // 旋转的渐变圆环
        Circle()
          .trim(from: 0, to: 0.7)
          .stroke(
            AngularGradient(
              colors: [DesignTokens.Colors.accent, DesignTokens.Colors.accent.opacity(0.3)],
              center: .center
            ),
            style: StrokeStyle(lineWidth: 4, lineCap: .round)
          )
          .frame(width: 60, height: 60)
          .rotationEffect(.degrees(-90))

        // 中心图标
        Image(systemName: "map")
          .font(.title2)
          .foregroundStyle(DesignTokens.Colors.accent)
          .pulseAnimation(duration: 1.2)
      }

      Text("探索中...")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  // MARK: - Search Logic

  private func triggerSearch() {
    searchTask?.cancel()
    searchTask = Task {
      try? await Task.sleep(for: .milliseconds(300))
      guard !Task.isCancelled else { return }
      await performSearch()
    }
  }

  private func performSearch() async {
    await store.search(
      query: searchText,
      destination: selectedCity,
      hasAiData: onlyAiGuides,
      daysAgo: nil
    )
  }
}

// MARK: - Preview

#Preview("Enhanced Discover - Light") {
  EnhancedDiscoverView()
    .preferredColorScheme(.light)
}

#Preview("Enhanced Discover - Dark") {
  EnhancedDiscoverView()
    .preferredColorScheme(.dark)
}
