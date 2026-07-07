import SwiftUI

// MARK: - Like Button

/// A reusable like button with animation
struct LikeButton: View {
  let itineraryId: String
  let showCount: Bool
  let size: ButtonSize

  @State private var store = FavoriteStore.shared
  @Environment(\.colorScheme) private var colorScheme

  enum ButtonSize {
    case small
    case regular
    case large

    var iconSize: CGFloat {
      switch self {
      case .small: return 16
      case .regular: return 20
      case .large: return 24
      }
    }

    var fontSize: Font {
      switch self {
      case .small: return .caption2
      case .regular: return .caption
      case .large: return .subheadline
      }
    }
  }

  init(itineraryId: String, showCount: Bool = false, size: ButtonSize = .regular) {
    self.itineraryId = itineraryId
    self.showCount = showCount
    self.size = size
  }

  private var isLiked: Bool {
    store.isLiked(itineraryId)
  }

  private var likeCount: Int {
    store.likeCounts[itineraryId] ?? 0
  }

  var body: some View {
    Button {
      Task {
        await store.toggleLike(itineraryId: itineraryId)
      }
    } label: {
      HStack(spacing: 4) {
        Image(systemName: isLiked ? "heart.fill" : "heart")
          .font(.system(size: size.iconSize))
          .foregroundStyle(isLiked ? .red : DesignTokens.Colors.textSecondary)
          .symbolEffect(.bounce, value: isLiked)
          .contentTransition(.symbolEffect(.replace))

        if showCount && likeCount > 0 {
          Text(formatCount(likeCount))
            .font(size.fontSize)
            .foregroundStyle(isLiked ? .red : DesignTokens.Colors.textSecondary)
            .contentTransition(.numericText())
        }
      }
      .animation(DesignTokens.Animation.quick, value: isLiked)
    }
    .buttonStyle(.plain)
    .disabled(store.isTogglingLike)
  }

  private func formatCount(_ count: Int) -> String {
    if count >= 10000 {
      return String(format: "%.1fw", Double(count) / 10000)
    } else if count >= 1000 {
      return String(format: "%.1fk", Double(count) / 1000)
    }
    return "\(count)"
  }
}

// MARK: - Favorite Button

/// A reusable favorite/bookmark button with animation
struct FavoriteButton: View {
  let itineraryId: String
  let showCount: Bool
  let size: LikeButton.ButtonSize
  let onAddToCollection: (() -> Void)?

  @State private var store = FavoriteStore.shared
  @Environment(\.colorScheme) private var colorScheme

  init(
    itineraryId: String,
    showCount: Bool = false,
    size: LikeButton.ButtonSize = .regular,
    onAddToCollection: (() -> Void)? = nil
  ) {
    self.itineraryId = itineraryId
    self.showCount = showCount
    self.size = size
    self.onAddToCollection = onAddToCollection
  }

  private var isFavorited: Bool {
    store.isFavorited(itineraryId)
  }

  private var favoriteCount: Int {
    store.favoriteCounts[itineraryId] ?? 0
  }

  var body: some View {
    Button {
      if isFavorited {
        Task {
          await store.toggleFavorite(itineraryId: itineraryId)
        }
      } else if let onAddToCollection {
        onAddToCollection()
      } else {
        Task {
          await store.toggleFavorite(itineraryId: itineraryId)
        }
      }
    } label: {
      HStack(spacing: 4) {
        Image(systemName: isFavorited ? "bookmark.fill" : "bookmark")
          .font(.system(size: size.iconSize))
          .foregroundStyle(isFavorited ? .orange : DesignTokens.Colors.textSecondary)
          .symbolEffect(.bounce, value: isFavorited)
          .contentTransition(.symbolEffect(.replace))

        if showCount && favoriteCount > 0 {
          Text(formatCount(favoriteCount))
            .font(size.fontSize)
            .foregroundStyle(isFavorited ? .orange : DesignTokens.Colors.textSecondary)
            .contentTransition(.numericText())
        }
      }
      .animation(DesignTokens.Animation.quick, value: isFavorited)
    }
    .buttonStyle(.plain)
    .disabled(store.isTogglingFavorite)
  }

  private func formatCount(_ count: Int) -> String {
    if count >= 10000 {
      return String(format: "%.1fw", Double(count) / 10000)
    } else if count >= 1000 {
      return String(format: "%.1fk", Double(count) / 1000)
    }
    return "\(count)"
  }
}

// MARK: - Combined Like & Favorite Bar

/// A horizontal bar showing both like and favorite buttons with counts
struct LikeFavoriteBar: View {
  let itineraryId: String
  let onAddToCollection: (() -> Void)?

  @State private var store = FavoriteStore.shared
  @Environment(\.colorScheme) private var colorScheme

  init(itineraryId: String, onAddToCollection: (() -> Void)? = nil) {
    self.itineraryId = itineraryId
    self.onAddToCollection = onAddToCollection
  }

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.lg) {
      LikeButton(itineraryId: itineraryId, showCount: true)
      FavoriteButton(
        itineraryId: itineraryId,
        showCount: true,
        onAddToCollection: onAddToCollection
      )
    }
  }
}

// MARK: - Add to Collection Sheet

/// Sheet for selecting a collection to add a favorite to
struct AddToCollectionSheet: View {
  let itineraryId: String
  let onDismiss: () -> Void

  @State private var store = FavoriteStore.shared
  @State private var notes = ""
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
            // Notes section
            Section {
              TextField("添加备注（可选）", text: $notes, axis: .vertical)
                .lineLimit(3...5)
            } header: {
              Text("备注")
            }

            // Collections section
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

                    Text("\(collection.itemCount)")
                      .font(.caption)
                      .foregroundStyle(DesignTokens.Colors.textTertiary)

                    if selectedCollectionId == collection.id {
                      Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    }
                  }
                }
                .buttonStyle(.plain)
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
              Text("选择收藏夹")
            }
          }
          .listStyle(.insetGrouped)
        }
      }
      .navigationTitle("收藏到")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("确定") {
            Task {
              let success = await store.addToFavorites(
                itineraryId: itineraryId,
                collectionId: selectedCollectionId,
                notes: notes.isEmpty ? nil : notes
              )
              if success {
                onDismiss()
              }
            }
          }
          .disabled(store.isSubmitting)
        }
      }
      .task {
        await store.fetchCollections()
        // Select default collection if exists
        if selectedCollectionId == nil {
          selectedCollectionId = store.collections.first { $0.isDefault }?.id
        }
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

// MARK: - Create Collection Sheet

/// Sheet for creating a new collection
struct CreateCollectionSheet: View {
  let onComplete: (String?) -> Void

  @State private var store = FavoriteStore.shared
  @State private var name = ""
  @State private var description = ""
  @FocusState private var isNameFocused: Bool

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
      .navigationTitle("新建收藏夹")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            onComplete(nil)
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("创建") {
            Task {
              let collectionId = await store.createCollection(
                name: name,
                description: description.isEmpty ? nil : description
              )
              onComplete(collectionId)
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

// MARK: - Liked Itinerary Card

/// Card displaying a liked itinerary
struct LikedItineraryCard: View {
  let like: ItineraryLike

  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    if let itinerary = like.itinerary {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Cover image
        CachedAsyncImage(url: URL(string: itinerary.coverImageUrl ?? "")) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Rectangle()
            .fill(DesignTokens.Colors.imagePlaceholder(for: colorScheme))
            .overlay {
              Image(systemName: "photo")
                .foregroundStyle(DesignTokens.Colors.textTertiary)
            }
        }
        .frame(width: 80, height: 80)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

        // Content
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
          Text(itinerary.title)
            .font(.subheadline)
            .fontWeight(.medium)
            .lineLimit(2)

          if let destination = itinerary.destination {
            Label(destination, systemImage: "mappin")
              .font(.caption)
              .foregroundStyle(DesignTokens.Colors.textSecondary)
          }

          HStack(spacing: DesignTokens.Spacing.sm) {
            // Author
            if let authorName = itinerary.authorName {
              HStack(spacing: 4) {
                if let avatar = itinerary.authorAvatar {
                  CachedAsyncImage(url: URL(string: avatar)) { image in
                    image
                      .resizable()
                      .aspectRatio(contentMode: .fill)
                  } placeholder: {
                    Circle()
                      .fill(DesignTokens.Colors.fill)
                  }
                  .frame(width: 16, height: 16)
                  .clipShape(Circle())
                }

                Text(authorName)
                  .font(.caption2)
                  .foregroundStyle(DesignTokens.Colors.textTertiary)
              }
            }

            Spacer()

            // Stats
            StatLabel(icon: "heart.fill", value: "\(itinerary.likesCount)", color: .red.opacity(0.7))
            StatLabel(
              icon: "bookmark.fill",
              value: "\(itinerary.favoritesCount)",
              color: .orange.opacity(0.7)
            )
          }

          Text(like.timeAgo)
            .font(.caption2)
            .foregroundStyle(DesignTokens.Colors.textQuaternary)
        }

        Spacer(minLength: 0)
      }
      .padding(DesignTokens.Spacing.sm)
      .cardSurface()
    }
  }
}

// MARK: - Favorited Itinerary Card

/// Card displaying a favorited itinerary
struct FavoritedItineraryCard: View {
  let favorite: ItineraryFavorite
  let onMove: (() -> Void)?
  let onDelete: (() -> Void)?

  @Environment(\.colorScheme) private var colorScheme

  init(
    favorite: ItineraryFavorite,
    onMove: (() -> Void)? = nil,
    onDelete: (() -> Void)? = nil
  ) {
    self.favorite = favorite
    self.onMove = onMove
    self.onDelete = onDelete
  }

  var body: some View {
    if let itinerary = favorite.itinerary {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        HStack(spacing: DesignTokens.Spacing.sm) {
          // Cover image
          CachedAsyncImage(url: URL(string: itinerary.coverImageUrl ?? "")) { image in
            image
              .resizable()
              .aspectRatio(contentMode: .fill)
          } placeholder: {
            Rectangle()
              .fill(DesignTokens.Colors.imagePlaceholder(for: colorScheme))
              .overlay {
                Image(systemName: "photo")
                  .foregroundStyle(DesignTokens.Colors.textTertiary)
              }
          }
          .frame(width: 80, height: 80)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

          // Content
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
            Text(itinerary.title)
              .font(.subheadline)
              .fontWeight(.medium)
              .lineLimit(2)

            if let destination = itinerary.destination {
              Label(destination, systemImage: "mappin")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            }

            // Collection badge
            if let collection = favorite.collection {
              HStack(spacing: 4) {
                Image(systemName: collection.isDefault ? "heart.fill" : "folder.fill")
                  .font(.caption2)
                Text(collection.name)
                  .font(.caption2)
              }
              .foregroundStyle(.orange)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(Color.orange.opacity(0.1))
              .clipShape(Capsule())
            }

            Text(favorite.timeAgo)
              .font(.caption2)
              .foregroundStyle(DesignTokens.Colors.textQuaternary)
          }

          Spacer(minLength: 0)
        }

        // Notes if any
        if let notes = favorite.notes, !notes.isEmpty {
          Text(notes)
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .padding(DesignTokens.Spacing.xs)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Colors.fillTertiary)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
        }
      }
      .padding(DesignTokens.Spacing.sm)
      .cardSurface()
      .contextMenu {
        if onMove != nil {
          Button {
            onMove?()
          } label: {
            Label("移动到其他收藏夹", systemImage: "folder.badge.plus")
          }
        }

        if onDelete != nil {
          Button(role: .destructive) {
            onDelete?()
          } label: {
            Label("取消收藏", systemImage: "bookmark.slash")
          }
        }
      }
    }
  }
}

// MARK: - Collection Card

/// Card displaying a favorite collection
struct CollectionCard: View {
  let collection: FavoriteCollection

  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      HStack {
        // Icon
        ZStack {
          Circle()
            .fill(collection.isDefault ? Color.red.opacity(0.1) : Color.orange.opacity(0.1))
            .frame(width: 44, height: 44)

          Image(systemName: collection.icon)
            .font(.title3)
            .foregroundStyle(collection.isDefault ? .red : .orange)
        }

        VStack(alignment: .leading, spacing: 2) {
          Text(collection.name)
            .font(.headline)

          if let description = collection.description {
            Text(description)
              .font(.caption)
              .foregroundStyle(DesignTokens.Colors.textSecondary)
              .lineLimit(1)
          }
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 2) {
          Text("\(collection.itemCount)")
            .font(.title3)
            .fontWeight(.semibold)

          Text("个行程")
            .font(.caption2)
            .foregroundStyle(DesignTokens.Colors.textTertiary)
        }

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(DesignTokens.Colors.textQuaternary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
  }
}

// MARK: - Preview

#Preview("Like Button") {
  VStack(spacing: 20) {
    HStack(spacing: 20) {
      LikeButton(itineraryId: "test1")
      LikeButton(itineraryId: "test1", showCount: true)
      LikeButton(itineraryId: "test1", showCount: true, size: .large)
    }

    HStack(spacing: 20) {
      FavoriteButton(itineraryId: "test1")
      FavoriteButton(itineraryId: "test1", showCount: true)
      FavoriteButton(itineraryId: "test1", showCount: true, size: .large)
    }

    LikeFavoriteBar(itineraryId: "test1")
  }
  .padding()
}

#Preview("Collection Card") {
  VStack(spacing: 12) {
    CollectionCard(collection: FavoriteCollection(
      id: "1",
      userId: "user1",
      name: "我的收藏",
      description: "默认收藏夹",
      coverImageUrl: nil,
      isDefault: true,
      itemCount: 12,
      sortOrder: 0,
      createdAt: Date().timeIntervalSince1970 * 1000,
      updatedAt: nil
    ))

    CollectionCard(collection: FavoriteCollection(
      id: "2",
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
  .padding()
}
