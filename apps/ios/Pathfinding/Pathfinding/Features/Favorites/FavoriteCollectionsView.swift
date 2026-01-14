import SwiftUI

/// View for managing favorite collections
struct FavoriteCollectionsView: View {
  @State private var store = FavoriteStore.shared
  @State private var showCreateSheet = false
  @State private var showEditSheet = false
  @State private var collectionToEdit: FavoriteCollection?
  @State private var showDeleteConfirmation = false
  @State private var collectionToDelete: FavoriteCollection?
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    Group {
      if store.isLoadingCollections && store.collections.isEmpty {
        loadingView
      } else if store.collections.isEmpty {
        emptyView
      } else {
        collectionsList
      }
    }
    .navigationTitle("收藏夹管理")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Button {
          showCreateSheet = true
        } label: {
          Image(systemName: "plus")
        }
      }
    }
    .refreshable {
      await store.fetchCollections()
    }
    .task {
      if store.collections.isEmpty {
        await store.fetchCollections()
      }
    }
    .sheet(isPresented: $showCreateSheet) {
      CreateCollectionSheet { _ in
        showCreateSheet = false
      }
    }
    .sheet(isPresented: $showEditSheet) {
      if let collection = collectionToEdit {
        EditCollectionSheet(collection: collection) {
          showEditSheet = false
          collectionToEdit = nil
        }
      }
    }
    .alert("删除收藏夹", isPresented: $showDeleteConfirmation) {
      Button("取消", role: .cancel) {
        collectionToDelete = nil
      }
      Button("删除", role: .destructive) {
        if let collection = collectionToDelete {
          Task {
            await store.deleteCollection(id: collection.id)
            collectionToDelete = nil
          }
        }
      }
    } message: {
      if let collection = collectionToDelete {
        Text("确定要删除「\(collection.name)」吗？收藏夹中的行程将移至默认收藏夹。")
      }
    }
  }

  // MARK: - Collections List

  private var collectionsList: some View {
    List {
      Section {
        ForEach(store.collections) { collection in
          NavigationLink {
            CollectionDetailView(collection: collection)
          } label: {
            CollectionRow(collection: collection)
          }
          .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if !collection.isDefault {
              Button(role: .destructive) {
                collectionToDelete = collection
                showDeleteConfirmation = true
              } label: {
                Label("删除", systemImage: "trash")
              }

              Button {
                collectionToEdit = collection
                showEditSheet = true
              } label: {
                Label("编辑", systemImage: "pencil")
              }
              .tint(.orange)
            }
          }
          .contextMenu {
            if !collection.isDefault {
              Button {
                collectionToEdit = collection
                showEditSheet = true
              } label: {
                Label("编辑收藏夹", systemImage: "pencil")
              }

              Button(role: .destructive) {
                collectionToDelete = collection
                showDeleteConfirmation = true
              } label: {
                Label("删除收藏夹", systemImage: "trash")
              }
            }
          }
        }
      } header: {
        Text("我的收藏夹")
      } footer: {
        Text("默认收藏夹无法删除或编辑")
      }
    }
    .listStyle(.insetGrouped)
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
      Image(systemName: "folder.badge.plus")
        .font(.system(size: 60))
        .foregroundStyle(DesignTokens.Colors.textQuaternary)

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text("暂无收藏夹")
          .font(.headline)

        Text("点击右上角加号创建收藏夹")
          .font(.subheadline)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
          .multilineTextAlignment(.center)
      }

      Button {
        showCreateSheet = true
      } label: {
        Text("创建收藏夹")
          .font(.headline)
          .padding(.horizontal, DesignTokens.Spacing.lg)
          .padding(.vertical, DesignTokens.Spacing.sm)
      }
      .buttonStyle(.borderedProminent)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(DesignTokens.Colors.backgroundGrouped)
  }
}

// MARK: - Collection Row

private struct CollectionRow: View {
  let collection: FavoriteCollection

  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Icon
      ZStack {
        Circle()
          .fill(collection.isDefault ? Color.red.opacity(0.1) : Color.orange.opacity(0.1))
          .frame(width: 44, height: 44)

        Image(systemName: collection.icon)
          .font(.title3)
          .foregroundStyle(collection.isDefault ? .red : .orange)
      }

      // Info
      VStack(alignment: .leading, spacing: 2) {
        HStack {
          Text(collection.name)
            .font(.body)
            .fontWeight(.medium)

          if collection.isDefault {
            Text("默认")
              .font(.caption2)
              .foregroundStyle(.white)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(Color.red.opacity(0.7))
              .clipShape(Capsule())
          }
        }

        if let description = collection.description, !description.isEmpty {
          Text(description)
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .lineLimit(1)
        }
      }

      Spacer()

      // Count
      VStack(alignment: .trailing, spacing: 2) {
        Text("\(collection.itemCount)")
          .font(.title3)
          .fontWeight(.semibold)

        Text("个行程")
          .font(.caption2)
          .foregroundStyle(DesignTokens.Colors.textTertiary)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xxs)
  }
}

// MARK: - Collection Detail View

struct CollectionDetailView: View {
  let collection: FavoriteCollection

  @State private var store = FavoriteStore.shared
  @State private var showDeleteConfirmation = false
  @State private var favoriteToDelete: ItineraryFavorite?
  @Environment(\.colorScheme) private var colorScheme

  private var items: [ItineraryFavorite] {
    store.selectedCollection?.items ?? []
  }

  var body: some View {
    Group {
      if store.isLoadingCollections && items.isEmpty {
        loadingView
      } else if items.isEmpty {
        emptyView
      } else {
        itemsList
      }
    }
    .navigationTitle(collection.name)
    .navigationBarTitleDisplayMode(.large)
    .refreshable {
      await store.fetchCollection(id: collection.id)
    }
    .task {
      await store.fetchCollection(id: collection.id)
    }
    .alert("取消收藏", isPresented: $showDeleteConfirmation) {
      Button("取消", role: .cancel) {
        favoriteToDelete = nil
      }
      Button("确定", role: .destructive) {
        if let favorite = favoriteToDelete {
          Task {
            await store.removeFromFavorites(itineraryId: favorite.itineraryId)
            await store.fetchCollection(id: collection.id)
            favoriteToDelete = nil
          }
        }
      }
    } message: {
      Text("确定要取消收藏这个行程吗？")
    }
  }

  // MARK: - Items List

  private var itemsList: some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        // Collection header
        collectionHeader

        ForEach(items) { favorite in
          if favorite.itinerary != nil {
            NavigationLink {
              // Navigate to itinerary detail
              // TODO: Implement itinerary detail view for public itineraries
              Text("行程详情: \(favorite.itinerary?.title ?? "")")
            } label: {
              FavoritedItineraryCard(
                favorite: favorite,
                onMove: nil, // Disable move in collection detail
                onDelete: {
                  favoriteToDelete = favorite
                  showDeleteConfirmation = true
                }
              )
            }
            .buttonStyle(.plain)
          }
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.sm)
    }
    .background(DesignTokens.Colors.backgroundGrouped)
  }

  private var collectionHeader: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: collection.icon)
          .font(.title2)
          .foregroundStyle(collection.isDefault ? .red : .orange)

        VStack(alignment: .leading, spacing: 2) {
          Text(collection.name)
            .font(.title3)
            .fontWeight(.semibold)

          Text("\(collection.itemCount) 个行程")
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
        }

        Spacer()
      }

      if let description = collection.description, !description.isEmpty {
        Text(description)
          .font(.subheadline)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .adaptiveSubtleCardStyle(radius: DesignTokens.Radius.md, colorScheme: colorScheme)
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
      Image(systemName: "folder")
        .font(.system(size: 60))
        .foregroundStyle(DesignTokens.Colors.textQuaternary)

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text("收藏夹为空")
          .font(.headline)

        Text("收藏行程后可以在这里查看")
          .font(.subheadline)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
          .multilineTextAlignment(.center)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(DesignTokens.Colors.backgroundGrouped)
  }
}

// MARK: - Edit Collection Sheet

struct EditCollectionSheet: View {
  let collection: FavoriteCollection
  let onDismiss: () -> Void

  @State private var store = FavoriteStore.shared
  @State private var name: String
  @State private var description: String
  @FocusState private var isNameFocused: Bool

  init(collection: FavoriteCollection, onDismiss: @escaping () -> Void) {
    self.collection = collection
    self.onDismiss = onDismiss
    _name = State(initialValue: collection.name)
    _description = State(initialValue: collection.description ?? "")
  }

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("收藏夹名称", text: $name)
            .focused($isNameFocused)
        } header: {
          Text("名称")
        } footer: {
          Text("最多50个字符")
        }

        Section {
          TextField("添加描述（可选）", text: $description, axis: .vertical)
            .lineLimit(3...5)
        } header: {
          Text("描述")
        } footer: {
          Text("最多200个字符")
        }
      }
      .navigationTitle("编辑收藏夹")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            Task {
              let success = await store.updateCollection(
                id: collection.id,
                name: name,
                description: description.isEmpty ? nil : description
              )
              if success {
                onDismiss()
              }
            }
          }
          .disabled(name.isEmpty || name.count > 50 || store.isSubmitting)
        }
      }
      .onAppear {
        isNameFocused = true
      }
    }
  }
}

// MARK: - Preview

#Preview("Collections List") {
  NavigationStack {
    FavoriteCollectionsView()
  }
}

#Preview("Collection Detail") {
  NavigationStack {
    CollectionDetailView(collection: FavoriteCollection(
      id: "1",
      userId: "user1",
      name: "日本行程",
      description: "收集日本旅行相关的行程",
      coverImageUrl: nil,
      isDefault: false,
      itemCount: 5,
      sortOrder: 1,
      createdAt: Date().timeIntervalSince1970 * 1000,
      updatedAt: nil
    ))
  }
}
