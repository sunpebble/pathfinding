import SwiftUI

// MARK: - User Profile View

/// View for displaying another user's profile with follow functionality
struct UserProfileView: View {
  let userId: String

  @State private var store = FollowStore.shared
  @State private var followStats: FollowStats?
  @State private var followStatus: FollowStatus?
  @State private var isLoading = true
  @State private var showFollowers = false
  @State private var showFollowing = false

  // Mock user data - in real app, fetch from API
  @State private var displayName: String = ""
  @State private var avatarUrl: String?
  @State private var bio: String?

  var body: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.lg) {
        // Profile Header
        profileHeader

        // Follow Stats
        if let stats = followStats {
          FollowStatsView(
            followersCount: stats.followersCount,
            followingCount: stats.followingCount,
            onFollowersTap: { showFollowers = true },
            onFollowingTap: { showFollowing = true }
          )
          .padding(.horizontal)
        }

        // Follow Button
        if let status = followStatus {
          followButton(status: status)
            .padding(.horizontal)
        }

        Divider()
          .padding(.horizontal)

        // User's content would go here (itineraries, notes, etc.)
        ContentUnavailableView(
          "暂无内容",
          systemImage: "doc.text",
          description: Text("该用户还没有发布内容")
        )
        .padding(.top, DesignTokens.Spacing.xl)
      }
      .padding(.top)
    }
    .navigationTitle(displayName.isEmpty ? "用户主页" : displayName)
    .navigationBarTitleDisplayMode(.inline)
    .sheet(isPresented: $showFollowers) {
      NavigationStack {
        FollowersListView(userId: userId)
          .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
              Button("完成") { showFollowers = false }
            }
          }
      }
    }
    .sheet(isPresented: $showFollowing) {
      NavigationStack {
        FollowingListView(userId: userId)
          .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
              Button("完成") { showFollowing = false }
            }
          }
      }
    }
    .task {
      await loadUserData()
    }
  }

  private var profileHeader: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Avatar
      AsyncImage(url: URL(string: avatarUrl ?? "")) { image in
        image
          .resizable()
          .aspectRatio(contentMode: .fill)
      } placeholder: {
        Circle()
          .fill(
            LinearGradient(
              colors: [.indigo, .purple],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .overlay {
            Image(systemName: "person.fill")
              .font(.system(size: 40))
              .foregroundStyle(.white)
          }
      }
      .frame(width: 100, height: 100)
      .clipShape(Circle())
      .shadow(color: .black.opacity(0.1), radius: 10, y: 5)

      // Name
      Text(displayName.isEmpty ? "Loading..." : displayName)
        .font(.title2)
        .fontWeight(.bold)

      // Bio
      if let bio = bio, !bio.isEmpty {
        Text(bio)
          .font(.body)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
          .padding(.horizontal)
      }

      // Mutual follow badge
      if let status = followStatus, status.isMutual {
        HStack(spacing: 4) {
          Image(systemName: "person.2.fill")
            .font(.caption)
          Text("互相关注")
        }
        .font(.caption)
        .foregroundStyle(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.green)
        .clipShape(Capsule())
      } else if let status = followStatus, status.isFollowedBy {
        HStack(spacing: 4) {
          Image(systemName: "person.fill.checkmark")
            .font(.caption)
          Text("关注了你")
        }
        .font(.caption)
        .foregroundStyle(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.blue)
        .clipShape(Capsule())
      }
    }
  }

  @ViewBuilder
  private func followButton(status: FollowStatus) -> some View {
    Button {
      Task {
        await toggleFollow()
      }
    } label: {
      HStack(spacing: 8) {
        if store.isFollowing {
          ProgressView()
            .tint(.white)
        } else {
          Image(systemName: status.isFollowing ? "checkmark" : "plus")
          Text(status.isFollowing ? "已关注" : (status.isFollowedBy ? "回关" : "关注"))
        }
      }
      .font(.headline)
      .foregroundStyle(status.isFollowing ? Color.primary : Color.white)
      .frame(maxWidth: .infinity)
      .padding(.vertical, 14)
      .background(status.isFollowing ? Color.secondary.opacity(0.2) : Color.accentColor)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
    .buttonStyle(.plain)
    .disabled(store.isFollowing)
  }

  private func loadUserData() async {
    isLoading = true

    // Load follow stats
    followStats = await store.getFollowStats(for: userId)

    // Load follow status
    followStatus = await store.checkFollowStatus(userId)

    // In a real app, you would also fetch user profile data here
    // For now, we'll use placeholder data
    displayName = userId.components(separatedBy: "@").first ?? userId

    isLoading = false
  }

  private func toggleFollow() async {
    guard let status = followStatus else { return }

    if status.isFollowing {
      let success = await store.unfollowUser(userId)
      if success {
        followStatus = FollowStatus(
          isFollowing: false,
          isFollowedBy: status.isFollowedBy,
          isMutual: false
        )
        if let stats = followStats {
          followStats = FollowStats(
            followersCount: max(0, stats.followersCount - 1),
            followingCount: stats.followingCount
          )
        }
      }
    } else {
      let success = await store.followUser(userId)
      if success {
        followStatus = FollowStatus(
          isFollowing: true,
          isFollowedBy: status.isFollowedBy,
          isMutual: status.isFollowedBy
        )
        if let stats = followStats {
          followStats = FollowStats(
            followersCount: stats.followersCount + 1,
            followingCount: stats.followingCount
          )
        }
      }
    }
  }
}

// MARK: - Follow Management View

/// Main view for managing follows - accessible from profile
struct FollowManagementView: View {
  @State private var selectedTab = 0

  var body: some View {
    VStack(spacing: 0) {
      // Tab selector
      Picker("", selection: $selectedTab) {
        Text("粉丝").tag(0)
        Text("关注").tag(1)
        Text("互关").tag(2)
        Text("推荐").tag(3)
      }
      .pickerStyle(.segmented)
      .padding()

      // Content
      TabView(selection: $selectedTab) {
        FollowersListView()
          .tag(0)

        FollowingListView()
          .tag(1)

        MutualFollowersView()
          .tag(2)

        FollowRecommendationsView()
          .tag(3)
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
    }
    .navigationTitle("关注管理")
    .navigationBarTitleDisplayMode(.inline)
  }
}

// MARK: - Compact Follow Recommendations Card

/// A compact card showing follow recommendations for embedding in other views
struct FollowRecommendationsCard: View {
  @State private var store = FollowStore.shared
  @State private var isLoading = false

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      HStack {
        Label("推荐关注", systemImage: "sparkles")
          .font(.headline)

        Spacer()

        NavigationLink {
          FollowRecommendationsView()
        } label: {
          Text("查看全部")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      if isLoading {
        HStack {
          Spacer()
          ProgressView()
          Spacer()
        }
        .padding(.vertical)
      } else if store.recommendations.isEmpty {
        Text("暂无推荐")
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .frame(maxWidth: .infinity)
          .padding(.vertical)
      } else {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.md) {
            ForEach(store.recommendations.prefix(5)) { recommendation in
              CompactRecommendationCard(recommendation: recommendation)
            }
          }
        }
      }
    }
    .padding()
    .background(Color(.systemBackground))
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    .shadow(color: .black.opacity(0.05), radius: 10, y: 5)
    .task {
      guard store.recommendations.isEmpty else { return }
      isLoading = true
      await store.fetchRecommendations(limit: 5)
      isLoading = false
    }
  }
}

// MARK: - Compact Recommendation Card

struct CompactRecommendationCard: View {
  let recommendation: FollowRecommendation

  @State private var store = FollowStore.shared
  @State private var isFollowed = false
  @State private var isProcessing = false

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
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
              .font(.body)
              .foregroundStyle(.white.opacity(0.7))
          }
      }
      .frame(width: 60, height: 60)
      .clipShape(Circle())

      // Name
      Text(recommendation.displayNameOrDefault)
        .font(.caption)
        .fontWeight(.medium)
        .lineLimit(1)

      // Reason
      Text(recommendation.reasons.first ?? "")
        .font(.caption2)
        .foregroundStyle(.orange)
        .lineLimit(1)

      // Follow button
      Button {
        Task {
          await followUser()
        }
      } label: {
        if isProcessing {
          ProgressView()
            .frame(width: 60, height: 28)
        } else {
          Text(isFollowed ? "已关注" : "关注")
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(isFollowed ? Color.secondary : Color.white)
            .frame(width: 60, height: 28)
            .background(isFollowed ? Color.secondary.opacity(0.2) : Color.accentColor)
            .clipShape(Capsule())
        }
      }
      .buttonStyle(.plain)
      .disabled(isProcessing || isFollowed)
    }
    .frame(width: 80)
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

// MARK: - Previews

#Preview("User Profile") {
  NavigationStack {
    UserProfileView(userId: "test@example.com")
  }
}

#Preview("Follow Management") {
  NavigationStack {
    FollowManagementView()
  }
}

#Preview("Recommendations Card") {
  FollowRecommendationsCard()
    .padding()
    .background(Color(.systemGroupedBackground))
}
