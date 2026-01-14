import SwiftUI

// MARK: - Notification List View

/// View showing user notifications
struct NotificationListView: View {
  @State private var store = CommentStore()
  @State private var showUnreadOnly = false

  var body: some View {
    List {
      // Filter Toggle
      Section {
        Toggle("Show unread only", isOn: $showUnreadOnly)
          .onChange(of: showUnreadOnly) { _, newValue in
            Task {
              await store.fetchNotifications(unreadOnly: newValue, refresh: true)
            }
          }
      }

      // Notifications
      Section {
        if store.isLoadingNotifications && store.notifications.isEmpty {
          HStack {
            Spacer()
            ProgressView()
            Spacer()
          }
          .listRowBackground(Color.clear)
        } else if store.notifications.isEmpty {
          EmptyNotificationView()
            .listRowBackground(Color.clear)
        } else {
          ForEach(store.notifications) { notification in
            NotificationRow(notification: notification) {
              Task {
                await store.markNotificationRead(notificationId: notification.id)
              }
            }
          }

          // Load More
          if store.notificationsPage < store.notificationsTotalPages {
            Button {
              Task {
                await store.loadMoreNotifications()
              }
            } label: {
              HStack {
                Spacer()
                if store.isLoadingNotifications {
                  ProgressView()
                } else {
                  Text("Load more")
                    .foregroundStyle(.secondary)
                }
                Spacer()
              }
            }
          }
        }
      }
    }
    .navigationTitle("Notifications")
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        if store.unreadCount > 0 {
          Button {
            Task {
              await store.markAllNotificationsRead()
            }
          } label: {
            Text("Mark All Read")
              .font(.subheadline)
          }
        }
      }
    }
    .refreshable {
      await store.fetchNotifications(unreadOnly: showUnreadOnly, refresh: true)
      await store.fetchUnreadCount()
    }
    .task {
      await store.fetchNotifications(unreadOnly: showUnreadOnly, refresh: true)
      await store.fetchUnreadCount()
    }
  }
}

// MARK: - Notification Row

struct NotificationRow: View {
  let notification: UserNotification
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
        // Icon
        ZStack {
          Circle()
            .fill(iconColor.opacity(0.15))
            .frame(width: 40, height: 40)

          Image(systemName: notification.icon)
            .foregroundStyle(iconColor)
        }

        // Content
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Text(notification.actorName ?? "Someone")
              .font(.subheadline)
              .fontWeight(.medium)

            Spacer()

            Text(notification.timeAgo)
              .font(.caption)
              .foregroundStyle(.tertiary)
          }

          Text(notification.message)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        // Unread indicator
        if !notification.isRead {
          Circle()
            .fill(.blue)
            .frame(width: 8, height: 8)
        }
      }
      .padding(.vertical, DesignTokens.Spacing.xs)
    }
    .buttonStyle(.plain)
    .listRowBackground(notification.isRead ? Color.clear : Color.blue.opacity(0.05))
  }

  private var iconColor: Color {
    switch notification.iconColor {
    case "blue": return .blue
    case "red": return .red
    case "green": return .green
    case "purple": return .purple
    case "orange": return .orange
    case "indigo": return .indigo
    default: return .gray
    }
  }
}

// MARK: - Empty Notification View

struct EmptyNotificationView: View {
  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "bell.slash")
        .font(.system(size: 48))
        .foregroundStyle(.tertiary)

      Text("No notifications")
        .font(.headline)
        .foregroundStyle(.secondary)

      Text("You'll see notifications here when someone interacts with your content.")
        .font(.subheadline)
        .foregroundStyle(.tertiary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.xxl)
  }
}

// MARK: - Notification Badge View

/// Badge component showing unread notification count
struct NotificationBadge: View {
  let count: Int

  var body: some View {
    if count > 0 {
      Text(count > 99 ? "99+" : "\(count)")
        .font(.caption2)
        .fontWeight(.bold)
        .foregroundStyle(.white)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(Color.red)
        .clipShape(Capsule())
    }
  }
}

// MARK: - Notification Bell Button

/// Bell button with badge for navigation bar
struct NotificationBellButton: View {
  @State private var store = CommentStore()

  var body: some View {
    NavigationLink {
      NotificationListView()
    } label: {
      ZStack(alignment: .topTrailing) {
        Image(systemName: "bell.fill")
          .font(.body)

        NotificationBadge(count: store.unreadCount)
          .offset(x: 8, y: -8)
      }
    }
    .task {
      await store.fetchUnreadCount()
    }
  }
}

// MARK: - Previews

#Preview("Notification List") {
  NavigationStack {
    NotificationListView()
  }
}

#Preview("Notification Row") {
  List {
    NotificationRow(
      notification: UserNotification(
        id: "1",
        userId: "user1",
        type: .like,
        referenceType: "comment",
        referenceId: "comment1",
        actorId: "user2",
        message: "liked your comment",
        isRead: false,
        createdAt: Date().timeIntervalSince1970 * 1000,
        readAt: nil,
        actorName: "John Doe",
        actorAvatar: nil
      )
    ) {}

    NotificationRow(
      notification: UserNotification(
        id: "2",
        userId: "user1",
        type: .comment,
        referenceType: "itinerary",
        referenceId: "itinerary1",
        actorId: "user3",
        message: "commented on your itinerary",
        isRead: true,
        createdAt: Date().timeIntervalSince1970 * 1000 - 3600000,
        readAt: Date().timeIntervalSince1970 * 1000,
        actorName: "Jane Smith",
        actorAvatar: nil
      )
    ) {}
  }
}

#Preview("Empty Notifications") {
  EmptyNotificationView()
}

#Preview("Notification Badge") {
  HStack(spacing: 20) {
    NotificationBadge(count: 0)
    NotificationBadge(count: 5)
    NotificationBadge(count: 99)
    NotificationBadge(count: 150)
  }
  .padding()
}
