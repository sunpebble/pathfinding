import SwiftUI

/// View displaying the user's favorited itineraries with collection filtering
struct MyFavoritesView: View {
  @State private var store = FavoriteStore.shared
  @State private var selectedCollectionId: String?
  @State private var showMoveSheet = false
  @State private var favoriteToMove: ItineraryFavorite?
  @State private var showDeleteConfirmation = false
  @State private var favoriteToDelete: ItineraryFavorite?
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    VStack(spacing: 0) {
      // Collection filter
      if !store.collections.isEmpty {
        collectionFilter
      }

      // Content
      Group {
        if store.isLoadingFavorites && store.favoritedItineraries.isEmpty {
          loadingView
        } else if store.favoritedItineraries.isEmpty {
          emptyView
        } else {
          favoritesList
        }
      }
    }
    .navigationTitle("我的收藏")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink {
          FavoriteCollectionsView()
        } label: {
          Image(systemName: "folder.badge.gearshape")
        }
      }
    }
    .refreshable {
      await refresh()
    }
    .task {
      await store.fetchCollections()
      if store.favoritedItineraries.isEmpty {
        await store.fetchFavoritedItineraries(collectionId: selectedCollectionId, refresh: true)
      }
    }
    .sheet(isPresented: $showMoveSheet) {
      if let favorite = favoriteToMove {
        MoveToCollectionSheet(favorite: favorite) {
          showMoveSheet = false
          favoriteToMove = nil
        }
      }
    }
    .alert("取消收藏", isPresented: $showDeleteConfirmation) {
      Button("取消", role: .cancel) {
        favoriteToDelete = nil
      }
      Button("确定", role: .destructive) {
        if let favorite = favoriteToDelete {
          Task {
            await store.removeFromFavorites(itineraryId: favorite.itineraryId)
            favoriteToDelete = nil
          }
        }
      }
    } message: {
      Text("确定要取消收藏这个行程吗？")
    }
  }

  // MARK: - Collection Filter

  private var collectionFilter: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // All favorites
        FilterChip(
          title: "全部",
          isSelected: selectedCollectionId == nil
        ) {
          selectCollection(nil)
        }

        // Collection chips
        ForEach(store.collections) { collection in
          FilterChip(
            title: collection.name,
            icon: collection.icon,
            count: collection.itemCount,
            isSelected: selectedCollectionId == collection.id
          ) {
            selectCollection(collection.id)
          }
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.sm)
    }
    .background(DesignTokens.Colors.backgroundPrimary)
  }

  private func selectCollection(_ collectionId: String?) {
    guard selectedCollectionId != collectionId else { return }
    selectedCollectionId = collectionId
    Task {
      await store.fetchFavoritedItineraries(collectionId: collectionId, refresh: true)
    }
  }

  // MARK: - Favorites List

  private var favoritesList: some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(store.favoritedItineraries) { favorite in
          if favorite.itinerary != nil {
            NavigationLink {
              // Navigate to itinerary detail
              // TODO: Implement itinerary detail view for public itineraries
              Text("行程详情: \(favorite.itinerary?.title ?? "")")
            } label: {
              FavoritedItineraryCard(
                favorite: favorite,
                onMove: {
                  favoriteToMove = favorite
                  showMoveSheet = true
                },
                onDelete: {
                  favoriteToDelete = favorite
                  showDeleteConfirmation = true
                }
              )
            }
            .buttonStyle(.plain)
          }
        }

        // Load more
        if store.favoritesPage < store.favoritesTotalPages {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding()
            .task {
              await store.loadMoreFavorites(collectionId: selectedCollectionId)
            }
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.sm)
    }
    .background(DesignTokens.Colors.backgroundGrouped)
  }

  // MARK: - Loading View

  private var loadingView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      ProgressView()
      Text("加载中...")
        .font(.subheadline)
        .foregroundStyle(DesignTokens.Colors.textSecondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(DesignTokens.Colors.backgroundGrouped)
  }

  // MARK: - Empty View

  private var emptyView: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      Image(systemName: "bookmark")
        .font(.system(size: 60))
        .foregroundStyle(DesignTokens.Colors.textQuaternary)

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text(selectedCollectionId == nil ? "暂无收藏" : "该收藏夹为空")
          .font(.headline)

        Text(selectedCollectionId == nil
          ? "浏览行程时点击收藏按钮即可收藏"
          : "可以从其他收藏夹移动行程到这里")
          .font(.subheadline)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
          .multilineTextAlignment(.center)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(DesignTokens.Colors.backgroundGrouped)
  }

  // MARK: - Helpers

  private func refresh() async {
    await store.fetchCollections()
    await store.fetchFavoritedItineraries(collectionId: selectedCollectionId, refresh: true)
  }
}

// MARK: - Filter Chip

private struct FilterChip: View {
  let title: String
  var icon: String?
  var count: Int?
  let isSelected: Bool
  let action: () -> Void

  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    Button(action: action) {
      HStack(spacing: 4) {
        if let icon {
          Image(systemName: icon)
            .font(.caption2)
        }

        Text(title)
          .font(.subheadline)
          .fontWeight(isSelected ? .semibold : .regular)

        if let count, count > 0 {
          Text("\(count)")
            .font(.caption2)
            .foregroundStyle(isSelected ? .white.opacity(0.8) : DesignTokens.Colors.textTertiary)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        Capsule()
          .fill(isSelected ? DesignTokens.Colors.accent : DesignTokens.Colors.fillSecondary)
      )
      .foregroundStyle(isSelected ? .white : DesignTokens.Colors.textPrimary)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Move to Collection Sheet

struct MoveToCollectionSheet: View {
  let favorite: ItineraryFavorite
  let onDismiss: () -> Void

  @State private var store = FavoriteStore.shared
  @State private var selectedCollectionId: String?
  @State private var showCreateCollection = false
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        if store.isLoadingCollections && store.collections.isEmpty {
          ProgressView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
          List {
            Section {
              ForEach(store.collections) { collection in
                Button {
                  selectedCollectionId = collection.id
                } label: {
                  HStack {
                    Image(systemName: collection.icon)
                      .foregroundStyle(collection.isDefault ? .red : .orange)

                    VStack(alignment: .leading, spacing: 2) {
                      Text(collection.name)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)

                      if let description = collection.description {
                        Text(description)
                          .font(.caption)
                          .foregroundStyle(DesignTokens.Colors.textSecondary)
                          .lineLimit(1)
                      }
                    }

                    Spacer()

                    // Show current badge
                    if favorite.collectionId == collection.id {
                      Text("当前")
                        .font(.caption2)
                        .foregroundStyle(DesignTokens.Colors.textTertiary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(DesignTokens.Colors.fillTertiary)
                        .clipShape(Capsule())
                    }

                    if selectedCollectionId == collection.id {
                      Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    }
                  }
                }
                .buttonStyle(.plain)
                .disabled(favorite.collectionId == collection.id)
              }

              // Create new collection button
              Button {
                showCreateCollection = true
              } label: {
                HStack {
                  Image(systemName: "plus.circle.fill")
                    .foregroundStyle(DesignTokens.Colors.accent)

                  Text("新建收藏夹")
                    .foregroundStyle(DesignTokens.Colors.accent)
                }
              }
            } header: {
              Text("选择目标收藏夹")
            }
          }
          .listStyle(.insetGrouped)
        }
      }
      .navigationTitle("移动到")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("移动") {
            Task {
              if let collectionId = selectedCollectionId {
                let success = await store.moveFavoriteToCollection(
                  favoriteId: favorite.id,
                  collectionId: collectionId
                )
                if success {
                  onDismiss()
                }
              }
            }
          }
          .disabled(selectedCollectionId == nil || store.isSubmitting)
        }
      }
      .task {
        await store.fetchCollections()
      }
      .sheet(isPresented: $showCreateCollection) {
        CreateCollectionSheet { collectionId in
          if let collectionId {
            selectedCollectionId = collectionId
          }
          showCreateCollection = false
        }
      }
    }
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    MyFavoritesView()
  }
}
