import SwiftUI

/// View displaying the user's liked itineraries
struct MyLikesView: View {
  @State private var store = FavoriteStore.shared
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    Group {
      if store.isLoadingLikes && store.likedItineraries.isEmpty {
        loadingView
      } else if store.likedItineraries.isEmpty {
        emptyView
      } else {
        likesList
      }
    }
    .navigationTitle("我的点赞")
    .navigationBarTitleDisplayMode(.large)
    .refreshable {
      await store.fetchLikedItineraries(refresh: true)
    }
    .task {
      if store.likedItineraries.isEmpty {
        await store.fetchLikedItineraries(refresh: true)
      }
    }
  }

  // MARK: - Likes List

  private var likesList: some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(store.likedItineraries) { like in
          if like.itinerary != nil {
            NavigationLink {
              // Navigate to itinerary detail
              // TODO: Implement itinerary detail view for public itineraries
              Text("行程详情: \(like.itinerary?.title ?? "")")
            } label: {
              LikedItineraryCard(like: like)
            }
            .buttonStyle(.plain)
          }
        }

        // Load more
        if store.likesPage < store.likesTotalPages {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding()
            .task {
              await store.loadMoreLikes()
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
      Image(systemName: "heart")
        .font(.system(size: 60))
        .foregroundStyle(DesignTokens.Colors.textQuaternary)

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text("暂无点赞")
          .font(.headline)

        Text("浏览行程时点击爱心图标即可点赞")
          .font(.subheadline)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
          .multilineTextAlignment(.center)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(DesignTokens.Colors.backgroundGrouped)
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    MyLikesView()
  }
}
