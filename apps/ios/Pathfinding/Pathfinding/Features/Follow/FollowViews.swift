import SwiftUI

// MARK: - Followers List View

struct FollowersListView: View {
  let userId: String?
  let isCurrentUser: Bool

  @State private var store = FollowStore.shared
  @State private var users: [FollowUser] = []
  @State private var pagination: FollowPaginationMeta?
  @State private var isLoading = false
  @State private var currentPage = 1

  init(userId: String? = nil) {
    self.userId = userId
    self.isCurrentUser = userId == nil
  }

  var body: some View {
    Group {
      if isLoading && users.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if users.isEmpty {
        ContentUnavailableView(
          "follow.no_followers".localized,
          systemImage: "person.2.slash",
          description: Text("follow.no_followers_description".localized)
        )
      } else {
        List {
          ForEach(users) { user in
            FollowUserRow(user: user, showFollowButton: isCurrentUser)
          }

          if let meta = pagination, currentPage < meta.totalPages {
            ProgressView()
              .frame(maxWidth: .infinity)
              .onAppear {
                Task {
                  await loadMore()
                }
              }
          }
        }
        .listStyle(.plain)
      }
    }
    .navigationTitle("follow.followers".localized)
    .navigationBarTitleDisplayMode(.inline)
    .refreshable {
      await refresh()
    }
    .task {
      await loadInitial()
    }
  }

  private func loadInitial() async {
    guard !isLoading else { return }
    isLoading = true
    currentPage = 1

    if isCurrentUser {
      await store.fetchFollowers(page: 1)
      users = store.followers
      pagination = store.followersPagination
    } else if let userId = userId {
      let result = await store.fetchUserFollowers(userId: userId, page: 1)
      users = result.users
      pagination = result.meta
    }

    isLoading = false
  }

  private func loadMore() async {
    guard !isLoading else { return }
    isLoading = true
    currentPage += 1

    if isCurrentUser {
      await store.fetchFollowers(page: currentPage)
      users = store.followers
      pagination = store.followersPagination
    } else if let userId = userId {
      let result = await store.fetchUserFollowers(userId: userId, page: currentPage)
      users.append(contentsOf: result.users)
      pagination = result.meta
    }

    isLoading = false
  }

  private func refresh() async {
    await loadInitial()
  }
}

// MARK: - Following List View

struct FollowingListView: View {
  let userId: String?
  let isCurrentUser: Bool

  @State private var store = FollowStore.shared
  @State private var users: [FollowUser] = []
  @State private var pagination: FollowPaginationMeta?
  @State private var isLoading = false
  @State private var currentPage = 1

  init(userId: String? = nil) {
    self.userId = userId
    self.isCurrentUser = userId == nil
  }

  var body: some View {
    Group {
      if isLoading && users.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if users.isEmpty {
        ContentUnavailableView(
          "follow.no_following".localized,
          systemImage: "person.badge.plus",
          description: Text("follow.no_following_description".localized)
        )
      } else {
        List {
          ForEach(users) { user in
            FollowUserRow(user: user, showFollowButton: isCurrentUser)
          }

          if let meta = pagination, currentPage < meta.totalPages {
            ProgressView()
              .frame(maxWidth: .infinity)
              .onAppear {
                Task {
                  await loadMore()
                }
              }
          }
        }
        .listStyle(.plain)
      }
    }
    .navigationTitle("follow.following".localized)
    .navigationBarTitleDisplayMode(.inline)
    .refreshable {
      await refresh()
    }
    .task {
      await loadInitial()
    }
  }

  private func loadInitial() async {
    guard !isLoading else { return }
    isLoading = true
    currentPage = 1

    if isCurrentUser {
      await store.fetchFollowing(page: 1)
      users = store.following
      pagination = store.followingPagination
    } else if let userId = userId {
      let result = await store.fetchUserFollowing(userId: userId, page: 1)
      users = result.users
      pagination = result.meta
    }

    isLoading = false
  }

  private func loadMore() async {
    guard !isLoading else { return }
    isLoading = true
    currentPage += 1

    if isCurrentUser {
      await store.fetchFollowing(page: currentPage)
      users = store.following
      pagination = store.followingPagination
    } else if let userId = userId {
      let result = await store.fetchUserFollowing(userId: userId, page: currentPage)
      users.append(contentsOf: result.users)
      pagination = result.meta
    }

    isLoading = false
  }

  private func refresh() async {
    await loadInitial()
  }
}

// MARK: - Mutual Followers View

struct MutualFollowersView: View {
  @State private var store = FollowStore.shared
  @State private var isLoading = false
  @State private var currentPage = 1

  var body: some View {
    Group {
      if isLoading && store.mutualFollowers.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if store.mutualFollowers.isEmpty {
        ContentUnavailableView(
          "follow.no_mutual".localized,
          systemImage: "person.2.fill",
          description: Text("follow.no_mutual_description".localized)
        )
      } else {
        List {
          ForEach(store.mutualFollowers) { user in
            FollowUserRow(user: user, showFollowButton: true, isMutual: true)
          }

          if let meta = store.mutualsPagination, currentPage < meta.totalPages {
            ProgressView()
              .frame(maxWidth: .infinity)
              .onAppear {
                Task {
                  await loadMore()
                }
              }
          }
        }
        .listStyle(.plain)
      }
    }
    .navigationTitle("follow.mutual".localized)
    .navigationBarTitleDisplayMode(.inline)
    .refreshable {
      await refresh()
    }
    .task {
      await loadInitial()
    }
  }

  private func loadInitial() async {
    guard !isLoading else { return }
    isLoading = true
    currentPage = 1
    await store.fetchMutualFollowers(page: 1)
    isLoading = false
  }

  private func loadMore() async {
    guard !isLoading else { return }
    isLoading = true
    currentPage += 1
    await store.fetchMutualFollowers(page: currentPage)
    isLoading = false
  }

  private func refresh() async {
    await loadInitial()
  }
}

// MARK: - Follow Recommendations View

struct FollowRecommendationsView: View {
  @State private var store = FollowStore.shared
  @State private var isLoading = false

  var body: some View {
    Group {
      if isLoading && store.recommendations.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if store.recommendations.isEmpty {
        ContentUnavailableView(
          "follow.no_recommendations".localized,
          systemImage: "sparkles",
          description: Text("follow.no_recommendations_description".localized)
        )
      } else {
        List {
          ForEach(store.recommendations) { recommendation in
            RecommendationRow(recommendation: recommendation)
          }
        }
        .listStyle(.plain)
      }
    }
    .navigationTitle("follow.recommendations".localized)
    .navigationBarTitleDisplayMode(.inline)
    .refreshable {
      await refresh()
    }
    .task {
      await loadInitial()
    }
  }

  private func loadInitial() async {
    guard !isLoading else { return }
    isLoading = true
    await store.fetchRecommendations()
    isLoading = false
  }

  private func refresh() async {
    await loadInitial()
  }
}

// MARK: - Follow User Row

struct FollowUserRow: View {
  let user: FollowUser
  let showFollowButton: Bool
  var isMutual: Bool = false

  @State private var store = FollowStore.shared
  @State private var isFollowing: Bool = true
  @State private var isProcessing = false

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Avatar
      AsyncImage(url: URL(string: user.avatarUrl ?? "")) { image in
        image
          .resizable()
          .aspectRatio(contentMode: .fill)
      } placeholder: {
        Circle()
          .fill(
            LinearGradient(
              colors: [.indigo.opacity(0.3), .purple.opacity(0.3)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .overlay {
            Image(systemName: "person.fill")
              .font(.title3)
              .foregroundStyle(.white.opacity(0.7))
          }
      }
      .frame(width: 50, height: 50)
      .clipShape(Circle())

      // User info
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Text(user.displayNameOrDefault)
            .font(.body)
            .fontWeight(.medium)

          if isMutual || user.isMutual == true {
            Text("互相关注")
              .font(.caption2)
              .foregroundStyle(.white)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(Color.green)
              .clipShape(Capsule())
          }
        }

        if let bio = user.bio, !bio.isEmpty {
          Text(bio)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }

        HStack(spacing: 12) {
          Text("\(user.followersCount) 粉丝")
            .font(.caption2)
            .foregroundStyle(.tertiary)

          Text("\(user.followingCount) 关注")
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
      }

      Spacer()

      // Follow button
      if showFollowButton {
        Button {
          Task {
            await toggleFollow()
          }
        } label: {
          if isProcessing {
            ProgressView()
              .frame(width: 70)
          } else {
            Text(isFollowing ? "已关注" : "关注")
              .font(.subheadline)
              .fontWeight(.medium)
              .foregroundStyle(isFollowing ? .secondary : .white)
              .padding(.horizontal, 16)
              .padding(.vertical, 8)
              .background(isFollowing ? Color.secondary.opacity(0.2) : Color.accentColor)
              .clipShape(Capsule())
          }
        }
        .buttonStyle(.plain)
        .disabled(isProcessing)
      }
    }
    .padding(.vertical, 4)
    .onAppear {
      isFollowing = user.isFollowedByCurrentUser ?? store.isFollowing(user.id)
    }
  }

  private func toggleFollow() async {
    isProcessing = true

    if isFollowing {
      let success = await store.unfollowUser(user.id)
      if success {
        isFollowing = false
      }
    } else {
      let success = await store.followUser(user.id)
      if success {
        isFollowing = true
      }
    }

    isProcessing = false
  }
}

// MARK: - Recommendation Row

struct RecommendationRow: View {
  let recommendation: FollowRecommendation

  @State private var store = FollowStore.shared
  @State private var isFollowed = false
  @State private var isProcessing = false

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Avatar
      AsyncImage(url: URL(string: recommendation.avatarUrl ?? "")) { image in
        image
          .resizable()
          .aspectRatio(contentMode: .fill)
      } placeholder: {
        Circle()
          .fill(
            LinearGradient(
              colors: [.orange.opacity(0.3), .pink.opacity(0.3)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .overlay {
            Image(systemName: "person.fill")
              .font(.title3)
              .foregroundStyle(.white.opacity(0.7))
          }
      }
      .frame(width: 50, height: 50)
      .clipShape(Circle())

      // User info
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Text(recommendation.displayNameOrDefault)
            .font(.body)
            .fontWeight(.medium)

          if recommendation.followsYou {
            Text("关注了你")
              .font(.caption2)
              .foregroundStyle(.white)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(Color.blue)
              .clipShape(Capsule())
          }
        }

        if let bio = recommendation.bio, !bio.isEmpty {
          Text(bio)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }

        // Reasons
        Text(recommendation.reasonsText)
          .font(.caption2)
          .foregroundStyle(.orange)
      }

      Spacer()

      // Follow button
      Button {
        Task {
          await followUser()
        }
      } label: {
        if isProcessing {
          ProgressView()
            .frame(width: 70)
        } else {
          Text(isFollowed ? "已关注" : "关注")
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(isFollowed ? .secondary : .white)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isFollowed ? Color.secondary.opacity(0.2) : Color.accentColor)
            .clipShape(Capsule())
        }
      }
      .buttonStyle(.plain)
      .disabled(isProcessing || isFollowed)
    }
    .padding(.vertical, 4)
  }

  private func followUser() async {
    isProcessing = true
    let success = await store.followUser(recommendation.id)
    if success {
      isFollowed = true
    }
    isProcessing = false
  }
}

// MARK: - Follow Button Component

struct FollowButton: View {
  let userId: String
  @State private var store = FollowStore.shared
  @State private var isFollowing = false
  @State private var isProcessing = false
  @State private var hasLoaded = false

  var body: some View {
    Button {
      Task {
        await toggleFollow()
      }
    } label: {
      if isProcessing {
        ProgressView()
          .frame(width: 80)
      } else {
        HStack(spacing: 4) {
          Image(systemName: isFollowing ? "checkmark" : "plus")
            .font(.caption)
          Text(isFollowing ? "已关注" : "关注")
        }
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(isFollowing ? .secondary : .white)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(isFollowing ? Color.secondary.opacity(0.2) : Color.accentColor)
        .clipShape(Capsule())
      }
    }
    .buttonStyle(.plain)
    .disabled(isProcessing)
    .task {
      guard !hasLoaded else { return }
      hasLoaded = true
      if let status = await store.checkFollowStatus(userId) {
        isFollowing = status.isFollowing
      }
    }
  }

  private func toggleFollow() async {
    isProcessing = true

    if isFollowing {
      let success = await store.unfollowUser(userId)
      if success {
        isFollowing = false
      }
    } else {
      let success = await store.followUser(userId)
      if success {
        isFollowing = true
      }
    }

    isProcessing = false
  }
}

// MARK: - Follow Stats View

struct FollowStatsView: View {
  let followersCount: Int
  let followingCount: Int
  let onFollowersTap: () -> Void
  let onFollowingTap: () -> Void

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xl) {
      Button(action: onFollowersTap) {
        VStack(spacing: 2) {
          Text("\(followersCount)")
            .font(.title2)
            .fontWeight(.bold)
          Text("粉丝")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .buttonStyle(.plain)

      Divider()
        .frame(height: 30)

      Button(action: onFollowingTap) {
        VStack(spacing: 2) {
          Text("\(followingCount)")
            .font(.title2)
            .fontWeight(.bold)
          Text("关注")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .buttonStyle(.plain)
    }
  }
}

// MARK: - Previews

#Preview("Followers List") {
  NavigationStack {
    FollowersListView()
  }
}

#Preview("Following List") {
  NavigationStack {
    FollowingListView()
  }
}

#Preview("Recommendations") {
  NavigationStack {
    FollowRecommendationsView()
  }
}

#Preview("Follow Button") {
  FollowButton(userId: "test@example.com")
    .padding()
}
