import SwiftUI

/// View displaying share statistics and management for an itinerary
struct ShareStatsView: View {
  let itineraryId: String
  let itineraryTitle: String

  @State private var store = ShareStore.shared
  @State private var showShareSheet = false
  @State private var showCreateLinkSheet = false
  @State private var selectedPlatform: SharePlatform = .copyLink
  @State private var copiedToClipboard = false

  var body: some View {
    ScrollView {
      VStack(spacing: 24) {
        // Statistics Summary
        if let stats = store.stats {
          StatsSummarySection(stats: stats)
        } else if store.isLoadingStats {
          ProgressView()
            .frame(maxWidth: .infinity, minHeight: 100)
        }

        // Platform Breakdown
        if let stats = store.stats, !stats.byPlatform.isEmpty {
          PlatformBreakdownSection(byPlatform: stats.byPlatform)
        }

        // Active Share Links
        ShareLinksSection(
          links: store.shareLinks,
          isLoading: store.isLoadingLinks,
          onCreateNew: { showCreateLinkSheet = true },
          onCopyLink: copyLinkToClipboard,
          onRevoke: revokeLink,
          onDelete: deleteLink
        )

        // Recent Activity
        if let stats = store.stats, !stats.recentShares.isEmpty {
          RecentSharesSection(shares: stats.recentShares)
        }
      }
      .padding()
    }
    .navigationTitle("分享统计")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          showShareSheet = true
        } label: {
          Image(systemName: "square.and.arrow.up")
        }
      }
    }
    .sheet(isPresented: $showShareSheet) {
      QuickShareSheet(
        itineraryId: itineraryId,
        itineraryTitle: itineraryTitle,
        onShare: { platform in
          Task {
            await quickShare(platform: platform)
          }
        }
      )
      .presentationDetents([.medium])
    }
    .sheet(isPresented: $showCreateLinkSheet) {
      CreateShareLinkSheet(
        itineraryId: itineraryId,
        onCreate: { result in
          showCreateLinkSheet = false
          if result != nil {
            Task {
              await loadData()
            }
          }
        }
      )
    }
    .overlay {
      if copiedToClipboard {
        CopiedToast()
      }
    }
    .task {
      await loadData()
    }
    .refreshable {
      await loadData()
    }
  }

  private func loadData() async {
    await store.loadItineraryStats(itineraryId: itineraryId)
    await store.loadShareLinks(resourceType: .itinerary, resourceId: itineraryId)
  }

  private func quickShare(platform: SharePlatform) async {
    if let result = await store.shareItinerary(itineraryId: itineraryId, platform: platform) {
      if platform == .copyLink {
        copyToClipboard(result.shareUrl)
      }
      showShareSheet = false
      await loadData()
    }
  }

  private func copyLinkToClipboard(_ url: String) {
    copyToClipboard(url)
  }

  private func copyToClipboard(_ text: String) {
    UIPasteboard.general.string = text
    withAnimation {
      copiedToClipboard = true
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
      withAnimation {
        copiedToClipboard = false
      }
    }
  }

  private func revokeLink(_ linkId: String) async {
    if await store.revokeShareLink(shareLinkId: linkId) {
      await loadData()
    }
  }

  private func deleteLink(_ linkId: String) async {
    if await store.deleteShareLink(shareLinkId: linkId) {
      await loadData()
    }
  }
}

// MARK: - Statistics Summary Section

private struct StatsSummarySection: View {
  let stats: ShareStats

  var body: some View {
    VStack(spacing: 16) {
      HStack(spacing: 16) {
        StatCard(
          title: "分享次数",
          value: "\(stats.totals.shares)",
          icon: "square.and.arrow.up",
          color: .blue
        )
        StatCard(
          title: "浏览次数",
          value: "\(stats.totals.views)",
          icon: "eye",
          color: .green
        )
      }

      HStack(spacing: 16) {
        StatCard(
          title: "点击次数",
          value: "\(stats.totals.clicks)",
          icon: "hand.tap",
          color: .orange
        )
        StatCard(
          title: "保存次数",
          value: "\(stats.totals.saves)",
          icon: "bookmark",
          color: .purple
        )
      }

      // Active links indicator
      HStack {
        Image(systemName: "link")
          .foregroundStyle(.secondary)
        Text("当前有 \(stats.totals.activeLinks) 个有效分享链接")
          .font(.subheadline)
          .foregroundStyle(.secondary)
        Spacer()
      }
      .padding(.horizontal, 4)
    }
  }
}

private struct StatCard: View {
  let title: String
  let value: String
  let icon: String
  let color: Color

  var body: some View {
    VStack(spacing: 8) {
      HStack {
        Image(systemName: icon)
          .font(.title2)
          .foregroundStyle(color)
        Spacer()
      }

      HStack {
        Text(value)
          .font(.title)
          .fontWeight(.bold)
        Spacer()
      }

      HStack {
        Text(title)
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
      }
    }
    .padding()
    .background(color.opacity(0.1))
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Platform Breakdown Section

private struct PlatformBreakdownSection: View {
  let byPlatform: [String: PlatformStats]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("平台分布")
        .font(.headline)

      VStack(spacing: 8) {
        ForEach(Array(byPlatform.keys.sorted()), id: \.self) { key in
          if let stats = byPlatform[key],
             let platform = SharePlatform(rawValue: key) {
            PlatformRow(platform: platform, stats: stats)
          }
        }
      }
    }
    .padding()
    .background(Color(.systemGray6))
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }
}

private struct PlatformRow: View {
  let platform: SharePlatform
  let stats: PlatformStats

  var body: some View {
    HStack {
      Image(systemName: platform.iconName)
        .frame(width: 24)
        .foregroundStyle(.blue)

      Text(platform.displayName)
        .font(.subheadline)

      Spacer()

      HStack(spacing: 12) {
        Label("\(stats.shares)", systemImage: "square.and.arrow.up")
        Label("\(stats.views)", systemImage: "eye")
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Share Links Section

private struct ShareLinksSection: View {
  let links: [ShareLink]
  let isLoading: Bool
  let onCreateNew: () -> Void
  let onCopyLink: (String) -> Void
  let onRevoke: (String) async -> Void
  let onDelete: (String) async -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text("分享链接")
          .font(.headline)
        Spacer()
        Button(action: onCreateNew) {
          Label("创建链接", systemImage: "plus.circle")
            .font(.subheadline)
        }
      }

      if isLoading {
        ProgressView()
          .frame(maxWidth: .infinity, minHeight: 60)
      } else if links.isEmpty {
        VStack(spacing: 8) {
          Image(systemName: "link.badge.plus")
            .font(.largeTitle)
            .foregroundStyle(.secondary)
          Text("暂无分享链接")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 100)
      } else {
        VStack(spacing: 8) {
          ForEach(links) { link in
            ShareLinkRow(
              link: link,
              onCopy: { onCopyLink(link.shareUrl) },
              onRevoke: { Task { await onRevoke(link.id) } },
              onDelete: { Task { await onDelete(link.id) } }
            )
          }
        }
      }
    }
    .padding()
    .background(Color(.systemGray6))
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }
}

private struct ShareLinkRow: View {
  let link: ShareLink
  let onCopy: () -> Void
  let onRevoke: () -> Void
  let onDelete: () -> Void

  @State private var showActions = false

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Image(systemName: link.platform.iconName)
          .foregroundStyle(.blue)

        Text(link.shareCode)
          .font(.subheadline.monospaced())

        if link.hasPassword {
          Image(systemName: "lock.fill")
            .font(.caption)
            .foregroundStyle(.orange)
        }

        if link.isExpired {
          Text("已过期")
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(.red.opacity(0.2))
            .foregroundStyle(.red)
            .clipShape(Capsule())
        }

        Spacer()

        Menu {
          Button(action: onCopy) {
            Label("复制链接", systemImage: "doc.on.doc")
          }
          Button(role: .destructive, action: onRevoke) {
            Label("撤销链接", systemImage: "xmark.circle")
          }
          Button(role: .destructive, action: onDelete) {
            Label("删除链接", systemImage: "trash")
          }
        } label: {
          Image(systemName: "ellipsis.circle")
            .foregroundStyle(.secondary)
        }
      }

      HStack(spacing: 12) {
        Label("\(link.viewCount)", systemImage: "eye")
        Label("\(link.clickCount)", systemImage: "hand.tap")
        Label("\(link.saveCount)", systemImage: "bookmark")
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding()
    .background(Color(.systemBackground))
    .clipShape(RoundedRectangle(cornerRadius: 8))
  }
}

// MARK: - Recent Shares Section

private struct RecentSharesSection: View {
  let shares: [ShareEvent]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("最近分享")
        .font(.headline)

      VStack(spacing: 8) {
        ForEach(shares) { share in
          HStack {
            if let platform = SharePlatform(rawValue: share.platform.rawValue) {
              Image(systemName: platform.iconName)
                .foregroundStyle(.blue)
              Text(platform.displayName)
                .font(.subheadline)
            }

            Spacer()

            Text(formatDate(share.createdAt))
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          .padding(.vertical, 4)
        }
      }
    }
    .padding()
    .background(Color(.systemGray6))
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }

  private func formatDate(_ timestamp: TimeInterval) -> String {
    let date = Date(timeIntervalSince1970: timestamp / 1000)
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}

// MARK: - Quick Share Sheet

private struct QuickShareSheet: View {
  let itineraryId: String
  let itineraryTitle: String
  let onShare: (SharePlatform) -> Void

  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      VStack(spacing: 24) {
        Text("分享「\(itineraryTitle)」")
          .font(.headline)
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .padding(.top)

        LazyVGrid(columns: [
          GridItem(.flexible()),
          GridItem(.flexible()),
          GridItem(.flexible()),
          GridItem(.flexible())
        ], spacing: 20) {
          ForEach(SharePlatform.allCases, id: \.self) { platform in
            SharePlatformButton(platform: platform) {
              onShare(platform)
            }
          }
        }
        .padding()

        Spacer()
      }
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("取消") { dismiss() }
        }
      }
    }
  }
}

private struct SharePlatformButton: View {
  let platform: SharePlatform
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 8) {
        Image(systemName: platform.iconName)
          .font(.title2)
          .frame(width: 50, height: 50)
          .background(Color(.systemGray5))
          .clipShape(Circle())

        Text(platform.displayName)
          .font(.caption)
          .foregroundStyle(.primary)
      }
    }
  }
}

// MARK: - Create Share Link Sheet

private struct CreateShareLinkSheet: View {
  let itineraryId: String
  let onCreate: (CreateShareLinkResult?) -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var store = ShareStore.shared

  @State private var selectedPlatform: SharePlatform = .copyLink
  @State private var selectedPermission: SharePermission = .public
  @State private var password = ""
  @State private var expiresInDays: Int?
  @State private var maxViews: Int?
  @State private var allowDownload = true
  @State private var allowCopy = true

  var body: some View {
    NavigationStack {
      Form {
        Section("分享平台") {
          Picker("平台", selection: $selectedPlatform) {
            ForEach(SharePlatform.allCases, id: \.self) { platform in
              Label(platform.displayName, systemImage: platform.iconName)
                .tag(platform)
            }
          }
        }

        Section("访问权限") {
          Picker("权限", selection: $selectedPermission) {
            ForEach(SharePermission.allCases, id: \.self) { permission in
              Text(permission.displayName)
                .tag(permission)
            }
          }
          .pickerStyle(.segmented)

          Text(selectedPermission.description)
            .font(.caption)
            .foregroundStyle(.secondary)

          if selectedPermission == .password {
            SecureField("设置密码", text: $password)
          }
        }

        Section("链接设置") {
          Toggle("允许下载", isOn: $allowDownload)
          Toggle("允许复制", isOn: $allowCopy)

          Picker("有效期", selection: $expiresInDays) {
            Text("永久有效").tag(nil as Int?)
            Text("1天").tag(1 as Int?)
            Text("7天").tag(7 as Int?)
            Text("30天").tag(30 as Int?)
            Text("90天").tag(90 as Int?)
          }

          Picker("最大浏览次数", selection: $maxViews) {
            Text("不限制").tag(nil as Int?)
            Text("10次").tag(10 as Int?)
            Text("50次").tag(50 as Int?)
            Text("100次").tag(100 as Int?)
            Text("500次").tag(500 as Int?)
          }
        }
      }
      .navigationTitle("创建分享链接")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("创建") {
            Task {
              await createLink()
            }
          }
          .disabled(store.isCreatingLink || (selectedPermission == .password && password.isEmpty))
        }
      }
    }
  }

  private func createLink() async {
    let result = await store.shareItinerary(
      itineraryId: itineraryId,
      platform: selectedPlatform,
      permission: selectedPermission,
      password: selectedPermission == .password ? password : nil,
      expiresInDays: expiresInDays
    )
    onCreate(result)
  }
}

// MARK: - Copied Toast

private struct CopiedToast: View {
  var body: some View {
    VStack {
      Spacer()
      HStack {
        Image(systemName: "checkmark.circle.fill")
          .foregroundStyle(.green)
        Text("链接已复制")
      }
      .padding()
      .background(.ultraThinMaterial)
      .clipShape(Capsule())
      .padding(.bottom, 50)
    }
    .transition(.move(edge: .bottom).combined(with: .opacity))
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    ShareStatsView(
      itineraryId: "test-itinerary-id",
      itineraryTitle: "东京5日游"
    )
  }
}
